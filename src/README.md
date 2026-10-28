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
- Kot Momin ke markaz se **har taraf barabar** gol daira (shuru mein 5.5 km). Bahar wala customer app nahi chala sakta, map par dikhta hai ke woh kitna door hai.
- **Admin > Settings > Service area:** map par slider se radius 0.5 se 50 km tak, markaz ko ungli se kheench kar ya map par tap kar ke badlein. Hare nuqte = pichle orders, narangi nuqte = jo log daire ke bahar se app khol rahe hain. "Save service area" dabayein, sab apps mein foran lag jata hai.
- **Admin > Live map:** online riders (khaali bhi), chalte orders, aaj ke orders, security alerts; riders aur orders ki list; nishan par click se order khulta hai. Order assign karte waqt riders customer se doori ke hisaab se nazar aate hain.
- Har map mein full screen, "meri location" aur "poora daira" buttons. Customer apna pin kheench kar laga sakta hai. Rider ko agle customer tak line nazar aati hai.

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

## Launch ke liye
- Website ka pehla page customers ke liye: Android app download (APK), iPhone ka tareeqa, madad ka number. Privacy policy: `privacy.html`.
- Phone ka "back" button app ke andar pichli screen par le jata hai (dialog pehle band hota hai).
- Tasveerein aur awaz alag rakhi jati hain (orders halke), rider sirf naye aur apne orders load karta hai: free Firebase ki roz ki had mein rehne ke liye.
- Admin mein "Sound alerts": order 3 minute se rider ke baghair pada ho to har minute awaz; laptop par Chrome notification.
- Hadd: app band ho to notification nahi aati (us ke liye Firebase ka paid plan aur server chahiye). Riders duty ke dauran app khuli rakhein.

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
