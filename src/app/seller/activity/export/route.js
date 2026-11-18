import { requirePerm } from "@/lib/auth";
import { all } from "@/lib/db";
import { activityWhere, AREAS } from "@/lib/activity";
import { csvCell as cell } from "@/lib/csv";


// Activity log CSV: sirf Owner (perm "reports"). Filters wahi jo page par chune hain.
export async function GET(request) {
  const me = await requirePerm("reports");
  const sp = new URL(request.url).searchParams;
  const area = AREAS.includes(sp.get("area")) ? sp.get("area") : "";
  const { where, params } = activityWhere(me.role, { q: (sp.get("q") || "").trim().slice(0, 80), area, who: (sp.get("who") || "").slice(0, 60), days: Number(sp.get("days")) || 30 });
  const rows = all(`SELECT a.created_at, a.user_name, a.area, a.action, a.detail FROM activity_log a WHERE ${where} ORDER BY a.id DESC LIMIT 5000`, ...params);
  const csv = "\uFEFF" + ["when_utc,who,area,action,detail", ...rows.map((r) => [r.created_at, r.user_name, r.area, r.action, r.detail].map(cell).join(","))].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
