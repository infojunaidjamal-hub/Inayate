import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { clientIp, minutesLocked, recordFail } from "@/lib/throttle";
import { answer, fallbackReply, logChat } from "@/lib/chatbot";
import { LANGS, resolveLang, t } from "@/lib/chatStrings";

export const dynamic = "force-dynamic";

// Chatbot: POST /api/chat  { message, lang?, hint? }  ->  { blocks, chips, handover, lang }
// lang = chat window ka bhasha-chunav ("auto" ya en/hl/hi/gu), hint = pichhli bhasha.
// Login cookie se pata chalta hai buyer kaun hai. Order sirf usi buyer ke dikhte hain, message mein likhe naam se nahi.
export async function POST(request) {
  if (SITE.chatbot?.enabled === false) return NextResponse.json({ error: "off" }, { status: 404 });
  let message = "", lang = "auto", hint = "en";
  try {
    const body = await request.json();
    message = String(body?.message || "").trim().slice(0, 300);
    if (LANGS.includes(body?.lang)) lang = body.lang;
    if (LANGS.includes(body?.hint)) hint = body.hint;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });

  const L = resolveLang(message, lang, hint);
  const user = await getUser();
  // Bahut tez messages rokna: 15 minute mein 40 se zyada ho jayein to thodi der ruk jao (lib/throttle.js)
  const key = `chat:${user ? "u" + user.id : await clientIp()}`;
  const wait = minutesLocked(key);
  if (wait) {
    return NextResponse.json({ blocks: [{ type: "text", text: t(L, "tooFast", { min: wait }) }], chips: [], handover: false, lang: L }, { status: 429 });
  }
  recordFail(key, 40);

  try {
    const r = answer({ message, user, lang, hint });
    logChat({ userId: user?.id, question: message, intent: r.intent, answered: r.answered, handover: r.handover, lang: r.lang });
    return NextResponse.json({ blocks: r.blocks, chips: r.chips, handover: r.handover, lang: r.lang });
  } catch (e) {
    console.error("chat:", e);
    const r = fallbackReply(message, L);
    return NextResponse.json({ blocks: r.blocks, chips: [], handover: true, lang: L });
  }
}
