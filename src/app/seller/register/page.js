import { redirect } from "next/navigation";

// Ye store single-seller hai: bahar se koi register nahi kar sakta. Staff ko Owner "Team" page se jodta hai.
export default function SellerRegister() {
  redirect("/seller/login");
}
