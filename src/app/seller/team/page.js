import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { ROLE_LABEL, PERM_ROWS, can } from "@/lib/perms";
import { AddStaff, ResetPw } from "./Forms";
import { resetStaffOtp, toggleStaff, setStaffRole } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team – Store Admin" };

export default async function Team() {
  const me = await requirePerm("team");
  const staff = all("SELECT id, name, email, mobile, role, disabled, last_login, (totp_secret IS NOT NULL) AS otp FROM users WHERE role IN ('seller','manager','operator') ORDER BY (role = 'seller') DESC, id");
  return (
    <>
      <h2>Team</h2>
      <AddStaff />
      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        <table className="st-t">
          <thead><tr><th>Naam</th><th>Role</th><th>OTP</th><th>Pichhla login</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {staff.map((u) => {
              const owner = u.role === "seller", self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td><b>{u.name}{self ? " (aap)" : ""}</b><br /><span className="mut" style={{ fontSize: 12 }}>{u.email || u.mobile}</span></td>
                  <td>
                    {owner ? <span className="st-tag g">Owner</span> : (
                      <form action={setStaffRole} style={{ display: "flex", gap: 4 }}>
                        <input type="hidden" name="id" value={u.id} />
                        <select name="role" defaultValue={u.role} style={{ padding: "4px 8px", width: "auto" }}><option value="manager">Manager</option><option value="operator">Operator</option></select>
                        <button className="st-mini">Badlein</button>
                      </form>
                    )}
                  </td>
                  <td>{u.otp ? "✔ Chalu" : u.role === "operator" ? "Nahi (optional)" : <b style={{ color: "#b8463c" }}>Baaki</b>}</td>
                  <td>{u.last_login ? fmtDate(u.last_login) : "Abhi tak nahi"}</td>
                  <td><span className={"st-tag " + (u.disabled ? "x" : "g")}>{u.disabled ? "Band" : "Active"}</span></td>
                  <td style={{ minWidth: 210 }}>
                    {!owner && (
                      <>
                        <ResetPw id={u.id} />
                        <form action={resetStaffOtp} style={{ display: "inline" }} ><input type="hidden" name="id" value={u.id} /><button className="st-mini">OTP reset</button></form>
                        <form action={toggleStaff} style={{ display: "inline" }}><input type="hidden" name="id" value={u.id} /><button className="st-mini r">{u.disabled ? "Chalu karein" : "Band karein"}</button></form>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mut" style={{ fontSize: 12 }}>Staff ka phone kho jaye to &quot;OTP reset&quot; dabayein, agle login par wo naya setup karega. Band kiye hue staff ka login turant band ho jata hai.</p>

      <h3 style={{ marginTop: 26 }}>Kaun kya kar sakta hai</h3>
      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        <table className="st-t">
          <thead><tr><th>Kaam</th>{["seller", "manager", "operator"].map((r) => <th key={r} className="c">{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>{PERM_ROWS.map(([label, perm]) => <tr key={perm}><td>{label}</td>{["seller", "manager", "operator"].map((r) => <td key={r} className="c">{can(r, perm) ? "✅" : "🔒"}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mut" style={{ fontSize: 12 }}>Ye table badalni ho to <code>src/lib/perms.js</code> mein ek line badalni hoti hai. OTP Owner aur Manager ke liye zaroori hai, Operator ke liye optional.</p>
    </>
  );
}
