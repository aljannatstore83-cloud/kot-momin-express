# Kot Momin Express — Project Handoff (for any AI or developer)

> **Roman Urdu note (owner ke liye):** Yeh file kisi bhi AI (ChatGPT, Gemini, Claude waghera) ya developer ko dein. Is mein app ka poora haal hai: kya bana, kahan rakha hai, kaise chalta hai, kya baqi hai. Saath mein GitHub repo ka link dein: https://github.com/aljannatstore83-cloud/kot-momin-express

Last updated: 28 October 2026. Planned public launch: 29 October 2026.

---

## 1. What this is

A delivery service for **Kot Momin** (small city, Sargodha District, Punjab, Pakistan). A customer says what they need (grocery, food, medicine, fruit/peanuts from a street cart "rehri", mobile items, parcels). A rider buys it from a shop in the city and delivers it. **Payment: cash on delivery.**

- Owner: runs Al-Jannat Mobiles & Computers, Chanab Bazar near Rehmat Market, Kot Momin. Support phone/WhatsApp: 0345-7792869.
- Owner is a **beginner with technology**: no command line, no installing Python/Node. Explain in simple **Roman Urdu**, give click-by-click steps.
- Three apps: **Customer**, **Rider**, **Admin** (owner). English + Urdu (RTL) in customer and rider apps; admin is English.

## 2. Where everything lives

| Thing | Where |
|---|---|
| Code (source + built site + APK build) | GitHub: `aljannatstore83-cloud/kot-momin-express` (public repo) |
| Live website (all 3 apps) | Netlify: https://spontaneous-lamington-c5c48f.netlify.app (`/customer-app/`, `/rider-app/`, `/admin-web/`, `/privacy.html`) |
| Database | Firebase project `kot-momin-express` (Firestore, Spark/free plan) |
| Android APKs | Built by GitHub Actions, saved on branch `apk-builds`; customer + rider APK also on the site under `/download/` |
| Demo (sample data, no real database) | `web/demo.html` |

**Netlify status:** the site was deployed by **drag-and-drop zip** (not yet linked to GitHub). To update: either link the Netlify project to the GitHub repo (Project configuration > Developer settings > Continuous deployment > Repository > Link repository; `netlify.toml` sets publish dir `web`), or upload a zip of the `web/` folder in Netlify > Deploys. Netlify free plan is credit-based (~300 credits/month, ~15 per production deploy) — batch changes.

### Repo layout
```
src/            SOURCE (edit here): index.html (customer), rider.html, admin.html,
                util.js, db.js, kyc.js, i18n.js (EN/UR texts), chat.js, dialog.js,
                app.css, config.js (Firebase config + defaults), sw.js, site-index.html,
                privacy.html, firestore.rules, README.md (owner guide, Roman Urdu)
tools/          build_apps.py (src -> build/web: bundles each app with esbuild to ES2015
                IIFE app.js + config.js), bundle.mjs, build_preview.py (demo hub),
                es2015check.cjs
web/            BUILT website that Netlify serves (+ web/download/*.apk, web/demo.html)
scripts/        build-apk.sh + launcher.html + live-base.txt (Android APK = launcher)
tests/          Playwright tests (t_kyc.py, t_back.py, t_media.py) and screens.py
                (GitHub Actions on branch "preview": real-internet screenshots -> branch "test-shots")
live.json       Which URL each APK opens (APKs read this from GitHub raw)
netlify.toml    publish = "web"; skips deploy if web/ unchanged
firestore.rules Rules to paste into Firebase console
```
Build: `npm i esbuild acorn` then `python3 tools/build_apps.py` -> copy `build/web/*` into `web/` (keep `web/download/` and `web/demo.html`). Bundles target Chrome 51 (old Android WebViews).

## 3. Architecture

- Plain HTML/CSS/JS (ES modules in src, bundled per app). No framework.
- **Firebase Firestore** via compat SDK 10.12.2 loaded at runtime from gstatic. If `apiKey` starts with "YOUR" the app runs in **demo mode** (localStorage + sample data).
- **Maps:** Leaflet 1.9.4 (cdnjs) + OpenStreetMap tiles. Own look: service circle, outside shaded, centre pin, "X km" label, buttons (my location, fit, full screen), smooth rider marker.
- **Android APKs (Capacitor 6.2, built on GitHub Actions):** each APK is only a **launcher** that opens the live website (`live.json` -> fallback `scripts/live-base.txt`), with `allowNavigation` for `*.netlify.app, *.pages.dev, *.web.app, *.firebaseapp.com` and user-agent suffix `KMXApp/2` (web code detects the app with this). So **website updates reach every phone without reinstalling**. Rebuild APKs only when launcher/icons/permissions change. Package IDs: `pk.kotmomin.express`, `.rider`, `.admin`. Signed with `keys/kmx.keystore` (public repo — see risks).
- **iPhone:** web app via Safari > Add to Home Screen (PWA).
- Service area hours use Pakistan time (UTC+5).

## 4. Features (all working, tested)

**Customer app**
- Location must be ON; only inside the service circle (default 5.5 km around Kot Momin centre 32.18833, 73.02861). Outside: shows distance + map.
- **KYC at first start** (one time): full name, CNIC, mobile, home address, CNIC front + back photos, selfie, consent. Encrypted on the phone (RSA-OAEP 2048 + AES-GCM; only the admin's KYC password opens them). Admin promises review within 24 h. Setting `kycMode`: `wait` (no orders until approved, default) / `allow` / `off`. Rejected -> reason shown, resend. Order phone is locked to the KYC phone.
- Categories, quick chips, voice order (60 s), list photo, draggable map pin, estimate, cash summary, 4-digit delivery code.
- Live tracking: rider position, ETA, "rider at door", bill + bill photo, "bill wrong", customer confirms cash paid, chat (text + voice), rating, complaints, reorder, trust level, KYC status, privacy page link, version number in Account tab.
- Every app open logs location/IP/device (visits); fraud-marked phone/device/IP/CNIC -> alert to admin.

**Rider app**
- Login: phone + PIN set by admin (stored as SHA-256 hash).
- Online/offline; while online, position shared every ~90 s (idle) / continuously on delivery.
- New orders with customer trust level, past orders, "KYC verified" badge (never sees CNIC), voice/photo of order.
- Steps: call customer to confirm -> enter bill + **mandatory bill photo** -> "I have arrived" -> customer's code. Problem report incl. robbery/threat (SOS alert). Wallet: cash in hand, earnings, rating. Map of deliveries with route line. Repeat sound for unassigned orders.
- Loads only new orders + own orders; customer history fetched per customer (keeps Firestore reads low).

**Admin**
- Login: PIN (default **786512**, change in Settings). 5 wrong tries -> 1 min lock.
- Overview, Orders (drawer with full record: IP, device, where ordered/received, timeline, cash, bill photo, assign rider sorted free-first + distance), Customers (trust, KYC, block, fraud), **KYC** tab (pending list, 24 h deadline, unlock with KYC password, photos, approve/reject with reason, duplicate-CNIC and fraud-CNIC checks), Riders (register with PIN, reset PIN, pause), Cash (riders' cash, deposits, failed-order loss), Security (alerts, fraud list, police report CSV for FIR), **Live map** (online riders incl. free ones, active/today orders, alerts, lists), Complaints, Reports (CSV), Settings (fees, hours, limits, KYC mode, **service area editor**: drag centre, radius slider 0.5–50 km, past orders + outside app-opens shown, save).
- Sound alerts toggle, repeat alarm if an order waits >3 min, desktop notifications.
- Phone back button works inside all apps (history API).

## 5. Firestore collections
`orders, messages, visits, alerts, complaints, riders, settlements, blocks, settings (doc "app"), kyc, kycfiles, media`
- Photos/voice of orders are in `media` (orders keep `photoId`, `voiceId`, `receiptId`; old orders may have inline `listPhoto/voice/receipt`).
- `kyc`: metadata + encrypted `info`; `kycfiles`: encrypted photos (`bin` = mime when stored as bytes).
- `settings/app`: all owner settings incl. `center`, `radiusKm`, `radiusSet`, `kycMode`, `kycHours`, `kycPublicKey`, `kycPrivEnc`, `adminPinHash`.
- Spark limits to respect: 50k reads/day, 20k writes/day, 1 GiB storage.

## 6. Owner to-do / open items
1. **Update Netlify** with the latest `web/` (or link GitHub) — required for changes to appear.
2. **Admin > KYC: set the KYC password** (8+ chars, letters + numbers). Without it KYC is off. If forgotten, old KYC documents cannot be opened.
3. **Paste `firestore.rules` into Firebase > Firestore > Rules and Publish before ~24 Nov 2026** (test mode expires; app stops working otherwise).
4. Optionally set the exact city centre: Admin > Settings > "Use my location as the centre".

## 7. Known limitations / risks (be honest with the owner)
- **No real authentication yet.** Firestore rules are permissive (no Firebase Auth). Admin PIN hash is in public code (crackable). Anyone with the Firebase config could read/write data via the SDK. KYC documents stay safe (encrypted). **Next step: Firebase Authentication** (admin email/password, then riders) + strict rules.
- **Public GitHub repo** exposes the APK signing key. Recommend making the repo private (raw `live.json` fetch then fails, launcher falls back to the built-in URL — fine) or rotating the key with a GitHub secret (users must reinstall once).
- **No push notifications when an app is closed** (needs Firebase Blaze + server/Cloud Functions + native push). Riders must keep the app open on duty.
- OpenStreetMap tiles: fine at small scale; for heavy use consider a paid tile provider.
- Netlify free credits can pause the site if too many deploys/bandwidth in a month.

## 8. Wishes mentioned for later
- Admin panel as a **Windows PC program (EXE)** that runs on any normal Windows.
- Possibly Google Play Store release later (needs AAB, $25 account, testers).
- Keep everything simple for the owner; professional look like big delivery companies.

## 9. Demo credentials (demo mode only, sample data)
Customer: "Demo: use a location in Kot Momin" · Rider: 03001234567 / PIN 4821 · Admin PIN 786512 · KYC password `demo1234`.
