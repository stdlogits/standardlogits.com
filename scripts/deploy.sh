#!/usr/bin/env bash
# Deploy standardlogits.com to Cloudflare Pages (project standardlogits, production branch main): build
# from a clean, pushed HEAD, upload dist with Wrangler, then verify the live site against that build.
#
#   scripts/deploy.sh                        check, build, upload, verify https://standardlogits.com
#   scripts/deploy.sh --dry-run              check and build only (an unpushed tree only warns)
#   scripts/deploy.sh --origin https://…     verify another origin (a pages.dev preview, say)
#
# The site lives in a9's own Cloudflare account, as neuron-lens.com does. Before the first deploy, in
# that account: create the Pages project (`wrangler pages project create standardlogits
# --production-branch main`, or Workers & Pages in the dashboard) and attach standardlogits.com to it as
# a custom domain. The CSP allows Cloudflare Web Analytics' beacon (static.cloudflareinsights.com,
# reporting to cloudflareinsights.com), should it be turned on; leave Rocket Loader and email
# obfuscation off, since they add inline scripts the CSP blocks.
#
# Which account: CLOUDFLARE_ACCOUNT_ID, from the environment or from
# ~/.config/cloudflare/standardlogits.env (outside the repo; STANDARDLOGITS_DEPLOY_ENV names another
# file). It is required, because the Cloudflare user this machine is logged in as also reaches the
# account that hosts drowse.ai: every Wrangler call here is pinned to that one ID. How to sign in: with
# CLOUDFLARE_API_TOKEN (Account > Cloudflare Pages > Edit) Wrangler runs on that token alone, with an
# empty home; without one it uses this machine's `wrangler login`. Either way no other credential
# variable reaches it.

set -euo pipefail
cd "$(dirname "$0")/.."

dry_run=0
origin=https://standardlogits.com
while (($#)); do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --origin) origin=${2:?--origin needs a URL}; shift ;;
    --origin=*) origin=${1#--origin=} ;;
    *) echo "deploy: unknown argument $1" >&2; exit 2 ;;
  esac
  shift
done

config=${STANDARDLOGITS_DEPLOY_ENV:-$HOME/.config/cloudflare/standardlogits.env}
if [[ -f "$config" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$config"
  set +a
fi
if [[ "$dry_run" == 0 && ! "${CLOUDFLARE_ACCOUNT_ID:-}" =~ ^[0-9a-f]{32}$ ]]; then
  echo "deploy: set CLOUDFLARE_ACCOUNT_ID to a9's account (in $config or the environment; see the top of this script)" >&2
  exit 1
fi

# The upload records HEAD as its commit, so HEAD must be committed and on origin/main. A dry run
# only warns.
refuse() {
  if [[ "$dry_run" == 1 ]]; then echo "deploy (dry run): $1" >&2; else echo "deploy: $1" >&2; exit 1; fi
}
[[ -z "$(git status --porcelain)" ]] || refuse 'commit or stash your changes first; the deploy records HEAD'
if ! git fetch --quiet origin main 2>/dev/null || ! git merge-base --is-ancestor HEAD origin/main; then
  refuse 'push HEAD to origin/main first'
fi
rev=$(git rev-parse HEAD)

npm ci
npm run check
npm run build
[[ -f dist/index.html && -f dist/404.html ]] || { echo 'deploy: the build made no dist/index.html or dist/404.html' >&2; exit 1; }
grep -q '@treetowntree' dist/index.html || { echo 'deploy: dist/index.html is not prerendered' >&2; exit 1; }
echo "deploy: dist has $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"

[[ "$dry_run" == 1 ]] && exit 0

# Wrangler sees nothing else from this shell: no stray credential variable (it also honours
# CF_API_KEY/CF_EMAIL and prefers a global key to a token), and an empty .env in place of any in the
# repo. With a token it also gets an empty home, so no saved login either.
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
: > "$scratch/empty.env"
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  auth=(HOME="$scratch" XDG_CONFIG_HOME="$scratch/config" CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN")
  echo "deploy: signing in with CLOUDFLARE_API_TOKEN"
else
  auth=(HOME="$HOME")
  echo "deploy: signing in with this machine's wrangler login"
fi
env -i PATH="$PATH" TMPDIR="${TMPDIR:-/tmp}" LANG="${LANG:-en_US.UTF-8}" WRANGLER_SEND_METRICS=false \
  CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" "${auth[@]}" \
  ./node_modules/.bin/wrangler pages deploy dist --env-file "$scratch/empty.env" --project-name standardlogits --branch main \
  --commit-hash "$rev" --commit-message "$(git log -1 --format=%s)" --commit-dirty=false

node scripts/verify-deployment.mjs "$origin" --build dist
