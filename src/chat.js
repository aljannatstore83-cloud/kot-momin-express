import { add, watch } from "./db.js";
import { esc, fmtTime, icon, toast, startRecording, pushBack } from "./util.js";
import { t } from "./i18n.js";

// Order ki chat: text aur voice message (WhatsApp jaisa mic button). role: "customer" | "rider" | "admin"
export function openChat({ orderId, role, name, title, subtitle }) {
  const ov = document.createElement("div");
  ov.className = "modal";
  ov.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(t("chat"))}">
    <div class="sh"><div><h3>${esc(title)}</h3>${subtitle ? `<div class="muted sm-t">${esc(subtitle)}</div>` : ""}</div>
      <button class="iconbtn x" type="button" aria-label="${esc(t("close"))}">${icon("x", 18)}</button></div>
    <div class="msgs"></div>
    <div class="chatbar" id="cbText">
      <input class="txt" placeholder="${esc(t("chat_ph"))}" maxlength="500" aria-label="${esc(t("chat_ph"))}">
      <button class="iconbtn mic" type="button" aria-label="${esc(t("chat_rec"))}" title="${esc(t("chat_rec"))}">${icon("mic", 20)}</button>
      <button class="btn send" type="button" aria-label="${esc(t("chat_send"))}">${icon("send", 17)}</button>
    </div>
    <div class="chatbar recbar" id="cbRec" hidden>
      <span class="recdot"></span><span class="grow rectxt"></span>
      <button class="btn sec sm cancelrec" type="button">${esc(t("d_cancel"))}</button>
      <button class="btn sm stoprec" type="button">${icon("send", 15)} ${esc(t("chat_send"))}</button>
    </div>
    <div class="hint" style="text-align:center">${icon("mic", 13)} ${esc(t("chat_rec"))}</div>
  </div>`;
  document.body.appendChild(ov);
  const q = (s) => ov.querySelector(s);
  const box = q(".msgs");
  const seen = new Set();
  let rec = null;

  const stopWatch = watch("messages", (list) => {
    let added = false;
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      added = true;
      const d = document.createElement("div");
      d.className = "msg " + (m.from === role ? "me" : "");
      const who = document.createElement("small");
      who.textContent = `${m.name || m.from} · ${fmtTime(m.createdAt)}`;
      d.appendChild(who);
      if (m.audio) {
        const a = document.createElement("audio");
        a.controls = true; a.preload = "none"; a.src = m.audio;
        d.appendChild(a);
      } else {
        const p = document.createElement("div");
        p.textContent = m.text;
        d.appendChild(p);
      }
      box.appendChild(d);
    }
    if (!seen.size && !box.querySelector(".empty")) box.innerHTML = `<div class="empty">${esc(t("chat_empty"))}</div>`;
    if (added) { box.querySelector(".empty")?.remove(); box.scrollTop = box.scrollHeight; }
  }, ["orderId", orderId]);

  async function sendText() {
    const inp = q(".txt");
    const text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    await add("messages", { orderId, from: role, name, text, createdAt: Date.now() });
  }
  q(".send").onclick = sendText;
  q(".txt").addEventListener("keydown", (e) => { if (e.key === "Enter") sendText(); });

  const setRec = (on) => { q("#cbText").hidden = on; q("#cbRec").hidden = !on; };
  q(".mic").onclick = async () => {
    try {
      rec = await startRecording(60, (s) => { q(".rectxt").textContent = t("chat_recording", { s }); });
    } catch { toast(t("chat_mic")); return; }
    q(".rectxt").textContent = t("chat_recording", { s: 0 });
    setRec(true);
    const r = await rec.done;
    rec = null;
    setRec(false);
    if (r) await add("messages", { orderId, from: role, name, audio: r.audio, dur: r.dur, createdAt: Date.now() });
  };
  q(".stoprec").onclick = () => rec?.stop();
  q(".cancelrec").onclick = () => rec?.cancel();

  let release = pushBack(() => { release = null; close(); });
  function close() {
    if (!ov.isConnected) return;
    stopWatch(); rec?.cancel(); ov.remove();
    if (release) { const r = release; release = null; r(); }
  }
  q(".x").onclick = close;
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
}
