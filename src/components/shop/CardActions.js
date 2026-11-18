"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickAdd } from "@/app/products/quick";
import { toggleWishlist } from "@/app/account/actions";

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

// Card par hover karne par dikhne wale 3 button: cart, dekho, wishlist
export default function CardActions({ id, name, out, inWish, hasVariants = false }) {
  const router = useRouter();
  const [wish, setWish] = useState(inWish);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const say = (m) => { setMsg(m); setTimeout(() => setMsg(""), 1800); };
  const add = hasVariants ? () => router.push(`/products/${id}`) : () => start(async () => { const r = await quickAdd(id); say(r.msg); });
  const heart = () => {
    setWish((w) => !w);
    start(async () => { const fd = new FormData(); fd.set("id", String(id)); await toggleWishlist(fd); });
  };

  return (
    <>
      <div className="shp-acts">
        <button type="button" onClick={add} disabled={out || pending} aria-label={`${name}: cart mein daalein`} title={hasVariants ? "Choose options" : "Add to cart"}>
          <svg {...svg}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
        </button>
        <Link href={`/products/${id}`} aria-label={`${name}: detail dekhein`} title="View">
          <svg {...svg}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </Link>
        <button type="button" onClick={heart} className={wish ? "on" : ""} aria-label={wish ? "Wishlist se hatayein" : "Wishlist mein daalein"} title="Wishlist">
          <svg {...svg} fill={wish ? "currentColor" : "none"}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
        </button>
      </div>
      {msg && <span className="shp-toast" role="status">{msg}</span>}
    </>
  );
}
