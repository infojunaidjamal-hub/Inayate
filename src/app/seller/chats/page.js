import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { saveAnswer, toggleAnswer, deleteAnswer } from "./actions";
import DeleteAnswer from "./DeleteAnswer";
import "./chats.css";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chatbot log – Seller Panel" };

const SAVED = { added: "Answer added. The bot will use it from now on.", updated: "Answer updated.", on: "Answer turned on.", off: "Answer turned off. The bot will not use it.", deleted: "Answer deleted." };

// Sawaal-jawab ka form: naya jawab jodne ke liye, ya (a di ho to) purana badalne ke liye
function AnswerForm({ q = "", a }) {
  return (
    <form action={saveAnswer} className="ch-form">
      {a && <input type="hidden" name="id" value={a.id} />}
      <label>Question
        <input name="question" defaultValue={a?.question ?? q} maxLength={300} required />
      </label>
      <label>Other ways buyers may ask this (optional, one per line)
        <textarea name="phrases" rows={2} maxLength={600} defaultValue={a?.phrases || ""} placeholder={"how do i place an order\nkaise order karun\nઓર્ડર કેવી રીતે કરવો"} />
      </label>
      <label>Answer the bot will give
        <textarea name="answer" rows={4} maxLength={1000} defaultValue={a?.answer || ""} required placeholder="Write the reply in simple words. A new line starts a new paragraph." />
      </label>
      <details className="ch-d">
        <summary>Answers in other languages (optional)</summary>
        <p className="ch-hint">The question can be in any language. If a buyer writes in Hinglish, Hindi or Gujarati, the bot uses the matching answer below. If a box is empty, the buyer gets the main answer above.</p>
        <label>Hinglish answer<textarea name="answer_hl" rows={3} maxLength={1000} defaultValue={a?.answer_hl || ""} placeholder="Roman Hindi mein jawab" /></label>
        <label>हिन्दी answer<textarea name="answer_hi" rows={3} maxLength={1000} defaultValue={a?.answer_hi || ""} placeholder="हिन्दी में जवाब" /></label>
        <label>ગુજરાતી answer<textarea name="answer_gu" rows={3} maxLength={1000} defaultValue={a?.answer_gu || ""} placeholder="ગુજરાતીમાં જવાબ" /></label>
      </details>
      <div className="ch-two">
        <label>Button text (optional)<input name="link_label" maxLength={30} defaultValue={a?.link_label || ""} placeholder="Shop now" /></label>
        <label>Button link (optional)<input name="link_url" maxLength={300} defaultValue={a?.link_url || ""} placeholder="/products or https://..." /></label>
      </div>
      <p className="ch-hint">The bot will use this answer when a buyer asks this question, or one very close to it.</p>
      <button className="btn a s">{a ? "Save changes" : "Save answer"}</button>
    </form>
  );
}

// Buyers ne chatbot se kya poocha, kya jawab mila, aur kya WhatsApp par gaya. 90 din ka log rehta hai.
export default async function ChatLog({ searchParams }) {
  await requirePerm("chats");
  const sp = await searchParams;
  const show = sp?.show === "missed" ? "missed" : sp?.show === "handover" ? "handover" : "all";
  const since = "created_at >= datetime('now','-30 days')";
  const s = one(`SELECT COUNT(*) total, COALESCE(SUM(answered),0) answered, COALESCE(SUM(handover),0) handed FROM chat_logs WHERE ${since}`);
  const missed = s.total - s.answered;
  const top = all(`SELECT MIN(question) q, COUNT(*) n FROM chat_logs WHERE answered = 0 AND ${since} GROUP BY lower(question) ORDER BY n DESC, MAX(id) DESC LIMIT 15`);
  const where = show === "missed" ? "WHERE c.answered = 0" : show === "handover" ? "WHERE c.handover = 1" : "";
  const rows = all(`SELECT c.*, u.name AS user_name FROM chat_logs c LEFT JOIN users u ON u.id = c.user_id ${where} ORDER BY c.id DESC LIMIT 150`);
  const taught = all("SELECT * FROM chat_answers ORDER BY id DESC");

  return (
    <>
      <h1 style={{ margin: 0 }}>Chatbot log</h1>
      <p className="mut" style={{ margin: "4px 0 16px" }}>Buyers ne chatbot se kya poocha (pichle 30 din). Jo sawaal bot ko samajh nahi aaya, uska jawab yahin likho. Bot aage se ye jawab (ya milte-julte sawaal par) har buyer ko dega.</p>

      {sp?.err && <p className="err" role="alert">{sp.err}</p>}
      {SAVED[sp?.saved] && <p className="ch-ok" role="status">{SAVED[sp.saved]}</p>}

      <div className="stats">
        <div className="card"><b>{s.total}</b><br /><small>Questions</small></div>
        <div className="card"><b>{s.answered}</b><br /><small>Answered by bot</small></div>
        <div className="card"><b>{missed}</b><br /><small>Not understood</small></div>
        <div className="card"><b>{s.handed}</b><br /><small>Sent to WhatsApp</small></div>
      </div>

      <div className="card pad" id="teach" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Questions the bot could not answer</h3>
        {top.length === 0 ? <p className="mut" style={{ margin: 0 }}>Nothing waiting. The bot understood every question.</p> : top.map((t) => (
          <div className="row" key={t.q} style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ wordBreak: "break-word" }}>{t.q}</span><span className="mut">{t.n}×</span></div>
            <details className="ch-d"><summary>Add answer</summary><AnswerForm q={t.q} /></details>
          </div>
        ))}
        <details className="ch-d" style={{ marginTop: 12 }}><summary>+ Add a new answer yourself</summary><AnswerForm /></details>
      </div>

      <div className="card pad" id="taught" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Answers you taught the bot ({taught.length})</h3>
        {taught.length === 0 ? <p className="mut" style={{ margin: 0 }}>Nothing yet. Add an answer above and it will show here.</p> : taught.map((a) => (
          <details className="ch-item" key={a.id}>
            <summary>
              <b style={{ wordBreak: "break-word" }}>{a.question}</b>
              <span className="mut">used {a.uses}×</span>
              {!a.active && <span className="tag x">Off</span>}
            </summary>
            <AnswerForm a={a} />
            <div className="ch-act">
              <form action={toggleAnswer}><input type="hidden" name="id" value={a.id} /><button className="btn o s">{a.active ? "Turn off" : "Turn on"}</button></form>
              <form action={deleteAnswer}><input type="hidden" name="id" value={a.id} /><DeleteAnswer /></form>
            </div>
          </details>
        ))}
      </div>

      <div className="tabs">
        <Link href="/seller/chats" className={show === "all" ? "on" : ""}>All</Link>
        <Link href="/seller/chats?show=missed" className={show === "missed" ? "on" : ""}>Not understood</Link>
        <Link href="/seller/chats?show=handover" className={show === "handover" ? "on" : ""}>Sent to WhatsApp</Link>
      </div>

      {rows.length === 0 ? <div className="card pad"><p className="mut" style={{ margin: 0 }}>Abhi koi chat nahi.</p></div> : (
        <div className="card tw">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Question</th><th>Topic</th><th>Result</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mut" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td>
                  <td>{r.user_name || <span className="mut">Guest</span>}</td>
                  <td style={{ wordBreak: "break-word", minWidth: 200 }}>
                    {r.question}
                    {!r.answered && <details className="ch-d"><summary>Add answer</summary><AnswerForm q={r.question} /></details>}
                  </td>
                  <td className="mut">{r.intent || "-"}{r.lang && <span> · {r.lang}</span>}</td>
                  <td>{!r.answered ? <span className="tag x">Not understood</span> : r.handover ? <span className="tag y">To WhatsApp</span> : <span className="tag g">Answered</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
