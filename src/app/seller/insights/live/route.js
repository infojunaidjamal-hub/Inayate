import { requirePerm } from "@/lib/auth";
import { liveData } from "@/lib/insights";

export const dynamic = "force-dynamic";

// Live activity ka data (har 30 second mein page yahan se taaza karta hai)
export async function GET() {
  await requirePerm("insights");
  return Response.json(liveData(), { headers: { "Cache-Control": "no-store" } });
}
