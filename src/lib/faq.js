// Phase 9 chatbot: store ke sawaal-jawab, 4 bhashaon mein (English, Hinglish, Hindi, Gujarati). Jawab ke shabd lib/chatStrings.js mein hain.
// Sab numbers SITE (lib/site.js) aur CHECKOUT (lib/checkout.js) se aate hain, isliye wahan badalte hi chatbot ka jawab bhi badal jata hai.
// Apne naye sawaal-jawab ke liye seller panel > Chatbot log se "Add answer" use karo (wahan har bhasha mein jawab likh sakte ho).
import { SITE } from "@/lib/site";
import { CHECKOUT, rupees, shipOptions } from "@/lib/checkout";
import { t, dur, hoursText } from "@/lib/chatStrings";
import { waLink } from "@/lib/whatsapp";

// Code mein hi fixed sawaal-jawab chahiye to yahan jodo (sirf ek bhasha). Aam taur par seller panel wala tarika behtar hai.
// Example: { keywords: ["gift wrap"], answer: "Yahan apna jawab likho." }
export const CUSTOM_FAQ = [];

export function customAnswer(q) {
  const hit = CUSTOM_FAQ.find((f) => f.keywords.some((k) => q.includes(String(k).toLowerCase())));
  return hit ? { text: [hit.answer], links: [] } : null;
}

const link = (label, href, kind = "link") => ({ label, href, kind });

// Har jawab: (bhasha) => { text: [paragraph...], links: [...] }
export const POLICY = {
  shipping: (L) => {
    const ex = shipOptions().find((s) => s.id === "express");
    return {
      text: [
        // freeShippingAbove = 0 matlab har order par shipping free (Phase 4), isliye "free above Rs 0" nahi likhna
        SITE.freeShippingAbove > 0 ? t(L, "ship1", { free: rupees(SITE.freeShippingAbove), fee: rupees(SITE.shippingFee) }) : t(L, "ship1Free"),
        t(L, "ship2", { dispatch: dur(L, SITE.dispatchDays), delivery: dur(L, SITE.deliveryDays) }) + (ex ? t(L, "shipExpress", { days: dur(L, ex.days) }) : ""),
      ],
      links: [link(t(L, "shipLink"), "/shipping")],
    };
  },
  cod: (L) => ({
    text: [
      t(L, "cod1", { note: CHECKOUT.codFee ? t(L, "codFee", { fee: rupees(CHECKOUT.codFee) }) : "" }),
      t(L, "cod2") + (CHECKOUT.onlineDiscountPercent ? t(L, "onlineSave", { pct: CHECKOUT.onlineDiscountPercent, max: rupees(CHECKOUT.onlineDiscountMax) }) : ""),
    ],
    links: [],
  }),
  payment: (L) => ({
    text: [t(L, "pay1") + (CHECKOUT.onlineDiscountPercent ? t(L, "payOff", { pct: CHECKOUT.onlineDiscountPercent, max: rupees(CHECKOUT.onlineDiscountMax) }) : ""), t(L, "pay2")],
    links: [],
  }),
  return: (L) => ({
    text: [t(L, "ret1", { days: SITE.returnDays }), t(L, "ret2")],
    links: [link(t(L, "retLink"), "/shipping"), link(t(L, "myOrders"), "/account/orders")],
  }),
  refund: (L) => ({ text: [t(L, "refund1", { days: dur(L, SITE.refundDays) }), t(L, "refund2")], links: [] }),
  cancel: (L) => ({ text: [t(L, "cancel1"), t(L, "cancel2")], links: [link(t(L, "myOrders"), "/account/orders")] }),
  coupon: (L) => ({ text: [t(L, "coupon1"), t(L, "coupon2")], links: [] }),
  contact: (L) => ({
    text: [t(L, "contact1", { phone: SITE.phone, email: SITE.email, hours: hoursText(L, SITE.hours) }), t(L, "contact2", { address: SITE.address })],
    links: [link(t(L, "waChat"), waLink(), "wa"), link(t(L, "contactPage"), "/contact")],
  }),
  account: (L) => ({
    text: [t(L, "account1")],
    links: [link(t(L, "loginBtn"), "/login"), link(t(L, "resetWa"), waLink("Hi, I need help resetting my password."), "wa")],
  }),
  about: (L) => ({
    text: [`${SITE.name}: ${SITE.tagline}`],
    links: [link(t(L, "aboutLink"), "/about"), link(t(L, "shopAll"), "/products")],
  }),
};
