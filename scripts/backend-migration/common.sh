#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK_DIR="${MIGRATION_WORK_DIR:-/tmp/chatr-backend-migration}"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
note() { printf '==> %s\n' "$*"; }
require_command() { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }
require_value() { [[ -n "${!1:-}" ]] || die "Missing required environment value: $1"; }

safe_project_ref() {
  local url="$1"
  printf '%s' "$url" | sed -E 's#https?://([^./]+).*#\1#'
}

assert_distinct_backends() {
  require_value SOURCE_DATABASE_URL
  require_value TARGET_DATABASE_URL
  [[ "$SOURCE_DATABASE_URL" != "$TARGET_DATABASE_URL" ]] || die "Source and destination database URLs are identical"
  if [[ -n "${SOURCE_SUPABASE_URL:-}" && -n "${TARGET_SUPABASE_URL:-}" ]]; then
    [[ "$(safe_project_ref "$SOURCE_SUPABASE_URL")" != "$(safe_project_ref "$TARGET_SUPABASE_URL")" ]] || die "Source and destination API projects are identical"
  fi
}

mkdir -p "$WORK_DIR"
umask 077
