"use client";
import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["featured", "Featured"],
  ["newest", "Newest first"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
  ["discount", "Biggest discount"],
];

export default function SortSelect({ value }) {
  const router = useRouter();
  const sp = useSearchParams();
  function change(e) {
    const p = new URLSearchParams(sp.toString());
    if (e.target.value === "featured") p.delete("sort"); else p.set("sort", e.target.value);
    p.delete("page");
    const s = p.toString();
    router.push("/products" + (s ? "?" + s : ""), { scroll: false });
  }
  return (
    <label className="shp-sort">
      <span className="shp-sr">Sort by</span>
      <select value={value} onChange={change}>
        {OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}
