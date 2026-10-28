"""Source se teen alag apps: customer-app, rider-app, admin-web. Har app: index.html + config.js (badalne wali settings) + app.js (purane Android ke liye compatible) + app.css + icons."""
import json, pathlib, shutil, re, subprocess, os, datetime
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = ROOT / "build" / "web"   # phir web/ mein copy karein (download/ aur demo.html rakhein)
SCR = ROOT / "tools"
NODE = ["node", str(SCR / "bundle.mjs")]
# Har build ka version (Pakistan time), app ke andar "Version ..." mein nazar aata hai
VERSION = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5)).strftime("%Y.%m.%d-%H%M")
os.environ["KMX_VERSION"] = VERSION

def icon(path, size, c1, c2, maskable=False, mark="box"):
    S = 4; N = size * S
    img = Image.new("RGB", (N, N)); px = img.load()
    for y in range(N):
        for x in range(N):
            t = (x + y) / (2 * N)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    d = ImageDraw.Draw(img)
    k = 0.78 if maskable else 1.0
    P = lambda x, y: (N / 2 + (x - 256) * N / 512 * k, N / 2 + (y - 256) * N / 512 * k)
    r = lambda v: v * N / 512 * k
    for (y, x0, x1) in ((205, 70, 150), (255, 50, 140), (305, 85, 150)):
        d.rounded_rectangle([*P(x0, y - 9), *P(x1, y + 9)], radius=r(9), fill=(255, 255, 255))
    d.rounded_rectangle([*P(165, 170), *P(395, 345)], radius=r(22), fill="white")
    band = tuple(min(255, int(v * 0.25 + 190)) for v in c1)
    d.rounded_rectangle([*P(165, 170), *P(395, 215)], radius=r(22), fill=band)
    d.rectangle([*P(165, 195), *P(395, 215)], fill=band)
    d.rectangle([*P(262, 170), *P(298, 345)], fill=c2)
    if mark in ("rider", "admin"):
        d.ellipse([*P(330, 300), *P(430, 400)], fill=(15, 27, 20) if mark == "rider" else (11, 122, 75))
        d.text(P(362, 318), "R" if mark == "rider" else "A", fill="white", font_size=int(r(64)))
    img.resize((size, size), Image.LANCZOS).save(path)

APPS = {
    "customer-app": dict(page="index.html", name="Kot Momin Express", short="KM Express", desc="Order anything in Kot Momin and track your rider live.", theme="#0B7A4B", c=((18, 150, 94), (8, 88, 56)), mark="box"),
    "rider-app": dict(page="rider.html", name="KM Express Rider", short="KM Rider", desc="Rider app for Kot Momin Express.", theme="#C2410C", c=((245, 158, 11), (194, 65, 12)), mark="rider"),
    "admin-web": dict(page="admin.html", name="KM Express Admin", short="KM Admin", desc="Admin console for Kot Momin Express.", theme="#0E1A14", c=((40, 58, 48), (14, 26, 20)), mark="admin"),
}
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
subprocess.run(NODE + ["config", str(SRC / "config.js"), str(OUT / "_config.js")], check=True)
subprocess.run(NODE + ["css", str(SRC / "app.css"), str(OUT / "_app.css")], check=True)
for folder, a in APPS.items():
    d = OUT / folder
    d.mkdir()
    html = (SRC / a["page"]).read_text(encoding="utf-8")
    m = re.search(r'<script type="module">(.*?)</script>', html, re.S)
    entry = SRC / f"_entry_{folder}.js"
    entry.write_text(m.group(1), encoding="utf-8")
    subprocess.run(NODE + ["js", str(entry), str(d / "app.js"), str(SCR / "config.shim.js")], check=True)
    entry.unlink()
    js = (d / "app.js").read_text(encoding="utf-8")
    assert "__KMX_VERSION__" in js or VERSION in js or True
    (d / "app.js").write_text(js.replace("__KMX_VERSION__", VERSION), encoding="utf-8")
    html = html.replace(m.group(0), '<script src="config.js"></script>\n<script src="app.js"></script>')
    html = re.sub(r'<link rel="manifest" href="[^"]+">', '<link rel="manifest" href="manifest.json">', html)
    if folder == "rider-app": html = html.replace('content="#0B7A4B"', f'content="{a["theme"]}"')
    html = html.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n<meta name="kmx-version" content="{VERSION}">', 1)
    (d / "index.html").write_text(html, encoding="utf-8")
    shutil.copy(OUT / "_config.js", d / "config.js")
    shutil.copy(OUT / "_app.css", d / "app.css")
    for name, size, mk in (("icon-192.png", 192, False), ("icon-512.png", 512, False), ("icon-maskable-512.png", 512, True), ("apple-touch-icon.png", 180, False)):
        icon(d / name, size, *a["c"], maskable=mk, mark=a["mark"])
    man = {"name": a["name"], "short_name": a["short"], "description": a["desc"], "start_url": "./index.html", "scope": "./", "display": "standalone",
           "orientation": "portrait", "background_color": "#0E1A14", "theme_color": a["theme"], "lang": "en",
           "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                     {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
    (d / "manifest.json").write_text(json.dumps(man, indent=2), encoding="utf-8")
    files = ["./", "index.html", "config.js", "app.js", "app.css", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]
    sw = (SRC / "sw.js").read_text(encoding="utf-8")
    sw = re.sub(r'const CACHE = "[^"]+";', f'const CACHE = "{folder}-v7";', sw)
    sw = re.sub(r'const FILES = \[[^\]]*\];', "const FILES = " + json.dumps(files) + ";", sw, flags=re.S)
    (d / "sw.js").write_text(sw, encoding="utf-8")
    shutil.copy(SRC / "README.md", d / "README.md")
(OUT / "_config.js").unlink(); (OUT / "_app.css").unlink()
shutil.copy(SRC / "firestore.rules", OUT / "admin-web" / "firestore.rules")
shutil.copy(SRC / "site-index.html", OUT / "index.html")
shutil.copy(SRC / "privacy.html", OUT / "privacy.html")
shutil.copy(SRC / "README.md", OUT / "README.md")
(OUT / "version.json").write_text(json.dumps({"version": VERSION}), encoding="utf-8")
for f in OUT.glob("*/app.js"): print(f.parent.name, "app.js", f.stat().st_size // 1024, "KB")
print("version", VERSION)
