"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAct } from "@/lib/activity";
import { norm, bestScore, FUZZY } from "@/lib/chatbotIntent";
import { clean } from "@/lib/text";

const back = (qs = "") => redirect("/seller/chats" + qs);
const fail = (msg) => back("?err=" + encodeURIComponent(msg) + "#teach");

// Form se sawaal, jawab aur button padhna. Galti ho to { error } milta hai.
function read(form) {
  const question = clean(form.get("question")).slice(0, 300);
  const phrases = String(form.get("phrases") || "").split("\n").map((l) => clean(l).slice(0, 200)).filter(Boolean).slice(0, 10);
  const body = (name) => String(form.get(name) || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1000);
  const answer = body("answer");
  const answer_hl = body("answer_hl") || null, answer_hi = body("answer_hi") || null, answer_gu = body("answer_gu") || null; // doosri bhashaon ke jawab (optional)
  const link_label = clean(form.get("link_label")).slice(0, 30);
  const link_url = String(form.get("link_url") || "").trim().slice(0, 300);
  if (question.length < 3) return { error: "Please write the question (at least 3 letters)." };
  if (answer.length < 2) return { error: "Please write the answer." };
  if (link_url && !/^(\/(?!\/)|https:\/\/)/.test(link_url)) return { error: "Button link should start with / (a page of your shop, like /products) or https://" };
  if (link_url && !link_label) return { error: "Please write the button text for the link." };
  return { question, phrases, answer, answer_hl, answer_hi, answer_gu, link_label: link_url ? link_label : null, link_url: link_url || null };
}

export async function saveAnswer(form) {
  const user = await requirePerm("chats");
  const id = Number(form.get("id") || 0);
  const d = read(form);
  if (d.error) return fail(d.error);
  const nq = norm(d.question);
  if (all("SELECT id, question FROM chat_answers").some((r) => r.id !== id && norm(r.question) === nq)) {
    return fail("This question already has an answer. Edit it under “Answers you taught the bot”.");
  }
  if (id) {
    if (!one("SELECT id FROM chat_answers WHERE id = ?", id)) return fail("Answer not found.");
    run("UPDATE chat_answers SET question = ?, phrases = ?, answer = ?, answer_hl = ?, answer_hi = ?, answer_gu = ?, link_label = ?, link_url = ?, updated_at = datetime('now') WHERE id = ?", d.question, d.phrases.join("\n"), d.answer, d.answer_hl, d.answer_hi, d.answer_gu, d.link_label, d.link_url, id);
  } else {
    run("INSERT INTO chat_answers (question, phrases, answer, answer_hl, answer_hi, answer_gu, link_label, link_url, created_by) VALUES (?,?,?,?,?,?,?,?,?)", d.question, d.phrases.join("\n"), d.answer, d.answer_hl, d.answer_hi, d.answer_gu, d.link_label, d.link_url, user.name || "-");
  }
  // Purane "samajh nahi aaya" sawaal jo is jawab se milte hain, unhe ab answered dikhao
  const mine = [d.question, ...d.phrases];
  for (const r of all("SELECT id, question FROM chat_logs WHERE answered = 0 ORDER BY id DESC LIMIT 500")) {
    if (bestScore(r.question, mine) >= FUZZY) run("UPDATE chat_logs SET answered = 1, handover = 0, intent = 'taught' WHERE id = ?", r.id);
  }
  logAct(user, id ? "chat_answer_edit" : "chat_answer_add", d.question);
  revalidatePath("/seller/chats");
  back("?saved=" + (id ? "updated" : "added"));
}

export async function toggleAnswer(form) {
  const user = await requirePerm("chats");
  const id = Number(form.get("id"));
  const r = one("SELECT question, active FROM chat_answers WHERE id = ?", id);
  if (!r) return fail("Answer not found.");
  run("UPDATE chat_answers SET active = ? WHERE id = ?", r.active ? 0 : 1, id);
  logAct(user, "chat_answer_toggle", `${r.question} -> ${r.active ? "off" : "on"}`);
  revalidatePath("/seller/chats");
  back("?saved=" + (r.active ? "off" : "on") + "#taught");
}

export async function deleteAnswer(form) {
  const user = await requirePerm("chats");
  const id = Number(form.get("id"));
  const r = one("SELECT question FROM chat_answers WHERE id = ?", id);
  if (r) {
    run("DELETE FROM chat_answers WHERE id = ?", id);
    logAct(user, "chat_answer_delete", r.question);
  }
  revalidatePath("/seller/chats");
  back("?saved=deleted#taught");
}
