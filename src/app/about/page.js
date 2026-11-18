import Link from "next/link";
import BagArt from "@/components/BagArt";
import { SITE } from "@/lib/site";
import { ABOUT } from "@/lib/about";

export const metadata = {
  title: `About – ${SITE.name}`,
  description: `Get to know ${SITE.name}: everyday bags made to move with your plans, your pace and your style.`,
};

const CSS = `
.ab section{margin-top:54px}
.ab h1,.ab h2,.ab h3,.ab p{margin:0}
.ab-tag{display:inline-block;font-size:12px;font-weight:500;letter-spacing:2px;color:var(--acc);margin-bottom:10px}
.ab-title{text-align:center;margin-bottom:26px}
.ab-title h2{font-size:clamp(26px,4vw,38px);line-height:1.15}
.ab-title p{color:var(--mut);max-width:520px;margin:10px auto 0}
.ab-anchor{scroll-margin-top:90px}

/* hero */
.ab-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center;margin-top:10px!important}
.ab-hero h1{font-size:clamp(36px,6vw,64px);line-height:1.05;letter-spacing:-1px;margin-bottom:16px}
.ab-hero h1 em{font-style:normal;color:var(--acc)}
.ab-lead{color:var(--mut);font-size:15.5px;max-width:480px}
.ab-cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
.ab-cta .btn{padding:12px 26px;font-size:14px}
.ab-vis{position:relative;min-height:400px;border-radius:28px;background:#e5e0f5;overflow:hidden;display:grid;place-items:center}
.ab-vis:before{content:"";position:absolute;width:290px;height:290px;border-radius:50%;background:#d7f36a;right:-50px;top:-70px}
.ab-vis:after{content:"";position:absolute;width:190px;height:190px;border-radius:50%;background:#f27d62;left:-60px;bottom:-60px}
.ab-vis svg{position:relative;z-index:2;width:min(250px,64%);transform:rotate(-6deg);filter:drop-shadow(0 20px 22px #2a262333)}
.ab-stk{position:absolute;z-index:3;background:#fff;padding:10px 14px;border-radius:12px;font-size:12px;font-weight:500;box-shadow:0 10px 26px #2a26231f}
.ab-stk.a{top:42px;left:22px;transform:rotate(-6deg)}
.ab-stk.b{right:20px;bottom:44px;background:#d7f36a;transform:rotate(5deg)}

/* story */
.ab-story{display:grid;grid-template-columns:.9fr 1.1fr;gap:40px;align-items:center}
.ab-pull{min-height:340px;border-radius:24px;background:#f27d62;color:#fff;padding:30px;display:flex;align-items:flex-end;position:relative;overflow:hidden;font:600 clamp(28px,4vw,38px)/1.12 'Playfair Display',serif}
.ab-pull:before{content:"";position:absolute;width:250px;height:250px;border:1px solid #ffffff8c;border-radius:50%;left:50%;top:40%;transform:translate(-50%,-50%);box-shadow:0 0 0 26px #ffffff1f}
.ab-story h2{font-size:clamp(26px,4vw,36px);line-height:1.15;margin-bottom:14px}
.ab-story p{color:var(--mut);margin-bottom:12px}
.ab-note{border-left:3px solid var(--acc);background:var(--card);padding:14px 18px;border-radius:0 12px 12px 0;font-size:13.5px;margin-top:16px}

/* women */
.ab-women{display:grid;grid-template-columns:1.1fr .9fr;gap:30px;align-items:center;background:linear-gradient(110deg,#2a2623,#4a3a2e);color:var(--bg);border-radius:24px;padding:44px}
.ab-women .ab-tag{color:#d7f36a}
.ab-women h2{font-size:clamp(28px,4.4vw,42px);line-height:1.12;color:var(--bg);margin-bottom:12px}
.ab-women p{color:#e8dfd4;margin-bottom:18px}
.ab-women .btn{background:#d7f36a;color:#2a2623}
.ab-pill{display:grid;gap:10px}
.ab-pill div{border:1px solid #ffffff2b;border-radius:16px;padding:16px 18px;background:#ffffff0d}
.ab-pill b{display:block;font:500 19px 'Playfair Display',serif;color:#f6e3a8;margin-bottom:2px}
.ab-pill span{font-size:13px;color:#e8dfd4}

/* quality */
.ab-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;counter-reset:s}
.ab-step{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;counter-increment:s}
.ab-step:before{content:counter(s);display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--rose);font:600 16px 'Playfair Display',serif;margin-bottom:14px}
.ab-step h3{font-size:17px;margin-bottom:6px}
.ab-step p{font-size:13px;color:var(--mut)}
.ab-certs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px}
.ab-cert{display:flex;gap:14px;align-items:center;background:#f3e3d3;border-radius:16px;padding:14px}
.ab-cert img{flex:none;width:64px;height:64px;object-fit:cover;border-radius:10px;background:#fff}
.ab-cert i{flex:none;width:44px;height:44px;border-radius:50%;background:#fff;display:grid;place-items:center;font-style:normal}
.ab-cert b{display:block;font-size:13.5px;font-weight:500}
.ab-cert small{color:var(--mut);font-size:12px}

/* team */
.ab-team{display:grid;grid-template-columns:1.25fr .75fr;gap:30px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:26px}
.ab-photo{aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:linear-gradient(135deg,#f3e3d3,#e9c9c0);display:grid;place-items:center;text-align:center;color:var(--mut);font-size:13px}
.ab-photo img{width:100%;height:100%;object-fit:cover;display:block}
.ab-photo svg{width:90px;display:block;margin:0 auto 8px;opacity:.8}
.ab-team h2{font-size:clamp(24px,3.6vw,34px);line-height:1.15;margin-bottom:10px}
.ab-team p{color:var(--mut)}

/* achievements */
.ab-ach{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.ab-a{border-radius:20px;padding:26px;min-height:200px;display:flex;flex-direction:column;justify-content:space-between;color:#2a2623}
.ab-a:nth-child(3n+1){background:#e5e0f5}.ab-a:nth-child(3n+2){background:#f7d9cb}.ab-a:nth-child(3n){background:#e2edc9}
.ab-a b{font:600 44px/1 'Playfair Display',serif;letter-spacing:-1px}
.ab-a h3{font:500 15px Poppins,sans-serif;margin-bottom:2px}
.ab-a p{font-size:12.5px;opacity:.75}

/* marketplaces */
.ab-mk{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.ab-m{display:flex;flex-direction:column;justify-content:space-between;min-height:140px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;text-decoration:none;transition:transform .2s,border-color .2s}
.ab-m:hover{transform:translateY(-3px);border-color:var(--acc)}
.ab-m b{font:600 26px 'Playfair Display',serif}
.ab-m span{font-size:13px;color:var(--acc);font-weight:500}

/* press */
.ab-press{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.ab-p{display:flex;flex-direction:column;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px}
.ab-p small{color:var(--acc);font-weight:500;font-size:12px}
.ab-p h3{font-size:18px;line-height:1.3}
.ab-p p{font-size:13px;color:var(--mut)}
.ab-p a{margin-top:auto;font-size:13px;font-weight:500;text-decoration:none}
.ab-p a:hover{color:var(--acc)}

/* final cta */
.ab-end{text-align:center;background:linear-gradient(120deg,var(--rose),#f3e3d3);border-radius:24px;padding:52px 22px}
.ab-end h2{font-size:clamp(28px,4.4vw,42px);margin-bottom:10px}
.ab-end p{color:#5c4f47;max-width:440px;margin:0 auto 22px}
.ab-end .btn{padding:12px 30px;font-size:14px}

@media(max-width:900px){
  .ab-hero,.ab-story,.ab-women,.ab-team{grid-template-columns:1fr}
  .ab-vis{min-height:340px}.ab-pull{min-height:260px}
  .ab-steps{grid-template-columns:1fr 1fr}
  .ab-women{padding:30px 22px}.ab-team{padding:18px}
}
@media(max-width:520px){.ab-steps{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.ab-m{transition:none}}
`;

const STEPS = [
  { t: "Material check", d: "Fabric, lining and fittings are reviewed before production begins." },
  { t: "In-process check", d: "Stitching, size and finishing are watched while each bag is made." },
  { t: "Final inspection", d: "Every bag is checked for look, stitching and consistency." },
  { t: "Pack and dispatch", d: `Contents and packing are verified. Orders leave us in ${SITE.dispatchDays}.` },
];

export default function About() {
  const certs = ABOUT.certificates.filter((c) => c.title);
  const stats = ABOUT.achievements.filter((a) => a.value && a.label);
  const markets = ABOUT.marketplaces.filter((m) => m.url);
  const press = ABOUT.press.filter((p) => p.title);

  return (
    <div className="ab">
      <style>{CSS}</style>

      {/* 1. Hero */}
      <section className="ab-hero">
        <div>
          <span className="ab-tag">A LITTLE ABOUT US</span>
          <h1>Not just a bag.<br /><em>Your whole vibe.</em></h1>
          <p className="ab-lead">
            {SITE.name} is made of totes, slings and everyday bags that fit into real life. From busy
            mornings to last-minute plans, we’re here for the things you carry and the style you bring along.
          </p>
          <div className="ab-cta">
            <Link href="/products" className="btn a">Find your bag</Link>
            <Link href="#our-story" className="btn o">Get to know us</Link>
          </div>
        </div>
        <div className="ab-vis" role="img" aria-label="Illustration of an everyday handbag">
          <span className="ab-stk a">THE EVERYDAY EDIT ✦</span>
          <BagArt main="#b87e52" dark="#805638" />
          <span className="ab-stk b">CARRY YOUR VIBE</span>
        </div>
      </section>

      {/* 2. Our story */}
      <section className="ab-story ab-anchor" id="our-story">
        <div className="ab-pull">Life moves.<br />Your bag should too.</div>
        <div>
          <span className="ab-tag">OUR STORY</span>
          <h2>For your plans.<br />And all the in-betweens.</h2>
          <p>
            We started {SITE.name} with a simple thought: the bag you carry every day should feel like it
            belongs to you. It should work with your plans, hold what you need and add something to your look,
            without making things complicated.
          </p>
          <p>
            {SITE.tagline} Whether you’re heading out for class, work, a quick catch-up or a full day on the
            move, there’s room for your kind of everyday.
          </p>
          <div className="ab-note"><b>Our point of view:</b> style should feel effortless, useful and completely your own.</div>
        </div>
      </section>

      {/* 3. Built by women, for women */}
      <section className="ab-women ab-anchor" id="women">
        <div>
          <span className="ab-tag">BUILT BY WOMEN, FOR WOMEN</span>
          <h2>Her dreams.<br />Her hustle. Her bag.</h2>
          <p>
            We believe women deserve to feel seen, supported and empowered, in the styles they carry and the
            opportunities they get. {SITE.name} is inspired by women who show up for their goals, their people
            and themselves.
          </p>
          <Link href="#team" className="btn">Meet the team</Link>
        </div>
        <div className="ab-pill">
          <div><b>Made with women</b><span>Opportunities and skills for the women behind every bag.</span></div>
          <div><b>Designed for women</b><span>Everyday carry that is practical, confident and easy to style.</span></div>
          <div><b>Your style. Your story.</b><span>Your power, in every plan you carry.</span></div>
        </div>
      </section>

      {/* 4. Quality assurance */}
      <section className="ab-anchor" id="quality">
        <div className="ab-title">
          <span className="ab-tag">QUALITY ASSURANCE</span>
          <h2>Checked at every step.</h2>
          <p>From material to dispatch, each order goes through the same four checkpoints.</p>
        </div>
        <div className="ab-steps">
          {STEPS.map((s) => (
            <article className="ab-step" key={s.t}><h3>{s.t}</h3><p>{s.d}</p></article>
          ))}
        </div>
        {certs.length > 0 && (
          <div className="ab-certs">
            {certs.map((c) => (
              <div className="ab-cert" key={c.title}>
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt={c.title} loading="lazy" />
                ) : (
                  <i aria-hidden="true">✓</i>
                )}
                <div><b>{c.title}</b>{c.note && <small>{c.note}</small>}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Meet our team */}
      <section className="ab-team ab-anchor" id="team">
        <div className="ab-photo">
          {ABOUT.teamPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ABOUT.teamPhoto} alt={ABOUT.teamPhotoAlt} loading="lazy" />
          ) : (
            <div><BagArt main="#b8865b" dark="#8a5d3a" />Our team photo is coming soon.</div>
          )}
        </div>
        <div>
          <span className="ab-tag">MEET OUR TEAM</span>
          <h2>One team.<br />One shared purpose.</h2>
          <p>
            Makers, quality checkers, packers and creative minds. Every person plays a part in the bag that
            reaches you.
          </p>
        </div>
      </section>

      {/* 6. Achievements */}
      {stats.length > 0 && (
        <section className="ab-anchor" id="achievements">
          <div className="ab-title">
            <span className="ab-tag">OUR ACHIEVEMENTS</span>
            <h2>Small steps. Real progress.</h2>
          </div>
          <div className="ab-ach">
            {stats.map((a) => (
              <article className="ab-a" key={a.label}>
                <b>{a.value}</b>
                <div><h3>{a.label}</h3>{a.note && <p>{a.note}</p>}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 7. Available everywhere */}
      {markets.length > 0 && (
        <section className="ab-anchor" id="available">
          <div className="ab-title">
            <span className="ab-tag">AVAILABLE EVERYWHERE</span>
            <h2>Shop where you love.</h2>
            <p>Find {SITE.name} on your favourite marketplaces, and right here on our website.</p>
          </div>
          <div className="ab-mk">
            {markets.map((m) => (
              <a className="ab-m" key={m.name} href={m.url} target="_blank" rel="noopener noreferrer">
                <b>{m.name}</b><span>Visit our store ↗</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 8. News and media */}
      {press.length > 0 && (
        <section className="ab-anchor" id="press">
          <div className="ab-title">
            <span className="ab-tag">NEWS AND MEDIA</span>
            <h2>In the spotlight.</h2>
            <p>For interviews or media requests, write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
          </div>
          <div className="ab-press">
            {press.map((p) => (
              <article className="ab-p" key={p.title}>
                <small>{[p.source, p.date].filter(Boolean).join(" · ")}</small>
                <h3>{p.title}</h3>
                {p.summary && <p>{p.summary}</p>}
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">Read the story ↗</a>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 9. Final CTA */}
      <section className="ab-end">
        <h2>Your next favourite bag is waiting.</h2>
        <p>Make room for the plans, the little essentials and the everyday moments.</p>
        <Link href="/products" className="btn">Explore the collection</Link>
      </section>
    </div>
  );
}
