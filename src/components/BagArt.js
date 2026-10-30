export default function BagArt({ main = "#b8865b", dark = "#8a5d3a" }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M38 48V36a22 22 0 0 1 44 0v12" fill="none" stroke={dark} strokeWidth="6" strokeLinecap="round" />
      <path d="M18 46h84l8 62a6 6 0 0 1-6 7H16a6 6 0 0 1-6-7z" fill={main} />
      <path d="M18 46h84l2 14H16z" fill={dark} opacity=".35" />
      <circle cx="60" cy="68" r="4" fill={dark} />
    </svg>
  );
}
