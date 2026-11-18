"use client";
// Seller: nayi Style video chunna. Browser mein hi jaanch leta hai (MP4, 8 se 20 second, sahi shape 3:4, 10 MB tak)
// aur pehle frame se poster bana leta hai. Phir /seller/videos/upload par bhej deta hai (progress dikhate hue).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 10 * 1024 * 1024, MIN_SEC = 8, MAX_SEC = 20, LINE_MAX = 24;

function readVideo(url) {
  return new Promise((ok, bad) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.onerror = () => bad(new Error("This browser cannot read the video. Please export it as MP4 (H.264)."));
    v.onloadeddata = () => ok(v);
  });
}
async function posterOf(v) {
  v.currentTime = Math.min(0.5, (v.duration || 1) / 4);
  await new Promise((ok) => { v.onseeked = ok; });
  const w = Math.min(540, v.videoWidth), h = Math.round((w * v.videoHeight) / v.videoWidth);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(v, 0, 0, w, h);
  return new Promise((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.82));
}

export default function VideoForm({ products, ratio }) {
  const router = useRouter();
  const fileRef = useRef(null), posterRef = useRef(null);
  const [video, setVideo] = useState(null);       // { file, secs, poster (Blob|null), previewUrl }
  const [own, setOwn] = useState(null);           // seller ki chuni hui poster image
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [l1, setL1] = useState(""), [l2, setL2] = useState(""), [pid, setPid] = useState("");

  async function pick(file) {
    setErr(""); setNote(""); setVideo(null);
    if (!file) return;
    if (!/\.mp4$/i.test(file.name) && file.type !== "video/mp4") return setErr("Please choose an MP4 video.");
    if (file.size > MAX_BYTES) return setErr("The video is bigger than 10 MB. Please compress it and try again.");
    const url = URL.createObjectURL(file);
    try {
      const v = await readVideo(url);
      const secs = Math.round(v.duration);
      if (secs < MIN_SEC || secs > MAX_SEC) { URL.revokeObjectURL(url); return setErr(`The video is ${secs} seconds long. It should be ${MIN_SEC} to ${MAX_SEC} seconds.`); }
      const want = ratio.w / ratio.h, got = v.videoWidth / v.videoHeight;
      if (Math.abs(got - want) / want > ratio.tol) { URL.revokeObjectURL(url); return setErr(`The video should be ${ratio.label} (yours is ${v.videoWidth}×${v.videoHeight}). ${ratio.hint}`.trim()); }
      let poster = null;
      try { poster = await posterOf(v); } catch { /* seller khud image chun sakta hai */ }
      setVideo({ file, secs, poster, previewUrl: poster ? URL.createObjectURL(poster) : null });
      if (!poster) setNote("Could not make a poster from the first frame. Please choose a poster image.");
    } catch (e) { URL.revokeObjectURL(url); setErr(e.message); }
  }

  function submit(e) {
    e.preventDefault();
    setErr(""); setNote("");
    if (!video) return setErr("Please choose a video first.");
    const poster = own || video.poster;
    if (!poster) return setErr("Please choose a poster image.");
    if (!pid) return setErr("Please choose the linked product.");
    if (!l1.trim()) return setErr("Please write caption line 1.");
    const fd = new FormData();
    fd.set("video", video.file, video.file.name);
    fd.set("poster", poster, poster.name || "poster.jpg");
    fd.set("product_id", pid); fd.set("line1", l1); fd.set("line2", l2);
    setBusy(true); setPct(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/seller/videos/upload");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setBusy(false);
      let d = {}; try { d = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && d.ok) {
        setVideo(null); setOwn(null); setL1(""); setL2(""); setPid(""); setNote(d.notice || "Video saved.");
        if (fileRef.current) fileRef.current.value = ""; if (posterRef.current) posterRef.current.value = "";
        router.refresh();
      } else setErr(d.error || "Upload failed. Please try again.");
    };
    xhr.onerror = () => { setBusy(false); setErr("Upload failed. Check your connection and try again."); };
    xhr.send(fd);
  }

  return (
    <form onSubmit={submit} className="card pad vd-form">
      <h3 style={{ marginTop: 0 }}>Add a video</h3>
      {err && <p className="err" role="alert">{err}</p>}
      {note && <p className="vd-note" role="status">{note}</p>}
      <label className="vd-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pick(f); }}>
        <input ref={fileRef} type="file" accept="video/mp4,.mp4" onChange={(e) => pick(e.target.files?.[0])} hidden />
        {video ? <span>{video.file.name} · {video.secs} s · {(video.file.size / 1048576).toFixed(1)} MB</span> : <span>Drop an MP4 here, or click to choose<br /><small>({ratio.label}, {MIN_SEC} to {MAX_SEC} seconds, up to 10 MB)</small></span>}
      </label>
      {video?.previewUrl && !own && <img src={video.previewUrl} alt="Poster from the first frame" className="vd-poster" style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }} />}
      <label>Poster image (optional, made from the first frame)
        <input ref={posterRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setOwn(e.target.files?.[0] || null)} />
      </label>
      <label>Linked product
        <select value={pid} onChange={(e) => setPid(e.target.value)} required>
          <option value="">Choose a product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label>Caption line 1 (max {LINE_MAX} characters)
        <input value={l1} maxLength={LINE_MAX} onChange={(e) => setL1(e.target.value)} placeholder="Everyday carry" required />
      </label>
      <label>Caption line 2 (max {LINE_MAX} characters, optional)
        <input value={l2} maxLength={LINE_MAX} onChange={(e) => setL2(e.target.value)} placeholder="Soft grain leather" />
      </label>
      <button className="btn a" disabled={busy}>{busy ? `Uploading… ${pct}%` : "Save video"}</button>
    </form>
  );
}
