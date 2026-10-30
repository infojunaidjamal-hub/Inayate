import { requireSeller } from "@/lib/auth";
import { all } from "@/lib/db";

const COLS = ["order_no", "created_at", "ship_name", "pay_method", "total", "pay_status", "status", "razorpay_payment_id", "razorpay_refund_id", "refunded_at", "refund_note"];

// Excel mein khulne wali CSV. Naam jaise "=cmd" Excel mein formula na ban jaye, isliye aage ' lagate hain
const cell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  await requireSeller();
  const rows = all(`SELECT ${COLS.join(", ")} FROM orders ORDER BY id DESC`);
  const csv = "\uFEFF" + [COLS.join(","), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
