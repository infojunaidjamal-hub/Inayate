"use client";
import { useState } from "react";
import BagArt from "./BagArt";

const fit = { width: "100%", height: "100%", objectFit: "cover", display: "block" };

export default function Gallery({ images, name, main, dark }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="pv"><BagArt main={main} dark={dark} /></div>;
  return (
    <div>
      <div className="pv"><img src={images[i]} alt={name} style={fit} /></div>
      {images.length > 1 && (
        <div className="ths">
          {images.map((u, k) => (
            <button key={u} type="button" className={"th " + (k === i ? "on" : "")} onClick={() => setI(k)} style={{ padding: 0, overflow: "hidden" }} aria-label={`Photo ${k + 1}`}>
              <img src={u} alt="" style={fit} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
