"use client";
import { useEffect, useState } from "react";
import SortSelect from "./SortSelect";
import FilterButton from "./FilterButton";

const COLS = [2, 3, 4];
const ColsIcon = ({ n }) => (
  <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true" fill="currentColor">
    {Array.from({ length: n }, (_, i) => <rect key={i} x={i * (18 / n) + 0.5} y="0" width={18 / n - 2} height="14" rx="1.5" />)}
  </svg>
);

// Toolbar (kitne products, grid size, sort) + products ka grid
export default function ShopResults({ info, sort, children }) {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    try { const v = Number(localStorage.getItem("shpCols")); if (COLS.includes(v)) setCols(v); } catch {}
  }, []);
  const pick = (c) => { setCols(c); try { localStorage.setItem("shpCols", String(c)); } catch {} };

  return (
    <>
      <div className="shp-bar">
        <span className="shp-count">{info}</span>
        <div className="shp-barR">
          <FilterButton />
          <div className="shp-cols" role="group" aria-label="Grid size">
            {COLS.map((c) => (
              <button key={c} type="button" className={cols === c ? "on" : ""} onClick={() => pick(c)} aria-label={`${c} columns`} aria-pressed={cols === c}><ColsIcon n={c} /></button>
            ))}
          </div>
          <SortSelect value={sort} />
        </div>
      </div>
      <div className="shp-grid" data-cols={cols}>{children}</div>
    </>
  );
}
