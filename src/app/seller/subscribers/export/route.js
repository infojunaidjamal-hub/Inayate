import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { csvCell as cell } from "@/lib/csv";
import { ensureLeads } from "@/lib/leads";


export async function GET(req) {
  await requirePerm("reports");
  // /seller/subscribers/export?type=mobile  ->  popup se aaye mobile numbers
  if (new URL(req.url).searchParams.get("type") === "mobile") {
    ensureLeads();
    const leads = all("SELECT mobile, notify, source, created_at FROM popup_leads ORDER BY id DESC");
    const out = "\uFEFF" + ["mobile,updates_and_offers,source,signed_up_at", ...leads.map((r) => [r.mobile, r.notify ? "yes" : "no", r.source, r.created_at].map(cell).join(","))].join("\r\n");
    return new Response(out, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mobile-signups-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  const rows = all("SELECT email, source, created_at, CASE WHEN unsubscribed_at IS NULL THEN 'active' ELSE 'unsubscribed' END AS status FROM subscribers ORDER BY id DESC");
  const csv = "\uFEFF" + ["email,source,subscribed_at,status", ...rows.map((r) => [r.email, r.source, r.created_at, r.status].map(cell).join(","))].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
