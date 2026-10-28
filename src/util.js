// Shared helpers: formatting, icons, hashing, device info, geo, toast, install prompt, map

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const norm = (p) => String(p || "").replace(/\D/g, "").replace(/^92/, "0");
export const validPhone = (p) => /^03\d{9}$/.test(norm(p));
export const shortId = (id) => String(id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
export const orderNo = (o) => o.no || "KM-" + shortId(o.id);
export const num = (x) => Number(String(x ?? "").replace(/[^\d.]/g, "")) || 0;
export const rs = (n) => "Rs " + Math.round(num(n)).toLocaleString("en-US");
export const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const collected = (o) => (o.status === "delivered" ? num(o.fee) + num(o.bill) : 0);

export const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-");
export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + fmtTime(ts) : "-");
export const mins = (a, b) => (a && b ? Math.max(0, Math.round((b - a) / 60000)) : null);
export const startOfToday = () => new Date().setHours(0, 0, 0, 0);
export function ago(ts) {
  if (!ts) return "";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  if (m < 60 * 24) return Math.round(m / 60) + " h ago";
  return fmtDate(ts);
}
export const hourLabel = (h) => { const x = ((Number(h) % 24) + 24) % 24; return (x % 12 || 12) + (x < 12 ? " AM" : " PM"); };
// Service ke auqaat hamesha Pakistan ke time (UTC+5) se, chahe device ka time zone kuch bhi ho
export const pkHour = (now = new Date()) => (now.getUTCHours() + 5) % 24;
export function isOpen(s, now = new Date()) {
  if (!s.accepting) return false;
  const h = pkHour(now);
  return s.openFrom <= s.openTo ? h >= s.openFrom && h < s.openTo : h >= s.openFrom || h < s.openTo;
}

// ---------- SHA-256 (PIN aur delivery code kabhi saaf likhe hue save nahi hote) ----------
const K256 = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
export function sha256(msg) {
  const bytes = new TextEncoder().encode(String(msg));
  const l = bytes.length, total = ((l + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(total);
  buf.set(bytes); buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, (l * 8) >>> 0);
  dv.setUint32(total - 8, Math.floor((l * 8) / 4294967296));
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      k = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + k].map((x) => x >>> 0);
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("");
}
export const adminHash = (pin) => sha256("kmd-admin:" + String(pin).trim());
export const riderHash = (phone, pin) => sha256("kmd-rider:" + norm(phone) + ":" + String(pin).trim());
export const otpHash = (no, code) => sha256("kmd-otp:" + no + ":" + String(code).trim());

// ---------- device info ----------
export function deviceId(store) {
  let id = store.getItem("kmd_device");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    store.setItem("kmd_device", id);
  }
  return id;
}
export function uaShort() {
  const u = (globalThis.navigator && navigator.userAgent) || "";
  const os = /Android/i.test(u) ? "Android" : /iPhone|iPad/i.test(u) ? "iPhone" : /Windows/i.test(u) ? "Windows" : /Mac OS/i.test(u) ? "Mac" : "Other";
  const br = /Edg\//.test(u) ? "Edge" : /SamsungBrowser/.test(u) ? "Samsung" : /Chrome\//.test(u) ? "Chrome" : /Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "Browser";
  return os + " · " + br;
}
// Public IP (sirf asli website par milta hai; mobile data par aik IP kai logon ka ho sakta hai)
export async function getIp() {
  try {
    const c = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = setTimeout(() => c && c.abort(), 3500);
    const r = await Promise.race([fetch("https://api.ipify.org?format=json", c ? { signal: c.signal } : {}), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))]);
    clearTimeout(t);
    return (await r.json()).ip || "";
  } catch { return ""; }
}

// Kya yeh hamari Android app (APK) ke andar chal raha hai? (APK user agent mein "KMXApp" jorti hai)
export const inApp = () => { try { return !!window.Capacitor || /KMXApp/i.test(navigator.userAgent || ""); } catch (e) { return false; } };
// App ka version (har nayi website update par badalta hai, taake pata chale nayi update aa gayi)
export const APP_VERSION = "__KMX_VERSION__";

// Photo ko itna chhota karna ke database mein fit ho jaye (KYC: CNIC parhne ke qabil rahe)
export async function fitImage(file, max = 1000, limit = 300000) {
  let out = "";
  for (const [m, q] of [[max, 0.72], [max, 0.6], [Math.round(max * 0.85), 0.55], [Math.round(max * 0.7), 0.5], [Math.round(max * 0.55), 0.45]]) {
    out = await compressImage(file, m, q);
    if (out.length <= limit) return out;
  }
  return out;
}

// Photo chhoti karna (receipt) taake jaldi upload ho
export function compressImage(file, max = 900, quality = 0.62) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// ---------- purane browsers: flexbox "gap" na ho to CSS fallback class ----------
if (typeof document !== "undefined") {
  try {
    const d = document.createElement("div");
    d.style.cssText = "display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden";
    d.appendChild(document.createElement("div")); d.appendChild(document.createElement("div"));
    document.documentElement.appendChild(d);
    if (d.scrollHeight !== 1) document.documentElement.className += " no-flexgap";
    d.parentNode.removeChild(d);
  } catch (e) {}
}

// ---------- icons ----------
const P = (d) => `<path d="${d}"/>`;
export const ICONS = {
  home: P("M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"),
  package: P("M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"),
  list: P("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"),
  help: `<circle cx="12" cy="12" r="10"/>` + P("M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"),
  phone: P("M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"),
  message: P("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"),
  pin: P("M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z") + `<circle cx="12" cy="10" r="3"/>`,
  check: P("M20 6L9 17l-5-5"),
  clock: `<circle cx="12" cy="12" r="10"/>` + P("M12 6v6l4 2"),
  user: P("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2") + `<circle cx="12" cy="7" r="4"/>`,
  users: P("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8") + `<circle cx="9" cy="7" r="4"/>`,
  plus: P("M12 5v14M5 12h14"),
  x: P("M18 6L6 18M6 6l12 12"),
  back: P("M15 18l-6-6 6-6"),
  chev: P("M9 18l6-6-6-6"),
  truck: P("M1 3h15v13H1zM16 8h4l3 3v5h-7z") + `<circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>`,
  mic: P("M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"),
  alert: P("M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"),
  logout: P("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"),
  nav: P("M3 11l19-9-9 19-2-8z"),
  grid: P("M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"),
  chart: P("M18 20V10M12 20V4M6 20v-6"),
  eye: P("M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z") + `<circle cx="12" cy="12" r="3"/>`,
  key: P("M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"),
  download: P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"),
  send: P("M22 2L11 13M22 2l-7 20-4-9-9-4z"),
  map: P("M1 6v16l7-4 8 4 7-4V2l-7 4-8-4zM8 2v16M16 6v16"),
  trash: P("M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"),
  shield: P("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
  wallet: P("M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z"),
  bolt: P("M13 2L3 14h9l-1 8 10-12h-9z"),
  cart: `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>` + P("M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"),
  pill: P("M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7zM8.5 8.5l7 7"),
  food: P("M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"),
  cake: P("M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"),
  mobile: `<rect x="5" y="2" width="14" height="20" rx="2"/>` + P("M12 18h.01"),
  star: P("M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"),
  camera: P("M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z") + `<circle cx="12" cy="13" r="4"/>`,
  lock: `<rect x="3" y="11" width="18" height="11" rx="2"/>` + P("M7 11V7a5 5 0 0 1 10 0v4"),
  settings: `<circle cx="12" cy="12" r="3"/>` + P("M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"),
  ban: `<circle cx="12" cy="12" r="10"/>` + P("M4.9 4.9l14.2 14.2"),
  globe: `<circle cx="12" cy="12" r="10"/>` + P("M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"),
  cash: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>` + P("M6 12h.01M18 12h.01"),
  fruit: P("M12 7c-3-2-8-1-8 5 0 5 3 9 6 9 1 0 1.5-.5 2-.5s1 .5 2 .5c3 0 6-4 6-9 0-6-5-7-8-5zM12 7c0-2 1-4 3-5"),
  snack: P("M4 10h16l-2 11H6zM7 10V7a5 5 0 0 1 10 0v3M9 14h.01M12 16h.01M15 14h.01"),
  bell: P("M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"),
  door: P("M3 21h18M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M14 12h.01"),
  image: `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>` + P("M21 15l-5-5L5 21"),
  stop: `<rect x="6" y="6" width="12" height="12" rx="2"/>`,
  award: `<circle cx="12" cy="8" r="6"/>` + P("M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"),
  idcard: `<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2.2"/>` + P("M14 10h5M14 14h4M4.8 16.5c.6-1.5 1.8-2.2 3.2-2.2s2.6.7 3.2 2.2"),
  target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>` + P("M12 1v3M12 20v3M1 12h3M20 12h3"),
  refresh: P("M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"),
  expand: P("M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"),
  shrink: P("M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"),
  layers: P("M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"),
};
export const icon = (n, s = 18) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
export function hydrateIcons(root) {
  (root || document).querySelectorAll("[data-icon]").forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon, Number(el.dataset.size) || 18));
  });
}

// ---------- geo ----------
export function distKm(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}
export const inArea = (p, s) => !!p && distKm(p, s.center) <= s.radiusKm;
export function eta(from, to, speedKmh = 20) {
  const km = distKm(from, to) * 1.3; // sadak ki doori seedhi doori se taqreeban 1.3 guna
  return { km, min: Math.max(1, Math.round((km / speedKmh) * 60)) };
}
export function getPos(timeout = 15000) {
  return new Promise((res, rej) => {
    if (!globalThis.navigator?.geolocation) return rej(new Error("No GPS"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy || 0) }),
      rej,
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    );
  });
}

// ---------- Android "back" button aur browser back: pehle khula dialog band, phir pichli screen ----------
const backStack = [];
let skipPop = 0;
export function pushBack(onBack) {
  const entry = { onBack };
  backStack.push(entry);
  try { history.pushState({ kmx: backStack.length }, ""); } catch (e) {}
  // release(): jab cheez button se band ho to history ki entry bhi hata do
  return function release() {
    const i = backStack.indexOf(entry);
    if (i === -1) return;
    backStack.splice(i, 1);
    skipPop++;
    try { history.back(); } catch (e) { skipPop--; }
  };
}
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("popstate", () => {
    if (skipPop > 0) { skipPop--; return; }
    const e = backStack.pop();
    if (e) e.onBack();
  });
}

// ---------- feedback ----------
export function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 3400);
}
export function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start();
    setTimeout(() => { o.stop(); c.close(); }, 350);
    navigator.vibrate?.(200);
  } catch {}
}

// ---------- install prompt (Android Chrome) ----------
let deferred = null;
const subs = [];
globalThis.addEventListener?.("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
export function onInstallable(cb) { subs.push(cb); if (deferred) cb(); }
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  try { await deferred.userChoice; } catch {}
  deferred = null;
  return true;
}

// ---------- map: Leaflet + OpenStreetMap, sirf Kot Momin ke service area tak ----------
let leafletP;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => res(window.L);
    s.onerror = () => { leafletP = null; rej(new Error("Map could not load")); };
    document.head.appendChild(s);
  });
  return leafletP;
}

// Gol daire ke kinare ke points: markaz se har taraf barabar doori (km)
export function circlePoints(c, km, n = 96) {
  const pts = [], kLat = km / 111.32, kLng = km / (111.32 * Math.cos((c.lat * Math.PI) / 180));
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; pts.push([c.lat + kLat * Math.cos(a), c.lng + kLng * Math.sin(a)]); }
  return pts;
}

// Hamara apna map: Kot Momin ka gol service area (bahar ka hissa dhundla), markaz ka nishan aur "X km" label.
// opts.still = sirf dekhne wala chhota map; opts.centreLabel = markaz ka naam; opts.free = daire se bahar bhi ghoom sako (admin)
// opts.controls = ["locate", "area", "full"]: meri location, poora daira / dobara fit, full screen
// opts.onLocate(p) = "meri location" dabane par; opts.editable = markaz ko kheench kar badlo (admin settings)
export async function createMap(el, s, opts = {}) {
  const L = await loadLeaflet();
  const still = !!opts.still;
  const c = [s.center.lat, s.center.lng];
  const map = L.map(el, { minZoom: 7, maxZoom: 19, zoomSnap: 0.25, maxBoundsViscosity: 0.9, zoomControl: !still, dragging: !still, touchZoom: !still, scrollWheelZoom: !still, doubleClickZoom: !still, boxZoom: !still, keyboard: !still }).setView(c, 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
  const world = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
  let cur = { center: { lat: s.center.lat, lng: s.center.lng }, radiusKm: Number(s.radiusKm) };
  const mask = L.polygon([world, circlePoints(cur.center, cur.radiusKm)], { stroke: false, fillColor: "#0E1A14", fillOpacity: 0.34, interactive: false }).addTo(map);
  const area = L.circle(c, { radius: cur.radiusKm * 1000, color: "#0B7A4B", weight: 2.5, fill: false, interactive: false }).addTo(map);
  const centre = L.marker(c, { icon: L.divIcon({ html: `<div class="cpin ${opts.editable ? "edit" : ""}"></div>`, className: "", iconSize: opts.editable ? [30, 30] : [18, 18], iconAnchor: opts.editable ? [15, 15] : [9, 9] }), keyboard: false, draggable: !!opts.editable, zIndexOffset: opts.editable ? 900 : -500 }).addTo(map);
  centre.bindTooltip(opts.centreLabel || "Kot Momin centre", { direction: "top", offset: [0, opts.editable ? -14 : -8], permanent: !!opts.editable });
  const lblIcon = (km) => L.divIcon({ html: `<div class="arealbl">${Number(km)} km</div>`, className: "", iconSize: [70, 22], iconAnchor: [35, 11] });
  const lbl = L.marker([cur.center.lat + cur.radiusKm / 111.32, cur.center.lng], { icon: lblIcon(cur.radiusKm), interactive: false, keyboard: false, zIndexOffset: -400 }).addTo(map);
  const bounds = () => area.getBounds().pad(0.6);
  if (!opts.free) map.setMaxBounds(bounds());
  const pin = (name, cls) => L.divIcon({ html: `<div class="pin ${cls || ""}">${icon(name, 16)}</div>`, className: "", iconSize: [34, 34], iconAnchor: [17, 17] });
  const group = L.layerGroup().addTo(map), dotLayer = L.layerGroup().addTo(map);
  let rm, dm, line, ym, pk, lastSig = "", lastDots = "", follow = true, tracked = [];
  const fitArea = () => { map.invalidateSize(); map.fitBounds(area.getBounds(), { padding: [8, 8] }); };
  const fitTracked = () => { map.invalidateSize(); if (tracked.length > 1) map.fitBounds(tracked, { padding: [44, 44], maxZoom: 17 }); else if (tracked.length) map.setView(tracked[0], 16); else fitArea(); };
  map.on("dragstart", () => { follow = false; });
  setTimeout(() => map.invalidateSize(), 250);
  function setArea(ns) {
    cur = { center: { lat: Number(ns.center.lat), lng: Number(ns.center.lng) }, radiusKm: Number(ns.radiusKm) };
    const nc = [cur.center.lat, cur.center.lng];
    area.setLatLng(nc); area.setRadius(cur.radiusKm * 1000);
    mask.setLatLngs([world, circlePoints(cur.center, cur.radiusKm)]);
    if (!centre.dragging || !centre.dragging.moved()) centre.setLatLng(nc);
    lbl.setLatLng([cur.center.lat + cur.radiusKm / 111.32, cur.center.lng]); lbl.setIcon(lblIcon(cur.radiusKm));
    if (!opts.free) map.setMaxBounds(bounds());
  }
  // Rider ka nishan jhatke ke bajaye aaram se chale
  function glide(marker, to, onStep) {
    const from = marker.getLatLng(), t0 = Date.now(), ms = 900;
    if (Math.abs(from.lat - to.lat) < 1e-7 && Math.abs(from.lng - to.lng) < 1e-7) return;
    if (marker._kmxT) clearInterval(marker._kmxT);
    marker._kmxT = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const p = L.latLng(from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e);
      marker.setLatLng(p);
      if (onStep) onStep(p);
      if (k >= 1) { clearInterval(marker._kmxT); marker._kmxT = null; }
    }, 40);
  }
  // Map ke buttons: meri location, poora daira, full screen
  const ctl = (opts.controls || []).filter(Boolean);
  if (ctl.length && !still) {
    const Box = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const d = L.DomUtil.create("div", "leaflet-bar kmxctl");
        const btn = (k, ic, title) => `<a href="#" role="button" data-k="${k}" title="${title}" aria-label="${title}">${icon(ic, 17)}</a>`;
        d.innerHTML = ctl.map((k) => (k === "locate" ? btn(k, "nav", "My location") : k === "area" ? btn(k, "target", "Fit") : k === "full" ? btn(k, "expand", "Full screen") : "")).join("");
        L.DomEvent.disableClickPropagation(d);
        L.DomEvent.on(d, "click", (e) => {
          L.DomEvent.preventDefault(e);
          const a = e.target.closest ? e.target.closest("a[data-k]") : null;
          if (!a) return;
          const k = a.getAttribute("data-k");
          if (k === "area") { follow = true; tracked.length ? fitTracked() : fitArea(); }
          if (k === "full") {
            const on = !el.classList.contains("full");
            el.classList.toggle("full", on);
            document.documentElement.classList.toggle("mapopen", on);
            a.innerHTML = icon(on ? "shrink" : "expand", 17);
            setTimeout(() => { map.invalidateSize(); follow = true; tracked.length ? fitTracked() : fitArea(); }, 60);
          }
          if (k === "locate") {
            a.classList.add("busy");
            getPos(12000).then((p) => {
              a.classList.remove("busy");
              api.you(p, opts.youLabel || "");
              follow = false;
              map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
              if (opts.onLocate) opts.onLocate(p);
            }).catch(() => { a.classList.remove("busy"); if (opts.onLocateFail) opts.onLocateFail(); });
          }
        });
        return d;
      },
    });
    map.addControl(new Box());
  }
  if (opts.editable) {
    centre.on("drag", (e) => { const ll = e.target.getLatLng(); setArea({ center: { lat: ll.lat, lng: ll.lng }, radiusKm: cur.radiusKm }); if (opts.onCentre) opts.onCentre({ lat: ll.lat, lng: ll.lng }, false); });
    centre.on("dragend", (e) => { const ll = e.target.getLatLng(); if (opts.onCentre) opts.onCentre({ lat: ll.lat, lng: ll.lng }, true); });
  }
  const api = {
    map, L, fitArea, setArea, fitTracked,
    get area() { return cur; },
    onClick(cb) { map.on("click", (e) => cb({ lat: e.latlng.lat, lng: e.latlng.lng })); },
    focus(lat, lng, z) { follow = false; map.setView([lat, lng], z || Math.max(map.getZoom(), 16)); },
    // "Aap yahan hain" ka neela nishan
    you(p, label, fit) {
      if (!p) { if (ym) { ym.remove(); ym = null; } return; }
      if (ym) ym.setLatLng([p.lat, p.lng]);
      else { ym = L.marker([p.lat, p.lng], { icon: L.divIcon({ html: '<div class="youpin"></div>', className: "", iconSize: [22, 22], iconAnchor: [11, 11] }), keyboard: false, interactive: !!label }).addTo(map); if (label) ym.bindTooltip(label, { direction: "top", offset: [0, -10], permanent: !!opts.still }); }
      if (fit) {
        map.invalidateSize();
        if (distKm(p, cur.center) > Math.max(35, cur.radiusKm * 4)) return fitArea(); // bohat door: sirf daira dikhao
        const b = L.latLngBounds(circlePoints(cur.center, cur.radiusKm, 16)).extend([p.lat, p.lng]);
        if (!opts.free) map.setMaxBounds(b.pad(0.4));
        map.fitBounds(b, { paddingTopLeft: [18, 46], paddingBottomRight: [18, 18] });
      }
    },
    // Customer ka pin: kheench kar ya map par tap kar ke
    pickPin(p, onMove) {
      if (!p) { if (pk) { pk.remove(); pk = null; } return; }
      if (pk) pk.setLatLng([p.lat, p.lng]);
      else {
        pk = L.marker([p.lat, p.lng], { icon: L.divIcon({ html: `<div class="pin dest big">${icon("home", 18)}</div><div class="pinshadow"></div>`, className: "", iconSize: [40, 40], iconAnchor: [20, 20] }), draggable: true, zIndexOffset: 800 }).addTo(map);
        pk.on("dragend", () => { const ll = pk.getLatLng(); if (onMove) onMove({ lat: ll.lat, lng: ll.lng }); });
      }
      map.invalidateSize();
      map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
    },
    // Tracking: rider + manzil, beech mein seedhi line
    update(rider, dest) {
      const drawLine = (rp) => {
        if (rp && dest) { const pts = [[rp.lat, rp.lng], [dest.lat, dest.lng]]; if (line) line.setLatLngs(pts); else line = L.polyline(pts, { color: "#0B7A4B", weight: 3, dashArray: "6 8" }).addTo(map); }
        else if (line) { line.remove(); line = null; }
      };
      if (rider) {
        const stale = rider.ts && Date.now() - rider.ts > 5 * 60000;
        if (rm) { rm.setIcon(pin("truck", stale ? "stale" : "live")); glide(rm, L.latLng(rider.lat, rider.lng), (p) => drawLine(p)); }
        else rm = L.marker([rider.lat, rider.lng], { icon: pin("truck", stale ? "stale" : "live"), zIndexOffset: 600 }).addTo(map);
      } else if (rm) { rm.remove(); rm = null; }
      if (dest) { if (dm) dm.setLatLng([dest.lat, dest.lng]); else dm = L.marker([dest.lat, dest.lng], { icon: pin("home", "dest") }).addTo(map); }
      else if (dm) { dm.remove(); dm = null; }
      drawLine(rider);
      tracked = [rider, dest].filter(Boolean).map((p) => [p.lat, p.lng]);
      if (follow) fitTracked();
    },
    // Nishan: {lat, lng, icon, cls, key, label, permanent, onClick}. keep = zoom na chhero; withArea = poora daira bhi fit
    setMarkers(items, keep, withArea) {
      group.clearLayers();
      items.forEach((i) => {
        const m = L.marker([i.lat, i.lng], { icon: pin(i.icon, i.cls), zIndexOffset: i.z || 0 }).addTo(group);
        if (i.label) m.bindTooltip(i.label, { direction: "top", offset: [0, -14], permanent: !!i.permanent, className: i.permanent ? "plabel" : "" });
        if (i.onClick) m.on("click", () => i.onClick(i));
      });
      const sig = items.map((i) => i.key || i.icon).join("|");
      if (keep && sig === lastSig) return;
      lastSig = sig;
      map.invalidateSize();
      const pts = items.map((i) => [i.lat, i.lng]);
      if (withArea) pts.push(...circlePoints(cur.center, cur.radiusKm, 16));
      if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
      else if (pts.length) map.setView(pts[0], 15);
      else fitArea();
    },
    // Chhote rangeen nuqte (pichle orders waghera): {lat, lng, color, label, onClick}
    dots(items) {
      const sig = items.map((i) => i.lat + "," + i.lng + i.color).join("|");
      if (sig === lastDots) return;
      lastDots = sig;
      dotLayer.clearLayers();
      items.forEach((i) => {
        const m = L.circleMarker([i.lat, i.lng], { radius: i.r || 6, color: "#fff", weight: 1.5, fillColor: i.color || "#0B7A4B", fillOpacity: 0.9 }).addTo(dotLayer);
        if (i.label) m.bindTooltip(i.label, { direction: "top", offset: [0, -6] });
        if (i.onClick) m.on("click", () => i.onClick(i));
      });
    },
  };
  return api;
}

// ---------- voice recording (chat aur voice order dono ke liye) ----------
const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
export async function startRecording(maxSec, onTick) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 16000 } : { audioBitsPerSecond: 16000 });
  const chunks = [], t0 = Date.now();
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  const timer = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); onTick?.(s); if (s >= maxSec) stop(); }, 500);
  const cleanup = () => { clearInterval(timer); stream.getTracks().forEach((x) => x.stop()); };
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    cleanup();
    const dur = Math.round((Date.now() - t0) / 1000);
    if (dur < 1 || !chunks.length) return resolveDone(null);
    resolveDone({ audio: await blobToDataURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" })), dur });
  };
  rec.start();
  function stop() { if (rec.state === "recording") rec.stop(); }
  function cancel() { rec.onstop = null; try { if (rec.state === "recording") rec.stop(); } catch {} cleanup(); resolveDone(null); }
  return { stop, cancel, done };
}

// ---------- customer trust level ----------
// Pichle orders se: kitne deliver hue, kitne cancel/fail, aur rider ko darwaze par kitna intezar karwaya
export function trustOf(list, phone, device, blocks = []) {
  const p = norm(phone);
  const mine = list.filter((o) => norm(o.phone) === p);
  const done = mine.filter((o) => o.status === "delivered");
  const failed = mine.filter((o) => o.status === "failed").length;
  const cancelled = mine.filter((o) => o.status === "cancelled").length;
  const lateCancel = mine.filter((o) => o.status === "cancelled" && o.acceptedAt).length;
  const waits = done.map((o) => (o.arrivedAt && o.deliveredAt ? (o.deliveredAt - o.arrivedAt) / 60000 : null)).filter((x) => x != null);
  const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null;
  const hit = (b) => norm(b.value) === p || (device && b.value === device);
  const fraud = blocks.some((b) => b.kind === "fraud" && hit(b));
  const blocked = blocks.some(hit);
  const d = done.length;
  // Isi phone (device) se kisi aur number ne gadbad ki ho to woh bhi shumar
  const linked = device ? list.filter((o) => o.device === device && norm(o.phone) !== p) : [];
  const linkedFailed = linked.filter((o) => o.status === "failed").length;
  const linkedPhones = [...new Set(linked.map((o) => norm(o.phone)))].length;
  let level;
  if (fraud) level = "fraud";
  else if (blocked) level = "blocked";
  else if (failed >= 2 || (failed >= 1 && d < 3) || linkedFailed >= 2) level = "risk";
  else if (failed === 1 || lateCancel >= 2 || cancelled > d + 1 || linkedFailed === 1) level = "caution";
  else if (d === 0) level = "new";
  else if (d >= 5 && (avgWait == null || avgWait <= 5)) level = "trusted";
  else level = "good";
  const base = d + failed + lateCancel;
  return { level, delivered: d, failed, cancelled, avgWait, rate: base ? Math.round((d * 100) / base) : null, total: mine.length, linkedPhones, linkedFailed };
}
export const TRUST_CLASS = { fraud: "red", blocked: "red", risk: "red", caution: "", new: "blue", good: "green", trusted: "green" };
export const TRUST_EN = { fraud: "Fraud: do not serve", blocked: "Blocked", risk: "High risk", caution: "Be careful", new: "First order", good: "Good customer", trusted: "Trusted customer" };
