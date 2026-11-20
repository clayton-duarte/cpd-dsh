#!/usr/bin/env bash
# Inspect the actual disk image without launching the application.
set -euo pipefail

if [[ $# != 1 || ! -f $1 || $1 != *.dmg ]]; then
  echo "Usage: bash verify-cpd-macos-preview.sh <path-to-preview.dmg>" >&2
  exit 1
fi
root=$(cd "$(dirname "$0")/../../.." && pwd)
dmg=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
hdiutil verify "$dmg"

mount=$(mktemp -d "${TMPDIR:-/tmp}/cpd-dmg.XXXXXX")
mounted=false
cleanup() {
  if [[ $mounted == true ]]; then hdiutil detach "$mount" || exit 1; fi
  rmdir "$mount"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
hdiutil attach -readonly -nobrowse -noautoopen -mountpoint "$mount" "$dmg"
mounted=true

contents="$mount/CPD.app/Contents"
plist="$contents/Info.plist"
assert_equal() {
  if [[ $1 != "$2" ]]; then
    printf 'CPD preview: expected %s to be %s, got %s\n' "$3" "$2" "$1" >&2
    exit 1
  fi
}
assert_equal "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$plist")" com.clayton-duarte.cpd "bundle identifier"
assert_equal "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$plist")" CPD "executable name"
assert_equal "$(lipo -archs "$contents/MacOS/CPD")" arm64 "executable architecture"
test -r "$contents/Resources/app.asar"
test ! -e "$contents/Resources/app-update.yml"
cmp "$root/LICENSE" "$contents/Resources/LICENSE"
cmp "$root/THIRD_PARTY_NOTICES.md" "$contents/Resources/THIRD_PARTY_NOTICES.md"
signature=$(codesign -d --verbose=4 "$mount/CPD.app" 2>&1)
grep -qx 'Signature=adhoc' <<< "$signature"
codesign --verify --strict "$mount/CPD.app"
