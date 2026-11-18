"use client";
import { useEffect, useRef, useState } from "react";
import { initialBox, moveBox, resizeBox, scaleBox, sourceRect } from "@/lib/cropMath";

const OUT = 400; // final photo 400 x 400 (hamesha gol dikhegi)
const CORNERS = ["nw", "ne", "sw", "se"];
const MAX_ZOOM = 8;

// dashed 3x3 grid (reference jaisa)
const GRID = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cg stroke='white' stroke-opacity='.85' stroke-width='1' stroke-dasharray='4 4' vector-effect='non-scaling-stroke' fill='none'%3E%3Cpath d='M33.333 0V100M66.666 0V100M0 33.333H100M0 66.666H100' vector-effect='non-scaling-stroke'/%3E%3C/g%3E%3C/svg%3E\")";

const CSS = `
.cr2-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cr2-head h3{margin:0}
.cr2-x{flex:none;border:0;background:var(--bg);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;color:var(--mut)}
.cr2-x:hover{background:var(--line);color:var(--ink)}
.cr2-x:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.cr2-sub{color:var(--mut);font-size:13px;margin:2px 0 12px}
.cr2-stage{position:relative;margin:0 auto;overflow:hidden;background:#1f1b18;border-radius:12px;user-select:none;-webkit-user-select:none;touch-action:none}
.cr2-stage>img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;-webkit-user-drag:none}
.cr2-frame{position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px #14110fb8;cursor:move;touch-action:none;box-sizing:border-box}
.cr2-frame:focus-visible{outline:3px solid var(--acc);outline-offset:3px}
.cr2-grid{position:absolute;inset:0;pointer-events:none;background:center/100% 100% no-repeat}
.cr2-dim{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle closest-side,transparent calc(100% - 1px),#14110f73 100%)}
.cr2-ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid #ffffffeb;pointer-events:none}
.cr2-h{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;display:grid;place-items:center;touch-action:none}
.cr2-h::after{content:"";width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 5px #0007;transition:transform .15s}
.cr2-h:hover::after{transform:scale(1.15)}
.cr2-h.c-nw{left:0;top:0;cursor:nwse-resize}.cr2-h.c-ne{left:100%;top:0;cursor:nesw-resize}
.cr2-h.c-sw{left:0;top:100%;cursor:nesw-resize}.cr2-h.c-se{left:100%;top:100%;cursor:nwse-resize}
.cr2-zoom{display:flex;align-items:center;gap:10px;margin-top:14px}
.cr2-zoom b{font:500 12px Poppins;color:var(--mut);width:36px}
.cr2-zoom button{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:20px;line-height:1;cursor:pointer;color:var(--ink)}
.cr2-zoom button:hover{border-color:var(--acc)}
.cr2-zoom input[type=range]{flex:1;min-width:0;margin:0;padding:0;accent-color:var(--acc);height:28px;cursor:pointer}
.cr2-prev{display:flex;align-items:center;gap:12px;margin-top:12px;padding:10px 12px;background:var(--bg);border-radius:14px}
.cr2-pv{flex:none;width:60px;height:60px;border-radius:50%;background-color:var(--rose);background-repeat:no-repeat;border:2px solid #fff;box-shadow:0 0 0 1px var(--line)}
.cr2-prev span{font-size:12.5px;color:var(--mut)}
.cr2-prev b{display:block;color:var(--ink);font-weight:500}
.cr2-err{text-align:center;padding:10px 4px 2px}
.cr2-err i{display:grid;place-items:center;width:56px;height:56px;margin:0 auto 12px;border-radius:50%;background:#fbeceb;color:#b8463c;font-style:normal;font-size:26px}
.cr2-err b{display:block;font-weight:500;margin-bottom:4px}
.cr2-err p{margin:0;color:var(--mut);font-size:13px}
`;

// Poori photo dikhti hai. Gol frame ko khiskayein, kono ke buttons ya Zoom slider se bada-chhota karein.
export default function PhotoCropper({ file, onCancel, onDone, onRepick }) {
  const dlg = useRef(null);
  const wrap = useRef(null);
  const stage = useRef(null);
  const drag = useRef(null);
  const [img, setImg] = useState(null);
  const [err, setErr] = useState("");
  const [k, setK] = useState(1); // display scale: screen px / photo px
  const [box, setBox] = useState(null);
  const boxRef = useRef(null);
  boxRef.current = box;

  useEffect(() => {
    const d = dlg.current;
    d.showModal();
    return () => { if (d.open) d.close(); };
  }, []);

  useEffect(() => {
    let alive = true; // dev mode mein effect do baar chalta hai: purani baar ka jawab ignore karo
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      if (!alive) return;
      const w = el.naturalWidth, h = el.naturalHeight;
      setImg({ el, w, h, url });
      setBox(initialBox(w, h));
    };
    el.onerror = () => { if (alive) setErr("bad"); };
    el.src = url;
    return () => {
      alive = false;
      el.onload = el.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // photo ko dialog mein poora fit karo (width aur height dono ke hisaab se)
  useEffect(() => {
    if (!img) return;
    const measure = () => {
      const maxW = wrap.current ? wrap.current.clientWidth : 320;
      const maxH = Math.max(200, window.innerHeight * 0.45);
      setK(Math.min(maxW / img.w, maxH / img.h));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [img]);

  const minSide = () => 48 / k;
  const base = img ? Math.min(img.w, img.h) : 1;       // sabse bada frame
  const zoomMax = Math.min(MAX_ZOOM, Math.max(1.5, base / minSide()));
  const zoom = box ? Math.min(zoomMax, Math.max(1, base / box.s)) : 1;
  const setZoom = (z) => setBox((b) => scaleBox(b, base / Math.min(zoomMax, Math.max(1, z)), img.w, img.h, minSide()));

  const start = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, id: e.pointerId, x: e.clientX, y: e.clientY, box: boxRef.current };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !img) return;
    if (d.mode === "move") {
      setBox(moveBox(d.box, (e.clientX - d.x) / k, (e.clientY - d.y) / k, img.w, img.h));
    } else {
      const r = stage.current.getBoundingClientRect();
      setBox(resizeBox(d.box, d.mode, (e.clientX - r.left) / k, (e.clientY - r.top) / k, img.w, img.h, minSide()));
    }
  };
  const end = (e) => { if (drag.current && drag.current.id === e.pointerId) drag.current = null; };

  const key = (e) => {
    if (!img || !box) return;
    const step = Math.max(2, box.s * 0.03);
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { e.preventDefault(); setBox(moveBox(box, m[0], m[1], img.w, img.h)); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(zoom * 1.08); }
    else if (e.key === "-") { e.preventDefault(); setZoom(zoom / 1.08); }
  };

  function save() {
    if (!img || !box) return;
    const { sx, sy } = sourceRect(box);
    const c = document.createElement("canvas");
    c.width = c.height = OUT;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img.el, sx, sy, box.s, box.s, 0, 0, OUT, OUT);
    c.toBlob((b) => (b ? onDone(b, "circle") : setErr("save")), "image/jpeg", 0.9);
  }

  // chhota live preview: final photo aisi dikhegi
  const P = 60, ps = box ? P / box.s : 1;
  const pv = img && box ? { backgroundImage: `url(${img.url})`, backgroundSize: `${img.w * ps}px ${img.h * ps}px`, backgroundPosition: `${-box.x * ps}px ${-box.y * ps}px` } : {};

  return (
    <dialog ref={dlg} className="dlg" aria-labelledby="cr-t" onCancel={(e) => { e.preventDefault(); onCancel(); }} style={{ maxWidth: 460 }}>
      <style>{CSS}</style>
      <div className="cr2-head">
        <h3 id="cr-t">Photo adjust karein</h3>
        <button type="button" className="cr2-x" onClick={onCancel} aria-label="Band karein">×</button>
      </div>

      {err ? (
        <>
          <div className="cr2-err" role="alert">
            <i aria-hidden="true">🖼</i>
            <b>{err === "save" ? "Photo save nahi ho payi" : "Ye photo khul nahi payi"}</b>
            <p>{err === "save" ? "Dobara try karein." : "JPG, PNG ya WEBP photo chunein."}</p>
          </div>
          <div className="dlg-btns">
            {onRepick && <button type="button" className="btn a" onClick={onRepick}>Dusri photo chunein</button>}
            <button type="button" className="btn o" onClick={onCancel}>Cancel</button>
          </div>
        </>
      ) : !img || !box ? (
        <>
          <p className="cr2-sub">Photo khul rahi hai...</p>
          <div className="dlg-btns"><button type="button" className="btn o" onClick={onCancel}>Cancel</button></div>
        </>
      ) : (
        <>
          <p className="cr2-sub">Gol frame ko khiskayein. Kono ke buttons ya Zoom se bada-chhota karein.</p>
          <div ref={wrap} style={{ width: "100%" }}>
            <div ref={stage} className="cr2-stage" style={{ width: img.w * k, height: img.h * k }}>
              <img src={img.url} alt="" draggable={false} />
              <div
                className="cr2-frame" tabIndex={0} role="group"
                aria-label="Crop frame. Khiskane ke liye drag karein, arrow keys se hilayein, plus aur minus se bada-chhota karein."
                style={{ left: box.x * k, top: box.y * k, width: box.s * k, height: box.s * k }}
                onPointerDown={start("move")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={key}
              >
                <i className="cr2-grid" style={{ backgroundImage: GRID }} />
                <i className="cr2-dim" />
                <i className="cr2-ring" />
                {CORNERS.map((c) => (
                  <span key={c} className={`cr2-h c-${c}`} aria-hidden="true" onPointerDown={start(c)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
                ))}
              </div>
            </div>
          </div>

          <div className="cr2-zoom">
            <b>Zoom</b>
            <button type="button" onClick={() => setZoom(zoom / 1.15)} aria-label="Zoom kam karein">−</button>
            <input type="range" min="1" max={zoomMax} step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
            <button type="button" onClick={() => setZoom(zoom * 1.15)} aria-label="Zoom badhayein">+</button>
          </div>

          <div className="cr2-prev">
            <div className="cr2-pv" style={pv} aria-hidden="true" />
            <span><b>Aisi dikhegi</b>Aapki profile photo gol hoti hai.</span>
          </div>

          <div className="dlg-btns">
            <button type="button" className="btn a" onClick={save}>Photo save karein</button>
            <button type="button" className="btn o" onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </dialog>
  );
}
