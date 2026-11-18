import { STATUS_HEADING } from "@/lib/orderStatus";
// Phase 9 chatbot: sab bhashaon ke jawab ek jagah. Server (chatbot.js, faq.js) aur chat window (ChatWidget.js) dono yahin se padhte hain.
// Bhashayein: en = English, hl = Hinglish (Roman Hindi), hi = Hindi (Devanagari), gu = Gujarati.
// Naya shabd/jawab badalna ho to neeche us key ke saamne apni bhasha wali line badlo. {naam} jagah par value aati hai, use mat badlo.

export const LANGS = ["en", "hl", "hi", "gu"];
export const LANG_LABEL = { en: "English", hl: "Hinglish", hi: "हिन्दी", gu: "ગુજરાતી" };

const S = {
  // ---------- chhoti baatein ----------
  empty: { en: "Please type your question and I’ll help.", hl: "Kripya apna sawaal likhiye, main madad karunga.", hi: "कृपया अपना सवाल लिखिए, मैं मदद करूँगा।", gu: "કૃપા કરીને તમારો પ્રશ્ન લખો, હું મદદ કરીશ." },
  greetGuest: { en: "Hi! I’m the {brand} assistant. I can help with shipping, returns and our bags. What would you like to know?", hl: "Namaste! Main {brand} ka assistant hoon. Main shipping, returns aur hamare bags ke baare mein madad kar sakta hoon. Aap kya jaanna chahte hain?", hi: "नमस्ते! मैं {brand} का असिस्टेंट हूँ। मैं शिपिंग, रिटर्न और हमारे बैग के बारे में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?", gu: "નમસ્તે! હું {brand} નો આસિસ્ટન્ટ છું. હું શિપિંગ, રિટર્ન અને અમારી બેગ વિશે મદદ કરી શકું છું. તમે શું જાણવા માંગો છો?" },
  greetUser: { en: "Hi! I’m the {brand} assistant. I can help with shipping, returns, our bags and your order status. What would you like to know?", hl: "Namaste! Main {brand} ka assistant hoon. Main shipping, returns, hamare bags aur aapke order status ke baare mein madad kar sakta hoon. Aap kya jaanna chahte hain?", hi: "नमस्ते! मैं {brand} का असिस्टेंट हूँ। मैं शिपिंग, रिटर्न, हमारे बैग और आपके ऑर्डर की स्थिति के बारे में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?", gu: "નમસ્તે! હું {brand} નો આસિસ્ટન્ટ છું. હું શિપિંગ, રિટર્ન, અમારી બેગ અને તમારા ઓર્ડરની સ્થિતિ વિશે મદદ કરી શકું છું. તમે શું જાણવા માંગો છો?" },
  thanks: { en: "You’re welcome! Let me know if there’s anything else I can help with.", hl: "Aapka swagat hai! Koi aur madad chahiye to bataiye.", hi: "आपका स्वागत है! कोई और मदद चाहिए तो बताइए।", gu: "આપનું સ્વાગત છે! બીજી કોઈ મદદ જોઈએ તો કહેજો." },
  bye: { en: "Thanks for visiting {brand}. Have a lovely day!", hl: "{brand} par aane ke liye shukriya. Aapka din accha rahe!", hi: "{brand} पर आने के लिए धन्यवाद। आपका दिन शुभ हो!", gu: "{brand} પર આવવા બદલ આભાર. તમારો દિવસ શુભ રહે!" },

  // ---------- WhatsApp handover ----------
  handoverIntro: { en: "I’m not fully sure about this one, and I don’t want to guess. Our team can help you directly on WhatsApp.", hl: "Is baare mein mujhe pakka nahi pata, aur main andaza nahi lagana chahta. Hamari team seedha WhatsApp par aapki madad kar sakti hai.", hi: "इस बारे में मुझे पक्का पता नहीं है, और मैं अंदाज़ा नहीं लगाना चाहता। हमारी टीम सीधे WhatsApp पर आपकी मदद कर सकती है।", gu: "આ વિશે મને ખાતરી નથી, અને હું અંદાજ લગાવવા માંગતો નથી. અમારી ટીમ તમને સીધી WhatsApp પર મદદ કરી શકે છે." },
  humanIntro: { en: "Of course. Our team is happy to help you on WhatsApp.", hl: "Zaroor. Hamari team WhatsApp par aapki madad karke khush hogi.", hi: "ज़रूर। हमारी टीम WhatsApp पर आपकी मदद करके खुश होगी।", gu: "ચોક્કસ. અમારી ટીમ WhatsApp પર તમારી મદદ કરવામાં ખુશ થશે." },
  errorIntro: { en: "Sorry, I ran into a problem. Our team can help you on WhatsApp.", hl: "Maaf kijiye, mujhse kuch gadbad ho gayi. Hamari team WhatsApp par madad kar sakti hai.", hi: "माफ़ कीजिए, मुझसे कुछ गड़बड़ हो गई। हमारी टीम WhatsApp पर मदद कर सकती है।", gu: "માફ કરજો, મારાથી કંઈક ગડબડ થઈ. અમારી ટીમ WhatsApp પર મદદ કરી શકે છે." },
  waBtn: { en: "Continue on WhatsApp", hl: "WhatsApp par baat karein", hi: "WhatsApp पर बात करें", gu: "WhatsApp પર વાત કરો" },
  hours: { en: "Support hours: {hours}.", hl: "Support ka samay: {hours}.", hi: "सहायता का समय: {hours}।", gu: "સહાયતાનો સમય: {hours}." },
  complaint: { en: "I’m really sorry about that. Please send your order number (and a photo if the item is damaged) to our team on WhatsApp so they can fix it quickly. For damaged or wrong items, please tell us within 48 hours of delivery.", hl: "Is pareshani ke liye mujhe bahut khed hai. Kripya apna order number (aur saaman kharab ho to uski photo) hamari team ko WhatsApp par bhejiye, taaki wo jaldi theek kar sakein. Kharab ya galat saaman ke liye delivery ke 48 ghante ke andar bata dein.", hi: "इसके लिए मुझे बहुत खेद है। कृपया अपना ऑर्डर नंबर (और सामान खराब हो तो उसकी फोटो) हमारी टीम को WhatsApp पर भेजें, ताकि वे जल्दी ठीक कर सकें। खराब या गलत सामान के लिए डिलीवरी के 48 घंटे के अंदर बताएं।", gu: "આ માટે મને ખૂબ દુઃખ છે. કૃપા કરીને તમારો ઓર્ડર નંબર (અને વસ્તુ બગડેલી હોય તો તેનો ફોટો) અમારી ટીમને WhatsApp પર મોકલો, જેથી તેઓ ઝડપથી ઉકેલ લાવી શકે. બગડેલી કે ખોટી વસ્તુ માટે ડિલિવરીના 48 કલાકમાં જણાવો." },

  // ---------- orders ----------
  loginNeeded: { en: "To show your order status I need to know it’s you. Please log in and ask me again.", hl: "Order ka status dikhane ke liye mujhe pata hona chahiye ki aap hi hain. Kripya login karke dobara poochhiye.", hi: "ऑर्डर की स्थिति दिखाने के लिए मुझे यह जानना ज़रूरी है कि यह आप ही हैं। कृपया लॉगिन करके दोबारा पूछें।", gu: "ઓર્ડરની સ્થિતિ બતાવવા માટે મારે જાણવું જરૂરી છે કે તે તમે જ છો. કૃપા કરીને લૉગિન કરીને ફરી પૂછો." },
  loginBtn: { en: "Log in", hl: "Login karein", hi: "लॉगिन करें", gu: "લૉગિન કરો" },
  loginPrivacy: { en: "For privacy, I only share order details with the account that placed the order.", hl: "Privacy ke liye, main order ki jaankari sirf usi account ko deta hoon jisne order kiya hai.", hi: "प्राइवेसी के लिए, मैं ऑर्डर की जानकारी सिर्फ उसी अकाउंट को देता हूँ जिसने ऑर्डर किया है।", gu: "પ્રાઇવસી માટે, હું ઓર્ડરની માહિતી ફક્ત તે જ એકાઉન્ટને આપું છું જેણે ઓર્ડર કર્યો છે." },
  orderNotFound: { en: "I can’t find order {no} on your account. Please check the number, or ask our team.", hl: "Mujhe aapke account mein order {no} nahi mil raha. Kripya number check karein, ya hamari team se poochhein.", hi: "मुझे आपके अकाउंट में ऑर्डर {no} नहीं मिल रहा। कृपया नंबर जाँचें, या हमारी टीम से पूछें।", gu: "મને તમારા એકાઉન્ટમાં ઓર્ડર {no} મળતો નથી. કૃપા કરીને નંબર તપાસો, અથવા અમારી ટીમને પૂછો." },
  teamLook: { en: "Our team can look into it for you.", hl: "Hamari team ise aapke liye dekh legi.", hi: "हमारी टीम इसे आपके लिए देख लेगी।", gu: "અમારી ટીમ તમારા માટે તે જોઈ લેશે." },
  noOrders: { en: "You haven’t placed any orders yet.", hl: "Aapne abhi tak koi order nahi kiya hai.", hi: "आपने अभी तक कोई ऑर्डर नहीं किया है।", gu: "તમે હજી સુધી કોઈ ઓર્ડર કર્યો નથી." },
  shopNow: { en: "Shop now", hl: "Abhi shop karein", hi: "अभी खरीदें", gu: "હમણાં ખરીદો" },
  hereOrder: { en: "Here’s that order:", hl: "Ye raha wo order:", hi: "यह रहा वह ऑर्डर:", gu: "આ રહ્યો તે ઓર્ડર:" },
  hereOrder1: { en: "Here’s your order:", hl: "Ye raha aapka order:", hi: "यह रहा आपका ऑर्डर:", gu: "આ રહ્યો તમારો ઓર્ડર:" },
  hereOrders: { en: "Here are your latest orders:", hl: "Ye rahe aapke haal ke orders:", hi: "ये रहे आपके हाल के ऑर्डर:", gu: "આ રહ્યા તમારા તાજેતરના ઓર્ડર:" },
  allOrders: { en: "All my orders", hl: "Mere saare orders", hi: "मेरे सभी ऑर्डर", gu: "મારા બધા ઓર્ડર" },
  // order card ke labels (chat window mein dikhte hain)
  cOrder: { en: "Order", hl: "Order", hi: "ऑर्डर", gu: "ઓર્ડર" },
  cView: { en: "View full order", hl: "Poora order dekhein", hi: "पूरा ऑर्डर देखें", gu: "આખો ઓર્ડર જુઓ" },
  cCourier: { en: "Courier", hl: "Courier", hi: "कूरियर", gu: "કુરિયર" },
  cAwb: { en: "Tracking ID", hl: "Tracking ID", hi: "ट्रैकिंग ID", gu: "ટ્રેકિંગ ID" },
  cEta: { en: "Estimated delivery", hl: "Anumaanit delivery", hi: "अनुमानित डिलीवरी", gu: "અંદાજિત ડિલિવરી" },
  payCod: { en: "Cash on Delivery", hl: "Cash on Delivery", hi: "कैश ऑन डिलीवरी", gu: "કેશ ઓન ડિલિવરી" },
  payPaid: { en: "Paid online", hl: "Online paid", hi: "ऑनलाइन भुगतान हो चुका", gu: "ઓનલાઇન ચુકવણી થઈ ગઈ" },
  payOnline: { en: "Online payment", hl: "Online payment", hi: "ऑनलाइन भुगतान", gu: "ઓનલાઇન ચુકવણી" },
  retReq: { en: "Return request: {s}", hl: "Return request: {s}", hi: "रिटर्न अनुरोध: {s}", gu: "રિટર્ન વિનંતી: {s}" },
  noteAwaitPay: { en: "Payment is pending. Unpaid orders are cancelled automatically after {min} minutes.", hl: "Payment baaki hai. Unpaid orders {min} minute baad apne aap cancel ho jaate hain.", hi: "भुगतान बाकी है। बिना भुगतान वाले ऑर्डर {min} मिनट बाद अपने आप कैंसिल हो जाते हैं।", gu: "ચુકવણી બાકી છે. અનપેઇડ ઓર્ડર {min} મિનિટ પછી આપમેળે કૅન્સલ થઈ જાય છે." },
  noteHold: { en: "We are doing a quick check on this order. We will update you soon.", hl: "Hum is order ki ek chhoti jaanch kar rahe hain. Jaldi hi aapko update denge.", hi: "हम इस ऑर्डर की एक छोटी जाँच कर रहे हैं। जल्दी ही आपको अपडेट देंगे।", gu: "અમે આ ઓર્ડરની નાની તપાસ કરી રહ્યા છીએ. જલદી જ તમને અપડેટ આપીશું." },
  noteNdr: { en: "The courier could not deliver. They will try again, so please keep your phone reachable.", hl: "Courier delivery nahi kar paya. Wo dobara koshish karenge, kripya apna phone chalu rakhein.", hi: "कूरियर डिलीवरी नहीं कर पाया। वे दोबारा कोशिश करेंगे, कृपया अपना फोन चालू रखें।", gu: "કુરિયર ડિલિવરી કરી શક્યો નથી. તે ફરી પ્રયાસ કરશે, કૃપા કરીને તમારો ફોન ચાલુ રાખો." },
  noteRetUntil: { en: "You can request a return until {date}.", hl: "Aap {date} tak return request kar sakte hain.", hi: "आप {date} तक रिटर्न का अनुरोध कर सकते हैं।", gu: "તમે {date} સુધી રિટર્ન માટે વિનંતી કરી શકો છો." },
  noteRetDays: { en: "Returns are open for {days} days after delivery.", hl: "Delivery ke baad {days} din tak return khule hain.", hi: "डिलीवरी के बाद {days} दिन तक रिटर्न खुले हैं।", gu: "ડિલિવરી પછી {days} દિવસ સુધી રિટર્ન ખુલ્લા છે." },
  noteRetClosed: { en: "The return window for this order has closed.", hl: "Is order ka return ka samay khatam ho gaya hai.", hi: "इस ऑर्डर के रिटर्न का समय खत्म हो गया है।", gu: "આ ઓર્ડર માટે રિટર્નનો સમય પૂરો થઈ ગયો છે." },
  noteCancelRefund: { en: "Your payment will be refunded to the original payment method within {days}.", hl: "Aapka payment {days} ke andar original payment method mein refund kar diya jayega.", hi: "आपका भुगतान {days} के अंदर मूल भुगतान माध्यम में वापस कर दिया जाएगा।", gu: "તમારી ચુકવણી {days} માં મૂળ ચુકવણી પદ્ધતિમાં પાછી આપવામાં આવશે." },

  // ---------- policies ----------
  ship1: { en: "We deliver across India. Shipping is free on orders of {free} and above, otherwise {fee}.", hl: "Hum poore India mein delivery karte hain. {free} ya usse zyada ke orders par shipping free hai, warna {fee}.", hi: "हम पूरे भारत में डिलीवरी करते हैं। {free} या उससे ज़्यादा के ऑर्डर पर शिपिंग फ्री है, नहीं तो {fee}।", gu: "અમે આખા ભારતમાં ડિલિવરી કરીએ છીએ. {free} કે તેથી વધુના ઓર્ડર પર શિપિંગ ફ્રી છે, નહીંતર {fee}." },
  ship1Free: { en: "We deliver across India, and shipping is free on every order.", hl: "Hum poore India mein delivery karte hain, aur har order par shipping free hai.", hi: "हम पूरे भारत में डिलीवरी करते हैं, और हर ऑर्डर पर शिपिंग फ्री है।", gu: "અમે આખા ભારતમાં ડિલિવરી કરીએ છીએ, અને દરેક ઓર્ડર પર શિપિંગ ફ્રી છે." },
  ship2: { en: "Orders are dispatched within {dispatch} and usually arrive in {delivery} after dispatch.", hl: "Orders {dispatch} ke andar dispatch hote hain aur dispatch ke baad aam taur par {delivery} mein pahunchte hain.", hi: "ऑर्डर {dispatch} के अंदर भेजे जाते हैं और भेजने के बाद आमतौर पर {delivery} में पहुँचते हैं।", gu: "ઓર્ડર {dispatch} માં મોકલવામાં આવે છે અને મોકલ્યા પછી સામાન્ય રીતે {delivery} માં પહોંચે છે." },
  shipExpress: { en: " Express Delivery ({days}) is also available at checkout for an extra fee.", hl: " Checkout par Express Delivery ({days}) bhi extra charge par milti hai.", hi: " चेकआउट पर एक्सप्रेस डिलीवरी ({days}) भी अतिरिक्त शुल्क पर उपलब्ध है।", gu: " ચેકઆઉટ પર એક્સપ્રેસ ડિલિવરી ({days}) પણ વધારાના ચાર્જ સાથે ઉપલબ્ધ છે." },
  shipLink: { en: "Shipping and Returns", hl: "Shipping aur Returns", hi: "शिपिंग और रिटर्न", gu: "શિપિંગ અને રિટર્ન" },
  cod1: { en: "Yes, Cash on Delivery is available{note}. Please keep the exact amount ready for the delivery person.", hl: "Haan, Cash on Delivery available hai{note}. Kripya delivery wale ke liye sahi amount ready rakhein.", hi: "हाँ, कैश ऑन डिलीवरी उपलब्ध है{note}। कृपया डिलीवरी वाले के लिए सही रकम तैयार रखें।", gu: "હા, કેશ ઓન ડિલિવરી ઉપલબ્ધ છે{note}. કૃપા કરીને ડિલિવરી કરનાર માટે સાચી રકમ તૈયાર રાખો." },
  codFee: { en: " (a {fee} COD fee applies at checkout)", hl: " (checkout par {fee} COD fee lagti hai)", hi: " (चेकआउट पर {fee} COD शुल्क लगता है)", gu: " (ચેકઆઉટ પર {fee} COD ફી લાગે છે)" },
  cod2: { en: "For some COD orders we may ask you to confirm the order before we dispatch it.", hl: "Kuch COD orders ke liye hum dispatch se pehle aapse order confirm karne ko keh sakte hain.", hi: "कुछ COD ऑर्डर के लिए हम भेजने से पहले आपसे ऑर्डर कन्फर्म करने को कह सकते हैं।", gu: "કેટલાક COD ઓર્ડર માટે અમે મોકલતા પહેલાં તમને ઓર્ડર કન્ફર્મ કરવા કહી શકીએ છીએ." },
  onlineSave: { en: " Paying online instead saves you {pct}% (up to {max}).", hl: " Online pay karne par aapko {pct}% ki bachat hoti hai ({max} tak).", hi: " ऑनलाइन भुगतान करने पर {pct}% की बचत होती है ({max} तक)।", gu: " ઓનલાઇન ચુકવણી કરવાથી {pct}% બચત થાય છે ({max} સુધી)." },
  pay1: { en: "You can pay online (UPI, card or net banking) or choose Cash on Delivery at checkout.", hl: "Aap online (UPI, card ya net banking) se pay kar sakte hain, ya checkout par Cash on Delivery chun sakte hain.", hi: "आप ऑनलाइन (UPI, कार्ड या नेट बैंकिंग) से भुगतान कर सकते हैं, या चेकआउट पर कैश ऑन डिलीवरी चुन सकते हैं।", gu: "તમે ઓનલાઇન (UPI, કાર્ડ અથવા નેટ બેંકિંગ) થી ચુકવણી કરી શકો છો, અથવા ચેકઆઉટ પર કેશ ઓન ડિલિવરી પસંદ કરી શકો છો." },
  payOff: { en: " Online payment gets {pct}% off, up to {max}.", hl: " Online payment par {pct}% ki chhoot milti hai, {max} tak.", hi: " ऑनलाइन भुगतान पर {pct}% की छूट मिलती है, {max} तक।", gu: " ઓનલાઇન ચુકવણી પર {pct}% છૂટ મળે છે, {max} સુધી." },
  pay2: { en: "If money was deducted but your order shows unpaid, please message our team on WhatsApp with your order number.", hl: "Agar paise kat gaye hain lekin order unpaid dikh raha hai, to kripya order number ke saath hamari team ko WhatsApp karein.", hi: "अगर पैसे कट गए हैं लेकिन ऑर्डर अनपेड दिख रहा है, तो कृपया ऑर्डर नंबर के साथ हमारी टीम को WhatsApp करें।", gu: "જો પૈસા કપાઈ ગયા હોય પણ ઓર્ડર અનપેઇડ દેખાતો હોય, તો કૃપા કરીને ઓર્ડર નંબર સાથે અમારી ટીમને WhatsApp કરો." },
  ret1: { en: "You can request a return within {days} days of delivery if the item is unused and in its original condition and packaging, or if it arrived damaged, defective or different from what you ordered.", hl: "Delivery ke {days} din ke andar aap return request kar sakte hain, agar saaman use nahi hua aur original condition aur packaging mein hai, ya agar wo kharab, defective ya order se alag aaya ho.", hi: "डिलीवरी के {days} दिन के अंदर आप रिटर्न का अनुरोध कर सकते हैं, अगर सामान इस्तेमाल नहीं हुआ है और मूल हालत व पैकिंग में है, या अगर वह खराब, दोषपूर्ण या ऑर्डर से अलग आया हो।", gu: "ડિલિવરીના {days} દિવસમાં તમે રિટર્ન માટે વિનંતી કરી શકો છો, જો વસ્તુ વપરાયેલી ન હોય અને મૂળ સ્થિતિ તથા પેકિંગમાં હોય, અથવા તે બગડેલી, ખામીવાળી અથવા ઓર્ડરથી અલગ આવી હોય." },
  ret2: { en: "To start one, open your delivered order under My Account and use the return option. If an item arrives damaged or wrong, please tell us within 48 hours of delivery.", hl: "Shuru karne ke liye My Account mein apna delivered order kholein aur return option chunein. Agar saaman kharab ya galat aaye, to delivery ke 48 ghante ke andar bata dein.", hi: "शुरू करने के लिए My Account में अपना डिलीवर हुआ ऑर्डर खोलें और रिटर्न विकल्प चुनें। अगर सामान खराब या गलत आए, तो डिलीवरी के 48 घंटे के अंदर बताएं।", gu: "શરૂ કરવા માટે My Account માં તમારો ડિલિવર થયેલ ઓર્ડર ખોલો અને રિટર્ન વિકલ્પ પસંદ કરો. જો વસ્તુ બગડેલી કે ખોટી આવે, તો ડિલિવરીના 48 કલાકમાં જણાવો." },
  retLink: { en: "Return policy", hl: "Return policy", hi: "रिटर्न पॉलिसी", gu: "રિટર્ન પોલિસી" },
  myOrders: { en: "My orders", hl: "Mere orders", hi: "मेरे ऑर्डर", gu: "મારા ઓર્ડર" },
  refund1: { en: "Once a return is approved and the item reaches us, your refund is processed within {days}. Online payments go back to the original payment method (card, UPI or bank).", hl: "Return approve hone aur saaman hum tak pahunchne ke baad, aapka refund {days} ke andar process hota hai. Online payment original payment method (card, UPI ya bank) mein wapas jata hai.", hi: "रिटर्न मंज़ूर होने और सामान हम तक पहुँचने के बाद, आपका रिफंड {days} के अंदर प्रोसेस होता है। ऑनलाइन भुगतान मूल भुगतान माध्यम (कार्ड, UPI या बैंक) में वापस जाता है।", gu: "રિટર્ન મંજૂર થયા અને વસ્તુ અમને મળ્યા પછી, તમારો રિફંડ {days} માં પ્રોસેસ થાય છે. ઓનલાઇન ચુકવણી મૂળ ચુકવણી પદ્ધતિ (કાર્ડ, UPI અથવા બેંક) માં પાછી જાય છે." },
  refund2: { en: "For Cash on Delivery orders, we will ask for your UPI ID or bank details. Shipping charges are not refunded unless the return is due to our mistake.", hl: "Cash on Delivery orders ke liye hum aapse UPI ID ya bank details maangenge. Shipping charges refund nahi hote, jab tak return hamari galti se na ho.", hi: "कैश ऑन डिलीवरी ऑर्डर के लिए हम आपसे UPI ID या बैंक विवरण मांगेंगे। शिपिंग शुल्क रिफंड नहीं होता, जब तक रिटर्न हमारी गलती से न हो।", gu: "કેશ ઓન ડિલિવરી ઓર્ડર માટે અમે તમારી પાસે UPI ID અથવા બેંક વિગતો માંગીશું. રિટર્ન અમારી ભૂલથી ન હોય ત્યાં સુધી શિપિંગ ચાર્જ રિફંડ થતો નથી." },
  cancel1: { en: "You can cancel an order yourself from its order page until it is packed and shipped. If you already paid online, the amount is refunded to your original payment method.", hl: "Aap order page se khud order cancel kar sakte hain jab tak wo pack aur ship nahi ho jata. Agar aapne online pay kiya hai, to amount original payment method mein refund hota hai.", hi: "आप ऑर्डर पेज से खुद ऑर्डर कैंसिल कर सकते हैं, जब तक वह पैक और शिप नहीं हो जाता। अगर आपने ऑनलाइन भुगतान किया है, तो रकम मूल भुगतान माध्यम में वापस कर दी जाती है।", gu: "ઓર્ડર પૅક અને શિપ ન થાય ત્યાં સુધી તમે ઓર્ડર પેજ પરથી જાતે કૅન્સલ કરી શકો છો. જો તમે ઓનલાઇન ચુકવણી કરી હોય, તો રકમ મૂળ ચુકવણી પદ્ધતિમાં પાછી મળે છે." },
  cancel2: { en: "After the order is shipped it cannot be cancelled, but you can return it once it arrives.", hl: "Order ship hone ke baad cancel nahi ho sakta, lekin pahunchne ke baad aap use return kar sakte hain.", hi: "ऑर्डर शिप होने के बाद कैंसिल नहीं हो सकता, लेकिन पहुँचने के बाद आप उसे रिटर्न कर सकते हैं।", gu: "ઓર્ડર શિપ થયા પછી કૅન્સલ થઈ શકતો નથી, પરંતુ પહોંચ્યા પછી તમે તેને રિટર્ન કરી શકો છો." },
  coupon1: { en: "If you have a coupon code, enter it at checkout and the discount is applied to your order.", hl: "Agar aapke paas coupon code hai, to use checkout par daalein aur discount aapke order par lag jayega.", hi: "अगर आपके पास कूपन कोड है, तो उसे चेकआउट पर डालें और छूट आपके ऑर्डर पर लग जाएगी।", gu: "જો તમારી પાસે કૂપન કોડ હોય, તો તેને ચેકઆઉટ પર નાખો અને છૂટ તમારા ઓર્ડર પર લાગુ થઈ જશે." },
  coupon2: { en: "New arrivals, restocks and offers are sent to subscribers by email. You can join from the home page.", hl: "New arrivals, restock aur offers subscribers ko email se bheje jaate hain. Aap home page se judh sakte hain.", hi: "नए प्रोडक्ट, रीस्टॉक और ऑफर सब्सक्राइबर्स को ईमेल से भेजे जाते हैं। आप होम पेज से जुड़ सकते हैं।", gu: "નવા પ્રોડક્ટ, રીસ્ટોક અને ઓફર સબ્સ્ક્રાઇબર્સને ઈમેલથી મોકલવામાં આવે છે. તમે હોમ પેજ પરથી જોડાઈ શકો છો." },
  contact1: { en: "You can reach us at {phone} or {email}. Support hours: {hours}.", hl: "Aap hum se {phone} ya {email} par sampark kar sakte hain. Support ka samay: {hours}.", hi: "आप हमसे {phone} या {email} पर संपर्क कर सकते हैं। सहायता का समय: {hours}।", gu: "તમે અમારો {phone} અથવા {email} પર સંપર્ક કરી શકો છો. સહાયતાનો સમય: {hours}." },
  contact2: { en: "Our address: {address}.", hl: "Hamara pata: {address}.", hi: "हमारा पता: {address}।", gu: "અમારું સરનામું: {address}." },
  waChat: { en: "Chat on WhatsApp", hl: "WhatsApp par chat karein", hi: "WhatsApp पर चैट करें", gu: "WhatsApp પર ચેટ કરો" },
  contactPage: { en: "Contact page", hl: "Contact page", hi: "संपर्क पेज", gu: "સંપર્ક પેજ" },
  account1: { en: "You can log in with your mobile number and password. For a password reset, please message us on WhatsApp with your registered mobile number and we will help you.", hl: "Aap apne mobile number aur password se login kar sakte hain. Password reset ke liye kripya registered mobile number ke saath hamein WhatsApp karein, hum madad karenge.", hi: "आप अपने मोबाइल नंबर और पासवर्ड से लॉगिन कर सकते हैं। पासवर्ड रीसेट के लिए कृपया रजिस्टर्ड मोबाइल नंबर के साथ हमें WhatsApp करें, हम मदद करेंगे।", gu: "તમે તમારા મોબાઇલ નંબર અને પાસવર્ડથી લૉગિન કરી શકો છો. પાસવર્ડ રીસેટ માટે કૃપા કરીને રજિસ્ટર્ડ મોબાઇલ નંબર સાથે અમને WhatsApp કરો, અમે મદદ કરીશું." },
  resetWa: { en: "Reset password on WhatsApp", hl: "WhatsApp par password reset karein", hi: "WhatsApp पर पासवर्ड रीसेट करें", gu: "WhatsApp પર પાસવર્ડ રીસેટ કરો" },
  aboutLink: { en: "About us", hl: "Hamare baare mein", hi: "हमारे बारे में", gu: "અમારા વિશે" },
  shopAll: { en: "Shop all", hl: "Saare products dekhein", hi: "सभी प्रोडक्ट देखें", gu: "બધા પ્રોડક્ટ જુઓ" },

  // ---------- products ----------
  found: { en: "Here’s what I found:", hl: "Ye mila:", hi: "यह मिला:", gu: "આ મળ્યું:" },
  foundUnder: { en: "Here’s what I found under {max}:", hl: "{max} se kam mein ye mila:", hi: "{max} से कम में यह मिला:", gu: "{max} થી ઓછામાં આ મળ્યું:" },
  close: { en: "I couldn’t find an exact match, but these are close:", hl: "Bilkul wahi nahi mila, lekin ye milte-julte hain:", hi: "बिल्कुल वही नहीं मिला, लेकिन ये मिलते-जुलते हैं:", gu: "બરાબર એ જ ન મળ્યું, પણ આ મળતા આવે છે:" },
  seeAll: { en: "See all in shop", hl: "Shop mein sab dekhein", hi: "शॉप में सभी देखें", gu: "શોપમાં બધું જુઓ" },
  noMatch: { en: "I couldn’t find a matching bag right now.", hl: "Abhi mujhe koi matching bag nahi mila.", hi: "अभी मुझे कोई मिलता-जुलता बैग नहीं मिला।", gu: "હમણાં મને કોઈ મળતી બેગ મળી નથી." },
  noMatchUnder: { en: "I couldn’t find a matching bag under {max} right now.", hl: "{max} se kam mein abhi koi matching bag nahi mila.", hi: "{max} से कम में अभी कोई मिलता-जुलता बैग नहीं मिला।", gu: "{max} થી ઓછામાં હમણાં કોઈ મળતી બેગ મળી નથી." },
  browse: { en: "Browse the shop", hl: "Shop dekhein", hi: "शॉप देखें", gu: "શોપ જુઓ" },
  askTeam: { en: "Or ask our team, they may be able to suggest something.", hl: "Ya hamari team se poochhein, shayad wo kuch suggest kar sakein.", hi: "या हमारी टीम से पूछें, शायद वे कुछ सुझा सकें।", gu: "અથવા અમારી ટીમને પૂછો, કદાચ તેઓ કંઈક સૂચવી શકે." },
  inStock: { en: "In stock", hl: "Stock mein hai", hi: "स्टॉक में है", gu: "સ્ટોકમાં છે" },
  outStock: { en: "Out of stock", hl: "Stock khatam", hi: "स्टॉक खत्म", gu: "સ્ટોક ખતમ" },
  onlyLeft: { en: "Only {n} left", hl: "Sirf {n} bache hain", hi: "सिर्फ {n} बचे हैं", gu: "ફક્ત {n} બાકી છે" },
  fromPrice: { en: "From {p}", hl: "{p} se shuru", hi: "{p} से शुरू", gu: "{p} થી શરૂ" },

  // ---------- chat window ----------
  placeholder: { en: "Ask about shipping, bags, orders…", hl: "Shipping, bags, orders ke baare mein poochhein…", hi: "शिपिंग, बैग, ऑर्डर के बारे में पूछें…", gu: "શિપિંગ, બેગ, ઓર્ડર વિશે પૂછો…" },
  note: { en: "AI assistant. For anything important, our team is on WhatsApp.", hl: "AI assistant. Zaroori baat ke liye hamari team WhatsApp par hai.", hi: "AI असिस्टेंट। ज़रूरी बात के लिए हमारी टीम WhatsApp पर है।", gu: "AI આસિસ્ટન્ટ. મહત્વની બાબત માટે અમારી ટીમ WhatsApp પર છે." },
  sub: { en: "AI helper · replies instantly", hl: "AI helper · turant jawab", hi: "AI सहायक · तुरंत जवाब", gu: "AI સહાયક · તરત જવાબ" },
  fail: { en: "Sorry, I couldn’t answer that right now. Our team can help you on WhatsApp.", hl: "Maaf kijiye, abhi main iska jawab nahi de paya. Hamari team WhatsApp par madad kar sakti hai.", hi: "माफ़ कीजिए, अभी मैं इसका जवाब नहीं दे पाया। हमारी टीम WhatsApp पर मदद कर सकती है।", gu: "માફ કરજો, હમણાં હું તેનો જવાબ આપી શક્યો નથી. અમારી ટીમ WhatsApp પર મદદ કરી શકે છે." },
  tooFast: { en: "You’re sending messages very quickly. Please try again in {min} minute(s).", hl: "Aap bahut tezi se message bhej rahe hain. Kripya {min} minute baad dobara koshish karein.", hi: "आप बहुत तेज़ी से मैसेज भेज रहे हैं। कृपया {min} मिनट बाद दोबारा कोशिश करें।", gu: "તમે બહુ ઝડપથી મેસેજ મોકલી રહ્યા છો. કૃપા કરીને {min} મિનિટ પછી ફરી પ્રયાસ કરો." },
  langAuto: { en: "Auto", hl: "Auto", hi: "ऑटो", gu: "ઓટો" },
};

// {naam} ko value se badal kar jawab deta hai. Bhasha mein line na ho to English chalti hai.
export function t(lang, key, v = {}) {
  const e = S[key];
  if (!e) return key;
  return String(e[lang] ?? e.en).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
}

// Shuru ke button (chips): login hai ya nahi, aur bhasha ke hisaab se
const CH = {
  en: ["Shipping charges", "Return policy", "Show bags", "Track my order"],
  hl: ["Shipping charges", "Return policy", "Bags dikhao", "Mera order track karo"],
  hi: ["शिपिंग चार्ज", "रिटर्न पॉलिसी", "बैग दिखाइए", "मेरा ऑर्डर ट्रैक करें"],
  gu: ["શિપિંગ ચાર્જ", "રિટર્ન પોલિસી", "બેગ બતાવો", "મારો ઓર્ડર ટ્રૅક કરો"],
};
export const chipsFor = (lang, loggedIn) => {
  const c = CH[lang] || CH.en;
  return loggedIn ? [c[3], c[1], c[0], c[2]] : c;
};

/* ---------- Bhasha pehchanna ---------- */
const DEVA = /[\u0900-\u097F]/;
const GUJ = /[\u0A80-\u0AFF]/;
// Roman Hindi ke pakke nishaan (English mein ye shabd nahi aate)
const HL = new Set("hai hain kya kaise kaisa kab kahan kaha kyun kyu mera meri mere mujhe nahi nahin chahiye dikhao dikhaiye kitna kitne kitni aap aapka apka tak wapas paisa paise karna karni karun karo hota hoti hoga milega bhejo batao bataiye shukriya dhanyavad namaste ka ki ko abhi jaldi kripya haan nahin bhai".split(" "));

// Buyer ne jis bhasha mein likha wahi bhasha. forced = chat window ke bhasha chunav se; hint = pichhli bhasha
export function resolveLang(text, forced, hint) {
  if (LANGS.includes(forced)) return forced;
  const s = String(text || "");
  if (GUJ.test(s)) return "gu";
  if (DEVA.test(s)) return "hi";
  const words = s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.some((w) => HL.has(w))) return "hl";
  if (words.length >= 2) return "en";
  return LANGS.includes(hint) ? hint : "en"; // ek shabd (jaise "MB1042", "cod") ho to pichhli bhasha
}

/* ---------- SITE ke English text ko bhasha mein badalna ("5 to 7 working days", "Mon to Sat, 10 AM to 6 PM (IST)") ---------- */
export function dur(lang, s) {
  const m = String(s).match(/^(\d+)\s*(?:to|-)\s*(\d+)\s*(working )?days?$/i);
  if (!m || lang === "en") return s;
  const [, a, b, w] = m;
  if (lang === "hl") return `${a} se ${b} ${w ? "working " : ""}din`;
  if (lang === "hi") return `${a} से ${b} ${w ? "कार्य " : ""}दिन`;
  return `${a} થી ${b} ${w ? "કામકાજી " : ""}દિવસ`;
}
const DAYS = {
  hl: ["Somvar", "Mangalvar", "Budhvar", "Guruvar", "Shukravar", "Shanivar", "Ravivar"],
  hi: ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"],
  gu: ["સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર", "રવિવાર"],
};
const PART = { hl: ["subah", "dopahar", "shaam"], hi: ["सुबह", "दोपहर", "शाम"], gu: ["સવારે", "બપોરે", "સાંજે"] };
export function hoursText(lang, s) {
  const m = String(s).match(/^(\w{3})\w* to (\w{3})\w*,?\s*(\d{1,2})\s?(AM|PM) to (\d{1,2})\s?(AM|PM)(?:\s*\(IST\))?$/i);
  const names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  if (!m || lang === "en") return s;
  const d1 = names.indexOf(m[1].toLowerCase()), d2 = names.indexOf(m[2].toLowerCase());
  if (d1 < 0 || d2 < 0) return s;
  const part = (h, ap) => { h = Number(h); const i = ap.toUpperCase() === "AM" ? 0 : h === 12 || h < 4 ? 1 : 2; return PART[lang][i]; };
  const D = DAYS[lang];
  const a = `${part(m[3], m[4])} ${m[3]}`, b = `${part(m[5], m[6])} ${m[5]}`;
  if (lang === "hl") return `${D[d1]} se ${D[d2]}, ${a} baje se ${b} baje tak (IST)`;
  if (lang === "hi") return `${D[d1]} से ${D[d2]}, ${a} बजे से ${b} बजे तक (IST)`;
  return `${D[d1]} થી ${D[d2]}, ${a} થી ${b} સુધી (IST)`;
}
export const dateLocale = (lang) => (lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : "en-IN");

/* ---------- Order ki halat ke naam (chat card mein) ---------- */
export const STATUS = {
  en: STATUS_HEADING, // buyer ko dikhne wala English text: lib/orderStatus.js (order page ke saath ek hi jagah)
  hl: { "Awaiting Payment": "Payment ka intezaar", Placed: "Order mil gaya", "On Hold": "Jaanch chal rahi hai", Confirmed: "Order confirm ho gaya", Packed: "Pack ho gaya", "Ready to ship": "Bhejne ke liye taiyar", "Picked up": "Courier ne utha liya", "In transit": "Raaste mein hai", Shipped: "Raaste mein hai", "Out for delivery": "Aaj delivery ke liye nikla hai", Delivered: "Deliver ho gaya", NDR: "Delivery nahi ho payi", RTO: "Seller ko wapas ja raha hai", "RTO Done": "Seller ko wapas pahunch gaya", Cancelled: "Order cancel ho gaya", "Return Requested": "Return ki request mili", "Return Approved": "Return manjoor", "Return Rejected": "Return manjoor nahi hua", Refunded: "Refund ho gaya" },
  hi: { "Awaiting Payment": "भुगतान का इंतज़ार", Placed: "ऑर्डर मिल गया", "On Hold": "जाँच चल रही है", Confirmed: "ऑर्डर कन्फर्म हो गया", Packed: "पैक हो गया", "Ready to ship": "भेजने के लिए तैयार", "Picked up": "कूरियर ने उठा लिया", "In transit": "रास्ते में है", Shipped: "रास्ते में है", "Out for delivery": "आज डिलीवरी के लिए निकला है", Delivered: "डिलीवर हो गया", NDR: "डिलीवरी नहीं हो पाई", RTO: "सेलर को वापस जा रहा है", "RTO Done": "सेलर को वापस पहुँच गया", Cancelled: "ऑर्डर कैंसिल हो गया", "Return Requested": "रिटर्न का अनुरोध मिला", "Return Approved": "रिटर्न मंज़ूर", "Return Rejected": "रिटर्न मंज़ूर नहीं हुआ", Refunded: "रिफंड हो गया" },
  gu: { "Awaiting Payment": "ચુકવણીની રાહ", Placed: "ઓર્ડર મળ્યો", "On Hold": "તપાસ ચાલુ છે", Confirmed: "ઓર્ડર કન્ફર્મ થયો", Packed: "પૅક થઈ ગયો", "Ready to ship": "મોકલવા માટે તૈયાર", "Picked up": "કુરિયરે લઈ લીધો", "In transit": "રસ્તામાં છે", Shipped: "રસ્તામાં છે", "Out for delivery": "આજે ડિલિવરી માટે નીકળ્યો છે", Delivered: "ડિલિવર થઈ ગયો", NDR: "ડિલિવરી થઈ શકી નથી", RTO: "સેલરને પાછો જઈ રહ્યો છે", "RTO Done": "સેલરને પાછો પહોંચી ગયો", Cancelled: "ઓર્ડર કૅન્સલ થયો", "Return Requested": "રિટર્નની વિનંતી મળી", "Return Approved": "રિટર્ન મંજૂર", "Return Rejected": "રિટર્ન મંજૂર થયો નથી", Refunded: "રિફંડ થઈ ગયો" },
};
