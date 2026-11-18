// ============================================================
// ABOUT PAGE CONTENT: About Us page ka editable content yahin badlo.
// Jo list khali hai, uska section website par apne aap hide rehta hai.
// Sirf real aur verified details hi daalo.
// ============================================================
export const ABOUT = {
  // Team ki ek real group photo. Photo ko public/about/ folder mein rakho
  // aur yahan path likho, jaise "/about/team.jpg". Khali = placeholder dikhega.
  teamPhoto: "",
  teamPhotoAlt: "The Inayate Bags team together",

  // Certificates. Image optional hai.
  // Example: { title: "ISO 9001", note: "Valid till Dec 2027", image: "/about/iso.jpg" }
  certificates: [],

  // Achievements. Sirf wahi numbers daalo jo aap verify kar sako.
  // Example: { value: "10,000+", label: "Happy customers", note: "Since 2024" }
  achievements: [],

  // Marketplaces. Sirf url bharo, url khali ho to wo card hide rehta hai.
  marketplaces: [
    { name: "Flipkart", url: "" },
    { name: "Amazon", url: "" },
    { name: "Meesho", url: "" },
    { name: "Myntra", url: "" },
  ],

  // News and media.
  // Example: { source: "The Times", date: "Oct 2026", title: "Inayate Bags: ...", summary: "...", url: "https://..." }
  press: [],
};
