#!/usr/bin/env bash
# Start the fake GitHub API server for a suite case and wait until it is ready.
#
# Usage:
#   scripts/start-fake-api.sh <port> <out_dir> <login> <id> <env_var> [ready_path]
#
# Starts scripts/fake-github-api.mjs in the background (logging to
# <out_dir>/server.log, pid to <out_dir>/server.pid), then polls
# http://127.0.0.1:<port><ready_path> (default /__ready) for up to ~30s,
# breaking as soon as it responds. On success, appends
# <env_var>=http://127.0.0.1:<port> to $GITHUB_ENV.
#
# Fails fast (exit 1, dumping server.log) if the server process dies during
# startup, and fails on timeout if it never becomes ready — so a genuine crash
# is diagnosable instead of a bare "connection refused".
set -euo pipefail

if [ "$#" -lt 5 ]; then
  echo "usage: start-fake-api.sh <port> <out_dir> <login> <id> <env_var> [ready_path]" >&2
  exit 2
fi

port="$1"
out_dir="$2"
login="$3"
id="$4"
env_var="$5"
ready_path="${6:-/__ready}"
base="http://127.0.0.1:${port}"

mkdir -p "$out_dir"
nohup node scripts/fake-github-api.mjs "$port" "$out_dir" "$login" "$id" \
  > "$out_dir/server.log" 2>&1 &
pid=$!
echo "$pid" > "$out_dir/server.pid"

dump_log() {
  echo "----- $out_dir/server.log -----" >&2
  cat "$out_dir/server.log" >&2 2>/dev/null || true
}

for _ in {1..60}; do
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "fake-api server (pid $pid) exited during startup at ${base}" >&2
    dump_log
    exit 1
  fi
  if curl -fsS "${base}${ready_path}" >/dev/null 2>&1; then
    echo "${env_var}=${base}" >> "$GITHUB_ENV"
    exit 0
  fi
  sleep 0.5
done

echo "fake-api server did not become ready at ${base}${ready_path} within ~30s" >&2
dump_log
exit 1
