#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

for cmd in psql diff; do require_command "$cmd"; done
assert_distinct_backends

OUT="$WORK_DIR/verify"
mkdir -p "$OUT"

QUERY="select schemaname, relname, n_live_tup from pg_stat_user_tables where schemaname in ('public','auth','storage') order by 1,2"
psql "$SOURCE_DATABASE_URL" -X -AtF $'\t' -c "$QUERY" > "$OUT/source-row-counts.tsv"
psql "$TARGET_DATABASE_URL" -X -AtF $'\t' -c "$QUERY" > "$OUT/target-row-counts.tsv"

psql "$SOURCE_DATABASE_URL" -X -AtF $'\t' <<'SQL' > "$OUT/source-objects.tsv"
select 'table', schemaname, tablename from pg_tables where schemaname='public'
union all select 'policy', schemaname, tablename || '.' || policyname from pg_policies where schemaname='public'
union all select 'function', n.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all select 'trigger', event_object_schema, event_object_table || '.' || trigger_name from information_schema.triggers where event_object_schema='public'
order by 1,2,3;
SQL

psql "$TARGET_DATABASE_URL" -X -AtF $'\t' <<'SQL' > "$OUT/target-objects.tsv"
select 'table', schemaname, tablename from pg_tables where schemaname='public'
union all select 'policy', schemaname, tablename || '.' || policyname from pg_policies where schemaname='public'
union all select 'function', n.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all select 'trigger', event_object_schema, event_object_table || '.' || trigger_name from information_schema.triggers where event_object_schema='public'
order by 1,2,3;
SQL

status=0
diff -u "$OUT/source-objects.tsv" "$OUT/target-objects.tsv" > "$OUT/object-diff.txt" || status=1
diff -u "$OUT/source-row-counts.tsv" "$OUT/target-row-counts.tsv" > "$OUT/row-count-diff.txt" || status=1

RLS_OFF="$(psql "$TARGET_DATABASE_URL" -X -Atqc "select count(*) from pg_tables where schemaname='public' and not rowsecurity")"
printf 'destination_public_tables_without_rls=%s\n' "$RLS_OFF" | tee "$OUT/security-summary.txt"

if [[ "$status" != "0" ]]; then
  die "Verification differences remain. Review $OUT before cutover."
fi
note "Database object and row-count verification passed"
