// ====== SETTINGS ======
// Zyada tar settings ab Admin console > Settings se badalti hain (code chhune ki zaroorat nahi).
// Yahan sirf Firebase aur pehli dafa ki default values hain.

// Firebase (README mein steps hain). Jab tak yeh na bharein, app demo mode mein chalti hai.
export const firebaseConfig = {
  apiKey: "AIzaSyAzjrI2jQreYTZ5Ks-CBs1NHRL5P5shyyY",
  authDomain: "kot-momin-express.firebaseapp.com",
  projectId: "kot-momin-express",
  storageBucket: "kot-momin-express.firebasestorage.app",
  messagingSenderId: "506541702056",
  appId: "1:506541702056:web:46851ad11230b87f9c7b9d",
};

export const DEFAULTS = {
  appName: "Kot Momin Express",
  // Admin PIN 786512 ka hash (asal PIN code mein likha hua nahi hai). Settings se badal sakte hain.
  adminPinHash: "4430b87e1aed696fcae0b85bdb80dce2334db344a55c47b5d33dd6d7a8fb9eb2",
  supportPhone: "03457792869",         // Al-Jannat Mobiles (Admin > Settings se badal sakte hain)
  supportWhatsapp: "923457792869",
  deliveryFee: 100,              // Rs, customer se
  riderShare: 70,                // Rs, har delivery par rider ki kamai (delivery fee mein se)
  newCustomerLimit: 3000,        // Pehle order par saman ki zyada se zyada qeemat (Rs)
  receiptPhotoAbove: 1000,       // Is se zyada bill par rider ko receipt ki photo lazmi
  maxActivePerCustomer: 2,       // Aik customer ke aik waqt mein zyada se zyada chalte orders
  maxActivePerRider: 2,          // Aik rider aik waqt mein kitne orders le sakta hai
  cashLimit: 5000,               // Rider ke paas is se zyada cash ho to admin ko alert
  openFrom: 9,                   // Orders kis waqt se (24 ghante wala waqt)
  openTo: 23,                    // Orders kis waqt tak
  accepting: true,               // Service chalu / band
  // Kot Momin ka markaz (Wikipedia: 32.18833 N, 73.02861 E) aur service ka daira:
  // markaz se har taraf barabar 5.5 km (gol daira)
  center: { lat: 32.18833, lng: 73.02861 },
  radiusKm: 5.5,
  areas: ["Chanab Bazar", "Rehmat Market", "Sargodha Road", "Phularwan Road"],
  speedKmh: 20,                  // Pohanchne ke waqt ke andaze ke liye
  // KYC: "wait" = approve hone tak order nahi, "allow" = review ke dauran bhi order, "off" = band
  kycMode: "wait",
  kycHours: 24,                  // Itne ghante mein KYC check karne ka wada
};
