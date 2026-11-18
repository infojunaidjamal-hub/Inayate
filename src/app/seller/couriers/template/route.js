import { requirePerm } from "@/lib/auth";
import { makeWorkbook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// Pincode upload ka khali Excel template
export async function GET() {
  await requirePerm("logistics");
  const columns = [
    { key: "pincode", header: "Pincode", width: 12, type: "text" },
    { key: "city", header: "City", width: 22, type: "text" },
    { key: "zone", header: "Zone", width: 8, type: "text" },
    { key: "cod", header: "COD", width: 8, type: "text" },
    { key: "prepaid", header: "Prepaid", width: 10, type: "text" },
  ];
  const rows = [{ pincode: "395009", city: "Surat (Adajan)", zone: "A", cod: "yes", prepaid: "yes" }, { pincode: "400001", city: "Mumbai", zone: "C", cod: "yes", prepaid: "yes" }];
  const body = makeWorkbook([{ name: "Pincodes", columns, rows }]);
  return new Response(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="pincodes-template.xlsx"', "Cache-Control": "no-store" } });
}
