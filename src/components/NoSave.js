"use client";
import { useEffect } from "react";

// Images / videos par right-click aur drag band. Seller ke liye ye component hi nahi lagta (NoSaveGate dekhein).
export default function NoSave() {
  useEffect(() => {
    document.documentElement.classList.add("nosave");
    const media = (t) => t instanceof Element && t.closest("img, video, picture, canvas");
    const block = (e) => { if (media(e.target)) e.preventDefault(); };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.documentElement.classList.remove("nosave");
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}