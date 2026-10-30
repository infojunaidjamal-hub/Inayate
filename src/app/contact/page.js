import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = {
  title: `Contact Us – ${SITE.name}`,
  description: "Get in touch with Inayate Bags. We're here to vibe and help you out!",
};

export default function ContactPage() {
  return (
    <div style={{ background: "var(--bg, #fbf9f5)", minHeight: "100vh", padding: "40px 16px 80px", color: "var(--ink, #241f1c)" }}>
      
      {/* Hero Header Section */}
      <div style={{ maxWidth: "900px", margin: "0 auto 40px", textAlign: "center" }}>
        <span style={{ background: "#f6e3a8", color: "#5c4825", fontSize: "12px", fontWeight: "600", padding: "6px 14px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "1px" }}>
          ✨ We are all ears!
        </span>
        <h1 style={{ font: "600 36px 'Playfair Display', serif", margin: "16px 0 10px", letterSpacing: "1px" }}>
          Let’s Keep It Connected
        </h1>
        <p style={{ font: "400 15px Poppins, sans-serif", color: "#6e655d", maxWidth: "550px", margin: "0 auto" }}>
          Got questions about a drop, order status, or just want to vibe over aesthetic bags? Hit us up, we reply faster than your ex! 💅
        </p>
      </div>

      {/* Main Grid Container */}
      <div style={{ maxWidth: "1000px", margin: "0 auto 30px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }} className="contact-grid">
        
        {/* LEFT: Interactive Quick Connect Card */}
        <div style={{ background: "#fff", border: "1px solid var(--line, #e8dfd4)", borderRadius: "20px", padding: "32px", boxShadow: "0 14px 30px rgba(42,38,35,0.06)", transition: "transform 0.3s ease" }}>
          <h3 style={{ font: "600 20px 'Playfair Display', serif", margin: "0 0 8px" }}>Quick Vibe Check (Reach Out)</h3>
          <p style={{ font: "400 13.5px Poppins, sans-serif", color: "#7a7067", margin: "0 0 24px" }}>
            Choose your fighter—WhatsApp is our fastest route!
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* WhatsApp Box */}
            <a 
              href={`https://wa.me/${SITE.whatsapp}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "14px", background: "#f2f9f4", border: "1px solid #d1ebd6", textDecoration: "none", color: "#1b4d2e", transition: "all 0.2s" }}
            >
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#25D366", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11 11 0 0 1-4.6-4.1c-.4-.5-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.6l-.4.5c-.2.2-.3.3-.1.6.7 1.1 1.5 1.9 2.7 2.5.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.4 0 .2 0 .8-.3 1.4z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#557a62", fontWeight: "500" }}>Instant Support</div>
                <div style={{ fontSize: "15px", fontWeight: "600" }}>Chat on WhatsApp (+{SITE.whatsapp})</div>
              </div>
            </a>

            {/* Email Box */}
            <a 
              href={`mailto:${SITE.email}`}
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "14px", background: "#fbf9f5", border: "1px solid var(--line)", textDecoration: "none", color: "var(--ink)", transition: "all 0.2s" }}
            >
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--ink)", display: "grid", placeItems: "center", color: "#f6e3a8", flexShrink: 0 }}>
                ✉️
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#7a7067", fontWeight: "500" }}>Collaborations & Queries</div>
                <div style={{ fontSize: "15px", fontWeight: "600" }}>{SITE.email}</div>
              </div>
            </a>

            {/* Call Box */}
            <a 
              href={`tel:${SITE.phone.replace(/\s/g, "")}`}
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "14px", background: "#fbf9f5", border: "1px solid var(--line)", textDecoration: "none", color: "var(--ink)", transition: "all 0.2s" }}
            >
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--acc, #b89768)", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}>
                📞
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#7a7067", fontWeight: "500" }}>Call Us ({SITE.hours})</div>
                <div style={{ fontSize: "15px", fontWeight: "600" }}>{SITE.phone}</div>
              </div>
            </a>

          </div>
        </div>

        {/* RIGHT: HQ Address & Order Help Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", boxShadow: "0 14px 30px rgba(42,38,35,0.06)" }}>
            <h4 style={{ font: "600 16px 'Playfair Display', serif", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "8px" }}>
              📍 Headquarters HQ
            </h4>
            <p style={{ font: "400 13.5px Poppins, sans-serif", color: "#6e655d", margin: "0", lineHeight: "1.6" }}>
              {SITE.name}<br />
              {SITE.address}
            </p>
          </div>

          <div style={{ background: "#241f1c", color: "#e8dfd4", borderRadius: "20px", padding: "28px", boxShadow: "0 14px 30px rgba(42,38,35,0.1)" }}>
            <h4 style={{ font: "600 16px 'Playfair Display', serif", margin: "0 0 10px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚡ Pro-Tip for Order Help
            </h4>
            <p style={{ font: "400 13.5px Poppins, sans-serif", color: "#bfb3a6", margin: "0", lineHeight: "1.6" }}>
              Dropping a text on WhatsApp? Keep your order ID ready (like <code style={{ background: "#ffffff22", padding: "2px 6px", borderRadius: "4px", color: "#f6e3a8" }}>MB1041</code>) so our squad can sort your query instantly!
            </p>
          </div>

        </div>

      </div>

      {/* MAP SECTION */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", background: "#fff", border: "1px solid var(--line, #e8dfd4)", borderRadius: "20px", padding: "24px", boxShadow: "0 14px 30px rgba(42,38,35,0.06)" }}>
        <h3 style={{ font: "600 18px 'Playfair Display', serif", margin: "0 0 14px" }}>Find Us Here 🗺️</h3>
        <div style={{ width: "100%", height: "340px", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--line)" }}>
          <iframe
            title="Inayate Bags Location Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3720.8596638971274!2d72.8777!3d21.1702!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDEwJzEyLjciTiA3MsKwNTInMzkuNyJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>
      </div>

      {/* Responsive adjustment CSS style block */}
      <style>{`
        @media(max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}