// Message outbox: abhi (localhost) har message database mein save hota hai. Asli bhejna (email/WhatsApp/SMS) baad mein judega.
import { run } from "@/lib/db";

export function queueMessage({ channel = "email", to, subject = "", body, kind = "", ref = "" }) {
  if (!body) return null;
  return run(
    "INSERT INTO message_outbox (channel, to_addr, subject, body, kind, ref) VALUES (?,?,?,?,?,?)",
    channel, to || null, subject, String(body).slice(0, 5000), kind || null, ref || null
  ).lastInsertRowid;
}
