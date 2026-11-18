import { getUser } from "@/lib/auth";
import NoSave from "./NoSave";

// Seller ho to kuch nahi lagta. Buyer ya bina login wale par NoSave chalta hai.
export default async function NoSaveGate() {
  const u = await getUser();
  if ((u && u.role !== "buyer")) return null;
  return <NoSave />;
}