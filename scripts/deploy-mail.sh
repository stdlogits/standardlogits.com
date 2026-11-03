#!/usr/bin/env bash
# Deploy the catch-all's Email Worker (mail/) to a9's Cloudflare account, pinned to
# CLOUDFLARE_ACCOUNT_ID as scripts/deploy.sh is (same env file, same sign-in). The catch-all rule in
# standardlogits.com's Email Routing sends to the Worker standardlogits-mail; deploying replaces its code
# and leaves the rule alone.

set -euo pipefail
cd "$(dirname "$0")/.."

config=${STANDARDLOGITS_DEPLOY_ENV:-$HOME/.config/cloudflare/standardlogits.env}
if [[ -f "$config" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$config"
  set +a
fi
if [[ ! "${CLOUDFLARE_ACCOUNT_ID:-}" =~ ^[0-9a-f]{32}$ ]]; then
  echo "deploy-mail: set CLOUDFLARE_ACCOUNT_ID to a9's account (in $config or the environment)" >&2
  exit 1
fi

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
: > "$scratch/empty.env"
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  auth=(HOME="$scratch" XDG_CONFIG_HOME="$scratch/config" CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN")
else
  auth=(HOME="$HOME")
fi
env -i PATH="$PATH" TMPDIR="${TMPDIR:-/tmp}" LANG="${LANG:-en_US.UTF-8}" WRANGLER_SEND_METRICS=false \
  CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" "${auth[@]}" \
  ./node_modules/.bin/wrangler deploy --config mail/wrangler.jsonc --env-file "$scratch/empty.env"
