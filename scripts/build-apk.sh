#!/usr/bin/env bash
# Aik app (customer ya rider) ki Android APK banata hai: Capacitor + Android SDK (GitHub Actions par)
set -euo pipefail
APP="$1"
ROOT="$(pwd)"
if [ "$APP" = "customer" ]; then ID="pk.kotmomin.express"; NAME="Kot Momin Express"; SRC="$ROOT/web/customer-app"; BG="#0B7A4B"
elif [ "$APP" = "rider" ]; then ID="pk.kotmomin.express.rider"; NAME="KM Rider"; SRC="$ROOT/web/rider-app"; BG="#C2410C"
else ID="pk.kotmomin.express.admin"; NAME="KM Admin"; SRC="$ROOT/web/admin-web"; BG="#0E1A14"; fi
W="$ROOT/build/$APP"
rm -rf "$W"; mkdir -p "$W"; cd "$W"

cat > package.json <<JSON
{ "name": "kmx-$APP", "private": true, "version": "1.0.0",
  "dependencies": { "@capacitor/core": "6.2.0", "@capacitor/android": "6.2.0" },
  "devDependencies": { "@capacitor/cli": "6.2.0", "@capacitor/assets": "3.0.5" } }
JSON
npm install --no-audit --no-fund

mkdir -p www
cp -r "$SRC"/. www/
rm -f www/README.md

cat > capacitor.config.json <<JSON
{ "appId": "$ID", "appName": "$NAME", "webDir": "www",
  "server": { "androidScheme": "https" },
  "android": { "allowMixedContent": false, "backgroundColor": "#0E1A14" } }
JSON

npx cap add android

# Location, mic aur camera ki ijazat
MAN=android/app/src/main/AndroidManifest.xml
PERMS='    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.microphone" android:required="false" />'
sed -i "s#</manifest>#${PERMS}\n</manifest>#" "$MAN"
grep -c "RECORD_AUDIO" "$MAN"

# App icon
mkdir -p assets
cp "$ROOT/icons/$APP-1024.png" assets/logo.png
cp "$ROOT/icons/$APP-1024.png" assets/logo-dark.png
npx capacitor-assets generate --android --iconBackgroundColor "$BG" --iconBackgroundColorDark "$BG" --splashBackgroundColor "#0E1A14" --splashBackgroundColorDark "#0E1A14" || echo "WARNING: icon generation skipped"

npx cap sync android

# Hamesha aik hi key se sign (taake naya version purane ke upar install ho)
mkdir -p ~/.android
cp "$ROOT/keys/kmx.keystore" ~/.android/debug.keystore

cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon --stacktrace
mkdir -p "$ROOT/out"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/out/KotMomin-$APP.apk"
ls -la "$ROOT/out"
