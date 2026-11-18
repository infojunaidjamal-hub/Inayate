import { SITE } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";

export const metadata = {
  title: `Contact Us – ${SITE.name}`,
  description: `Get in touch with ${SITE.name}. WhatsApp, email or call: a real person is ready to help.`,
};

const CSS = `
.ct section{margin-top:54px}
.ct h1,.ct h2,.ct h3,.ct p{margin:0}
.ct-tag{display:inline-block;font-size:12px;font-weight:500;letter-spacing:2px;color:var(--acc);margin-bottom:10px}
.ct-anchor{scroll-margin-top:90px}
.ct-head{max-width:620px;margin-bottom:26px}
.ct-head h2{font-size:clamp(26px,4vw,38px);line-height:1.15;margin-bottom:8px}
.ct-head p{color:var(--mut)}

/* hero */
.ct-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center;margin-top:10px!important}
.ct-hero h1{font-size:clamp(36px,6vw,64px);line-height:1.05;letter-spacing:-1px;margin-bottom:16px}
.ct-hero h1 em{font-style:normal;color:var(--acc)}
.ct-lead{color:var(--mut);font-size:15.5px;max-width:480px}
.ct-cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
.ct-cta .btn{padding:12px 26px;font-size:14px}
.ct-art{position:relative;min-height:380px;border-radius:28px;background:#e5e0f5;overflow:hidden;display:grid;place-items:center;padding:28px}
.ct-art:before{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:#d7f36a;right:-65px;top:-80px}
.ct-art:after{content:"";position:absolute;width:180px;height:180px;border-radius:50%;background:#f27d62;left:-65px;bottom:-65px}
.ct-note{position:absolute;z-index:3;background:#fff;padding:10px 14px;border-radius:12px;font-size:11.5px;font-weight:500;letter-spacing:.5px;box-shadow:0 10px 26px #2a26231f}
.ct-note.a{top:30px;left:22px;transform:rotate(-5deg)}
.ct-note.b{right:20px;bottom:30px;background:#d7f36a;transform:rotate(5deg)}
.ct-chat{position:relative;z-index:2;width:min(300px,92%);height:230px}
.ct-bub{position:absolute;border-radius:22px;padding:14px 18px;box-shadow:0 16px 30px #2a262324;font-size:13px;font-weight:500}
.ct-bub small{display:block;font-size:10px;letter-spacing:1px;color:var(--mut);margin-bottom:3px}
.ct-bub.one{left:0;top:10px;background:#fff;width:210px;transform:rotate(-5deg)}
.ct-bub.two{right:0;top:92px;background:#d7f36a;width:210px;transform:rotate(4deg)}
.ct-bub.three{left:26px;bottom:0;background:#f7d9cb;width:190px;transform:rotate(-2deg)}

/* ticker */
.ct-tick{background:#d7f36a;color:#2a2623;overflow:hidden;white-space:nowrap;padding:12px 0;border-radius:16px}
.ct-tick div{display:inline-flex;gap:34px;font-size:12px;font-weight:500;letter-spacing:2px;animation:ctTick 28s linear infinite}
@keyframes ctTick{to{transform:translateX(-50%)}}

/* channels + side */
.ct-layout{display:grid;grid-template-columns:1.08fr .92fr;gap:18px;align-items:start}
.ct-panel{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:26px;box-shadow:0 12px 30px #2a26230d}
.ct-panel h3{font-size:20px;margin-bottom:4px}
.ct-panel>p{color:var(--mut);font-size:13.5px;margin-bottom:18px}
.ct-ch{display:grid;gap:12px}
.ct-c{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:16px;padding:14px 16px;background:var(--bg);text-decoration:none;transition:transform .2s,border-color .2s}
.ct-c:hover{transform:translateY(-3px);border-color:var(--acc)}
.ct-ic{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:20px;color:#2a2623}
.ct-ic svg{width:24px;height:24px;fill:currentColor}
.ct-ic.w{background:#e2edc9}.ct-ic.e{background:#e5e0f5}.ct-ic.p{background:#f7d9cb}
.ct-c small{display:block;font-size:11px;letter-spacing:.5px;color:var(--mut)}
.ct-c b{display:block;font-size:15px;font-weight:500;overflow-wrap:anywhere}
.ct-c em{display:block;font-style:normal;font-size:12px;color:var(--mut)}
.ct-go{margin-left:auto;color:var(--acc);font-size:20px;flex:none}
.ct-side{display:grid;gap:14px}
.ct-addr{position:relative;overflow:hidden;background:#2a2623;color:#e8dfd4;border-radius:24px;padding:26px}
.ct-addr:after{content:"";position:absolute;width:200px;height:200px;border:1px solid #ffffff30;border-radius:50%;right:-90px;top:-100px;box-shadow:0 0 0 24px #ffffff0a}
.ct-addr .ct-tag{color:#d7f36a}
.ct-addr h3{color:#fff;font-size:22px;line-height:1.2;margin-bottom:10px;position:relative;z-index:1}
.ct-addr p{font-size:13.5px;margin-bottom:16px;position:relative;z-index:1}
.ct-addr .btn{background:#d7f36a;color:#2a2623;position:relative;z-index:1}
.ct-hrs{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:20px 24px}
.ct-hrs h3{font:600 18px 'Playfair Display',serif;margin-bottom:8px}
.ct-hrs div{display:flex;justify-content:space-between;gap:14px;padding:8px 0;font-size:13px;border-bottom:1px solid var(--line)}
.ct-hrs div:last-child{border:0;padding-bottom:0}
.ct-hrs span{color:var(--mut)}

/* faq */
.ct-faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:40px;align-items:start}
.ct-faq h2{font-size:clamp(26px,4vw,38px);line-height:1.15;margin-bottom:8px}
.ct-faq>div>p{color:var(--mut)}
.ct-q{display:grid;gap:10px}
.ct-q details{border:1px solid var(--line);border-radius:16px;padding:15px 18px;background:var(--card)}
.ct-q summary{cursor:pointer;font-weight:500;font-size:14px;list-style:none;display:flex;justify-content:space-between;gap:14px}
.ct-q summary::-webkit-details-marker{display:none}
.ct-q summary:after{content:"+";font-size:20px;line-height:1;color:var(--acc)}
.ct-q details[open] summary:after{content:"−"}
.ct-q details p{font-size:13px;color:var(--mut);margin-top:10px}

/* final cta */
.ct-end{text-align:center;background:#f27d62;color:#fff;border-radius:24px;padding:52px 22px}
.ct-end .ct-tag{color:#fff}
.ct-end h2{font-size:clamp(28px,4.4vw,42px);color:#fff;margin-bottom:10px}
.ct-end p{color:#fff1ec;max-width:440px;margin:0 auto 22px}
.ct-end .btn{background:#2a2623;color:#fff;padding:12px 30px;font-size:14px}

@media(max-width:900px){
  .ct-hero,.ct-layout,.ct-faq{grid-template-columns:1fr}
  .ct-faq{gap:22px}.ct-art{min-height:340px}
}
@media(max-width:520px){.ct-panel{padding:18px}.ct-c{padding:12px;gap:12px}.ct-c b{font-size:13.5px}}
@media(prefers-reduced-motion:reduce){.ct-tick div{animation:none}.ct-c{transition:none}}
`;

export default function ContactPage() {
  const wa = waLink();
  const waHelp = `${wa}?text=${encodeURIComponent(`Hi ${SITE.name} team, I need some help.`)}`;
  const tel = `tel:${SITE.phone.replace(/\s/g, "")}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;
  const ticker = ["HERE WHEN YOU NEED US ✳", "GOOD BAGS, GOOD PEOPLE ✳", "LET’S TALK ✳", "YOUR EVERYDAY, YOUR STYLE ✳"];

  return (
    <div className="ct">
      <style>{CSS}</style>

      {/* Hero */}
      <section className="ct-hero">
        <div>
          <span className="ct-tag">WE’D LOVE TO HEAR FROM YOU</span>
          <h1>Let’s keep<br /><em>it connected.</em></h1>
          <p className="ct-lead">
            Need help with an order, have a question about a bag, or want to work with us? Reach out to the{" "}
            {SITE.name} team. A real person is ready to help.
          </p>
          <div className="ct-cta">
            <a className="btn a" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            <a className="btn o" href={`mailto:${SITE.email}`}>Send an email</a>
          </div>
        </div>
        <div className="ct-art" role="img" aria-label="Friendly message bubbles representing ways to contact us">
          <span className="ct-note a">YOUR INAYATE CREW ✦</span>
          <div className="ct-chat">
            <div className="ct-bub one"><small>YOU</small>Hey! Need a little help 👋</div>
            <div className="ct-bub two"><small>INAYATE TEAM</small>We’ve got you. 💛</div>
            <div className="ct-bub three"><small>GOOD VIBES ONLY</small>Let’s sort it out!</div>
          </div>
          <span className="ct-note b">REAL PEOPLE. QUICK REPLIES.</span>
        </div>
      </section>

      <div className="ct-tick" aria-hidden="true">
        <div>{[...ticker, ...ticker].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>

      {/* Channels */}
      <section className="ct-anchor" id="contact">
        <div className="ct-head">
          <span className="ct-tag">PICK YOUR WAY TO SAY HELLO</span>
          <h2>We’re just a message away.</h2>
          <p>Choose whichever channel works best for you. For order questions, WhatsApp is the quickest way to reach us.</p>
        </div>
        <div className="ct-layout">
          <div className="ct-panel">
            <h3>Quick vibe check</h3>
            <p>Choose your fighter. We’ll take it from there.</p>
            <div className="ct-ch">
              <a className="ct-c" href={waHelp} target="_blank" rel="noopener noreferrer">
                <span className="ct-ic w" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11 11 0 0 1-4.6-4.1c-.4-.5-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.6l-.4.5c-.2.2-.3.3-.1.6.7 1.1 1.5 1.9 2.7 2.5.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.4 0 .2 0 .8-.3 1.4z" /></svg>
                </span>
                <span><small>Fastest route, instant support</small><b>Chat on WhatsApp</b><em>+{SITE.whatsapp}</em></span>
                <span className="ct-go" aria-hidden="true">↗</span>
              </a>
              <a className="ct-c" href={`mailto:${SITE.email}`}>
                <span className="ct-ic e" aria-hidden="true">✉️</span>
                <span><small>Collaborations and queries</small><b>{SITE.email}</b><em>For ideas, partnerships and everything else</em></span>
                <span className="ct-go" aria-hidden="true">↗</span>
              </a>
              <a className="ct-c" href={tel}>
                <span className="ct-ic p" aria-hidden="true">📞</span>
                <span><small>Prefer a phone call?</small><b>{SITE.phone}</b><em>{SITE.hours}</em></span>
                <span className="ct-go" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <aside className="ct-side">
            <div className="ct-addr">
              <span className="ct-tag">📍 HEADQUARTERS</span>
              <h3>Our little corner<br />of Gujarat.</h3>
              <p><b>{SITE.name}</b><br />{SITE.address}</p>
              <a className="btn" href={mapUrl} target="_blank" rel="noopener noreferrer">Get directions ↗</a>
            </div>
            <div className="ct-hrs">
              <h3>When we’re around</h3>
              <div><span>Support hours</span><b>{SITE.hours}</b></div>
              <div><span>Sunday</span><b>Closed</b></div>
            </div>
          </aside>
        </div>
      </section>

      {/* FAQ */}
      <section className="ct-faq ct-anchor" id="faq">
        <div>
          <span className="ct-tag">A FEW QUICK ANSWERS</span>
          <h2>Before you<br />drop us a text.</h2>
          <p>A little info that can make getting help even easier.</p>
        </div>
        <div className="ct-q">
          <details open>
            <summary>What’s the fastest way to contact you?</summary>
            <p>WhatsApp is our fastest support route. Send us a message at +{SITE.whatsapp}.</p>
          </details>
          <details>
            <summary>What should I share for an order update?</summary>
            <p>Please include your order ID in your WhatsApp message so the team can find your order more quickly.</p>
          </details>
          <details>
            <summary>When can I call the team?</summary>
            <p>Our calling hours are {SITE.hours}.</p>
          </details>
          <details>
            <summary>Who should I contact for collaborations?</summary>
            <p>For collaborations and general queries, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
          </details>
        </div>
      </section>

      {/* Final CTA */}
      <section className="ct-end">
        <span className="ct-tag">WE’RE ALL EARS ✦</span>
        <h2>Got something on your mind?</h2>
        <p>Whether it’s a question, an idea or just a quick hello, our inbox is open.</p>
        <a className="btn" href={wa} target="_blank" rel="noopener noreferrer">Let’s chat on WhatsApp ↗</a>
      </section>
    </div>
  );
}