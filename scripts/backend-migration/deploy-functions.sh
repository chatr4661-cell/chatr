#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"

require_command supabase
require_value TARGET_PROJECT_REF

note "Deploying Edge Functions to the destination"
while IFS= read -r entry; do
  name="$(basename "$(dirname "$entry")")"
  [[ "$name" == "_shared" ]] && continue
  note "Deploying $name"
  supabase functions deploy "$name" --project-ref "$TARGET_PROJECT_REF"
done < <(find "$ROOT_DIR/supabase/functions" -mindepth 2 -maxdepth 2 -name index.ts -print | sort)

note "Function deployment completed"
