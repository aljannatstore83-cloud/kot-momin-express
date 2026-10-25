// ====== KOT MOMIN EXPRESS SETTINGS ======
// Firebase lagane ke baad sirf "firebaseConfig" ki 4 values badlein (README dekhein).
// Baqi settings (fee, area, auqaat, PIN) Admin > Settings se badalti hain.
window.KMX_CONFIG = {
  "firebaseConfig": {
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_PROJECT.firebaseapp.com",
    "projectId": "YOUR_PROJECT_ID",
    "appId": "YOUR_APP_ID"
  },
  "DEFAULTS": {
    "appName": "Kot Momin Express",
    "adminPinHash": "4430b87e1aed696fcae0b85bdb80dce2334db344a55c47b5d33dd6d7a8fb9eb2",
    "supportPhone": "03001234567",
    "supportWhatsapp": "923001234567",
    "deliveryFee": 100,
    "riderShare": 70,
    "newCustomerLimit": 3000,
    "receiptPhotoAbove": 1000,
    "maxActivePerCustomer": 2,
    "maxActivePerRider": 2,
    "cashLimit": 5000,
    "openFrom": 9,
    "openTo": 23,
    "accepting": true,
    "center": {
      "lat": 32.18833,
      "lng": 73.02861
    },
    "radiusKm": 3,
    "areas": [
      "Chanab Bazar",
      "Rehmat Market",
      "Sargodha Road",
      "Phularwan Road"
    ],
    "speedKmh": 20
  }
};
