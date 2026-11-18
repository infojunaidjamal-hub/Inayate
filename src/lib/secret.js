// Ek jagah se AUTH_SECRET (session, OTP aur trusted-device sab isi se bandhte hain)
export function authSecret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET set karna zaroori hai");
  return "maison-dev-secret-change-me"; // sirf apne computer par testing ke liye
}
