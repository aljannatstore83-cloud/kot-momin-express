# Kot Momin Express: guide

Teen alag apps hain. Har aik ka apna folder, apna icon, aur har aik phone mein alag install hoti hai:

| Folder | Kis ke liye | Icon |
|---|---|---|
| `customer-app` | Customers | Hara |
| `rider-app` | Riders | Narangi, "R" ke saath |
| `admin-web` | Aap (web version aur Android app) | Kala, "A" ke saath |

Teeno aik hi Firebase database istemal karti hain, is liye aapas mein jure rehte hain.

## Live system (sab se zaroori)
- Android apps (APK) ab sirf aik "darwaza" hain jo **live website** kholti hain. Website par update aate hi sab phones par app khud update ho jati hai, dobara APK install nahi karni parti.
- Website GitHub se Netlify par khud jati hai (Netlify ko GitHub repo se aik dafa jorna hai, neeche dekhein).
- `live.json` (GitHub par) batata hai ke apps kis website se chalein. Hosting badalni ho to sirf yeh file badlein.

## KYC (customer ki tasdeeq)
- Naya customer shuru mein hi aik dafa: pura naam, **CNIC number**, mobile number, ghar ka pata, **CNIC ki aage aur peeche ki photo** aur **selfie** bhejta hai.
- CNIC aur tasveerein customer ke phone par hi **lock (encrypt)** ho kar jati hain. Inhein sirf aap ka **KYC password** khol sakta hai (admin PIN se alag).
- Admin > **KYC** tab mein "Pending" list, har KYC ka **24 ghante ka deadline** (late ho to laal), photos, call/WhatsApp button, Approve / Reject (wajah ke saath).
- Settings > KYC: approve hone tak order band (recommended), ya review ke dauran bhi order, ya KYC off.
- Aik hi CNIC kisi aur number se aaye, ya fraud list wale banday ka CNIC aaye, to laal nishan aur Security alert.
- Pehli dafa: Admin > KYC mein apna KYC password banayein (kam az kam 8 harf, harf aur number dono). Yeh password likh kar sambhal lein: bhool gaye to purane documents nahi khulenge.

## Service area aur map
- Kot Momin ke markaz se **har taraf barabar 5.5 km** ka gol daira. Bahar wala customer app nahi chala sakta, map par dikhta hai ke woh kitna door hai.
- Hamara apna map: daire ke bahar ka hissa dhundla, markaz ka nishan, "5.5 km" label; customer, rider aur admin teeno mein.
- Settings > Service area mein radius aur markaz badal sakte hain. Shehar ke beech khade ho kar "Use my current location as the centre" dabayein.

## Customer app mein kya hai
- Location on kiye baghair app nahi khulti; sirf service area mein order hota hai
- Har dafa app kholne par location, IP aur device record hota hai (pehle screen par customer ko bataya jata hai)
- Categories: kiryana, phal/sabzi, rehri/snacks (moong phali, samosa), khana, bakery, medical, mobile, kuch bhi, parcel
- Jaldi add karne ke buttons, **awaz mein order** (60 sec) aur **list/nuskhe ki photo**
- Rider ki live location, waqt, "rider darwaze par hai" alert
- Bill ki photo aur raqam saamne; "bill ghalat hai" button
- Customer khud batata hai kitna cash diya
- 4 hindson ka delivery code, chat (text + voice mic button), rating, shikayat
- Customer ka apna darja aur KYC ki halat, English aur Urdu

## Rider app mein kya hai
- Mobile number + admin ka diya PIN
- Har order par customer ka **trust level** aur **"KYC verified"** nishan (rider ko CNIC nazar nahi aata)
- Active tab mein map: rider aur customers ke ghar, Kot Momin ka daira
- 3 qadam: customer ko call karke confirm, saman khareed kar bill + **photo (lazmi)**, "main pohanch gaya" aur customer ka code
- Masla ya **ڈکیتی/دھمکی (emergency)** report: admin ko foran alert
- Wallet: jama karwane wala cash, aaj ki kamai, rating

## Admin
Riders register karna, block karna, **fraud mark karna** (number, phone, IP aur KYC ho to CNIC bhi), KYC review, Security tab (fraud wala banda app khole ya KYC bheje to alert + location), police report (KYC ho to CNIC ke saath), cash hisaab, settings.
Admin PIN: **786512** (Settings se badal sakte hain)

## Kaun se phone par chalegi
- Android 5.1 aur us se upar (APK), iPhone par Safari se "Add to Home Screen"
- Chrome ya "Android System WebView" update hona chahiye (Play Store se)

## Netlify ko GitHub se jorna (aik dafa, phir sab updates khud)
1. https://app.netlify.com kholein aur apni site (spontaneous-lamington-c5c48f) par click karein
2. **Site configuration** > **Build & deploy** > **Link repository** (ya "Link to Git")
3. **GitHub** chunein, ijazat dein, phir repo **kot-momin-express** chunein
4. Branch: `main`. Baqi sab khali chhor dein (`netlify.toml` khud batata hai ke `web` folder chalana hai)
5. **Deploy** dabayein. Bas, ab har update khud live hogi

## Demo (laptop par)
`demo.html` kholein. Customer: "Demo: use a location in Kot Momin". Rider: 03001234567 / PIN 4821. Admin: 786512, KYC password: demo1234.

## Firebase rules
Firestore > Rules mein `admin-web/firestore.rules` ka text paste karein (KYC ke rules bhi is mein hain).
