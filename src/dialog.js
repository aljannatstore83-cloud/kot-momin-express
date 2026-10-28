// App ke apne dialogs (browser ke prompt/confirm kuch jagah chalte hi nahi)
import { esc, pushBack } from "./util.js";
import { t } from "./i18n.js";

function open(inner, onReady) {
  return new Promise((res) => {
    const ov = document.createElement("div");
    ov.className = "modal center";
    ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(ov);
    let release = null;
    const done = (v) => { if (!ov.isConnected) return; ov.remove(); if (release) { const r = release; release = null; r(); } res(v); };
    release = pushBack(() => { release = null; done(null); });
    ov.addEventListener("click", (e) => { if (e.target === ov) done(null); });
    onReady(ov, done);
  });
}
export function askText(msg, def, placeholder, okText, mode) {
  return open(`<p class="q">${esc(msg)}</p><input class="a" inputmode="${mode || "numeric"}" placeholder="${esc(placeholder || "")}" value="${esc(def || "")}">
    <div class="btns"><button class="btn sec no" type="button">${esc(t("d_cancel"))}</button><button class="btn ok" type="button">${esc(okText || t("d_ok"))}</button></div>`,
  (ov, done) => {
    const inp = ov.querySelector(".a");
    inp.focus();
    ov.querySelector(".ok").onclick = () => done(inp.value);
    ov.querySelector(".no").onclick = () => done(null);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(inp.value); });
  });
}
// Password (chhupa hua) poochna; value ya null
export function askPassword(msg, placeholder, okText) {
  return open(`<p class="q">${esc(msg)}</p><input class="a" type="password" autocomplete="new-password" placeholder="${esc(placeholder || "")}">
    <div class="btns"><button class="btn sec no" type="button">${esc(t("d_cancel"))}</button><button class="btn ok" type="button">${esc(okText || t("d_ok"))}</button></div>`,
  (ov, done) => {
    const inp = ov.querySelector(".a");
    inp.focus();
    ov.querySelector(".ok").onclick = () => done(inp.value);
    ov.querySelector(".no").onclick = () => done(null);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(inp.value); });
  });
}
export async function askYes(msg, okText, danger) {
  const v = await open(`<p class="q">${esc(msg)}</p>
    <div class="btns"><button class="btn sec no" type="button">${esc(t("d_cancel"))}</button><button class="btn ok ${danger ? "danger" : ""}" type="button">${esc(okText || t("d_ok"))}</button></div>`,
  (ov, done) => {
    ov.querySelector(".ok").onclick = () => done(true);
    ov.querySelector(".no").onclick = () => done(false);
  });
  return v === true;
}
// Sirf maloomat: aik button
export async function info(title, msg, okText) {
  await open(`<div class="infohead"><b>${esc(title)}</b></div><p class="q" style="font-weight:600">${esc(msg)}</p>
    <div class="btns"><button class="btn ok" type="button">${esc(okText || t("close"))}</button></div>`,
  (ov, done) => { ov.querySelector(".ok").onclick = () => done(true); });
}
// Kai options mein se aik chunna; value ya null
export function askChoice(msg, options) {
  return open(`<p class="q">${esc(msg)}</p><div class="stack">${options.map((o, i) => `<button class="btn sec block" type="button" data-i="${i}">${esc(o.label)}</button>`).join("")}</div>
    <button class="btn ghost block no" type="button">${esc(t("d_cancel"))}</button>`,
  (ov, done) => {
    ov.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => done(options[Number(b.dataset.i)].value)));
    ov.querySelector(".no").onclick = () => done(null);
  });
}
