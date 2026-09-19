#!/bin/zsh
# Double-click this file in Finder to start writing.
# It starts the local server, opens the editor, and stops when you close the window.

cd "$(dirname "$0")/.."

PORT=8080
# -iTCP without a host matches both IPv4 and IPv6 listeners
while lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
	PORT=$((PORT + 1))
done

PORT=$PORT node plog/serve.js &
SERVER=$!

# stop the server when this window closes / ctrl-c
trap "kill $SERVER 2>/dev/null" EXIT INT TERM

sleep 1
open "http://localhost:$PORT/plog/write.html"

echo ""
echo "Editor open at http://localhost:$PORT/plog/write.html"
echo "Close this window (or ctrl-c) when you're done."
echo ""

wait $SERVER
