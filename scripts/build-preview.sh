#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/build/icqram.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$ROOT/work/swift-module-cache"
xcrun swiftc "$ROOT/desktop/Preview.swift" -o "$APP/Contents/MacOS/icqramPreview" \
  -module-cache-path "$ROOT/work/swift-module-cache" -framework Cocoa -framework WebKit
python3 "$ROOT/scripts/build-icons.py"
node "$ROOT/scripts/package-ui.mjs"
cp -R "$ROOT/build/ui/." "$APP/Contents/Resources/"
cp "$ROOT/build/icqram.icns" "$APP/Contents/Resources/"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>icqramPreview</string>
<key>CFBundleIdentifier</key><string>local.icqram.preview</string>
<key>CFBundleName</key><string>IBQgram</string>
<key>CFBundleDisplayName</key><string>IBQgram</string>
<key>CFBundleIconFile</key><string>icqram.icns</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST
codesign --force --sign - "$APP"
printf 'Built: %s\n' "$APP"
