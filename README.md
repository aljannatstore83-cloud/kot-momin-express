# Kot Momin Express

Kot Momin (Punjab) ki delivery service: customer app, rider app aur admin panel.

- `web/`: live website (Netlify isi folder ko chalata hai). Yahan update = sab phones par update
- `web/customer-app`, `web/rider-app`, `web/admin-web`: teeno apps
- `live.json`: Android apps yahan se dekhti hain ke live website kahan hai
- `scripts/launcher.html` + `scripts/build-apk.sh`: Android APK (chhota launcher jo live website kholta hai)
- `tests/screens.py`: `preview` branch par asli internet ke saath screenshots (`test-shots` branch)
- `firestore.rules`: Firebase database ke rules

APK sirf tab dobara banti hai jab launcher, icon ya build script badle (Actions > "Build Android APKs").
Bani hui APK files `apk-builds` branch par hoti hain.
