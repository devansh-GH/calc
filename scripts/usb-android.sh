#!/usr/bin/env bash
# USB-debugging helper for testing this Expo project on a physical Android device with Expo Go.
# Usage:
#   ./scripts/usb-android.sh          # set up adb reverse only (start server separately with `bun run start`)
#   ./scripts/usb-android.sh --start  # set up adb reverse, then start the dev server (bunx expo start)
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Usage: $(basename "$0") [--start] [--help]"
  echo ""
  echo "  (no args)  Verify adb + device, run 'adb reverse tcp:8081 tcp:8081'."
  echo "  --start    Same as above, then exec 'bunx expo start' from the project root."
  echo "  --help     Show this help."
}

# Resolve adb: prefer PATH, then standard SDK locations (incl. user-space install).
resolve_adb() {
  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return 0
  fi
  for dir in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Android/Sdk" "$HOME/Android"; do
    if [ -n "$dir" ] && [ -x "$dir/platform-tools/adb" ]; then
      echo "$dir/platform-tools/adb"
      return 0
    fi
  done
  return 1
}

ADB="$(resolve_adb || true)"

START_SERVER=0
for arg in "$@"; do
  case "$arg" in
    --start) START_SERVER=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

# (a) Verify adb exists.
if [ -z "$ADB" ]; then
  echo "ERROR: 'adb' not found on PATH." >&2
  echo "" >&2
  echo "Install it with one of:" >&2
  echo "  Debian/Ubuntu:  sudo apt install adb" >&2
  echo "  Or install Android Studio (includes platform-tools), then add it to PATH:" >&2
  echo "    export ANDROID_HOME=\"\$HOME/Android/Sdk\"" >&2
  echo "    export PATH=\"\$PATH:\$ANDROID_HOME/platform-tools\"" >&2
  echo "" >&2
  echo "Then reconnect your phone with USB debugging enabled and re-run this script." >&2
  exit 1
fi
echo "Found adb: $ADB ($("$ADB" version 2>&1 | head -n 1))"

# (b) Wait for a device, then require exactly one 'device' entry.
echo "Waiting for an Android device (plug in phone, enable USB debugging, accept the RSA prompt)..."
"$ADB" wait-for-device

# Count lines in 'adb devices' output whose second column is exactly 'device'.
DEVICE_COUNT="$("$ADB" devices | awk 'NR>1 && $2=="device" {c++} END {print c+0}')"
RAW_LIST="$("$ADB" devices)"

if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "ERROR: No authorized device found." >&2
  echo "" >&2
  echo "$RAW_LIST" >&2
  echo "" >&2
  echo "Fix checklist:" >&2
  echo "  1. On the phone: Settings > About phone > tap 'Build number' 7x to enable Developer options." >&2
  echo "  2. In Developer options: enable 'USB debugging'." >&2
  echo "  3. Replug USB, set USB mode to File Transfer / PTP (not 'Charging only')." >&2
  echo "  4. Accept the 'Allow USB debugging?' RSA fingerprint prompt on the phone." >&2
  echo "  5. If the device shows as 'unauthorized', run 'adb kill-server && adb start-server' (or with the full path shown above) and try again." >&2
  exit 1
fi

if [ "$DEVICE_COUNT" -gt 1 ]; then
  echo "ERROR: Found $DEVICE_COUNT connected devices; this script expects exactly one." >&2
  echo "" >&2
  echo "$RAW_LIST" >&2
  echo "" >&2
  echo "Disconnect the extra device(s)/emulator(s) (or target one explicitly with 'adb -s <serial> reverse ...'), then re-run." >&2
  exit 1
fi

SERIAL="$("$ADB" devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
echo "Device ready: $SERIAL"

# (c) Reverse-port so Expo Go on the phone reaches the laptop Metro server over USB.
"$ADB" reverse tcp:8081 tcp:8081
echo "Ran: adb reverse tcp:8081 tcp:8081"
echo "Verified reverse list:"
"$ADB" reverse --list

# (d) Next steps.
echo ""
echo "Done. Expo Go on the phone can now reach Metro at localhost:8081 over USB,"
echo "even when Wi-Fi / auto-discovery fails."
echo ""
echo "Next steps:"
echo "  1. Start the server:  bun run start"
echo "  2. Open Expo Go on the phone."
echo "  3. If auto-discovery fails, enter the URL manually:  exp://localhost:8081"
echo ""

# (e) Optionally start the dev server.
if [ "$START_SERVER" -eq 1 ]; then
  echo "Starting dev server (bunx expo start --localhost --go) from $PROJECT_ROOT ..."
  cd "$PROJECT_ROOT"
  exec bunx expo start --localhost --go
  # adb reverse tcp:8081 tcp:8081
fi
