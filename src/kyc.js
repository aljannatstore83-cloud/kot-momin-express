// KYC ki hifazat: CNIC number aur tasveerein customer ke phone par hi encrypt hoti hain.
// Sirf admin ka "KYC password" unhein khol sakta hai (database mein sab kuch band hi rehta hai).
const enc = new TextEncoder(), dec = new TextDecoder();
const ITER = 250000;

export function b64(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(str) {
  const s = atob(str);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
const subtle = () => (globalThis.crypto && globalThis.crypto.subtle) || null;
export const kycCryptoOk = () => !!subtle() && typeof globalThis.crypto.getRandomValues === "function";
const rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

async function pwKey(password, salt, iter) {
  const base = await subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", salt, iterations: iter || ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function wrapPkcs8(pkcs8, password) {
  const salt = rand(16), iv = rand(12);
  const k = await pwKey(password, salt, ITER);
  const data = await subtle().encrypt({ name: "AES-GCM", iv }, k, pkcs8);
  return { salt: b64(salt), iv: b64(iv), data: b64(data), iter: ITER };
}

// Admin: pehli dafa KYC ka taala banana
export async function createKycKeys(password) {
  const kp = await subtle().generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const pub = b64(await subtle().exportKey("spki", kp.publicKey));
  const pkcs8 = await subtle().exportKey("pkcs8", kp.privateKey);
  return { kycPublicKey: pub, kycPrivEnc: await wrapPkcs8(pkcs8, password) };
}
// Admin: password se taala kholna. Ghalat password par error deta hai.
export async function unlockKycKey(password, privEnc) {
  const k = await pwKey(password, unb64(privEnc.salt), privEnc.iter || ITER);
  const pkcs8 = await subtle().decrypt({ name: "AES-GCM", iv: unb64(privEnc.iv) }, k, unb64(privEnc.data));
  const key = await subtle().importKey("pkcs8", pkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  return { key, pkcs8 };
}
// Admin: KYC password badalna (khula hua taala naye password se dobara band)
export const rewrapKycKey = (pkcs8, newPassword) => wrapPkcs8(pkcs8, newPassword);

// Tasveer (data:...;base64,...) ko bytes mein: is tarah encrypt karne se jagah taqreeban 25% kam lagti hai
function dataUrlBytes(v) {
  if (typeof v !== "string" || v.indexOf("data:") !== 0) return null;
  const i = v.indexOf(","), meta = v.slice(5, i);
  if (!/;base64$/.test(meta)) return null;
  return { mime: meta.replace(/;base64$/, "") || "image/jpeg", bytes: unb64(v.slice(i + 1)) };
}
// Customer: data band karna. parts = { naam: text ya tasveer }
export async function sealKyc(pubB64, parts) {
  const pub = await subtle().importKey("spki", unb64(pubB64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const aes = await subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await subtle().exportKey("raw", aes);
  const encKey = b64(await subtle().encrypt({ name: "RSA-OAEP" }, pub, raw));
  const out = {};
  for (const k of Object.keys(parts)) {
    const iv = rand(12), bin = dataUrlBytes(parts[k]);
    out[k] = { iv: b64(iv), data: b64(await subtle().encrypt({ name: "AES-GCM", iv }, aes, bin ? bin.bytes : enc.encode(parts[k]))) };
    if (bin) out[k].bin = bin.mime;
  }
  return { encKey, parts: out };
}
// Admin: data kholna (tasveer wapas data URL ban jati hai)
export async function openKyc(privKey, encKey, parts) {
  const raw = await subtle().decrypt({ name: "RSA-OAEP" }, privKey, unb64(encKey));
  const aes = await subtle().importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
  const out = {};
  for (const k of Object.keys(parts)) {
    const buf = await subtle().decrypt({ name: "AES-GCM", iv: unb64(parts[k].iv) }, aes, unb64(parts[k].data));
    out[k] = parts[k].bin ? "data:" + parts[k].bin + ";base64," + b64(buf) : dec.decode(buf);
  }
  return out;
}

// CNIC ki pehchan (fraud list ke liye): seedha CNIC kahin save nahi hota, sirf yeh mushkil-se-ulat-ne-wala nishan
export async function cnicKey(cnic) {
  const digits = String(cnic || "").replace(/\D/g, "");
  const base = await subtle().importKey("raw", enc.encode("kmx-cnic:" + digits), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits({ name: "PBKDF2", salt: enc.encode("kmx-cnic-v1"), iterations: 60000, hash: "SHA-256" }, base, 128);
  return "cnic-" + Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}
export const cnicMask = (cnic) => { const d = String(cnic || "").replace(/\D/g, ""); return d.length === 13 ? "•••••-•••" + d.slice(8, 12) + "-" + d.slice(12) : ""; };

export const cnicFormat = (v) => {
  const d = String(v || "").replace(/\D/g, "").slice(0, 13);
  return d.length > 12 ? d.slice(0, 5) + "-" + d.slice(5, 12) + "-" + d.slice(12) : d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
};
export const validCnic = (v) => /^\d{5}-\d{7}-\d$/.test(cnicFormat(v));
// KYC password: kam az kam 8 harf, jin mein harf aur number dono hon
export const strongKycPassword = (p) => typeof p === "string" && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
