"""Customer, rider aur admin ko aik demo page mein jodta hai (laptop par dekhne ke liye).
Teeno apps iframe (srcdoc) mein chalti hain aur aik hi storage share karti hain."""
import re, base64, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / "build"
read = lambda n: (P / n).read_text(encoding="utf-8")


APPS_DIR = ROOT / "build" / "web-demo"  # demo config: asli database ko kabhi na chhuey

def page(folder):
    d = APPS_DIR / folder
    h = (d / "index.html").read_text(encoding="utf-8")
    js = lambda n: (d / n).read_text(encoding="utf-8").replace("</script", "<\\/script")
    h = h.replace('<script src="config.js"></script>', "<script>" + js("config.js") + "</script>")
    h = h.replace('<script src="app.js"></script>', "<script>" + js("app.js") + "</script>")
    h = h.replace('<link rel="stylesheet" href="app.css">', "<style>" + (d / "app.css").read_text(encoding="utf-8") + "</style>")
    h = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*', "", h)
    assert "app.js" not in h and "config.js" not in h
    return h


b64 = {k: base64.b64encode(page(f).encode("utf-8")).decode() for k, f in
       [("customer", "customer-app"), ("rider", "rider-app"), ("admin", "admin-web")]}

STYLE = """
/* Layout: sticky top bar, credentials strip, phone frames in a row, admin console full width below */
:root{
  --bg:#EEF1EE;--surface:#fff;--fg:#0F1B14;--muted:#5C6A62;--line:#D6DED8;--brand:#0B7A4B;--brand-fg:#fff;--soft:#E1EFE7;--bezel:#0E1A14;
  --font:"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--display:"Sora","Manrope",system-ui,sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0B130E;--surface:#142019;--fg:#E7F0EA;--muted:#9AAEA2;--line:#26372D;--brand:#3FC382;--brand-fg:#06140C;--soft:#1B2D23;--bezel:#26372D;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0B130E;--surface:#142019;--fg:#E7F0EA;--muted:#9AAEA2;--line:#26372D;--brand:#3FC382;--brand-fg:#06140C;--soft:#1B2D23;--bezel:#26372D;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 var(--font);
  padding-block:20px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
.top{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between}
.top h1{font:700 22px/1.2 var(--display);margin:0;letter-spacing:-.01em}
.top p{margin:2px 0 0;color:var(--muted);font-size:13.5px}
.tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.seg{display:flex;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:3px;gap:2px}
.seg button{font:inherit;font-weight:700;font-size:13px;border:0;background:none;color:var(--muted);padding:8px 14px;border-radius:9px;cursor:pointer}
.seg button.on{background:var(--brand);color:var(--brand-fg)}
.seg button:focus-visible,.reset:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.reset{font:inherit;font-weight:700;font-size:13px;border:1px solid var(--line);background:var(--surface);color:var(--fg);padding:9px 14px;border-radius:12px;cursor:pointer}
.creds{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.cred{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;min-width:0}
.cred small{display:block;color:var(--muted);font-weight:700;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}
.cred b{display:block;margin-top:4px;font-family:var(--display);font-size:16px;overflow-wrap:anywhere}
.cred span{display:block;margin-top:2px;color:var(--muted);font-size:13px}
.stage{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;justify-content:center}
.dev{min-width:0}
.dev>h2{font:700 13px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 10px 4px}
.phone{width:392px;max-width:100%}
.phone iframe{width:100%;height:790px;border:10px solid var(--bezel);border-radius:38px;background:#fff;display:block}
.desk{flex:1 1 100%;width:100%}
.win{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface);box-shadow:0 10px 30px rgba(0,0,0,.08)}
.win .bar{display:flex;gap:6px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--bg)}
.win .bar i{width:10px;height:10px;border-radius:50%;background:var(--line)}
.win .bar span{margin-left:10px;font-size:12px;color:var(--muted);font-weight:600}
.desk iframe{width:100%;height:780px;border:0;display:block;background:#fff}
.stage.f-customer .rider,.stage.f-customer .admin,.stage.f-rider .customer,.stage.f-rider .admin,.stage.f-admin .customer,.stage.f-admin .rider{display:none}
.stage.f-customer .phone iframe,.stage.f-rider .phone iframe{height:840px}
.note{color:var(--muted);font-size:13px;max-width:90ch}
@media (max-width:700px){.phone iframe{height:700px}}
"""

BODY = """
<div class="wrap">
  <header class="top">
    <div><h1>Kot Momin Express, live demo</h1><p>Customer, rider and admin apps, fully working and sharing the same data. English and Urdu.</p></div>
    <div class="tools">
      <div class="seg" id="seg" role="group" aria-label="Choose screen">
        <button type="button" data-f="all" class="on">All screens</button><button type="button" data-f="customer">Customer</button><button type="button" data-f="rider">Rider</button><button type="button" data-f="admin">Admin</button>
      </div>
      <button class="reset" id="reset" type="button">Reset demo data</button>
    </div>
  </header>

  <section class="creds" aria-label="Demo sign-ins">
    <div class="cred"><small>Customer app</small><b>Tap "Demo: use a location in Kot Momin"</b><span>The real app opens only with GPS on, inside Kot Momin</span></div>
    <div class="cred"><small>Rider app</small><b>03001234567 &middot; PIN 4821</b><span>Or register your own rider with your own PIN in Admin &gt; Riders</span></div>
    <div class="cred"><small>Admin console PIN</small><b>786512 &middot; KYC password demo1234</b><span>KYC tab: unlock with the KYC password to see CNIC photos, then approve or reject</span></div>
  </section>

  <main class="stage" id="stage">
    <section class="dev phone customer"><h2>Customer app</h2><iframe id="f-customer" title="Customer app" allow="geolocation; microphone"></iframe></section>
    <section class="dev phone rider"><h2>Rider app</h2><iframe id="f-rider" title="Rider app" allow="geolocation; microphone"></iframe></section>
    <section class="dev desk admin"><h2>Admin console</h2><div class="win"><div class="bar"><i></i><i></i><i></i><span>Admin console</span></div><iframe id="f-admin" title="Admin console" allow="geolocation; microphone"></iframe></div></section>
  </main>
  <p class="note">New in this version: KYC (new customers send CNIC front, back and a selfie; you approve in Admin &gt; KYC within 24 hours) and the 5.5 km service circle around Kot Momin centre. Try the full flow: place an order as Customer, accept it in Rider, tap "Customer confirmed", enter the shop bill, then type the 4-digit delivery code shown in the Customer app. Watch everything update in Admin. Map tiles, real GPS, IP address and voice messages work on the live website; in this preview tick "Demo: simulate movement" in the Rider app to see a moving rider.</p>
</div>
"""

SCRIPT = """
<script>
(function(){
  var base = null, mem = {};
  try { localStorage.setItem("_t","1"); localStorage.removeItem("_t"); base = localStorage; } catch(e) {}
  window.__kmdStorage = {
    getItem: function(k){ return base ? base.getItem(k) : (k in mem ? mem[k] : null); },
    setItem: function(k,v){ if (base) base.setItem(k,v); else mem[k] = String(v); },
    removeItem: function(k){ if (base) base.removeItem(k); else delete mem[k]; },
    keys: function(){ return base ? Object.keys(base) : Object.keys(mem); }
  };
  var data = %s;
  function dec(b){ return new TextDecoder().decode(Uint8Array.from(atob(b), function(c){ return c.charCodeAt(0); })); }
  Object.keys(data).forEach(function(k){ document.getElementById("f-"+k).srcdoc = dec(data[k]); });
  var stage = document.getElementById("stage");
  document.getElementById("seg").addEventListener("click", function(e){
    var b = e.target.closest("button[data-f]"); if (!b) return;
    stage.className = "stage" + (b.dataset.f === "all" ? "" : " f-" + b.dataset.f);
    document.querySelectorAll("#seg button").forEach(function(x){ x.classList.toggle("on", x === b); });
  });
  document.getElementById("reset").addEventListener("click", function(){
    window.__kmdStorage.keys().filter(function(k){ return k.indexOf("kmd_") === 0; }).forEach(function(k){ window.__kmdStorage.removeItem(k); });
    location.reload();
  });
})();
</script>
""" % repr(b64).replace("'", '"')

TITLE = "Kot Momin Express Demo"
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Sora:wght@600;700&display=swap">'
full = f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{TITLE}</title>{FONTS}<style>{STYLE}</style></head><body>{BODY}{SCRIPT}</body></html>\n'
artifact = f'<title>{TITLE}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n{FONTS}\n<style>{STYLE}</style>\n{BODY}{SCRIPT}\n'

(P / "demo.html").write_text(full, encoding="utf-8")
pathlib.Path(sys.argv[1]).write_text(artifact, encoding="utf-8")
print("demo.html", len(full) // 1024, "KB")
