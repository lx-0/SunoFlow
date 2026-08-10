#!/usr/bin/env bash
#
# Archive the iOS app and upload it to App Store Connect for TestFlight.
#
#   pnpm testflight
#
# Prerequisites (both one-time, see README "TestFlight"):
#   1. The app record exists in App Store Connect for app.sunoflow.mobile.
#   2. An App Store Connect API key (.p8) is downloaded and apps/mobile/.env carries
#      ASC_KEY_ID and ASC_ISSUER_ID (copy .env.example). Optional: ASC_KEY_PATH.
#
# Signing certificate and App Store provisioning profile are created on demand
# via -allowProvisioningUpdates; nothing has to be prepared in the portal.

set -euo pipefail

cd "$(dirname "$0")/.."

# Config comes from apps/mobile/.env (+ .env.local override), the same files Expo
# reads for EXPO_PUBLIC_* — both are gitignored repo-wide. An already-exported shell
# variable still wins, so a one-off `ASC_KEY_ID=… pnpm testflight` keeps working.
_shell_key_id="${ASC_KEY_ID:-}"
_shell_issuer_id="${ASC_ISSUER_ID:-}"
_shell_key_path="${ASC_KEY_PATH:-}"

for _envfile in .env .env.local; do
  if [ -f "$_envfile" ]; then
    set -a
    # shellcheck disable=SC1090
    . "./$_envfile"
    set +a
  fi
done

if [ -n "$_shell_key_id" ]; then ASC_KEY_ID="$_shell_key_id"; fi
if [ -n "$_shell_issuer_id" ]; then ASC_ISSUER_ID="$_shell_issuer_id"; fi
if [ -n "$_shell_key_path" ]; then ASC_KEY_PATH="$_shell_key_path"; fi

: "${ASC_KEY_ID:?ASC_KEY_ID is not set — copy .env.example to .env and fill it in}"
: "${ASC_ISSUER_ID:?ASC_ISSUER_ID is not set — copy .env.example to .env and fill it in}"

# Project-local key first (certs/ is gitignored), then the directory Xcode itself uses.
if [ -z "${ASC_KEY_PATH:-}" ]; then
  if [ -f "certs/AuthKey_${ASC_KEY_ID}.p8" ]; then
    ASC_KEY_PATH="certs/AuthKey_${ASC_KEY_ID}.p8"
  else
    ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  fi
fi

if [ ! -f "$ASC_KEY_PATH" ]; then
  echo "error: App Store Connect key not found at $ASC_KEY_PATH" >&2
  echo "       Download AuthKey_${ASC_KEY_ID}.p8 from App Store Connect (it is offered exactly once)" >&2
  echo "       and put it in apps/mobile/certs/, or point ASC_KEY_PATH at it." >&2
  exit 1
fi

AUTH=(
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
)

# Timestamped so previous archives stay available for symbolication and re-upload.
ARCHIVE="build/SunoFlow-$(date +%Y%m%d-%H%M%S).xcarchive"
mkdir -p build

echo "› Archiving to $ARCHIVE"
xcodebuild archive \
  -workspace ios/SunoFlow.xcworkspace \
  -scheme SunoFlow \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  "${AUTH[@]}" \
  COMPILER_INDEX_STORE_ENABLE=NO

echo "› Uploading to App Store Connect"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist testflight/ExportOptions.plist \
  -exportPath "${ARCHIVE%.xcarchive}-export" \
  -allowProvisioningUpdates \
  "${AUTH[@]}"

echo
echo "✓ Uploaded. App Store Connect processes the build for a few minutes;"
echo "  it then appears under TestFlight and installs on the phone via the TestFlight app."
