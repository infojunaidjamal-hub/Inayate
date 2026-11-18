import { redirect } from "next/navigation";
// Profile ab seedha /account par hai
export default function ProfileRedirect() {
  redirect("/account");
}
