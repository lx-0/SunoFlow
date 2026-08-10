#!/usr/bin/env bash
#
# Archive the iOS app and upload it to App Store Connect for TestFlight.
#
#   pnpm testflight
#
# Prerequisites (both one-time, see README "TestFlight"):
#   1. The app record exists in App Store Connect for app.sunoflow.mobile.
#   2. An App Store Connect API key (.p8) is downloaded and these are exported:
#        ASC_KEY_ID     the key's Key ID
#        ASC_ISSUER_ID  the team's Issuer ID
#        ASC_KEY_PATH   optional, defaults to the location Xcode also looks in
#
# Signing certificate and App Store provisioning profile are created on demand
# via -allowProvisioningUpdates; nothing has to be prepared in the portal.

set -euo pipefail

cd "$(dirname "$0")/.."

: "${ASC_KEY_ID:?ASC_KEY_ID is not set — see the TestFlight section in README.md}"
: "${ASC_ISSUER_ID:?ASC_ISSUER_ID is not set — see the TestFlight section in README.md}"
ASC_KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"

if [ ! -f "$ASC_KEY_PATH" ]; then
  echo "error: App Store Connect key not found at $ASC_KEY_PATH" >&2
  echo "       Download AuthKey_${ASC_KEY_ID}.p8 from App Store Connect (it is offered exactly once)" >&2
  echo "       and place it there, or point ASC_KEY_PATH at it." >&2
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
