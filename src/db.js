import { firebaseConfig, DEFAULTS } from "./config.js";
import { riderHash, otpHash, esc } from "./util.js";
import * as K from "./kyc.js";

// Firebase keys bhari hon to cloud mode, warna demo mode (browser mein sample data ke saath)
export const cloud = !!(firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("YOUR"));

export const STATUS = {
  new: "Awaiting rider",
  accepted: "Rider assigned",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
};
export const ACTIVE = ["new", "accepted", "on_the_way"];

// Firebase "compat" version: purane Android browsers par bhi chalta hai, zaroorat par hi load hota hai
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
let fbP = null;
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); });
}
function fb() {
  if (!fbP) {
    fbP = loadScript(FB + "firebase-app-compat.js").then(() => loadScript(FB + "firebase-firestore-compat.js")).then(() => {
      const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
      return app.firestore();
    });
    fbP.catch(() => { fbP = null; });
  }
  return fbP;
}
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// ---------- browser storage (block ho to memory mein chalta hai) ----------
const g = globalThis;
const mem = () => {
  const m = {};
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, keys: () => Object.keys(m) };
};
function pick(name, shared) {
  try { if (g.parent && g.parent !== g && g.parent[shared]) return g.parent[shared]; } catch {}
  try { const s = g[name]; if (s) { s.setItem("_t", "1"); s.removeItem("_t"); return s; } } catch {}
  return mem();
}
export const kv = pick("localStorage", "__kmdStorage");
export const ss = pick("sessionStorage", "__kmdSession");

const key = (c) => "kmd_" + c;
const lsAll = (c) => { try { return JSON.parse(kv.getItem(key(c)) || "[]"); } catch { return []; } };
const lsSave = (c, a) => kv.setItem(key(c), JSON.stringify(a));
const uid = () => "L" + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
const byTime = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);

// ---------- demo data (sirf demo mode, aik baar) ----------
function receiptSvg(shop, lines, total) {
  const rows = lines.map((l, i) => `<text x="16" y="${78 + i * 20}" font-size="12">${l[0]}</text><text x="204" y="${78 + i * 20}" font-size="12" text-anchor="end">${l[1]}</text>`).join("");
  const h = 120 + lines.length * 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${h}" font-family="monospace"><rect width="220" height="${h}" fill="#fffef8"/><text x="110" y="28" font-size="13" font-weight="bold" text-anchor="middle">${shop}</text><text x="110" y="46" font-size="10" text-anchor="middle">Kot Momin · sample bill</text><line x1="12" y1="58" x2="208" y2="58" stroke="#999" stroke-dasharray="3 3"/>${rows}<line x1="12" y1="${h - 44}" x2="208" y2="${h - 44}" stroke="#999" stroke-dasharray="3 3"/><text x="16" y="${h - 22}" font-size="13" font-weight="bold">TOTAL</text><text x="204" y="${h - 22}" font-size="13" font-weight="bold" text-anchor="end">${total}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function seedDemo() {
  if (cloud || kv.getItem("kmd_seeded") === "7") return;
  const now = Date.now(), M = 60000, H = 3600000, D = 86400000, c = DEFAULTS.center;
  const at = (dLat, dLng) => ({ lat: +(c.lat + dLat).toFixed(5), lng: +(c.lng + dLng).toFixed(5) });
  const near = (p, k = 0.0004) => ({ lat: +(p.lat + k).toFixed(5), lng: +(p.lng - k).toFixed(5) });
  const rider = (id, name, phone, pin, online) => ({ id, name, phone, pinHash: riderHash(phone, pin), active: true, online, lastSeen: online ? now : now - 3 * H, createdAt: now - 20 * D });
  const riders = [rider("DR1", "Usman Ali", "03001234567", "4821", true), rider("DR2", "Bilal Ahmad", "03111234567", "7390", true), rider("DR3", "Hamza Khan", "03211234567", "1156", false), rider("DR4", "Ali Raza", "03021234567", "2468", true)];
  riders[0].loc = { ...at(0.003, 0.004), ts: now }; riders[1].loc = { ...at(-0.001, 0.002), ts: now }; riders[3].loc = { ...at(-0.009, -0.007), ts: now - 2 * M };
  const R = (i) => ({ riderId: riders[i].id, rider: riders[i].name, riderPhone: riders[i].phone });
  const mk = (id, no, o) => {
    const dest = o.dest;
    return { id, no, fee: 100, type: "shop", cat: "grocery", pickup: "", note: "", estimate: 0, bill: "", acc: 15, ua: "Android · Chrome", orderLoc: dest ? near(dest) : null, ...o };
  };
  const done = (t0, extra) => ({ createdAt: t0, acceptedAt: t0 + 4 * M, confirmedAt: t0 + 5 * M, pickedAt: t0 + 17 * M, arrivedAt: t0 + 33 * M, deliveredAt: t0 + 35 * M, otpOk: "code", ...extra });
  const orders = [
    mk("D1", "KM-10412", { items: "1 kg chicken, 2 naan", shop: "Al-Madina Chicken Shop", cat: "food", estimate: 900, area: "Chanab Bazar", address: "Street 4, near the water tank", dest: at(0.004, -0.005), name: "Ayesha Bibi", phone: "03451112233", ip: "203.0.113.24", device: "dev-a1k2", status: "delivered", ...R(0), ...done(now - 175 * M), bill: 850, custPaid: 950, receipt: receiptSvg("Al-Madina Chicken", [["Chicken 1 kg", "760"], ["Naan x2", "90"]], "850"), rating: 5 }),
    mk("D2", "KM-10415", { items: "Panadol, ORS sachets x4", shop: "City Pharmacy", cat: "pharmacy", estimate: 400, area: "Sargodha Road", address: "House 18, opposite the girls college", dest: at(-0.006, 0.003), name: "Tariq Mehmood", phone: "03337775544", ip: "203.0.113.57", device: "dev-b7m1", status: "delivered", ...R(1), ...done(now - 130 * M), bill: 420, custPaid: 520, receipt: receiptSvg("City Pharmacy", [["Panadol x2", "100"], ["ORS x4", "320"]], "420"), rating: 4 }),
    mk("D3", "KM-10418", { items: "1 kg kinnow, 1 dozen bananas from the fruit cart", shop: "Fruit rehri, Chanab Bazar", cat: "fruit", estimate: 450, area: "Rehmat Market", address: "Shop 12, Rehmat Market", dest: at(0.002, 0.007), name: "Imran Sheikh", phone: "03009998877", ip: "203.0.113.90", device: "dev-p3q8", status: "delivered", ...R(0), ...done(now - 90 * M), bill: 400, custPaid: 500, receipt: receiptSvg("Fruit rehri (no bill)", [["Kinnow 1 kg", "220"], ["Bananas 1 dz", "180"]], "400"), rating: 5 }),
    mk("D4", "KM-10377", { items: "Flour 10 kg, sugar 2 kg, tea 1 packet", shop: "Rehmat Kiryana Store", estimate: 2700, area: "Chanab Bazar", address: "Street 7, house 33", dest: at(0.006, 0.008), name: "Ahmed Raza", phone: "03451234567", ip: "203.0.113.81", device: "dev-c3", status: "delivered", ...R(1), ...done(now - D - 40 * M), bill: 2650, custPaid: 2750, receipt: receiptSvg("Rehmat Kiryana", [["Flour 10 kg", "1900"], ["Sugar 2 kg", "300"], ["Tea", "450"]], "2650") }),
    mk("D5", "KM-10421", { items: "2 pizzas, 1 cold drink", shop: "Pizza Point", cat: "food", estimate: 1800, area: "Chanab Bazar", address: "Street 7, house 33", dest: at(0.006, 0.008), name: "Ahmed Raza", phone: "03451234567", ip: "203.0.113.81", device: "dev-c3", status: "on_the_way", ...R(0), createdAt: now - 32 * M, acceptedAt: now - 29 * M, confirmedAt: now - 28 * M, pickedAt: now - 14 * M, bill: 1650, receipt: receiptSvg("Pizza Point", [["Pizza large x2", "1500"], ["Cold drink 1.5L", "150"]], "1650"), otpHash: otpHash("KM-10421", "5832"), riderLoc: { ...at(0.003, 0.004), ts: now } }),
    mk("D6", "KM-10424", { items: "Garam moong phali 250 g and 1 plate chana chaat", shop: "Street cart near the chowk", cat: "snack", estimate: 300, area: "Sargodha Road", address: "Bank Road, near HBL", dest: at(-0.004, -0.006), name: "Sana Malik", phone: "03221239876", ip: "203.0.113.12", device: "dev-s5t6", status: "accepted", ...R(1), createdAt: now - 12 * M, acceptedAt: now - 9 * M, otpHash: otpHash("KM-10424", "1946"), riderLoc: { ...at(-0.001, 0.002), ts: now } }),
    mk("D7", "KM-10426", { items: "Medicines as per the prescription photo", shop: "Shifa Pharmacy", cat: "pharmacy", estimate: 2800, area: "Phularwan Road", address: "Ward 3, street 9", dest: at(0.009, -0.003), name: "Nadia Parveen", phone: "03181236677", ip: "203.0.113.200", device: "dev-x9", acc: 240, status: "new", rider: "", riderId: "", riderPhone: "", createdAt: now - 4 * M, otpHash: otpHash("KM-10426", "7731") }),
    mk("D8", "KM-10380", { items: "Stationery set", shop: "Book Corner", estimate: 600, area: "Rehmat Market", address: "College Road", dest: at(-0.008, 0.006), name: "Faisal Iqbal", phone: "03141239988", ip: "203.0.113.44", device: "dev-f4g4", status: "cancelled", cancelledBy: "customer", rider: "", riderId: "", riderPhone: "", createdAt: now - D - 5 * H, cancelledAt: now - D - 5 * H + 3 * M }),
    mk("D9", "KM-10350", { items: "Ghee 5 kg, rice 5 kg, cooking oil", shop: "Rehmat Kiryana Store", estimate: 2400, area: "Phularwan Road", address: "Near the old mosque", dest: at(0.010, -0.002), name: "Shahid Mehmood", phone: "03001112223", ip: "203.0.113.200", device: "dev-x9", status: "failed", ...R(1), createdAt: now - 2 * D, acceptedAt: now - 2 * D + 3 * M, confirmedAt: now - 2 * D + 4 * M, pickedAt: now - 2 * D + 20 * M, failedAt: now - 2 * D + 35 * M, bill: 2350, failReason: "Customer refused the order" }),
    mk("D10", "KM-10301", { items: "Mobile charger and earphones", shop: "Al-Jannat Mobiles", cat: "mobile", estimate: 1200, area: "Phularwan Road", address: "Near the old mosque", dest: at(0.010, -0.002), name: "Shahid Mehmood", phone: "03001112223", ip: "203.0.113.200", device: "dev-x9", status: "failed", ...R(0), createdAt: now - 5 * D, acceptedAt: now - 5 * D + 2 * M, failedAt: now - 5 * D + 25 * M, failReason: "Customer not answering" }),
    mk("D11", "KM-10288", { items: "2 mobile phones (Rs 18,000) from the market", shop: "Main Bazar", cat: "mobile", estimate: 18000, area: "Sargodha Road", address: "Behind the grain market", dest: at(-0.011, 0.009), name: "Waqas", phone: "03331234000", ip: "203.0.113.66", device: "dev-z7", acc: 30, status: "failed", ...R(1), createdAt: now - 8 * D, acceptedAt: now - 8 * D + 3 * M, confirmedAt: now - 8 * D + 4 * M, pickedAt: now - 8 * D + 30 * M, arrivedAt: now - 8 * D + 44 * M, failedAt: now - 8 * D + 50 * M, bill: 18000, failReason: "Robbery: took the items and cash at gunpoint" }),
  ];
  lsSave("riders", riders);
  lsSave("orders", orders);
  lsSave("settlements", [
    { id: "DS1", riderId: "DR2", rider: "Bilal Ahmad", amount: 3000, note: "Evening cash", createdAt: now - D + 2 * H },
    { id: "DS2", riderId: "DR1", rider: "Usman Ali", amount: 1000, note: "", createdAt: now - 60 * M },
  ]);
  lsSave("blocks", [
    { id: "DB1", kind: "block", type: "phone", value: "03001112223", name: "Shahid Mehmood", reason: "Refused or ignored 2 orders", createdAt: now - 2 * D + 2 * H },
    { id: "DB2", kind: "fraud", type: "phone", value: "03331234000", name: "Waqas", reason: "Robbed rider Bilal Ahmad at gunpoint (order KM-10288). FIR pending.", createdAt: now - 8 * D + 2 * H },
    { id: "DB3", kind: "fraud", type: "device", value: "dev-z7", name: "Waqas", reason: "Robbed rider Bilal Ahmad at gunpoint (order KM-10288). FIR pending.", createdAt: now - 8 * D + 2 * H },
  ]);
  const seen = at(-0.0105, 0.0093);
  lsSave("visits", [
    { id: "DV1", device: "dev-z7", phone: "03331234000", name: "Waqas", ip: "203.0.113.66", lat: seen.lat, lng: seen.lng, acc: 25, ua: "Android · Chrome", ts: now - 3 * H },
    { id: "DV2", device: "dev-c3", phone: "03451234567", name: "Ahmed Raza", ip: "203.0.113.81", ...at(0.006, 0.008), acc: 12, ua: "Android · Chrome", ts: now - 33 * M },
  ]);
  lsSave("alerts", [{ id: "DA1", type: "fraud_seen", match: "device", device: "dev-z7", phone: "03331234000", name: "Waqas", ip: "203.0.113.66", lat: seen.lat, lng: seen.lng, acc: 25, reason: "Robbed rider Bilal Ahmad at gunpoint (order KM-10288). FIR pending.", seen: false, ts: now - 3 * H }]);
  lsSave("complaints", [{ id: "DC1", orderId: "D4", orderShort: "KM-10377", rider: "Bilal Ahmad", name: "Ahmed Raza", phone: "03451234567", text: "The rider reached about 20 minutes later than the time shown in the app.", status: "open", createdAt: now - 20 * H }]);
  lsSave("messages", [
    { id: "DM1", orderId: "D5", from: "rider", name: "Usman Ali", text: "Assalam o Alaikum, I have your order and I am on my way.", createdAt: now - 12 * M },
    { id: "DM2", orderId: "D5", from: "customer", name: "Ahmed Raza", text: "Great, please call when you reach the street.", createdAt: now - 10 * M },
  ]);
  lsSave("settings", [{ id: "app" }]);
  lsSave("kyc", []); lsSave("kycfiles", []);
  kv.setItem("kmd_my", JSON.stringify(["D5", "D4"]));
  kv.setItem("kmd_otp", JSON.stringify({ D5: "5832" }));
  kv.setItem("kmd_device", "dev-c3");
  kv.setItem("kmd_profile", JSON.stringify({ name: "Ahmed Raza", phone: "03451234567", area: "Chanab Bazar", address: "Street 7, house 33" }));
  kv.removeItem("kmd_mykyc"); kv.removeItem("kmd_seeded_kyc");
  kv.setItem("kmd_seeded", "7");
}
seedDemo();

// Demo KYC: sample CNIC (nakli, "00000" se shuru) aur tasveerein, demo KYC password "demo1234"
function demoCard(kind, name, cnic) {
  const head = `<rect width="320" height="200" rx="14" fill="#F2F7F3"/><rect width="320" height="38" rx="14" fill="#0B7A4B"/><rect y="24" width="320" height="14" fill="#0B7A4B"/><text x="16" y="25" font-size="13" font-weight="bold" fill="#fff">SAMPLE ID CARD · DEMO ONLY</text>`;
  const body = kind === "front"
    ? `<rect x="16" y="54" width="82" height="100" rx="8" fill="#C9D8CE"/><circle cx="57" cy="90" r="20" fill="#9DB5A6"/><rect x="31" y="116" width="52" height="30" rx="14" fill="#9DB5A6"/><text x="112" y="70" font-size="10" fill="#557">Name</text><text x="112" y="86" font-size="14" font-weight="bold" fill="#123">${name}</text><text x="112" y="110" font-size="10" fill="#557">Identity number</text><text x="112" y="126" font-size="14" font-weight="bold" fill="#123">${cnic}</text><text x="16" y="182" font-size="10" fill="#8a3">Not a real card</text>`
    : `<text x="16" y="70" font-size="12" fill="#123">Address: Kot Momin (sample)</text>${Array.from({ length: 34 }, (_, i) => `<rect x="${16 + i * 8.5}" y="120" width="${i % 3 ? 3 : 5}" height="54" fill="#123"/>`).join("")}`;
  const svg = kind === "selfie"
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300"><rect width="240" height="300" fill="#DDE7E0"/><circle cx="120" cy="120" r="56" fill="#B58B6B"/><rect x="40" y="190" width="160" height="110" rx="60" fill="#2F5D46"/><text x="120" y="290" font-size="12" text-anchor="middle" fill="#fff">SAMPLE SELFIE · ${name}</text></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" font-family="sans-serif">${head}${body}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
async function seedDemoKyc() {
  if (cloud || kv.getItem("kmd_seeded") !== "7") return;
  const flag = kv.getItem("kmd_seeded_kyc");
  if (flag === "1" || (flag && Date.now() - Number(flag.split(":")[1] || 0) < 30000)) return;
  kv.setItem("kmd_seeded_kyc", "busy:" + Date.now());
  try {
    const k = K;
    if (!k.kycCryptoOk()) return;
    const keys = await k.createKycKeys("demo1234");
    const now = Date.now(), H = 3600000, D = 864e5, c = DEFAULTS.center;
    const loc = (dLat, dLng) => ({ lat: +(c.lat + dLat).toFixed(5), lng: +(c.lng + dLng).toFixed(5), acc: 14 });
    const people = [
      { id: "DK0", name: "Waqas", phone: "03331234000", device: "dev-z7", ip: "203.0.113.66", cnic: "00000-7766554-3", area: "Sargodha Road", address: "Behind the grain market", at: now - 9 * D, status: "approved", rev: 2 * H, loc: loc(-0.011, 0.009) },
      { id: "DK1", name: "Ahmed Raza", phone: "03451234567", device: "dev-c3", ip: "203.0.113.81", cnic: "00000-1234567-1", area: "Chanab Bazar", address: "Street 7, house 33", at: now - 3 * D, status: "approved", rev: 3 * H, loc: loc(0.006, 0.008) },
      { id: "DK2", name: "Faisal Iqbal", phone: "03141239988", device: "dev-f4g4", ip: "203.0.113.44", cnic: "00000-5554443-2", area: "Rehmat Market", address: "College Road", at: now - 2 * D, status: "rejected", rev: 5 * H, reason: "CNIC photo is not clear", loc: loc(-0.008, 0.006) },
      { id: "DK3", name: "Nadia Parveen", phone: "03181236677", device: "dev-x9", ip: "203.0.113.200", cnic: "00000-2223334-4", area: "Phularwan Road", address: "Ward 3, street 9", at: now - 26 * H, status: "pending", loc: loc(0.009, -0.003) },
      { id: "DK4", name: "Sana Malik", phone: "03221239876", device: "dev-s5t6", ip: "203.0.113.12", cnic: "00000-8889990-6", area: "Sargodha Road", address: "Bank Road, near HBL", at: now - 2 * H, status: "pending", loc: loc(-0.004, -0.006) },
      { id: "DK5", name: "Waqas Ahmed", phone: "03331239999", device: "dev-z9", ip: "203.0.113.67", cnic: "00000-7766554-3", area: "Sargodha Road", address: "Near the grain market", at: now - 50 * 60000, status: "pending", loc: loc(-0.0102, 0.0091) },
    ];
    const kycs = [], files = [];
    for (const p of people) {
      const sealed = await k.sealKyc(keys.kycPublicKey, {
        info: JSON.stringify({ cnic: p.cnic, fullName: p.name, area: p.area, address: p.address, cnicKey: await k.cnicKey(p.cnic) }),
        front: demoCard("front", p.name, p.cnic), back: demoCard("back", p.name, p.cnic), selfie: demoCard("selfie", p.name, p.cnic),
      });
      kycs.push({ id: p.id, phone: p.phone, name: p.name, device: p.device, ip: p.ip, ua: "Android · Chrome", loc: p.loc, status: p.status, createdAt: p.at, dueAt: p.at + 24 * H,
        encKey: sealed.encKey, info: sealed.parts.info, cnicMask: k.cnicMask(p.cnic), v: 1, ...(p.rev ? { reviewedAt: p.at + p.rev } : {}), ...(p.reason ? { reason: p.reason } : {}) });
      for (const part of ["front", "back", "selfie"]) files.push({ id: p.id + "-" + part, ref: p.id, part, iv: sealed.parts[part].iv, data: sealed.parts[part].data, createdAt: p.at });
    }
    lsSave("kyc", kycs);
    lsSave("kycfiles", files);
    const fraudKey = await k.cnicKey("00000-7766554-3");
    lsSave("blocks", [...lsAll("blocks"), { id: "DB4", kind: "fraud", type: "cnic", value: fraudKey, name: "Waqas", reason: "Robbed rider Bilal Ahmad at gunpoint (order KM-10288). FIR pending.", createdAt: now - 8 * D + 2 * H }]);
    lsSave("alerts", [...lsAll("alerts"), { id: "DA2", type: "fraud_kyc", match: "cnic", device: "dev-z9", phone: "03331239999", name: "Waqas Ahmed", ip: "203.0.113.67", ...loc(-0.0102, 0.0091), reason: "Robbed rider Bilal Ahmad at gunpoint (order KM-10288). FIR pending.", seen: false, ts: now - 50 * 60000 }]);
    lsSave("settings", lsAll("settings").map((s) => (s.id === "app" ? { ...s, kycPublicKey: keys.kycPublicKey, kycPrivEnc: keys.kycPrivEnc } : s)));
    kv.setItem("kmd_mykyc", JSON.stringify({ ref: "DK1", phone: "03451234567", name: "Ahmed Raza", mask: k.cnicMask("00000-1234567-1"), at: now - 3 * D }));
    kv.setItem("kmd_seeded_kyc", "1");
  } catch (e) { console.warn("demo kyc", e); kv.removeItem("kmd_seeded_kyc"); }
}
seedDemoKyc();

// ---------- collections ----------
export async function add(c, data) {
  if (cloud) return (await (await fb()).collection(c).add(data)).id;
  const id = uid();
  lsSave(c, [...lsAll(c), { id, ...data }]);
  return id;
}
export async function update(c, id, patch) {
  if (cloud) return (await fb()).collection(c).doc(id).update(patch);
  lsSave(c, lsAll(c).map((o) => (o.id === id ? { ...o, ...patch } : o)));
}
export async function setOne(c, id, patch) {
  if (cloud) return (await fb()).collection(c).doc(id).set(patch, { merge: true });
  const all = lsAll(c);
  lsSave(c, all.some((o) => o.id === id) ? all.map((o) => (o.id === id ? { ...o, ...patch } : o)) : [...all, { id, ...patch }]);
}
export async function remove(c, id) {
  if (cloud) return (await fb()).collection(c).doc(id).delete();
  lsSave(c, lsAll(c).filter((o) => o.id !== id));
}
export async function getAll(c) {
  if (cloud) return rows(await (await fb()).collection(c).get());
  return lsAll(c);
}

// Aik document (id se); na mile to null
export async function getOne(c, id) {
  if (cloud) { const d = await (await fb()).collection(c).doc(id).get(); return d.exists ? { id: d.id, ...d.data() } : null; }
  return lsAll(c).find((o) => o.id === id) || null;
}

// Sirf matching documents (customer ko sab ka data download nahi karna parta)
export async function getWhere(c, field, value) {
  if (cloud) return rows(await (await fb()).collection(c).where(field, "==", value).get());
  return lsAll(c).filter((o) => o[field] === value);
}

// Collection live dekhna (purane pehle). where = ["field", value] optional.
// recent = { by: "ts", limit: 300 }: sirf sab se naye N (taake roz ki free had mein rahe)
export function watch(c, cb, where, recent) {
  const order = recent ? (a, b) => (a[recent.by] || 0) - (b[recent.by] || 0) : byTime;
  if (cloud) {
    let un = null, stopped = false;
    fb().then((db) => {
      if (stopped) return;
      let q = db.collection(c);
      if (where) q = q.where(where[0], "==", where[1]);
      if (recent) q = q.orderBy(recent.by, "desc").limit(recent.limit);
      un = q.onSnapshot((snap) => cb(rows(snap).sort(order)), (e) => console.warn(e));
    }).catch((e) => console.warn(e));
    return () => { stopped = true; if (un) un(); };
  }
  let last = "";
  const run = () => {
    let rows = lsAll(c).filter((o) => !where || o[where[0]] === where[1]).sort(order);
    if (recent) rows = rows.slice(-recent.limit);
    const s = JSON.stringify(rows);
    if (s !== last) { last = s; cb(rows); }
  };
  run();
  const t = setInterval(run, 1200);
  return () => clearInterval(t);
}
export function watchOne(c, id, cb) {
  if (cloud) {
    let un = null, stopped = false;
    fb().then((db) => {
      if (stopped) return;
      un = db.collection(c).doc(id).onSnapshot((d) => cb(d.exists ? { id: d.id, ...d.data() } : null), (e) => console.warn(e));
    }).catch((e) => console.warn(e));
    return () => { stopped = true; if (un) un(); };
  }
  let last = "";
  const run = () => {
    const o = lsAll(c).find((x) => x.id === id) || null;
    const s = JSON.stringify(o);
    if (s !== last) { last = s; cb(o); }
  };
  run();
  const t = setInterval(run, 1200);
  return () => clearInterval(t);
}

// ---------- tasveerein aur awaz alag "media" collection mein ----------
// Order halka rehta hai: admin aur rider har dafa sab orders ki tasveerein download nahi karte, sirf jab dekhein.
const mediaCache = new Map();
export async function putMedia(kind, data) {
  const id = await add("media", { kind, data, createdAt: Date.now() });
  mediaCache.set(id, data);
  return id;
}
export async function getMedia(id) {
  if (!id) return null;
  if (mediaCache.has(id)) return mediaCache.get(id);
  const d = await getOne("media", id);
  const v = d ? d.data : null;
  if (v) mediaCache.set(id, v);
  return v;
}
// <img>/<audio> ka src: purane orders (seedha data) aur naye (media id) dono
export function mediaSrc(inline, id) {
  if (inline) return `src="${esc(inline)}"`;
  if (!id) return "";
  const c = mediaCache.get(id);
  return c ? `src="${esc(c)}"` : `data-media="${esc(id)}"`;
}
export function hydrateMedia(root) {
  (root || document).querySelectorAll("[data-media]").forEach((el) => {
    const id = el.getAttribute("data-media");
    if (el.getAttribute("data-media-done") === id) return;
    el.setAttribute("data-media-done", id);
    getMedia(id).then((v) => { if (v && el.getAttribute("data-media") === id) el.setAttribute("src", v); }).catch(() => {});
  });
}

// Settings (admin console se badalti hain), defaults ke saath
export const watchSettings = (cb) => watchOne("settings", "app", (d) => {
  const s = { ...DEFAULTS, ...(d || {}), center: { ...DEFAULTS.center, ...(d?.center || {}) } };
  // Purani 3 km wali setting khud naye 5.5 km daire mein badal jati hai (jab tak admin khud radius save na kare)
  if (d && Number(d.radiusKm) === 3 && !d.radiusSet) s.radiusKm = DEFAULTS.radiusKm;
  if (!s.kycMode) s.kycMode = "wait";
  cb(s);
});
export const saveSettings = (patch) => setOne("settings", "app", patch);

// Order rider ke naam karna. Sirf pehla rider kamyab hota hai.
export async function claimOrder(id, rider) {
  const patch = { status: "accepted", riderId: rider.id, rider: rider.name, riderPhone: rider.phone, acceptedAt: Date.now() };
  if (cloud) {
    const db = await fb();
    return db.runTransaction(async (t) => {
      const ref = db.collection("orders").doc(id);
      const s = await t.get(ref);
      if (!s.exists || s.data().status !== "new") return false;
      t.update(ref, patch);
      return true;
    });
  }
  const all = lsAll("orders");
  const o = all.find((x) => x.id === id);
  if (!o || o.status !== "new") return false;
  lsSave("orders", all.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return true;
}
