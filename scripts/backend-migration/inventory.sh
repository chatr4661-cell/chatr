#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

require_command rg
require_command sha256sum

OUT="$WORK_DIR/inventory"
mkdir -p "$OUT"

rg --files "$ROOT_DIR/supabase/migrations" | sort > "$OUT/migrations.txt"
rg --files "$ROOT_DIR/supabase/functions" -g 'index.ts' | sort > "$OUT/functions.txt"
rg -l -i 'create extension' "$ROOT_DIR/supabase/migrations" | sort > "$OUT/extensions.txt" || true
rg -l -i 'storage\.buckets|storage\.objects' "$ROOT_DIR/supabase/migrations" | sort > "$OUT/storage-migrations.txt" || true
rg -l -i 'cron\.schedule|pg_cron' "$ROOT_DIR/supabase/migrations" | sort > "$OUT/cron-migrations.txt" || true
rg -l -i 'supabase_realtime|alter publication' "$ROOT_DIR/supabase/migrations" | sort > "$OUT/realtime-migrations.txt" || true
rg -l -i 'net\.http|supabase_functions\.http' "$ROOT_DIR/supabase/migrations" | sort > "$OUT/http-hook-migrations.txt" || true
rg -l -i 'drop table|truncate table|drop schema|drop column' "$ROOT_DIR/supabase/migrations" | sort > "$OUT/destructive-history.txt" || true
(cd "$ROOT_DIR" && sha256sum supabase/migrations/*.sql) > "$OUT/migration-checksums.sha256"

{
  printf 'migrations=%s\n' "$(wc -l < "$OUT/migrations.txt" | tr -d ' ')"
  printf 'edge_functions=%s\n' "$(wc -l < "$OUT/functions.txt" | tr -d ' ')"
  printf 'storage_migrations=%s\n' "$(wc -l < "$OUT/storage-migrations.txt" | tr -d ' ')"
  printf 'realtime_migrations=%s\n' "$(wc -l < "$OUT/realtime-migrations.txt" | tr -d ' ')"
  printf 'http_hook_migrations=%s\n' "$(wc -l < "$OUT/http-hook-migrations.txt" | tr -d ' ')"
  printf 'destructive_history_files=%s\n' "$(wc -l < "$OUT/destructive-history.txt" | tr -d ' ')"
} | tee "$OUT/summary.txt"

note "Inventory written to $OUT"
