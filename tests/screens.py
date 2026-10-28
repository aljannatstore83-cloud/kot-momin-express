"""GitHub Actions par asli internet ke saath screenshots (map tiles, Leaflet) - demo data ke saath.
Natije 'test-shots' branch par jate hain."""
import asyncio, functools, http.server, os, re, shutil, socketserver, threading, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = pathlib.Path("/tmp/kmx-site")
OUT = ROOT / "shots"
PORT = 8800
B = f"http://127.0.0.1:{PORT}/"
UA = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36"
INSIDE = {"latitude": 32.191, "longitude": 73.031}
OUTSIDE = {"latitude": 32.262, "longitude": 72.985}
log = []

def prep():
    if SITE.exists(): shutil.rmtree(SITE)
    shutil.copytree(ROOT / "web", SITE)
    for cfg in SITE.glob("*/config.js"):
        cfg.write_text(re.sub(r'"apiKey": "[^"]*"', '"apiKey": "YOUR_API_KEY"', cfg.read_text()))
    OUT.mkdir(exist_ok=True)
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

async def tiles(pg, sel, n=4, ms=25000):
    try:
        await pg.wait_for_function(f"document.querySelectorAll('{sel} .leaflet-tile-loaded').length >= {n}", timeout=ms)
        await pg.wait_for_timeout(800)
        return "tiles ok"
    except Exception as e:
        return "TILES NOT LOADED: " + str(e)[:80]

async def phone(br, geo, lang=None):
    ctx = await br.new_context(geolocation=geo, permissions=["geolocation"], viewport={"width": 400, "height": 860}, device_scale_factor=2, user_agent=UA)
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: log.append(f"pageerror: {e}"))
    pg.on("console", lambda m: log.append(f"console {m.type}: {m.text[:160]}") if m.type == "error" else None)
    await pg.goto(B + "customer-app/index.html")
    await pg.wait_for_function("localStorage.getItem('kmd_seeded_kyc') === '1'", timeout=30000)
    await pg.evaluate("""(l) => { const s = JSON.parse(localStorage.getItem('kmd_settings')); s[0].openFrom = 0; s[0].openTo = 24; localStorage.setItem('kmd_settings', JSON.stringify(s)); if (l) localStorage.setItem('kmd_lang_customer', l); }""", lang)
    return ctx, pg

async def main():
    prep()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        # 1) customer home + service area map
        ctx, pg = await phone(br, INSIDE)
        await pg.reload(); await pg.wait_for_selector("#app:not([hidden])", timeout=15000)
        card = pg.locator(".areacard"); await card.scroll_into_view_if_needed()
        log.append("home map: " + await tiles(pg, "#amap"))
        await card.screenshot(path=str(OUT / "1-home-area-map.png"))
        await pg.evaluate("window.scrollTo(0,0)"); await pg.screenshot(path=str(OUT / "1b-home-top.png"))
        # 2) tracking map (order on the way)
        await pg.click("#tabs [data-v=orders]"); await pg.click("[data-open=D5]")
        await pg.wait_for_selector("#tmap:not([hidden])")
        log.append("track map: " + await tiles(pg, "#tmap"))
        await pg.locator(".ocard").first.screenshot(path=str(OUT / "2-track-map.png"))
        # 3) new customer -> KYC screen (English + Urdu)
        await pg.evaluate("""() => { localStorage.removeItem('kmd_mykyc'); localStorage.setItem('kmd_device','dev-shot'); localStorage.setItem('kmd_profile','{}'); }""")
        await pg.reload(); await pg.wait_for_selector("#kyc:not([hidden])", timeout=15000)
        await pg.screenshot(path=str(OUT / "3-kyc-en.png"), full_page=True)
        await pg.click("#kLang"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=str(OUT / "3b-kyc-ur.png"), full_page=True)
        await ctx.close()
        # 4) outside the 5.5 km circle
        ctx, pg = await phone(br, OUTSIDE)
        await pg.reload(); await pg.wait_for_selector("#gMap:not([hidden])", timeout=15000)
        log.append("gate map: " + await tiles(pg, "#gMap"))
        await pg.screenshot(path=str(OUT / "4-outside-gate.png"))
        log.append("gate text: " + (await pg.inner_text("#gText")))
        await ctx.close()
        # 5) rider: active order map
        ctx, pg = await phone(br, INSIDE)
        await pg.goto(B + "rider-app/index.html")
        await pg.fill("#phone", "03001234567"); await pg.fill("#pin", "4821"); await pg.click("#loginForm button[type=submit]")
        await pg.wait_for_selector("#app:not([hidden])")
        await pg.check("#sim"); await pg.click("#tabs [data-f=active]")
        await pg.wait_for_selector("#rmapCard:not([hidden])", timeout=15000)
        log.append("rider map: " + await tiles(pg, "#rmap"))
        await pg.wait_for_timeout(3500)
        await pg.screenshot(path=str(OUT / "5-rider-active-map.png"))
        await ctx.close()
        # 6) admin: KYC review + live map
        ctx = await br.new_context(viewport={"width": 1366, "height": 900}, user_agent=UA.replace("Mobile ", ""))
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: log.append(f"admin pageerror: {e}"))
        await pg.goto(B + "admin-web/index.html")
        await pg.wait_for_function("localStorage.getItem('kmd_seeded_kyc') === '1'", timeout=30000)
        await pg.reload()
        await pg.fill("#pin", "786512"); await pg.click("#loginForm button[type=submit]")
        await pg.wait_for_selector("#shell:not([hidden])")
        await pg.click("#nav button[data-v=kyc]"); await pg.wait_for_selector("#kycUnlock")
        await pg.screenshot(path=str(OUT / "6-admin-kyc-locked.png"))
        await pg.fill("#kpw", "demo1234"); await pg.click("#kycUnlock button[type=submit]")
        await pg.wait_for_function("document.querySelector('#kycTop').innerText.includes('unlocked')", timeout=15000)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=str(OUT / "6b-admin-kyc-list.png"))
        await pg.locator("#kTbl tbody tr", has_text="Waqas Ahmed").locator("button").click()
        await pg.wait_for_selector("#kdrawer .kfig img", timeout=15000); await pg.wait_for_timeout(600)
        await pg.screenshot(path=str(OUT / "6c-admin-kyc-review.png"))
        await pg.click("#kdrawer [data-kact=close]")
        await pg.click("#nav button[data-v=map]"); await pg.wait_for_selector("#bigmap")
        log.append("admin map: " + await tiles(pg, "#bigmap", 6))
        await pg.screenshot(path=str(OUT / "7-admin-live-map.png"))
        await br.close()
    (OUT / "log.txt").write_text("\n".join(log) or "no messages")
    print("\n".join(log))

asyncio.run(main())
