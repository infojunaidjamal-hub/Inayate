"use client";
export default function PrintBtn({ label = "Print / Save as PDF" }) {
  return <button type="button" className="btn a" style={{ minHeight: 44 }} onClick={() => window.print()}>{label}</button>;
}
