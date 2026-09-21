#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

for cmd in psql gzip sha256sum; do require_command "$cmd"; done
assert_distinct_backends

ARCHIVE="$WORK_DIR/export/source-data.sql.gz"
CHECKSUMS="$WORK_DIR/export/checksums.sha256"
[[ -f "$ARCHIVE" && -f "$CHECKSUMS" ]] || die "Source export or checksum file is missing"
(cd "$(dirname "$CHECKSUMS")" && sha256sum -c "$(basename "$CHECKSUMS")")

note "Importing rows in one transaction without overwriting existing keys"
gzip -dc "$ARCHIVE" | psql "$TARGET_DATABASE_URL" -X -v ON_ERROR_STOP=1 --single-transaction

note "Import completed; run verification before enabling traffic"
