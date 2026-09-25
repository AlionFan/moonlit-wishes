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

# Compose changes can replace the serving container. Keep routine site releases
# on the existing container and handle infrastructure changes as a separate rollout.
if ! cmp -s "$staging/compose.yaml" "$base/compose.yaml" || ! cmp -s "$staging/compose.routing.yaml" "$base/compose.routing.yaml"; then
  echo "Compose configuration changed; refusing to recreate production services during a site release." >&2
  exit 1
fi

mkdir -p "$base/analytics" "$base/data"
chmod 700 "$base/data"
analytics_changed=0
if ! cmp -s "$staging/server.py" "$base/analytics/server.py"; then
  analytics_changed=1
fi
if [ ! -f "$base/analytics.env" ]; then
  python3 - <<'PY' > "$base/analytics.env"
import secrets
print('MOONLIT_STATS_TOKEN=' + secrets.token_urlsafe(32))
PY
  chmod 600 "$base/analytics.env"
fi

nginx_changed=0
if ! cmp -s "$staging/nginx.conf" "$base/nginx.conf"; then
  cp "$base/nginx.conf" "$base/nginx.conf.previous"
  install -m 644 "$staging/nginx.conf" "$base/nginx.conf"
  if ! docker exec joybeat-mid-autumn nginx -t; then
    install -m 644 "$base/nginx.conf.previous" "$base/nginx.conf"
    rm -f "$base/nginx.conf.previous"
    echo "New Nginx configuration failed validation; the active release was not changed." >&2
    exit 1
  fi
  nginx_changed=1
fi

if [ "$analytics_changed" = 1 ]; then
  install -m 644 "$staging/server.py" "$base/analytics/server.py"
fi

previous=""
if [ -L "$base/current" ]; then
  previous=$(readlink "$base/current")
  printf '%s\n' "$previous" > "$base/previous-release"
fi
ln -s "releases/$release" "$base/current-next"
mv -Tf "$base/current-next" "$base/current"

if [ "$nginx_changed" = 1 ]; then
  if ! docker exec joybeat-mid-autumn nginx -s reload; then
    if [ -n "$previous" ]; then
      ln -s "$previous" "$base/current-rollback"
      mv -Tf "$base/current-rollback" "$base/current"
    fi
    install -m 644 "$base/nginx.conf.previous" "$base/nginx.conf"
    docker exec joybeat-mid-autumn nginx -s reload || true
    rm -f "$base/nginx.conf.previous"
    echo "Nginx reload failed; restored the previous release and configuration." >&2
    exit 1
  fi
fi
if ! docker exec joybeat-mid-autumn wget -qO- http://127.0.0.1/healthz >/dev/null || ! docker exec joybeat-mid-autumn wget -q --spider http://127.0.0.1/; then
  if [ -n "$previous" ]; then
    ln -s "$previous" "$base/current-rollback"
    mv -Tf "$base/current-rollback" "$base/current"
  fi
  if [ "$nginx_changed" = 1 ]; then
    install -m 644 "$base/nginx.conf.previous" "$base/nginx.conf"
    docker exec joybeat-mid-autumn nginx -s reload
    rm -f "$base/nginx.conf.previous"
  fi
  echo "New release failed the serving-container health check; traffic was rolled back." >&2
  exit 1
fi

# Updating analytics is independent from serving the static site. Only recreate
# that API when its code changed; never recreate the web container for content.
if [ "$analytics_changed" = 1 ]; then
  if [ -f "$base/site.env" ]; then
    docker compose --env-file "$base/site.env" -f "$base/compose.yaml" -f "$base/compose.routing.yaml" up -d --no-deps analytics
  else
    docker compose -f "$base/compose.yaml" up -d --no-deps analytics
  fi
  for attempt in $(seq 1 30); do
    status=$(docker inspect --format '{{.State.Health.Status}}' joybeat-mid-autumn-analytics 2>/dev/null || true)
    [ "$status" = healthy ] && break
    sleep 2
  done
  if [ "${status:-}" != healthy ]; then
    echo "Analytics did not become healthy. The static site remains on release $release." >&2
    exit 1
  fi
fi

rm -f "$base/nginx.conf.previous"
printf 'Release deployed: %s\n' "$release"
REMOTE
printf '%s\n' "$MOONLIT_RELEASE" > artifacts/latest-joybeat-release
