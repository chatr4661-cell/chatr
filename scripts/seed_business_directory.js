/**
 * seed_business_directory.js
 * ---------------------------------------------------------------
 * Solves the cold-start problem for the crowdsourced phonebook by
 * seeding known business numbers into the global hashed directory.
 *
 * Phone numbers are normalized to E.164 and hashed (SHA-256) before
 * upload — raw numbers are never sent to the database. Each entry is
 * written via the `seed_business_number` RPC (service-role only).
 *
 * USAGE:
 *   1. Add your real numbers to the `businessDataset` array below.
 *   2. Create a .env file in the project root with:
 *        SUPABASE_URL=https://<your-project-ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
 *   3. Run:  node scripts/seed_business_directory.js
 *
 * Requires: @supabase/supabase-js  (already a project dependency)
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// --- Minimal .env loader (no extra dependency) ---------------------------
try {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = (m[2] ?? "").replace(/^['"]|['"]$/g, "");
    }
  }
} catch {
  /* .env is optional if vars are already exported */
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env or your shell.",
  );
  process.exit(1);
}

// --- E.164 normalization (must match the sync-contacts edge function) ----
function normalizePhone(raw) {
  const trimmed = (raw ?? "").toString().trim();
  const hasPlus = trimmed.startsWith("+");
  const hasDoubleZero = trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return `+${digits}`;
  if (hasDoubleZero) return `+${digits.slice(2)}`;
  if (digits.length > 10) return `+${digits}`;
  return `+91${digits}`;
}

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

// --- YOUR DATASET --------------------------------------------------------
// Replace these examples with your real verified business numbers.
const businessDataset = [
  // { name: "State Bank of India", phone: "+911800112211", trust: 95 },
  // { name: "Zomato Support",       phone: "+918039604060", trust: 90 },
  // { name: "Airtel Care",          phone: "121",           trust: 92 },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (businessDataset.length === 0) {
    console.warn("⚠️  businessDataset is empty — add your numbers and re-run.");
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const biz of businessDataset) {
    const normalized = normalizePhone(biz.phone);
    if (!biz.name || !normalized) {
      console.warn(`  ↳ skipping invalid entry: ${JSON.stringify(biz)}`);
      fail++;
      continue;
    }
    const phone_hash = sha256Hex(normalized);
    const { error } = await supabase.rpc("seed_business_number", {
      p_phone_hash: phone_hash,
      p_name: biz.name,
      p_trust: biz.trust ?? 90,
    });
    if (error) {
      console.error(`  ✗ ${biz.name}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ seeded ${biz.name}`);
      ok++;
    }
  }

  console.log(`\nDone. Seeded ${ok} business numbers, ${fail} failed/skipped.`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
