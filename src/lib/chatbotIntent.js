// Phase 9 chatbot: buyer kya pooch raha hai, ye samajhne ka code. Isme database nahi hai (pure code),
// isliye ise alag se test kar sakte hain. English aur Hinglish dono chalte hain.
// Naya shabd jodna ho to neeche ki RULES mein us intent ki regex mein jodo.

// Chhote akshar, 1,000 -> 1000, baaki nishaan hata do (hindi akshar aur ₹ rehte hain)
const digits = (s) => s.replace(/[\u0966-\u096F]/g, (c) => c.charCodeAt(0) - 0x966).replace(/[\u0AE6-\u0AEF]/g, (c) => c.charCodeAt(0) - 0xae6);
export const norm = (s) =>
  digits(String(s || ""))
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/[^\p{L}\p{M}\p{N}₹\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Order number jaise MB1041 (checkout/actions.js mein "MB" + number banta hai)
export function extractOrderNo(t) {
  const m = norm(t).match(/\bmb\s*-?\s*(\d{3,7})\b/);
  return m ? "MB" + m[1] : "";
}

// "under 1000", "1000 tak", "1000 se kam" -> 1000 (nahi hai to 0)
export function budgetOf(t) {
  const x = norm(t);
  const n = "(\\d{3,6})";
  const m =
    x.match(new RegExp("(?:under|below|less than|within|upto|up to|max|maximum|budget)\\s*(?:rs|inr|rupees|₹)?\\s*" + n)) ||
    x.match(new RegExp("(?:rs|inr|₹)?\\s*" + n + "\\s*(?:rs|rupees|₹)?\\s*(?:tak|se kam|ke andar|ke ander|below|or less|and below|तक|से कम|के अंदर|के अन्दर|સુધી|થી ઓછા|થી ઓછું|ની અંદર)"));
  return m ? Number(m[1]) : 0;
}

const RULES = [
  ["human", /\b(human|live agent|customer care|customer support|representative|executive|real person|call me|baat karni|baat karna|insaan|(speak|talk|connect me|chat) (to|with) (someone|a person|the team|staff|an agent))\b/],
  ["complaint", /\b(damaged|damage|broken|defective|faulty|wrong (item|product|size|colou?r)|not received|never received|missing|fraud|scam|cheat|cheated|fake|complain|complaint|worst|money (deducted|cut)|paisa (kat|cut)|paise (kat|cut)|payment (failed|deducted)|kharab|toota|tuta|galat (item|product|maal)|nahi mila|nahin mila|not refunded|refund (not|nahi))\b/],
  ["cancel", /\bcancel/],
  ["refund", /\b(refund|money back|paise wapas|paisa wapas|wapas paise)\b/],
  ["return", /\b(return|returns|exchange|replace|replacement|wapas)\b/],
  ["order", /\b(track|tracking|awb|my orders?|order status|status of|where is my|mera order|meri order|mere order|order kahan|parcel kahan|kab aayega|kab ayega|my parcel|my shipment|order details|mb\s*-?\s*\d{3,7})\b/],
  ["cod", /\b(cod|cash on delivery|cash on|pay on delivery)\b/],
  ["payment", /\b(payment|pay|upi|card|netbanking|net banking|razorpay|emi|paytm|gpay)\b/],
  ["shipping", /\b(ship|shipping|deliver|delivery|dispatch|courier|charges|how long|kitne din|kab milega|kab tak)\b/],
  ["coupon", /\b(coupon|promo|discount code|offer|offers|code|discount)\b/],
  ["contact", /\b(contact|phone number|mobile number|contact number|whatsapp|call|email|mail|address|hours|timing|timings|open|location)\b/],
  ["account", /\b(password|login|log in|sign in|signup|sign up|register|otp|my account)\b/],
  ["about", /\b(about|who are you|about us|your story|brand)\b/],
  ["thanks", /\b(thanks|thank you|thankyou|thx|shukriya|dhanyavad|dhanyawad)\b/],
  ["bye", /^(bye|goodbye|ok bye|tata|good night)\b/],
  ["greet", /^(hi+|hello+|hey+|helo|namaste|namaskar|good (morning|afternoon|evening))\b/],
  ["product", /\b(bags?|totes?|sling|backpacks?|wallets?|clutch(es)?|handbags?|purses?|shoulder|laptop|travel|duffle|gift|price|prices|cost|stock|available|availability|show|suggest|recommend|collection|new arrivals?|bestsellers?|best seller|dikhao|dikhaiye|chahiye|kitne ka|kitna|daam|sasta|cheap|budget)\b/],
];

// Hindi (Devanagari) aur Gujarati script ke shabd. Har intent ke liye ek regex. (Latin wale RULES se milkar kaam karta hai.)
// "order" mein jaanboojh kar sirf track/status/kahan wale shabd hain, taaki "ऑर्डर कैसे करें" (how to order) order-status na ban jaye.
const INDIC = {
  human: /इंसान|एजेंट|बात करनी|बात करना|कस्टमर केयर|માણસ|એજન્ટ|વાત કરવી|કસ્ટમર કેર/,
  complaint: /खराब|टूट|गलत|शिकायत|धोखा|फ्रॉड|नहीं मिला|नही मिला|पैसे कट|पैसा कट|ખરાબ|તૂટ|ખોટું|ખોટી|ફરિયાદ|છેતરપિંડી|ફ્રોડ|મળ્યું નથી|પૈસા કપાયા/,
  cancel: /कैंसिल|केंसल|रद्द|निरस्त|કેન્સલ|કૅન્સલ|રદ/,
  refund: /रिफंड|पैसे वापस|पैसा वापस|રિફંડ|પૈસા પાછા/,
  return: /रिटर्न|वापस|एक्सचेंज|बदलना|बदलवा|રિટર્ન|પરત|એક્સચેન્જ|બદલવું|બદલાવ/,
  order: /ट्रैक|ट्रेक|कहां है|कहाँ है|स्थिति|स्टेटस|मेरा ऑर्डर|मेरे ऑर्डर|मेरी ऑर्डर|ऑर्डर कहां|ऑर्डर कहाँ|ऑर्डर नंबर|कब आएगा|कब आयेगा|कब तक आएगा|ટ્રૅક|ટ્રેક|ક્યાં છે|સ્થિતિ|સ્ટેટસ|મારો ઓર્ડર|મારા ઓર્ડર|ઓર્ડર ક્યાં|ઓર્ડર નંબર|ક્યારે આવશે/,
  cod: /कैश ऑन|सीओडी|કેશ ઓન|સીઓડી/,
  payment: /पेमेंट|भुगतान|यूपीआई|कार्ड|પેમેન્ટ|ચુકવણી|યુપીઆઈ|કાર્ડ/,
  shipping: /डिलीवरी|डिलिवरी|शिपिंग|कूरियर|कितने दिन|कब तक|कब मिलेगा|ડિલિવરી|ડિલીવરી|શિપિંગ|કુરિયર|કેટલા દિવસ|ક્યારે મળશે/,
  coupon: /कूपन|ऑफर|डिस्काउंट|छूट|કૂપન|ઓફર|ડિસ્કાઉન્ટ|છૂટ/,
  contact: /संपर्क|फोन नंबर|मोबाइल नंबर|ईमेल|पता|समय|व्हाट्सएप|व्हाट्सऐप|સંપર્ક|ફોન નંબર|મોબાઇલ નંબર|ઈમેલ|ઇમેઇલ|સરનામું|સમય|વોટ્સએપ|વ્હોટ્સએપ/,
  account: /पासवर्ड|लॉगिन|लोगिन|खाता|रजिस्टर|પાસવર્ડ|લૉગિન|લોગિન|ખાતું|રજિસ્ટર/,
  about: /हमारे बारे|आप कौन|અમારા વિશે|તમે કોણ/,
  thanks: /धन्यवाद|शुक्रिया|आभार|આભાર|ધન્યવાદ/,
  bye: /अलविदा|આવજો/,
  greet: /^(नमस्ते|नमस्कार|हैलो|हेलो|प्रणाम|નમસ્તે|કેમ છો|હેલો)/,
  product: /बैग|टोट|पर्स|वॉलेट|क्लच|बैकपैक|लैपटॉप|दिखाओ|दिखाइए|दिखाएं|चाहिए|कीमत|दाम|सस्ता|બેગ|પર્સ|વૉલેટ|ક્લચ|બેકપેક|લેપટોપ|બતાવો|જોઈએ|કિંમત|ભાવ|સસ્તું/,
};

export function detectIntent(raw) {
  const t = norm(raw);
  if (!t) return "";
  for (const [name, re] of RULES) if (re.test(t) || (INDIC[name] && INDIC[name].test(t))) return name;
  if (budgetOf(t)) return "product";
  return "";
}

// Product dhoondhne ke liye kaam ke shabd (faltu shabd hata dete hain)
const STOP = new Set(("the a an is are do you have has any some show me i want need looking for to buy get under below above less than within upto up max budget price cost rs inr rupees tak se kam ke andar ander ka ki ko hai hain mujhe chahiye dikhao dikhaiye kuch koi aur or and of in on with my your please pls can could would what which whats best good new latest available availability stock bag bags handbag handbags suggest recommend collection one pair size sasta cheap daam kitna kitne wala wali wale dijiye batao bataiye mein me nahi ya").split(" "));

// Hindi / Gujarati mein likhe naam ko English mein badalna (database English mein hai). "" = sirf "bag", jo khoj mein nahi gina jata.
const ALIAS_INDIC = [
  ["बैग", ""], ["बेग", ""], ["બેગ", ""],
  ["टोट", "tote"], ["ટોટ", "tote"], ["स्लिंग", "sling"], ["સ્લિંગ", "sling"], ["बैकपैक", "backpack"], ["બેકપેક", "backpack"],
  ["वॉलेट", "wallet"], ["वालेट", "wallet"], ["વૉલેટ", "wallet"], ["વોલેટ", "wallet"], ["पर्स", "purse"], ["પર્સ", "purse"],
  ["क्लच", "clutch"], ["ક્લચ", "clutch"], ["लैपटॉप", "laptop"], ["લેપટોપ", "laptop"], ["ट्रैवल", "travel"], ["ટ્રાવેલ", "travel"], ["शोल्डर", "shoulder"], ["શોલ્ડર", "shoulder"],
  ["काल", "black"], ["કાળ", "black"], ["सफे", "white"], ["સફેદ", "white"], ["लाल", "red"], ["લાલ", "red"], ["नील", "blue"], ["વાદળ", "blue"],
  ["हरा", "green"], ["हरी", "green"], ["હરે", "green"], ["લીલ", "green"], ["गुलाबी", "pink"], ["ગુલાબી", "pink"], ["भूर", "brown"], ["ભૂર", "brown"], ["पील", "yellow"], ["પીળ", "yellow"], ["ग्रे", "grey"], ["ગ્રે", "grey"],
];
const ALIAS_HL = { kala: "black", kali: "black", safed: "white", safaid: "white", lal: "red", neela: "blue", neeli: "blue", nila: "blue", hara: "green", hari: "green", gulabi: "pink", bhura: "brown", bhuri: "brown", peela: "yellow", pili: "yellow" };

export function searchWords(raw) {
  const out = [];
  for (let w of norm(raw).split(" ")) {
    if (!w || /\d/.test(w) || w.includes("₹")) continue;
    if (/[^\u0000-\u024F]/.test(w)) { // Hindi / Gujarati shabd: sirf pehchane hue naam rakho, baaki chhod do
      const a = ALIAS_INDIC.find(([k]) => w.startsWith(k));
      if (a && a[1] && !out.includes(a[1])) out.push(a[1]);
      continue;
    }
    if (ALIAS_HL[w]) w = ALIAS_HL[w];
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = /(ches|shes|xes|sses)$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
    if (w.length < 3 || STOP.has(w) || STOP.has(w + "s") || out.includes(w)) continue;
    out.push(w);
  }
  return out.slice(0, 4);
}

/* ---------- Seller ke sikhaye hue jawab: milte-julte sawaal pehchanna ---------- */
// Ye shabd matlab nahi badalte, isliye hata dete hain. "how", "where", "kaise", "kab" jaise shabd rakhe gaye hain
// (inse "how to order" aur "where is my order" alag rehte hain).
const FILLER = new Set("the a an is are am do does can could would will please pls kindly hi hello hey tell me i you your to of in on at for with and or ek hai hain ho kya".split(" "));
export const tokens = (s) => [...new Set(norm(s).split(" ").filter((w) => w && !FILLER.has(w)))];

// Ek akshar ki galti chalegi ("shiping" = "shipping"), chhote shabdon mein nahi
function near(a, b) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false; return true; }
  const [x, y] = a.length < b.length ? [a, b] : [b, a];
  let i = 0; while (i < x.length && x[i] === y[i]) i++;
  return x.slice(i) === y.slice(i + 1);
}

// 0 se 1: 1 = bilkul wahi sawaal (faltu shabd chhod kar)
export function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.length || !B.length) return 0;
  const used = new Set();
  let m = 0;
  for (const x of A) { const j = B.findIndex((y, k) => !used.has(k) && near(x, y)); if (j >= 0) { used.add(j); m++; } }
  return m / (A.length + B.length - m);
}
export const bestScore = (q, phrases) => Math.max(0, ...phrases.map((p) => similarity(q, p)));
export const FUZZY = 0.6; // itna milta-julta ho to sikhaya hua jawab chalega
