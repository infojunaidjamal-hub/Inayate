// ============================================================
// SITE SETTINGS: apni website ki saari details yahin badlo.
// Sirf is ek file ko badalne se About, Contact, Terms, Shipping,
// Privacy aur footer, sab jagah naya naam / number dikhega.
// ============================================================
export const SITE = {
  name: "Inayate Bags",                       // <- apne brand ka naam
  tagline: "Handbags for every day, every occasion.",
  email: "Hello@inayate.in",           // <- apna email
  phone: "+91 8769075016",                  // <- apna phone number
  whatsapp: "918769075016",                  // <- WhatsApp number: 91 ke saath, bina + aur space ke
  address: "Shop no 112, Pyayosha Impress, Dindholi, Gujarat, 394310",   // <- apna pata
  city: "Surat",                         // <- terms mein "courts of ..." ke liye
  hours: "Mon to Sat, 10 AM to 6 PM (IST)",

  freeShippingAbove: 0,                     // 0 = har order par shipping free (Phase 4). Baad mein rule chahiye to yahan rupaye likhein, jaise 499
  shippingFee: 0,                           // freeShippingAbove se kam ke order par fee (abhi 0, kyunki sab free hai)
  dispatchDays: "1 to 2 working days",
  deliveryDays: "5 to 7 working days",
  returnDays: 10,                             // delivery ke baad kitne din mein return
  refundDays: "5 to 7 working days",
  updated: "October 2026",

  // Home page ka "Also available on" section: jis marketplace ka link yahan daaloge wahi card dikhega.
  // "" (khali) chhodne par us marketplace ka card nahi dikhta. Chaaron khali hon to poora section chhup jata hai.
  marketplaces: {
    amazon: "https://www.flipkart.com/product/p/itme?pid=DUPHSG5KVAYHUBCA",     // jaise: "https://www.amazon.in/..."
    flipkart: "https://www.flipkart.com/product/p/itme?pid=DUPHSG5KVAYHUBCA",
    meesho: "https://www.flipkart.com/product/p/itme?pid=DUPHSG5KVAYHUBCA",
    myntra: "https://www.flipkart.com/product/p/itme?pid=DUPHSG5KVAYHUBCA",
  },

  // Chatbot (Phase 9): chhota chat button jo shipping, returns, products aur login kiye hue buyer ke order status ka jawab deta hai.
  // enabled: false karne par chatbot poori tarah band. log: false karne par buyers ke sawaal save nahi hote.
  chatbot: {
    enabled: true,
    name: "Inayate Assistant",
    log: true,
  },

  // Homepage welcome popup (email signup). Change the words here, no code change needed.
  // Set enabled: false to switch it off. Change `version` to show it again to everyone.
  popup: {
    enabled: true,
    version: 1,
    eyebrow: "WELCOME",
    title: "Be the first to see our new bags",
    text: "Join our list for new arrivals, restocks and special offers, straight to your inbox.",
    button: "SUBSCRIBE",
    delayMs: 6000,        // show after this many milliseconds (or when the mouse leaves the page on desktop)
    snoozeDays: 7,        // after "No, thanks" / close, stay away this many days
    subscribedDays: 365,  // after subscribing, stay away this many days
  },
};
