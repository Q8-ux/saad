#!/bin/sh
set -eu
: "${STUDIO_API_TOKEN:?Set a private STUDIO_API_TOKEN before starting}"
mkdir -p /data/models /data/profiles /data/generations /data/cache /data/captures
if [ "$(id -u)" = "0" ]; then
  chown voicebox:voicebox /data /data/models /data/profiles /data/generations /data/cache /data/captures
  exec gosu voicebox uvicorn "${STUDIO_APP:-runtime:app}" --host 0.0.0.0 --port "${PORT:-8080}" --no-access-log
fi
exec uvicorn "${STUDIO_APP:-runtime:app}" --host 0.0.0.0 --port "${PORT:-8080}" --no-access-log
