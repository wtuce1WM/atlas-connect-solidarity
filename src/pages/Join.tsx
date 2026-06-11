import { useEffect } from "react";
import joinHero from "@/assets/join-hero.jpg";
import hiwStep2Mockup from "@/assets/hiw-step2-app-mockup.webp";
import hiwStep3Tourist from "@/assets/hiw-step3-tourist.png";


const CSS = `
  .join-page{--bg:#ECD6B8;--ink:#0f0f0f;--muted:#6b6b6b;--line:#ececec;--orange:#ff6b35;--orange-deep:#e85a26;--green:#00a896;--gold:#ffc008;background:var(--bg);color:var(--ink);font-family:'Roboto',system-ui,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
  .join-page *{box-sizing:border-box}
  .join-page .wrap{max-width:1240px;margin:0 auto;padding:0 24px}
  .join-page header.nav{position:sticky;top:0;background:#ECD6B8;border-bottom:1px solid var(--line);z-index:10}
  .join-page header.nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
  .join-page .brand{font-family:'Josefin Sans',sans-serif;font-weight:700;letter-spacing:.12em;font-size:14px;text-decoration:none;color:var(--ink)}
  .join-page .nav-cta{display:inline-flex;align-items:center;gap:8px;background:var(--orange);color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;transition:background .2s}
  .join-page .nav-cta:hover{background:var(--orange-deep)}
  .join-page section{padding:80px 0;border-bottom:1px solid var(--line)}
  .join-page .section-head{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:end;margin-bottom:56px}
  .join-page .subtitle{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:clamp(34px,5vw,64px);line-height:1;letter-spacing:-.01em;text-transform:uppercase}
  .join-page .lead{color:var(--muted);font-size:17px;max-width:520px}
  @media (max-width:880px){.join-page .section-head{grid-template-columns:1fr;gap:20px}}
  .join-page .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;position:relative}
  @media (max-width:980px){.join-page .steps{grid-template-columns:1fr}}
  .join-page .step{position:relative;border:1px solid var(--line);border-radius:24px;padding:32px 28px 36px;background:#fff;overflow:hidden;transition:transform .25s,box-shadow .25s}
  .join-page .step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -20px rgba(0,0,0,.18)}
  .join-page .step .num{position:absolute;right:18px;top:-10px;font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:180px;line-height:1;color:#f3f3f3;pointer-events:none;user-select:none}
  .join-page .step .ico{width:48px;height:48px;display:flex;align-items:center;justify-content:center;margin-bottom:46px;position:relative;z-index:1}
  .join-page .step .step-label{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;position:relative;z-index:1}
  .join-page .step h3{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:22px;margin-bottom:10px;position:relative;z-index:1}
  .join-page .step p{color:var(--muted);font-size:15px;position:relative;z-index:1}
  .join-page .cta-row{display:flex;justify-content:center;margin-top:56px}
  .join-page .btn-primary{display:inline-flex;align-items:center;gap:10px;background:#C04F17;color:#fff;padding:18px 44px;border-radius:999px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:14px;box-shadow:0 14px 30px -12px rgba(192,79,23,.6);transition:transform .2s,background .2s}
  .join-page .btn-primary:hover{background:#a84313;transform:translateY(-2px)}
  .join-page .t-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  @media (max-width:980px){.join-page .t-grid{grid-template-columns:1fr}}
  .join-page .t-card{position:relative;border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:#222}
  .join-page .t-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .join-page .t-card::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,0) 70%)}
  .join-page .t-badge{position:absolute;top:24px;left:24px;color:#fff;font-family:'Josefin Sans',sans-serif;z-index:2;text-align:center;padding:10px 18px}
  .join-page .t-badge::before{content:"";position:absolute;inset:0;border:2px solid #fff;border-radius:50%;transform:rotate(-8deg) scale(1.15);opacity:.95}
  .join-page .t-badge strong{display:block;font-size:28px;font-weight:700;line-height:1}
  .join-page .t-badge span{font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.9}
  .join-page .t-body{position:absolute;left:24px;right:24px;bottom:24px;color:#fff;z-index:2}
  .join-page .t-body p{font-size:15px;line-height:1.5;margin-bottom:14px}
  .join-page .t-meta h4{font-family:'Josefin Sans',sans-serif;font-size:16px;font-weight:600;margin-bottom:2px}
  .join-page .t-meta span{font-size:12px;opacity:.85;letter-spacing:.1em;text-transform:uppercase}
  .join-page footer{padding:36px 0;text-align:center;color:var(--muted);font-size:13px}
  .join-page footer a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--line)}
  .join-page .ways-head{text-align:center;max-width:780px;margin:0 auto 56px}
  .join-page .ways-head h2{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.05;letter-spacing:-.01em;margin-bottom:18px}
  .join-page .ways-head p{color:var(--muted);font-size:17px}
  .join-page .ways{display:grid;grid-template-columns:repeat(4,1fr);gap:28px}
  @media (max-width:1180px){.join-page .ways{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:680px){.join-page .ways{grid-template-columns:1fr}}
  .join-page .way{border-radius:28px;padding:44px 44px 36px;position:relative;overflow:hidden}
  .join-page .hiw-illu{margin:0 auto 22px;max-width:240px}
  .join-page .hiw-illu svg{width:100%;height:auto;display:block}
  .join-page .way.green{background:#194CFF;color:#fff}
  .join-page .way.orange{background:#8F7950;color:#fff}
  .join-page .way.teal{background:#00a896;color:#fff}
  .join-page .way.purple{background:#6B4E9B;color:#fff}
  .join-page .way .badge{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:24px;color:#194CFF;background:#fff;margin-bottom:22px}
  .join-page .way.orange .badge{background:#fff;color:#8F7950}
  .join-page .way.teal .badge{background:#fff;color:#00a896}
  .join-page .way h3{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:clamp(24px,2.6vw,32px);line-height:1.15;margin-bottom:18px;color:#111}
  .join-page .way.green h3{color:#fff}
  .join-page .way.orange h3{color:#fff}
  .join-page .way.teal h3{color:#fff}
  .join-page .way > p.intro{color:#3a3a3a;font-size:16px;line-height:1.6;margin-bottom:26px;max-width:520px}
  .join-page .way.green > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way.orange > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way.teal > p.intro{color:rgba(255,255,255,.92)}
  .join-page .way ul{list-style:none;padding:0;margin:0 0 28px;display:flex;flex-direction:column;gap:14px}
  .join-page .way li{display:flex;gap:12px;align-items:flex-start;font-size:15px;color:#222;line-height:1.45}
  .join-page .way.green li{color:#fff}
  .join-page .way.orange li{color:#fff}
  .join-page .way.teal li{color:#fff}
  .join-page .way li svg{flex:0 0 22px;margin-top:1px}
  .join-page .way .way-cta{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;border-radius:999px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.04em;transition:transform .2s,filter .2s}
  .join-page .way .way-cta:hover{transform:translateY(-2px);filter:brightness(1.05)}
  .join-page .way.green .way-cta{background:#fff;color:#194CFF}
  .join-page .way.orange .way-cta{background:#fff;color:#8F7950}
  .join-page .way.teal .way-cta{background:#fff;color:#00a896}
  .join-page .way .tag{margin-top:26px;padding-top:22px;border-top:1px solid rgba(0,0,0,.08);text-align:center;font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:15px}
  .join-page .way.green .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .way.orange .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .way.teal .tag{color:#fff;border-top-color:rgba(255,255,255,.25)}
  .join-page .hiw-head{text-align:center;max-width:820px;margin:0 auto 56px}
  .join-page .hiw-head h2{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.05;letter-spacing:-.01em;margin-bottom:18px}
  .join-page .hiw-head p{color:var(--muted);font-size:17px}
  .join-page .hiw{display:grid;grid-template-columns:1fr 40px 1fr 40px 1fr;gap:18px;align-items:stretch}
  .join-page .hiw-arrow{display:flex;align-items:center;justify-content:center;color:var(--orange)}
  .join-page .hiw-arrow svg{width:40px;height:40px;animation:hiwArrowSlide 1.6s ease-in-out infinite}
  @keyframes hiwArrowSlide{0%,100%{transform:translateX(-6px);opacity:.55}50%{transform:translateX(6px);opacity:1}}
  @media (prefers-reduced-motion:reduce){.join-page .hiw-arrow svg{animation:none}}
  @media (max-width:980px){
    .join-page .hiw{grid-template-columns:1fr;gap:28px}
    .join-page .hiw-arrow{transform:rotate(90deg);margin:-6px 0}
    .join-page .hiw-arrow svg{animation:hiwArrowSlideV 1.6s ease-in-out infinite}
    @keyframes hiwArrowSlideV{0%,100%{transform:translateX(-6px);opacity:.55}50%{transform:translateX(6px);opacity:1}}
  }
  .join-page .hiw-step{background:#fff;border:1px solid var(--line);border-radius:24px;padding:36px 28px;text-align:center;position:relative;transition:transform .25s,box-shadow .25s}
  .join-page .hiw-step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -20px rgba(0,0,0,.18)}
  .join-page .hiw-step .hiw-num{width:56px;height:56px;border-radius:50%;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:24px;margin:0 auto 22px}
  .join-page .hiw-step h3{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:20px;margin-bottom:12px;line-height:1.25}
  .join-page .hiw-step p{color:var(--muted);font-size:15px;line-height:1.55}
  .join-page .hiw-cta{display:flex;justify-content:center;margin-top:48px}
  .join-page .hero{position:relative;padding:0;border-bottom:1px solid var(--line);overflow:hidden}
  .join-page .hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .join-page .hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.35) 40%,rgba(0,0,0,.65) 100%)}
  .join-page .hero-inner{position:relative;z-index:1;max-width:1240px;margin:0 auto;padding:120px 24px 110px;text-align:center;color:#fff}
  .join-page .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);color:#fff;padding:8px 18px;border-radius:999px;font-family:'Josefin Sans',sans-serif;font-weight:600;font-size:12px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:28px;border:1px solid rgba(255,255,255,.18)}
  .join-page .hero h1{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:clamp(36px,5.4vw,68px);line-height:1.05;letter-spacing:-.01em;margin:0 auto 22px;max-width:980px}
  .join-page .hero h1 .hl{color:#ffc008}
  .join-page .hero .hero-sub{font-size:clamp(16px,1.4vw,19px);color:rgba(255,255,255,.92);max-width:680px;margin:0 auto 34px;line-height:1.5}
  .join-page .hero .hero-cta{display:inline-flex;align-items:center;gap:10px;background:#C04F17;color:#fff;padding:18px 44px;border-radius:999px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:14px;box-shadow:0 14px 30px -12px rgba(192,79,23,.7);transition:transform .2s,background .2s}
  .join-page .hero .hero-cta:hover{background:#a84313;transform:translateY(-2px)}
  .join-page .hero-checks{display:flex;flex-wrap:wrap;justify-content:center;gap:22px;margin-top:22px;font-size:14px;color:rgba(255,255,255,.95)}
  .join-page .hero-checks span{display:inline-flex;align-items:center;gap:8px}
  .join-page .hero-checks svg{color:var(--green)}
  .join-page .hero-stats{margin-top:38px;display:inline-flex;flex-wrap:wrap;justify-content:center;gap:0;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:10px 8px;font-size:13px}
  .join-page .hero-stats div{padding:6px 22px;display:inline-flex;align-items:center;gap:8px;color:#fff;border-right:1px solid rgba(255,255,255,.18)}
  .join-page .hero-stats div:last-child{border-right:none}
  @media (max-width:700px){.join-page .hero-inner{padding:90px 20px 80px}.join-page .hero-stats{font-size:12px}.join-page .hero-stats div{padding:6px 14px}}
  .join-page .why-head{text-align:center;max-width:900px;margin:0 auto 48px}
  .join-page .why-head h2{font-family:'Josefin Sans',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.05;letter-spacing:-.01em;margin-bottom:16px;text-transform:uppercase}
  .join-page .why-head p{color:var(--muted);font-size:17px;max-width:620px;margin:0 auto}
  .join-page .why-wrap{background:#BED1FF;border-radius:32px;padding:32px}
  .join-page .cmp{width:100%;background:#fff;border-radius:20px;overflow:hidden;border-collapse:separate;border-spacing:0;font-size:15px}
  .join-page .cmp th,.join-page .cmp td{padding:18px 22px;text-align:center;border-bottom:1px solid #eef2f0;vertical-align:middle}
  .join-page .cmp th:first-child,.join-page .cmp td:first-child{text-align:left;color:#444;font-weight:500}
  .join-page .cmp thead th{font-family:'Josefin Sans',sans-serif;font-weight:600;font-size:16px;color:#1a1a1a;padding:24px 22px;background:#fff;border-bottom:1px solid #eef2f0}
  .join-page .cmp thead th.us{background:#194CFF;color:#fff;position:relative;padding-top:42px}
  .join-page .cmp thead th.us .reco{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:#C04F17;color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;padding:4px 12px;border-radius:999px;white-space:nowrap}
  .join-page .cmp tbody td.us{background:#BED1FF;color:#194CFF;font-weight:700}
  .join-page .cmp tbody tr:last-child td{border-bottom:none}
  .join-page .cmp .wow{display:inline-block;margin-left:8px;background:#FF6B35;color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em;padding:2px 8px;border-radius:999px;vertical-align:middle}
  .join-page .cmp .x{color:#9aa3a0}
  .join-page .why-cta{display:flex;justify-content:center;margin-top:40px}
  @media (max-width:760px){.join-page .why-wrap{padding:14px;border-radius:22px}.join-page .cmp{font-size:13px}.join-page .cmp th,.join-page .cmp td{padding:12px 10px}.join-page .cmp thead th{font-size:14px}}

`;

const Check = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1.6" />
    <path d="M6.5 11.3l3 3 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Join = () => {
  useEffect(() => {
    if (!document.getElementById("join-fonts")) {
      const l = document.createElement("link");
      l.id = "join-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&display=swap";
      document.head.appendChild(l);
    }
    document.title = "Rejoindre One World Morocco — Devenir partenaire";
  }, []);

  return (
    <div className="join-page">
      <style>{CSS}</style>

      <header className="nav">
        <div className="wrap">
          <a href="/" className="brand">ONE WORLD MOROCCO</a>
          
        </div>
      </header>

      <section className="hero" aria-label="Rejoindre One World Morocco">
        <img className="hero-img" src={joinHero} alt="" width={1920} height={1080} />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-badge">★ Partenaires locaux</div>
          <h1>Rejoignez le premier écosystème numérique <span className="hl">éthique & solidaire</span> au Maroc.</h1>
          <p className="hero-sub">Tourisme, commerce, artisanat, services et solidarité réunis dans une même plateforme à impact positif.</p>
          <p className="hero-sub">Gagnez en visibilité auprès des voyageurs et habitants. Sans commission.</p>
          <a href="/devenir-affilie" className="hero-cta">REJOINDRE →</a>
          <div className="hero-checks">
            <span><Check color="#00a896" />Consommez local</span>
            <span><Check color="#00a896" />Voyagez autrement</span>
            <span><Check color="#00a896" />Agissez pour tous</span>
          </div>
          <div className="hero-stats">
            <div>🌍 Tout le Maroc</div>
            <div>🤝 Partenaires locaux</div>
            <div>✓ 0% de commission</div>
          </div>
        </div>
      </section>

      <section id="ways">
        <div className="wrap">
          <div className="ways-head">
            <h2>Trois moyens puissants d'attirer plus de clients</h2>
            <p>
              Soyez référencé dans notre catalogue&nbsp;et obtenez votre carte business avec QR code.
              Deux outils complémentaires pour convertir les utilisateurs en clients.
            </p>
          </div>

          <div className="ways">
            <article className="way green">
              <div className="badge">1</div>
              <h3>Publiez vos offres sur One World Morocco</h3>
              <p className="intro">
                Soyez référencé dans notre catalogue et touchez les voyageurs et habitants qui découvrent des entreprises locales partout au Maroc.
              </p>
              <ul>
                <li><Check color="#ffffff" />Soyez découvert par les voyageurs &amp; habitants&nbsp;de votre région</li>
                <li><Check color="#ffffff" />Référencé dans le catalogue<br/><strong>&nbsp;oneworldmorocco.com/votrenom</strong></li>
                <li><Check color="#ffffff" />Plus de trafic et de réservations directes</li>
                <li><Check color="#ffffff" />Mis en avant dans la recherche et dans l'agent IA</li>
                <li><Check color="#ffffff" />Aucune commission sur les réservations</li>
              </ul>
              <a href="/devenir-affilie" className="way-cta">En savoir plus →</a>
              <div className="tag">Vos offres. Notre audience. Plus de réservations.</div>
            </article>

            <article className="way orange">
              <div className="badge">2</div>
              <h3>Créez vos cartes business (QR)</h3>
              <p className="intro">
                Obtenez votre page personnelle et votre code QR. Quand les voyageurs sont devant vous, partagez-le et convertissez instantanément.
              </p>
              <ul>
                <li><Check color="#ffffff" />Toutes vos canaux digitaux au même endroit</li>
                <li><Check color="#ffffff" />URL courte  personnalisée <br/><br/><strong> oneworldmorocco.com/votrenom</strong></li>
                <li><Check color="#ffffff" />Partagez par code QR ou lien en un tap</li>
                <li><Check color="#ffffff" />Mettez à jour offres, évènements, vidéos et photos à tout moment</li>
                <li><Check color="#ffffff" />Profil vérifié inspire confiance aux clients</li>
              </ul>
              <a href="/devenir-affilie" className="way-cta">En savoir plus →</a>
              <div className="tag">Votre carte. Votre QR. Plus de clients sur place.</div>
            </article>

            <article className="way teal">
              <div className="badge">3</div>
              <h3>Votre assistant IA sur votre site web</h3>
              <p className="intro">
                Intégrez un assistant IA directement sur votre site pour répondre aux visiteurs 24/7, qualifier leurs demandes et booster vos conversions.
              </p>
              <ul>
                <li><Check color="#ffffff" />Disponible 24/7 pour répondre à vos visiteurs</li>
                <li><Check color="#ffffff" />Répond en plusieurs langues automatiquement</li>
                <li><Check color="#ffffff" />Qualifie les demandes et capture les leads</li>
                <li><Check color="#ffffff" />Connaît vos offres, horaires et tarifs</li>
                <li><Check color="#ffffff" />Intégration simple en quelques minutes</li>
              </ul>
              <a href="/devenir-affilie" className="way-cta">En savoir plus →</a>
              <div className="tag">Votre IA. Vos réponses. Plus de conversions.</div>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="wrap">
          <div className="hiw-head">
            <h2>Comment fonctionne le programme de remises pour les utilisateurs de l'App ?</h2>
            <p>Trois étapes simples pour attirer plus de clients, sans commissions ni intermédiaires.</p>
          </div>

          <div className="hiw">
            <article className="hiw-step">
              <div className="hiw-illu" aria-hidden="true">
                <svg width="100%" height="100%" viewBox="0 0 327 196" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g filter="url(#hd0)">
                    <rect x="196.896" y="40.8579" width="106.075" height="106.075" rx="18.8578" transform="rotate(10 196.896 40.8579)" fill="#D1F2EB"/>
                    <rect x="197.852" y="42.2233" width="103.718" height="103.718" rx="17.6792" transform="rotate(10 197.852 42.2233)" stroke="white" strokeWidth="2.35722"/>
                  </g>
                  <text x="244" y="105" textAnchor="middle" fontFamily="Josefin Sans, sans-serif" fontWeight="700" fontSize="22" fill="#C04F17" transform="rotate(10 244 105)">-20%</text>
                  <g filter="url(#hd1)">
                    <rect x="25.9977" y="59.2777" width="106.075" height="106.075" rx="18.8578" transform="rotate(-10 25.9977 59.2777)" fill="#FFF2CE"/>
                    <rect x="27.363" y="60.2338" width="103.718" height="103.718" rx="17.6792" transform="rotate(-10 27.363 60.2338)" stroke="white" strokeWidth="2.35722"/>
                  </g>
                  <text x="82" y="118" textAnchor="middle" fontFamily="Josefin Sans, sans-serif" fontWeight="700" fontSize="22" fill="#8F7950" transform="rotate(-10 82 118)">-5%</text>
                  <g filter="url(#hd2)">
                    <rect x="103.785" y="22.0002" width="117.861" height="117.861" rx="18.8578" fill="#FFDDD3"/>
                    <rect x="104.964" y="23.1789" width="115.504" height="115.504" rx="17.6792" stroke="white" strokeWidth="2.35722"/>
                  </g>
                  <text x="162.7" y="95" textAnchor="middle" fontFamily="Josefin Sans, sans-serif" fontWeight="700" fontSize="32" fill="#194CFF">-10%</text>
                  <defs>
                    <filter id="hd0" x="153" y="22" width="174" height="174" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14"/><feOffset dy="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/><feBlend in="SourceGraphic"/></filter>
                    <filter id="hd1" x="0" y="22" width="174" height="174" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14"/><feOffset dy="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/><feBlend in="SourceGraphic"/></filter>
                    <filter id="hd2" x="28" y="-53" width="269" height="269" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14"/><feOffset dy="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"/><feBlend in="SourceGraphic"/></filter>
                  </defs>
                </svg>
              </div>
              <h3>Inscrivez-vous et définissez la remise que vous souhaitez offrir</h3>
              <p>Choisissez librement le pourcentage de remise accordé aux utilisateurs. Ajustable à tout moment depuis votre espace partenaire.</p>
            </article>
            <div className="hiw-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
            </div>
            <article className="hiw-step">
              <div className="hiw-illu" aria-hidden="true">
                <img src={hiwStep2Mockup} alt="" loading="lazy" width={512} height={512} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <h3>Nos abonnés voient votre offre dans l'application</h3>
              <p>Votre entreprise gagne en visibilité auprès des voyageurs et habitants qui explorent One World Morocco partout au Maroc.</p>
            </article>
            <div className="hiw-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
            </div>
            <article className="hiw-step">
              <div className="hiw-illu" aria-hidden="true">
                <img src={hiwStep3Tourist} alt="" loading="lazy" width={512} height={512} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <h3>Les clients viennent directement chez vous, sans commissions</h3>
              <p>Réservations en direct, tarifs transparents : vous gardez 100% de vos revenus, sans intermédiaire.</p>
            </article>
          </div>

          <div className="hiw-cta">
            <a className="btn-primary" href="/devenir-affilie">S'INSCRIRE</a>
          </div>
        </div>
      </section>

      <section id="join">
        <div className="wrap">
          <div className="section-head">
            <h1 className="subtitle">REJOINDRE EN TANT QUE PARTENAIRE.</h1>
            <p className="lead">
              Abonnez-vous à One World Morocco en quelques étapes : enregistrez votre entreprise, définissez votre offre
              et commencez à attirer de nouveaux clients instantanément, sans frais cachés ni intermédiaires.
            </p>
          </div>

          <div className="steps">
            <article className="step">
              <span className="num">1</span>
              <div className="ico">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M6 21.5C6 19.0147 8.01472 17 10.5 17C12.9853 17 15 19.0147 15 21.5C15 23.9853 12.9853 26 10.5 26C8.01472 26 6 23.9853 6 21.5ZM10.5 20C9.67 20 9 20.67 9 21.5C9 22.33 9.67 23 10.5 23C11.33 23 12 22.33 12 21.5C12 20.67 11.33 20 10.5 20ZM10.5 28C8.01 28 6 30.01 6 32.5C6 34.99 8.01 37 10.5 37C12.99 37 15 34.99 15 32.5C15 30.01 12.99 28 10.5 28ZM9 32.5C9 31.67 9.67 31 10.5 31C11.33 31 12 31.67 12 32.5C12 33.33 11.33 34 10.5 34C9.67 34 9 33.33 9 32.5ZM18 21.5C18 20.67 18.67 20 19.5 20H28.5C29.33 20 30 20.67 30 21.5C30 22.33 29.33 23 28.5 23H19.5C18.67 23 18 22.33 18 21.5ZM19.5 31C18.67 31 18 31.67 18 32.5C18 33.33 18.67 34 19.5 34H28.5C29.33 34 30 33.33 30 32.5C30 31.67 29.33 31 28.5 31H19.5ZM6 13.5C6 12.67 6.67 12 7.5 12H28.5C29.33 12 30 12.67 30 13.5C30 14.33 29.33 15 28.5 15H7.5C6.67 15 6 14.33 6 13.5ZM6.5 6C2.91 6 0 8.91 0 12.5V35.5C0 39.09 2.91 42 6.5 42H29.5C33.09 42 36 39.09 36 35.5V12.5C36 8.91 33.09 6 29.5 6H6.5ZM3 12.5C3 10.57 4.57 9 6.5 9H29.5C31.43 9 33 10.57 33 12.5V35.5C33 37.43 31.43 39 29.5 39H6.5C4.57 39 3 37.43 3 35.5V12.5Z" fill="#ff6b35"/></svg>
              </div>
              <p className="step-label">Étape 1</p>
              <h3>Remplissez le formulaire</h3>
              <p>Fournissez le nom et les coordonnées de votre entreprise.</p>
            </article>

            <article className="step">
              <span className="num">2</span>
              <div className="ico">
                <svg width="40" height="44" viewBox="0 0 35 40" fill="none"><path d="M27.5.5h-20C2.66.5 0 3.16 0 8v25.24c0 1.33.74 2.53 1.94 3.13 1.19.6 2.59.47 3.66-.33l2.72-2.04c.59-.44 1.43-.38 1.96.14l4.04 4.04c.88.88 2.03 1.32 3.18 1.32s2.3-.44 3.18-1.32l4.04-4.04c.53-.52 1.37-.58 1.96-.14l2.72 2.04c1.07.8 2.47.93 3.66.33C34.26 35.77 35 34.57 35 33.24V8c0-4.84-2.66-7.5-7.5-7.5zM32 33.24c0 .27-.17.4-.28.45-.1.05-.31.12-.52-.05l-2.72-2.04c-1.77-1.33-4.31-1.15-5.88.42L18.56 36.06c-.57.57-1.56.57-2.13 0L12.4 32.02C11.53 31.15 10.37 30.71 9.21 30.71c-.95 0-1.9.29-2.7.89l-2.72 2.04c-.21.16-.42.1-.52.05-.1-.05-.28-.18-.28-.45V8c0-3.15 1.35-4.5 4.5-4.5h20c3.15 0 4.5 1.35 4.5 4.5v25.24zM23.56 14.06l-10 10c-.29.29-.67.44-1.06.44s-.77-.15-1.06-.44c-.59-.59-.59-1.54 0-2.12l10-10c.59-.59 1.54-.59 2.12 0 .58.58.58 1.54 0 2.12zM10.53 13c0-1.1.88-2 1.99-2h.02c1.1 0 2 .9 2 2s-.9 2-2 2-1.99-.9-1.99-2zM24.54 23c0 1.1-.9 2-2 2s-1.99-.9-1.99-2c0-1.1.88-2 1.99-2h.02c1.1 0 1.99.9 1.99 2z" fill="#ffc008"/></svg>
              </div>
              <p className="step-label">Étape 2</p>
              <h3>Définissez votre offre</h3>
              <p>Vous pouvez la mettre à jour à tout moment.</p>
            </article>

            <article className="step">
              <span className="num">3</span>
              <div className="ico">
                <svg width="48" height="48" viewBox="0 0 49 48" fill="none"><path d="M26.5 20c1.93 0 3.5 1.57 3.5 3.5v9.5c0 4.97-4.03 9-9 9s-9-4.03-9-9V23.5c0-1.93 1.57-3.5 3.5-3.5h11zm0 3h-11c-.28 0-.5.22-.5.5v9.5c0 3.31 2.69 6 6 6s6-2.69 6-6V23.5c0-.28-.22-.5-.5-.5zM4.5 20l6.76-.002C10.58 20.83 10.13 21.86 10.03 23H4.5c-.28 0-.5.22-.5.5V30c0 2.76 2.24 5 5 5 .4 0 .79-.05 1.16-.14.17 1.01.48 1.97.91 2.87C10.41 37.91 9.72 38 9 38c-4.42 0-8-3.58-8-8v-6.5C1 21.57 2.57 20 4.5 20zm26.25-.002L37.5 20c1.93 0 3.5 1.57 3.5 3.5V30c0 4.42-3.58 8-8 8-.71 0-1.4-.09-2.06-.27.43-.9.74-1.86.91-2.87.37.09.76.14 1.16.14 2.76 0 5-2.24 5-5v-6.5c0-.28-.22-.5-.5-.5l-5.51.001c-.1-1.14-.55-2.17-1.24-3zM21 6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zM34 8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zM8 8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zM21 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#00a896"/></svg>
              </div>
              <p className="step-label">Étape 3</p>
              <h3>Obtenez des clients</h3>
              <p>Les voyageurs verront votre offre dans notre catalogue.</p>
            </article>
          </div>

          <div className="cta-row">
            <a className="btn-primary" href="/devenir-affilie">S'INSCRIRE</a>
          </div>
        </div>
      </section>

      <section id="why-us">
        <div className="wrap">
          <div className="why-head">
            <h2>Pourquoi les partenaires choisissent One World Morocco</h2>
            <p>Une offre plus équitable que les OTA classiques — sans commission, sans intermédiaire.</p>
          </div>

          <div className="why-wrap">
            <table className="cmp">
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  <th className="us"><span className="reco">★ RECOMMANDÉ</span>One World Morocco</th>
                  <th>Booking.com<br/>TripAdvisor</th>
                  <th>GetYourGuide<br/>Viator</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Commission + Avis Clients + Réseau social</td><td className="us">0 %</td><td>15–25 %</td><td>20–30 %</td></tr>
                <tr><td>Votre QR code</td><td className="us">✓ Oui</td><td>✗ Non</td><td>✗ Non</td></tr>
                <tr><td>Contact direct</td><td className="us">✓ Oui</td><td className="x">✗ Non</td><td className="x">✗ Non</td></tr>
                <tr><td>Carte business digitale</td><td className="us">✓ Gratuit</td><td className="x">✗ Non</td><td className="x">✗ Non</td></tr>
                <tr><td>Votre assistant IA sur votre site web</td><td className="us">✓ Optionnel</td><td>✗ Non</td><td>✗ Non</td></tr>
                <tr><td>Vitesse de paiement / Système de paiement</td><td className="us">Instantané</td><td>30–60 jours</td><td>2–4 semaines</td></tr>
                <tr><td>Vous possédez les données client</td><td className="us">✓ Oui</td><td className="x">✗ Non</td><td className="x">✗ Non</td></tr>
                <tr><td>Liberté tarifaire</td><td className="us">✓ Oui</td><td>✗ Non</td><td>✗ Non</td></tr>
              </tbody>
            </table>
          </div>

          <div className="why-cta">
            <a className="btn-primary" href="/devenir-affilie">S'INSCRIRE</a>
          </div>
        </div>
      </section>




      <footer>
        <div className="wrap">© One World Morocco — <a href="/">Retour à l'accueil</a></div>
      </footer>
    </div>
  );
};

export default Join;
