"use client";
import { useActionState, useRef, useState } from "react";
import { saveAvatar, removeAvatar } from "./actions";
import PhotoCropper from "./PhotoCropper";

export default function AvatarForm({ current, name }) {
  const [s, action, busy] = useActionState(saveAvatar, null);
  const [file, setFile] = useState(null); // jo photo crop ho rahi hai
  const picker = useRef(null);
  const photoOut = useRef(null);
  const formEl = useRef(null);

  function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = ""; // wahi photo dobara chunne par bhi chale
    if (f && f.type.startsWith("image/")) setFile(f);
  }
  function done(blob) {
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
    photoOut.current.files = dt.files;
    setFile(null);
    formEl.current.requestSubmit();
  }

  return (
    <div className="card pad" style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ width: 104, height: 104, borderRadius: "50%", overflow: "hidden", background: "var(--rose)", display: "grid", placeItems: "center", fontSize: 40, fontFamily: "Playfair Display, serif", color: "#2a2623", flexShrink: 0 }}>
        {current ? <img src={current} alt="Profile photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name || "?").trim().charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 230 }}>
        <h3 style={{ marginTop: 0 }}>Profile photo</h3>
        <form action={action} ref={formEl}>
          <input ref={photoOut} name="photo" type="file" hidden />
          <input name="shape" type="hidden" value="circle" readOnly />
          <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn a s" style={{ minHeight: 44 }} disabled={busy} onClick={() => picker.current.click()}>{busy ? "Save ho raha hai..." : current ? "Photo badlein" : "Photo chunein"}</button>
          </div>
        </form>
        {current && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <form action={removeAvatar}><button className="btn o s" style={{ minHeight: 44 }}>Photo hatayein</button></form>
          </div>
        )}
        {s?.error && <p className="err" role="alert" style={{ marginBottom: 0 }}>{s.error}</p>}
        {s?.ok && <p className="ok" role="status" style={{ marginBottom: 0 }}>{s.ok}</p>}
        <p className="mut" style={{ fontSize: 12, marginBottom: 0 }}>JPG, PNG ya WEBP. Photo chunne ke baad aap use khiska kar, zoom karke crop kar sakte hain.</p>
      </div>
      {file && <PhotoCropper file={file} onCancel={() => setFile(null)} onDone={done} onRepick={() => { setFile(null); picker.current.click(); }} />}
    </div>
  );
}
