import asyncio, re, json
from playwright.async_api import async_playwright
B = "http://127.0.0.1:8767/"
S = __import__("os").path.dirname(__import__("os").path.abspath(__file__)) + "/"
IMG = S + "receipt.jpg"
INSIDE = {"latitude": 32.191, "longitude": 73.031}
NEAR_EDGE = {"latitude": 32.2335, "longitude": 73.02861}   # ~5.0 km north: andar hona chahiye
OUTSIDE = {"latitude": 32.30, "longitude": 73.03}          # ~12.4 km: bahar

def clean(t): return re.sub(r"\s+", " ", t).strip()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        errs = []
        ctx = await br.new_context(geolocation=INSIDE, permissions=["geolocation"], viewport={"width": 400, "height": 860})
        cust = await ctx.new_page()
        cust.on("pageerror", lambda e: errs.append(f"cust: {e}"))
        # 1) pehli dafa: demo data + demo KYC ban-ne do
        await cust.goto(B + "customer-app/index.html")
        await cust.wait_for_function("localStorage.getItem('kmd_seeded_kyc') === '1'", timeout=20000)
        st = await cust.evaluate("JSON.parse(localStorage.getItem('kmd_settings'))[0]")
        print("1 demo KYC seeded, public key:", bool(st.get("kycPublicKey")), "| kyc docs:", await cust.evaluate("JSON.parse(localStorage.getItem('kmd_kyc')).length"))
        # test raat ko bhi chale: auqaat 0-24
        await cust.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kmd_settings')); s[0].openFrom = 0; s[0].openTo = 24; localStorage.setItem('kmd_settings', JSON.stringify(s)); }""")
        await cust.reload()
        await cust.wait_for_selector("#app:not([hidden])", timeout=10000)
        await cust.wait_for_timeout(1500)
        print("2 demo customer (approved KYC) chip:", clean(await cust.inner_text("#kycChip")), "| kyc box empty:", (await cust.inner_text("#kycBox")).strip() == "")
        print("  area text:", clean(await cust.inner_text("#areaTxt")), "| radius flag:", await cust.inner_text("#areaKm"))

        # 2) naya customer: KYC screen pehle aani chahiye
        await cust.evaluate("""() => { localStorage.removeItem('kmd_mykyc'); localStorage.setItem('kmd_device','dev-new1'); localStorage.setItem('kmd_profile','{}'); localStorage.setItem('kmd_my','[]'); sessionStorage.clear(); }""")
        await cust.reload()
        await cust.wait_for_selector("#kyc:not([hidden])", timeout=10000)
        print("3 new customer sees KYC screen first:", await cust.is_visible("#kform"), "| intro:", clean(await cust.inner_text("#kIntro"))[:70])
        await cust.click("#kSend")
        print("4 empty submit ->", await cust.inner_text("#kErr"))
        await cust.fill("#kName", "Kashif Mehmood")
        await cust.type("#kCnic", "0000011122233")
        print("5 CNIC auto format:", await cust.input_value("#kCnic"))
        await cust.fill("#kPhone", "03459990001")
        await cust.select_option("#kArea", "Chanab Bazar"); await cust.fill("#kAddress", "Street 2, house 9")
        await cust.click("#kSend")
        print("6 without photos ->", await cust.inner_text("#kErr"))
        for i, part in enumerate(["front", "back", "selfie"]):
            await cust.locator(f'#kPhotos input[data-kp="{part}"]').nth(1).set_input_files(IMG)
            await cust.wait_for_timeout(500)
        print("7 photos added:", await cust.locator("#kPhotos .kslot.on").count())
        await cust.click("#kSend")
        print("8 without consent ->", await cust.inner_text("#kErr"))
        await cust.screenshot(path=S + "k_form.png", full_page=True)
        await cust.check("#kAgree")
        await cust.click("#kSend")
        await cust.wait_for_selector("#app:not([hidden])", timeout=15000)
        await cust.wait_for_timeout(800)
        print("9 after submit -> home banner:", clean(await cust.inner_text("#kycBox"))[:110])
        ref = await cust.evaluate("JSON.parse(localStorage.getItem('kmd_mykyc')).ref")
        stored = await cust.evaluate(f"JSON.parse(localStorage.getItem('kmd_mykyc'))")
        print("  local KYC ref:", stored.get("ref"), "mask:", stored.get("mask"))
        await cust.screenshot(path=S + "k_pending.png", full_page=True)
        # order try while pending (wait mode)
        await cust.click("[data-cat=grocery]")
        await cust.wait_for_selector(".modal .sheet", timeout=4000)
        print("10 order while pending ->", clean(await cust.inner_text(".modal .sheet"))[:120])
        await cust.click(".modal .ok")

        # 3) admin: KYC tab, unlock, approve
        admin = await ctx.new_page()
        admin.on("pageerror", lambda e: errs.append(f"admin: {e}"))
        await admin.set_viewport_size({"width": 1366, "height": 900})
        await admin.goto(B + "admin-web/index.html")
        await admin.fill("#pin", "786512"); await admin.click("#loginForm button[type=submit]")
        await admin.wait_for_selector("#shell:not([hidden])")
        await admin.wait_for_timeout(800)
        print("11 admin nav KYC badge:", clean(await admin.inner_text("#nav button[data-v=kyc]")), "| overview alert:", "waiting for KYC review" in await admin.inner_text("#alerts"))
        await admin.click("#nav button[data-v=kyc]")
        await admin.wait_for_selector("#kycUnlock")
        rows = await admin.locator("#kTbl tbody tr").count()
        print("12 pending rows (locked):", rows, "| first row:", clean(await admin.locator("#kTbl tbody tr").first.inner_text())[:110])
        await admin.fill("#kpw", "wrongpass1"); await admin.click("#kycUnlock button[type=submit]"); await admin.wait_for_timeout(1500)
        print("13 wrong password ->", await admin.inner_text("#kperr"))
        await admin.fill("#kpw", "demo1234"); await admin.click("#kycUnlock button[type=submit]")
        await admin.wait_for_function("document.querySelector('#kycTop').innerText.includes('unlocked')", timeout=10000)
        await admin.wait_for_timeout(1200)
        print("14 unlocked; CNICs visible:", clean(await admin.inner_text("#kTbl"))[:300])
        await admin.screenshot(path=S + "k_admin_list.png", full_page=True)
        # Waqas Ahmed (same CNIC as fraud) flags
        wrow = admin.locator("#kTbl tbody tr", has_text="Waqas Ahmed")
        print("15 fraud CNIC flags:", clean(await wrow.inner_text())[:220])
        # open new KYC
        await admin.locator("#kTbl tbody tr", has_text="Kashif Mehmood").locator("button").click()
        await admin.wait_for_selector("#kdrawer .kfig img", timeout=10000)
        print("16 review drawer photos decrypted:", await admin.locator("#kdrawer .kfig img").count(), "| CNIC:", clean(await admin.locator("#kdrawer dd.mono").first.inner_text()))
        await admin.screenshot(path=S + "k_admin_review.png", full_page=False)
        await admin.click("#kdrawer [data-kact=approve]"); await admin.click(".modal .ok")
        await admin.wait_for_timeout(1500)
        print("17 approved; toast:", await admin.inner_text("#toast"))
        await admin.click("#kdrawer [data-kact=close]")

        # 4) customer gets approved
        await cust.wait_for_function("document.getElementById('kycChip').innerText.trim().length > 0", timeout=8000)
        print("18 customer chip:", clean(await cust.inner_text("#kycChip")), "| banner gone:", (await cust.inner_text("#kycBox")).strip() == "")
        await cust.click("[data-cat=grocery]")
        await cust.wait_for_selector("#v-new:not([hidden])")
        print("19 order form phone locked:", await cust.eval_on_selector("#phone", "e => e.readOnly"), await cust.input_value("#phone"), "| lock hint:", await cust.is_visible("#phoneLock"))
        await cust.fill("#items", "2 kg sugar"); await cust.fill("#estimate", "400")
        await cust.select_option("#area", "Chanab Bazar"); await cust.fill("#address", "Street 2, house 9")
        await cust.click("#send")
        try: await cust.wait_for_selector("#v-track:not([hidden])", timeout=8000)
        except Exception: print("   FORM ERROR:", await cust.inner_text("#formErr")); raise
        no = (await cust.inner_text("#trNo")).strip()
        o = await cust.evaluate(f"JSON.parse(localStorage.getItem('kmd_orders')).find(o => o.no === '{no}')")
        print("20 order placed", no, "kyc field:", o.get("kyc"), "kycRef ok:", o.get("kycRef") == ref, "phone:", o.get("phone"))

        # 5) rider sees KYC badge
        rider = await ctx.new_page()
        rider.on("pageerror", lambda e: errs.append(f"rider: {e}"))
        await rider.goto(B + "rider-app/index.html")
        await rider.fill("#phone", "03001234567"); await rider.fill("#pin", "4821"); await rider.click("#loginForm button[type=submit]")
        await rider.wait_for_selector("#app:not([hidden])")
        card = rider.locator("article", has_text=no); await card.wait_for(timeout=8000)
        print("21 rider badge:", clean(await card.locator(".trustline").first.inner_text())[:120])
        await card.locator("[data-a=accept]").click()
        await rider.wait_for_timeout(800)
        print("22 rider map card visible on Active tab:", await rider.is_visible("#rmapCard") , "(map lib blocked locally, card hides if map fails)")

        # 6) reject flow: Sana (DK4)
        await admin.click("#nav button[data-v=kyc]")
        await admin.locator("#kTbl tbody tr", has_text="Sana Malik").locator("button").click()
        await admin.wait_for_selector("#kdrawer [data-kact=reject]")
        await admin.click("#kdrawer [data-kact=reject]")
        await admin.locator(".modal .stack button", has_text="Selfie does not match").click()
        await admin.wait_for_timeout(1200)
        await admin.click("#kdrawer [data-kact=close]")
        c2 = await ctx.new_page()
        c2.on("pageerror", lambda e: errs.append(f"c2: {e}"))
        await c2.goto(B + "customer-app/index.html")
        # c2 shares storage; switch identity to Sana with DK4
        await c2.evaluate("""() => { localStorage.setItem('kmd_mykyc', JSON.stringify({ref:'DK4', phone:'03221239876', name:'Sana Malik', mask:'•••••-•••9990-6', at: Date.now()-7200000})); localStorage.setItem('kmd_profile', JSON.stringify({name:'Sana Malik', phone:'03221239876'})); }""")
        await c2.reload()
        await c2.wait_for_selector("#app:not([hidden])", timeout=10000)
        await c2.wait_for_timeout(1200)
        print("23 rejected customer banner:", clean(await c2.inner_text("#kycBox"))[:140])
        await c2.click("#kycBox [data-kyc]")
        await c2.wait_for_selector("#kyc:not([hidden])")
        print("24 KYC screen shows reason:", clean(await c2.inner_text("#kRej"))[:120])

        # 7) fraud CNIC tries to register
        await c2.evaluate("""() => { localStorage.removeItem('kmd_mykyc'); localStorage.setItem('kmd_device','dev-fraud2'); localStorage.setItem('kmd_profile','{}'); }""")
        await c2.reload()
        await c2.wait_for_selector("#kyc:not([hidden])", timeout=10000)
        await c2.fill("#kName", "Waqas Ali"); await c2.fill("#kCnic", "00000-7766554-3"); await c2.fill("#kPhone", "03335550000")
        await c2.select_option("#kArea", "Sargodha Road"); await c2.fill("#kAddress", "Near the market")
        for part in ["front", "back", "selfie"]:
            await c2.locator(f'#kPhotos input[data-kp="{part}"]').nth(1).set_input_files(IMG); await c2.wait_for_timeout(300)
        await c2.check("#kAgree"); await c2.click("#kSend")
        await c2.wait_for_function("document.getElementById('kErr').innerText.length > 0", timeout=10000)
        print("25 fraud CNIC submit ->", await c2.inner_text("#kErr"))
        await c2.wait_for_timeout(800)
        al = await c2.evaluate("JSON.parse(localStorage.getItem('kmd_alerts')).filter(a => a.type==='fraud_kyc').map(a => a.phone + ' via ' + a.match)")
        print("26 fraud_kyc alerts:", al)

        # 8) 5.5 km daira: andar / bahar
        for name, geo in (("near edge 5.0 km", NEAR_EDGE), ("outside 12.4 km", OUTSIDE)):
            cx = await br.new_context(geolocation=geo, permissions=["geolocation"], viewport={"width": 400, "height": 860})
            pg = await cx.new_page()
            pg.on("pageerror", lambda e: errs.append(f"geo: {e}"))
            await pg.goto(B + "customer-app/index.html")
            await pg.wait_for_function("localStorage.getItem('kmd_seeded_kyc') === '1'", timeout=20000)
            await pg.reload()
            await pg.wait_for_function("!document.getElementById('app').hidden || !document.getElementById('kyc').hidden || document.getElementById('gTitle').innerText.includes(\"don't\")", timeout=10000)
            where = "app" if await pg.is_visible("#app") else "kyc" if await pg.is_visible("#kyc") else "gate"
            print(f"27 {name}: ->", where, "|", clean(await pg.inner_text("#gText"))[:120] if where == "gate" else "")
            if where == "gate": await pg.screenshot(path=S + "k_outside.png")
            await cx.close()

        # 9) purani 3 km setting -> 5.5 km (jab tak admin radius save na kare)
        await cust.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kmd_settings')); s[0].radiusKm = 3; delete s[0].radiusSet; localStorage.setItem('kmd_settings', JSON.stringify(s)); }""")
        await cust.wait_for_timeout(2000)
        await cust.click("#tabs [data-v=home]"); await cust.wait_for_timeout(500)
        print("28 old radius 3 migrated ->", await cust.inner_text("#areaKm"))
        await admin.click("#nav button[data-v=settings]")
        await admin.wait_for_timeout(500)
        print("29 admin settings radius shows:", await admin.input_value("#s_radiusKm"), "| kycMode:", await admin.input_value("#s_kycMode"), "| kycHours:", await admin.input_value("#s_kycHours"))
        await admin.select_option("#s_kycMode", "allow")
        await admin.click("#sform button[type=submit]"); await admin.wait_for_timeout(1500)
        st = await admin.evaluate("JSON.parse(localStorage.getItem('kmd_settings'))[0]")
        print("30 saved: radiusKm", st.get("radiusKm"), "radiusSet", st.get("radiusSet"), "kycMode", st.get("kycMode"))

        # 10) security tab shows fraud_kyc alert
        await admin.click("#nav button[data-v=security]"); await admin.wait_for_timeout(500)
        print("31 security alerts:", clean(await admin.inner_text("#alTbl"))[:200])
        await admin.click("#nav button[data-v=customers]"); await admin.wait_for_timeout(400)
        print("32 customers KYC column:", clean(await admin.locator("#cuTbl tbody tr", has_text="Ahmed Raza").first.inner_text())[:120])
        print("ERRORS:", errs or "none")
        await br.close()
asyncio.run(main())
