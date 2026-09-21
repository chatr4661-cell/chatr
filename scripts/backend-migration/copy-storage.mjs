import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
};

const sourceUrl = required('SOURCE_SUPABASE_URL');
const sourceKey = required('SOURCE_SERVICE_ROLE_KEY');
const targetUrl = required('TARGET_SUPABASE_URL');
const targetKey = required('TARGET_SERVICE_ROLE_KEY');
if (new URL(sourceUrl).host === new URL(targetUrl).host) throw new Error('Source and destination Storage projects are identical');

const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false } });
const target = createClient(targetUrl, targetKey, { auth: { persistSession: false } });
const workDir = process.env.MIGRATION_WORK_DIR || '.migration-work';
const checkpointPath = join(workDir, 'storage-checkpoint.json');
await mkdir(dirname(checkpointPath), { recursive: true });

let checkpoint = {};
try { checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8')); } catch { checkpoint = {}; }

const { data: buckets, error: bucketError } = await source.storage.listBuckets();
if (bucketError) throw bucketError;

async function walk(bucket, prefix = '') {
  let offset = 0;
  const files = [];
  while (true) {
    const { data, error } = await source.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) files.push({ path, metadata: item.metadata || {} });
      else files.push(...await walk(bucket, path));
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return files;
}

for (const bucket of buckets || []) {
  const files = await walk(bucket.id);
  for (const file of files) {
    const key = `${bucket.id}/${file.path}`;
    if (checkpoint[key] === 'done') continue;
    const { data: blob, error: downloadError } = await source.storage.from(bucket.id).download(file.path);
    if (downloadError) throw downloadError;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { error: uploadError } = await target.storage.from(bucket.id).upload(file.path, bytes, {
      upsert: false,
      contentType: file.metadata.mimetype || file.metadata.contentType || 'application/octet-stream',
      cacheControl: file.metadata.cacheControl || '3600',
    });
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
    checkpoint[key] = 'done';
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }
  console.log(`${bucket.id}: ${files.length} objects checked`);
}

console.log('Storage copy complete');
