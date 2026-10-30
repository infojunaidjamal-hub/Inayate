"use client";

import { useState, useEffect } from "react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function toggleVisibility() {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: "90px", // WhatsApp button ke upar place karne ke liye
        right: "20px",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        backgroundColor: "var(--ink, #241f1c)",
        color: "#f6e3a8", // Brand accent tone
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        zIndex: 999,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.backgroundColor = "var(--acc, #b89768)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.backgroundColor = "var(--ink, #241f1c)";
        e.currentTarget.style.color = "#f6e3a8";
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}