"use client";
// Button dabane se pehle "pakka?" poochhta hai (server form ke andar chalta hai)
export default function Confirm({ message, className, children }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
