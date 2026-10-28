import asyncio, re
from playwright.async_api import async_playwright
B = "http://127.0.0.1:8767/"
async def vis(pg, ids):
    return [i for i in ids if await pg.is_visible(i)]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(geolocation={"latitude": 32.191, "longitude": 73.031}, permissions=["geolocation"], viewport={"width": 400, "height": 860})
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(B + "customer-app/index.html")
        await pg.wait_for_function("localStorage.getItem('kmd_seeded_kyc') === '1'", timeout=20000)
        await pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kmd_settings')); s[0].openFrom = 0; s[0].openTo = 24; localStorage.setItem('kmd_settings', JSON.stringify(s)); }""")
        await pg.reload(); await pg.wait_for_selector("#app:not([hidden])", timeout=10000)
        V = ["#v-home", "#v-new", "#v-orders", "#v-track", "#v-account"]
        await pg.click("#tabs [data-v=orders]"); await pg.click("[data-open=D5]"); await pg.wait_for_selector("#v-track:not([hidden])")
        print("customer at:", await vis(pg, V))
        await pg.go_back(); await pg.wait_for_timeout(400); print(" back ->", await vis(pg, V))
        await pg.go_back(); await pg.wait_for_timeout(400); print(" back ->", await vis(pg, V))
        await pg.click("[data-cat=grocery]"); await pg.wait_for_selector("#v-new:not([hidden])")
        await pg.go_back(); await pg.wait_for_timeout(400); print(" new order then back ->", await vis(pg, V))
        # dialog closes with back
        await pg.click("#tabs [data-v=orders]"); await pg.click("[data-open=D5]"); await pg.wait_for_selector("#v-track:not([hidden])")
        await pg.click("#trChat"); await pg.wait_for_selector(".modal .msgs")
        await pg.go_back(); await pg.wait_for_timeout(400); print(" chat open then back -> modal gone:", await pg.locator(".modal").count() == 0, "| still", await vis(pg, V))
        await pg.go_back(); await pg.wait_for_timeout(400); print(" back ->", await vis(pg, V))
        await pg.click("#tabs [data-v=home]"); await pg.wait_for_timeout(300)
        print(" history length now:", await pg.evaluate("history.length"))
        # admin
        ad = await ctx.new_page(); ad.on("pageerror", lambda e: errs.append("admin: " + str(e)))
        await ad.set_viewport_size({"width": 1300, "height": 860})
        await ad.goto(B + "admin-web/index.html"); await ad.fill("#pin", "786512"); await ad.click("#loginForm button[type=submit]")
        await ad.wait_for_selector("#shell:not([hidden])")
        await ad.click("#nav button[data-v=kyc]"); await ad.locator("#kTbl tbody tr").first.locator("button").click()
        await ad.wait_for_selector("#kdrawer")
        await ad.go_back(); await ad.wait_for_timeout(400)
        print("admin: drawer closed by back:", await ad.locator("#kdrawer").count() == 0, "| view:", await ad.inner_text("#vtitle"))
        await ad.go_back(); await ad.wait_for_timeout(400)
        print("admin: back again -> view:", await ad.inner_text("#vtitle"))
        await ad.click("#nav button[data-v=orders]"); await ad.locator("#oTbl tbody tr").first.click(); await ad.wait_for_selector("#drawer")
        await ad.locator("#drawer [data-act=close]").click(); await ad.wait_for_timeout(400)
        print("admin: drawer closed by button, view:", await ad.inner_text("#vtitle"), "| drawer:", await ad.locator("#drawer").count())
        await ad.go_back(); await ad.wait_for_timeout(400); print("admin: back -> view:", await ad.inner_text("#vtitle"))
        # rider
        rd = await ctx.new_page(); rd.on("pageerror", lambda e: errs.append("rider: " + str(e)))
        await rd.goto(B + "rider-app/index.html"); await rd.fill("#phone", "03001234567"); await rd.fill("#pin", "4821"); await rd.click("#loginForm button[type=submit]")
        await rd.wait_for_selector("#app:not([hidden])")
        await rd.click("#tabs [data-f=wallet]"); await rd.wait_for_timeout(300)
        await rd.go_back(); await rd.wait_for_timeout(400)
        print("rider: wallet then back -> tab:", await rd.eval_on_selector("#tabs .tab.on", "e => e.dataset.f"))
        await rd.wait_for_timeout(2500)
        print("rider: available card trust:", re.sub(r"\s+", " ", await rd.locator("article .trustline").first.inner_text())[:90])
        print("errors:", errs or "none")
        await br.close()
asyncio.run(main())
