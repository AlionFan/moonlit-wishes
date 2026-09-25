#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
MOONLIT_RELEASE="$(date -u +%Y%m%dT%H%M%SZ)"
MOONLIT_STAGING="/home/ubuntu/mid-autumn-upload-${MOONLIT_RELEASE}"
MOONLIT_ARCHIVE="artifacts/joybeat-${MOONLIT_RELEASE}.tar.gz"
mkdir -p artifacts
COPYFILE_DISABLE=1 tar -czf "$MOONLIT_ARCHIVE" -C dist .
ssh -o BatchMode=yes joybeat "mkdir -p '$MOONLIT_STAGING'"
scp -q "$MOONLIT_ARCHIVE" deploy/joybeat/nginx.conf deploy/joybeat/compose.yaml deploy/joybeat/compose.routing.yaml analytics/server.py "joybeat:$MOONLIT_STAGING/"
ssh -o BatchMode=yes joybeat "sudo -n bash -s -- '$MOONLIT_RELEASE' '$MOONLIT_STAGING'" <<'REMOTE'
set -euo pipefail
release="$1"
staging="$2"
base=/srv/apps/mid-autumn
mkdir -p "$base/releases/$release"
tar -xzf "$staging/joybeat-$release.tar.gz" -C "$base/releases/$release"
chmod -R a+rX "$base/releases/$release"
[ -f "$base/releases/$release/index.html" ]
[ -f "$base/releases/$release/audio/rest-now.mp3" ]
[ -f "$base/releases/$release/fonts/ma-shan-zheng.woff2" ]
install -m 644 "$staging/nginx.conf" "$base/nginx.conf"
install -m 644 "$staging/compose.yaml" "$base/compose.yaml"
install -m 644 "$staging/compose.routing.yaml" "$base/compose.routing.yaml"
mkdir -p "$base/analytics" "$base/data"
chmod 700 "$base/data"
install -m 644 "$staging/server.py" "$base/analytics/server.py"
if [ ! -f "$base/analytics.env" ]; then
  python3 - <<'PY' > "$base/analytics.env"
import secrets
print('MOONLIT_STATS_TOKEN=' + secrets.token_urlsafe(32))
PY
  chmod 600 "$base/analytics.env"
fi
if [ -L "$base/current" ]; then readlink "$base/current" > "$base/previous-release"; fi
ln -s "releases/$release" "$base/current-next"
mv -Tf "$base/current-next" "$base/current"
if [ -f "$base/site.env" ]; then
  docker compose --env-file "$base/site.env" -f "$base/compose.yaml" -f "$base/compose.routing.yaml" up -d --force-recreate
else
  docker compose -f "$base/compose.yaml" up -d --force-recreate
fi
docker exec joybeat-mid-autumn nginx -t
docker exec joybeat-mid-autumn nginx -s reload
docker exec joybeat-mid-autumn wget -qO- http://127.0.0.1/healthz
printf 'Release deployed: %s\n' "$release"
REMOTE
printf '%s\n' "$MOONLIT_RELEASE" > artifacts/latest-joybeat-release
