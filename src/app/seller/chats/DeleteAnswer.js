"use client";
// Delete se pehle "pakka?" poochhta hai
export default function DeleteAnswer() {
  return (
    <button className="btn r s" onClick={(e) => { if (!confirm("Ye jawab hat jayega aur bot isse jawab dena band kar dega. Pakka hatana hai?")) e.preventDefault(); }}>
      Delete
    </button>
  );
}
