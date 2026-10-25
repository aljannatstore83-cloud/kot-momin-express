# Kot Momin Express: guide

Teen alag apps hain. Har aik ka apna folder, apna icon, aur har aik phone mein alag install hoti hai:

| Folder | Kis ke liye | Icon |
|---|---|---|
| `customer-app` | Customers | Hara |
| `rider-app` | Riders | Narangi, "R" ke saath |
| `admin-web` | Aap (abhi web version; Windows software baad mein) | Kala, "A" ke saath |

Teeno aik hi Firebase database istemal karti hain, is liye aapas mein jure rehte hain.

## Customer app mein kya hai
- Location on kiye baghair app nahi khulti; sirf Kot Momin ke service area mein order hota hai
- Har dafa app kholne par location, IP aur device record hota hai (pehle screen par customer ko bataya jata hai)
- Categories: kiryana, phal/sabzi, rehri/snacks (moong phali, samosa), khana, bakery, medical, mobile, kuch bhi, parcel
- Jaldi add karne ke buttons, **awaz mein order** (60 sec) aur **list/nuskhe ki photo**
- Pehla order kabhi nahi rukta
- Rider ki live location, waqt, "rider darwaze par hai" alert
- Bill ki photo aur raqam saamne; "bill ghalat hai" button
- Customer khud batata hai kitna cash diya
- 4 hindson ka delivery code, chat (text + voice mic button), rating, shikayat
- Customer ka apna darja (Trusted customer waghera), English aur Urdu

## Rider app mein kya hai
- Mobile number + admin ka diya PIN
- Har order par customer ka **trust level**: pehla order / achha / qabil-e-aitmaad / ehtiyat / zyada khatra, pichle orders, cancel, fail, darwaze par intezar
- Customer ki awaz wala order sunna aur photo dekhna
- 3 qadam: customer ko call karke confirm, saman khareed kar bill + **bill ya saman ki photo (lazmi)**, "main pohanch gaya" aur customer ka code
- Masla ya **ڈکیتی/دھمکی (emergency)** report: admin ko foran alert
- Wallet: jama karwane wala cash, aaj ki kamai, rating

## Admin (abhi web, baad mein Windows software)
Riders register karna, block karna, **fraud mark karna**, Security tab (fraud wala banda app khole to alert + location), police report download, cash hisaab, settings.
Admin PIN: **786512**

## Kaun se Android par chalegi
- **Android 5.0 aur us se upar** ka har phone, jis mein Chrome ya "Android System WebView" 2016 ke baad kabhi update hua ho (Pakistan mein chalne wale taqreeban sab phones)
- Chrome, Samsung Internet, Opera, Mi Browser waghera sab mein chalti hai
- Install: Chrome / Samsung Internet mein "Install app"; baqi browsers mein menu (⋮) > "Add to Home screen". App ke andar bhi yeh hidayat likhi hai
- Chhoti 320px screen (purane sastay phone) se le kar bari screens tak test ki gayi hai; English aur Urdu dono

## APK file (Play Store jaisi install file) chahiye ho to
Hosting (Netlify link) ke baad https://www.pwabuilder.com par link daalein > "Package for stores" > Android > Download. Options mein **Fallback: Web View** chunein, taake jis phone mein Chrome na ho wahan bhi chale. Yeh sab clicks se hota hai, koi CMD nahi.

## 1. Laptop par demo
`demo.html` double-click karein. Customer: "Demo: use a location in Kot Momin". Rider: 03001234567 / PIN 4821. Admin: 786512.

## 2. Asli istemal ke liye (aik dafa)
1. https://console.firebase.google.com par free project banayein, Firestore Database banayein
2. Web app add karke `firebaseConfig` ki values **teeno folders** ki `config.js` mein daalein
3. Firestore > Rules mein `admin-web/firestore.rules` ka text paste karein
4. Har folder ko alag https://app.netlify.com/drop par drag karein. Teen links milenge
5. Phone ke Chrome mein link kholein > teen dots > **Install app**

Customers ko customer link dein, riders ko rider link. Admin link sirf apne paas rakhein.
