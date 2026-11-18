"use client";
// Delete se pehle "pakka?" poochhta hai
export default function DeleteButton() {
  return (
    <button className="btn r s" onClick={(e) => { if (!confirm("Ye post hamesha ke liye hat jayega. Pakka hatana hai?")) e.preventDefault(); }}>
      Post hatayein
    </button>
  );
}
