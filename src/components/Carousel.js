"use client";
import { useRef } from "react";

export default function Carousel({ title, children }) {
  const ref = useRef(null);
  return (
    <>
      <div className="pp-secH">
        <h2>{title}</h2>
        <button className="pp-arr" aria-label="Aage" onClick={() => ref.current?.scrollBy({ left: 420, behavior: "smooth" })}>→</button>
      </div>
      <div className="pp-car" ref={ref}>{children}</div>
    </>
  );
}
