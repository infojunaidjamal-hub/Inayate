"use client";
import { useEffect, useState } from "react";
import Carousel from "./Carousel";
import MiniCard from "./MiniCard";
import { recentProducts } from "@/app/products/recent";
import { deliveryBy } from "@/lib/delivery";

// Dekhe hue products browser mein yaad rakhta hai (login ki zaroorat nahi)
export default function RecentlyViewed({ currentId }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem("maison_recent") || "[]"); } catch {}
    const next = [currentId, ...ids.filter((x) => x !== currentId)].slice(0, 12);
    try { localStorage.setItem("maison_recent", JSON.stringify(next)); } catch {}
    const others = ids.filter((x) => x !== currentId);
    if (others.length) recentProducts(others).then(setItems).catch(() => {});
  }, [currentId]);
  if (!items.length) return null;
  const by = deliveryBy();
  return <Carousel title="Recently Viewed">{items.map((p) => <MiniCard key={p.id} p={p} by={by} />)}</Carousel>;
}
