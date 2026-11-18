"use client";
import { useState } from "react";

export default function CopyText({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn o s" onClick={() => { try { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>
      {ok ? "Copied" : "Copy"}
    </button>
  );
}
