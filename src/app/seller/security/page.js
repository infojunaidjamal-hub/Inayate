import { requireStaff } from "@/lib/auth";
import { one, all } from "@/lib/db";
import { otpRequired, ROLE_LABEL } from "@/lib/perms";
import { fmtDate } from "@/lib/format";
import SetupBlock from "../login/SetupBlock";
import { PasswordForm, OtpActions } from "./Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security – Store Admin" };

export default async function Security({ searchParams }) {
  const user = await requireStaff({ allowSetup: true });
  const { force } = await searchParams;
  const u = one("SELECT * FROM users WHERE id = ?", user.id);
  const left = one("SELECT COUNT(*) c FROM backup_codes WHERE user_id = ? AND used_at IS NULL", u.id).c;
  const needOtp = otpRequired(u.role) && !u.totp_secret;

  return (
    <>
      <h2>Security</h2>
      {u.must_change ? <div className="st-deny">Aapko temporary password mila hai. Aage badhne se pehle apna password badlein.</div> : null}
      {needOtp && !u.must_change ? <div className="st-deny">Aapke role ({ROLE_LABEL[u.role]}) ke liye OTP zaroori hai. Neeche authenticator app jodein, phir dashboard khulega.</div> : null}
      {force && !u.must_change && !needOtp ? <div className="st-ok">Sab theek hai, ab aap aage badh sakte hain.</div> : null}
      <p className="mut">Login: {u.email || u.mobile} · Role: <b>{ROLE_LABEL[u.role]}</b> · Pichhla login: {u.last_login ? fmtDate(u.last_login) : "-"}</p>

      <h3 style={{ marginTop: 22 }}>Password badlein</h3>
      <PasswordForm />

      <h3 style={{ marginTop: 28 }}>OTP (authenticator app)</h3>
      {u.totp_secret ? (
        <>
          <p><span className="st-tag g">Chalu hai</span> <span className="mut">· {left} backup codes bache hain</span>{left <= 2 ? <b style={{ color: "#b8463c" }}> (naye bana lein)</b> : null}</p>
          <OtpActions canDisable={!otpRequired(u.role)} />
        </>
      ) : (
        <>
          <p className="mut" style={{ maxWidth: 520 }}>{otpRequired(u.role) ? "Ye aapke role ke liye zaroori hai." : "Ye zaroori nahi hai, par login ko kaafi surakshit bana deta hai."}</p>
          <div style={{ maxWidth: 440 }}><SetupBlock /></div>
        </>
      )}
    </>
  );
}
