#!/bin/sh
# Termux Android Quick-Launcher for FireMap
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "================================================="
echo " 🔥 Starting FireMap on Termux (Android)"
echo "================================================="

# Check runtime (Node.js or Bun)
if command -v bun >/dev/null 2>&1; then
  RUNNER="bun"
elif command -v node >/dev/null 2>&1; then
  RUNNER="node"
else
  echo "⚠️ Node.js is not installed."
  echo "👉 Run: pkg update && pkg install nodejs-lts"
  exit 1
fi

echo "✓ Runtime detected: $RUNNER"

# Check dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  if [ "$RUNNER" = "bun" ]; then
    bun install
  else
    npm install
  fi
fi

# Set host to localhost by default
export HOST="localhost"

# Optionally trigger opening browser on Android once server is up
if command -v termux-open-url >/dev/null 2>&1; then
  (sleep 2 && termux-open-url http://localhost:3000) &
elif command -v am >/dev/null 2>&1; then
  (sleep 2 && am start -a android.intent.action.VIEW -d http://localhost:3000 >/dev/null 2>&1) &
fi

echo "🚀 Launching FireMap on http://localhost:3000 ..."
echo "🌐 Open your Android browser (Chrome/Firefox) to: http://localhost:3000"
echo "================================================="

if [ "$RUNNER" = "bun" ]; then
  bun run dev
else
  npm run dev
fi
