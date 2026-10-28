#!/usr/bin/env bash
# Aik app (customer, rider ya admin) ki Android APK banata hai (GitHub Actions par).
# APK ab sirf aik "launcher" hai jo LIVE website kholta hai: website update hote hi sab phones par app khud update.
# APK dobara sirf tab banani parti hai jab icon, naam, ijazatein ya launcher badle.
set -euo pipefail
APP="$1"
ROOT="$(pwd)"
LIVE_BASE="$(tr -d ' \r\n' < "$ROOT/scripts/live-base.txt")"
CFG_URL="https://raw.githubusercontent.com/${GITHUB_REPOSITORY:-aljannatstore83-cloud/kot-momin-express}/main/live.json"
case "$APP" in
  customer) ID="pk.kotmomin.express"; NAME="Kot Momin Express"; DIR="customer-app"; BG="#0B7A4B";;
  rider)    ID="pk.kotmomin.express.rider"; NAME="KM Rider"; DIR="rider-app"; BG="#C2410C";;
  *)        ID="pk.kotmomin.express.admin"; NAME="KM Admin"; DIR="admin-web"; BG="#0E1A14";;
esac
VC=$((100 + ${GITHUB_RUN_NUMBER:-1}))
W="$ROOT/build/$APP"
rm -rf "$W"; mkdir -p "$W"; cd "$W"

cat > package.json <<JSON
{ "name": "kmx-$APP", "private": true, "version": "2.0.0",
  "dependencies": { "@capacitor/core": "6.2.0", "@capacitor/android": "6.2.0" },
  "devDependencies": { "@capacitor/cli": "6.2.0", "@capacitor/assets": "3.0.5" } }
JSON
npm install --no-audit --no-fund

# Launcher (live website kholne wala chhota page)
mkdir -p www
sed -e "s#__APP__#$APP#g" -e "s#__NAME__#$NAME#g" -e "s#__URL__#${LIVE_BASE}${DIR}/#g" -e "s#__CFG__#$CFG_URL#g" "$ROOT/scripts/launcher.html" > www/index.html
cp "$ROOT/web/$DIR/icon-192.png" www/icon.png
grep -c "location.replace" www/index.html

# allowNavigation: live website app ke andar hi khule (bahar browser mein nahi). "KMXApp" se website pehchanti hai ke yeh APK hai.
cat > capacitor.config.json <<JSON
{ "appId": "$ID", "appName": "$NAME", "webDir": "www",
  "appendUserAgent": "KMXApp/2",
  "server": { "androidScheme": "https", "allowNavigation": ["*.netlify.app", "*.pages.dev", "*.web.app", "*.firebaseapp.com"] },
  "android": { "allowMixedContent": false, "backgroundColor": "#0E1A14" } }
JSON

npx cap add android

# Har nayi APK ka version number bara (purani ke upar update ho jaye)
GRADLE=android/app/build.gradle
sed -i -E "s/versionCode [0-9]+/versionCode $VC/; s/versionName \"[^\"]*\"/versionName \"2.$VC\"/" "$GRADLE"
grep -E "versionCode|versionName" "$GRADLE"

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
