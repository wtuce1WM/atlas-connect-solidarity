import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";

const heroImageDesktop = originalHeroAsset.url;
const heroImageTablet = zelligeBrunAsset.url;
const heroImageMobile = zelligeBrunAsset.url;


const CSS = `
  .card-page{--bg:#ECD6B8;--ink:#0f0f0f;--muted:#6b6b6b;--line:#ececec;--terracotta:#C04F17;--terracotta-deep:#a84313;--whatsapp:#25D366;--gold:#D4AF37;background:var(--bg);color:var(--ink);font-family:'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif,system-ui,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
  .card-page *{box-sizing:border-box}
  .card-page .wrap{max-width:1240px;margin:0 auto;padding:0 24px}



  .card-page .hero{position:relative;padding:72px 0 96px;overflow:hidden;min-height:92vh;display:flex;align-items:center;perspective:1200px}
  .card-page .hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;will-change:transform;transform:scale(1.05)}
  @media (min-width:1024px){.card-page .hero-bg{height:100%}}
  .card-page .hero-content{position:relative;z-index:2;width:100%;transform:translate3d(0,calc(var(--sy,0)*-30px),0);transition:transform .5s cubic-bezier(.2,.7,.2,1);will-change:transform}
  @media (prefers-reduced-motion:reduce){.card-page .hero-content{transform:none !important}}
  .card-page .hero-overlay-tablet{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.5),rgba(0,0,0,.3),rgba(0,0,0,.5));z-index:1;display:none}
  .card-page .hero-overlay-mobile{position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(to bottom,rgba(0,0,0,.85),rgba(0,0,0,.45),transparent);z-index:1;display:none}
  @media (min-width:768px) and (max-width:1023px){.card-page .hero-overlay-tablet{display:block}}
  @media (max-width:767px){.card-page .hero-overlay-mobile{display:block}}
  .card-page .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center;position:relative;z-index:2}
  @media (max-width:980px){.card-page .hero-grid{grid-template-columns:1fr;gap:48px}}
  .card-page .eyebrow{display:inline-block;background:#fff5ec;color:var(--terracotta);font-weight:700;font-size:12px;letter-spacing:.16em;text-transform:uppercase;padding:8px 14px;border-radius:999px;margin-bottom:22px}
  .card-page h1{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(26px,5vw,60px);line-height:1.2;letter-spacing:-.01em;margin-bottom:24px}
  @keyframes heroRise { from { opacity: 0; transform: translateY(34px); } to { opacity: 1; transform: none; } }
  .card-page .hero-rise { opacity: 0; animation: heroRise 1s forwards; }
  .card-page h1 .accent{color:var(--terracotta)}
  .card-page .hero h1{color:#ffffff}
  .card-page .lead{color:#3a3a3a;font-size:17px;max-width:560px;margin-bottom:28px}
  .card-page .hero .lead{color:rgba(255,255,255,0.9)}
  .card-page .lead code{background:#fff;padding:2px 8px;border-radius:6px;font-family:inherit;font-weight:600;color:var(--terracotta);font-size:.95em}
  .card-page .bullets{list-style:none;padding:0;margin:0 0 36px;display:flex;flex-direction:column;gap:14px}
  .card-page .bullets li{display:flex;gap:12px;align-items:flex-start;font-size:15.5px;color:#222}
  .card-page .hero .bullets li{color:rgba(255,255,255,0.95)}
  .card-page .check{flex:none;width:22px;height:22px;border-radius:50%;background:var(--terracotta);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;margin-top:1px}
  .card-page .btn-row{display:flex;gap:14px;flex-wrap:wrap}
  .card-page .btn-primary{display:inline-flex;align-items:center;gap:10px;background:var(--terracotta);color:#fff;padding:16px 32px;border-radius:999px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px;box-shadow:0 14px 30px -12px rgba(192,79,23,.55);transition:transform .2s,background .2s}
  .card-page .btn-primary:hover{background:var(--terracotta-deep);transform:translateY(-2px)}
  .card-page .btn-ghost{display:inline-flex;align-items:center;gap:10px;background:transparent;color:var(--ink);padding:16px 28px;border-radius:999px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px;border:1.5px solid rgba(0,0,0,.18)}
  .card-page .btn-ghost:hover{background:rgba(0,0,0,.04)}
  .card-page .hero .btn-ghost{color:#ffffff;border-color:rgba(255,255,255,0.35)}
  .card-page .hero .btn-ghost:hover{background:rgba(255,255,255,0.1)}

  /* Phone mock */
  .card-page .phone-wrap{position:relative;display:flex;justify-content:center}
  .card-page .url-label{position:absolute;top:-32px;right:0;color:var(--terracotta);font-family:'Montserrat',sans-serif;font-weight:700;font-size:14px;letter-spacing:.04em;z-index:10}
  .card-page .url-label::after{content:"";position:absolute;right:30%;bottom:-46px;width:90px;height:48px;border-right:2px dashed var(--terracotta);border-bottom:2px dashed var(--terracotta);border-bottom-right-radius:30px}
  .card-page .phone{width:320px;max-width:100%;background:#111;border-radius:48px;padding:14px;box-shadow:0 30px 80px -30px rgba(0,0,0,.4)}
  .card-page .phone-inner{background:#fff;border-radius:36px;overflow:hidden;position:relative;padding-bottom:18px}
  @keyframes urlShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .card-page .phone-bar{display:flex;align-items:center;gap:6px;background:#f1f1f1;padding:10px 16px;font-size:12px;color:#555}
  .card-page .phone-bar .lock{font-size:10px}
  .card-page .phone-bar b{color:#111;font-weight:600}
  .card-page .phone-bar .slug{
    font-weight:700;
    background: linear-gradient(90deg, var(--terracotta) 0%, #ffbe7a 25%, var(--terracotta) 50%, #ffbe7a 75%, var(--terracotta) 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: urlShimmer 3s infinite linear;
    display: inline-block;
  }
  .card-page .phone-body{padding:22px 20px 0;text-align:center}
  .card-page .logo-circle{width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#C04F17,#8F7950);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Montserrat',sans-serif;font-weight:700;font-size:32px;box-shadow:0 0 0 4px rgba(192,79,23,.15)}
  .card-page .biz-name{font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;margin-bottom:4px}
  .card-page .biz-sub{font-size:13px;color:#666;margin-bottom:16px}
  .card-page .icons-row{display:flex;justify-content:center;gap:10px;margin-bottom:18px}
  .card-page .ic{width:38px;height:38px;border-radius:50%;background:#f3f3f3;display:flex;align-items:center;justify-content:center;font-size:15px}
  .card-page .offer{display:flex;align-items:center;gap:12px;background:#fff5ec;padding:10px 14px;border-radius:14px;margin:0 14px 8px;text-align:left}
  .card-page .offer .pct{background:var(--terracotta);color:#fff;font-weight:700;font-size:12px;padding:4px 8px;border-radius:8px}
  .card-page .offer .lbl{font-size:13px;font-weight:600}
  .card-page .offer .sub{font-size:11px;color:#777;display:block}
  .card-page .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:14px}
  .card-page .gallery div{aspect-ratio:1;border-radius:10px;background:linear-gradient(135deg,#d4b58a,#8F7950)}
  .card-page .gallery div:nth-child(2){background:linear-gradient(135deg,#C04F17,#e89a6f)}
  .card-page .gallery div:nth-child(3){background:linear-gradient(135deg,#3B3B3B,#6b6b6b)}
  .card-page .share-btn{margin:6px 14px 14px;background:var(--whatsapp);color:#fff;text-align:center;padding:14px;border-radius:14px;font-weight:700;font-size:14px}

  /* Sections */
  .card-page section{padding:90px 0;border-top:1px solid rgba(0,0,0,.08)}
  .card-page .section-head{text-align:center;max-width:780px;margin:0 auto 64px}
  .card-page .section-head .kicker{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--terracotta);font-weight:700;margin-bottom:14px}
  .card-page .section-head h2{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(32px,4.6vw,54px);line-height:1.05;letter-spacing:-.01em;margin-bottom:16px;text-transform:uppercase}
  .card-page .section-head p{color:var(--muted);font-size:17px}

  .card-page .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  @media (max-width:980px){.card-page .steps{grid-template-columns:1fr}}
  .card-page .step{position:relative;border:1px solid var(--line);border-radius:24px;padding:36px 28px;background:#fff;overflow:hidden;transition:transform .25s,box-shadow .25s}
  .card-page .step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -20px rgba(0,0,0,.18)}
  .card-page .step .num{position:absolute;right:18px;top:-20px;font-family:'Montserrat',sans-serif;font-weight:700;font-size:170px;line-height:1;color:#f4f4f4;pointer-events:none}
  .card-page .step h3{font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;margin-bottom:12px;position:relative}
  .card-page .step p{color:var(--muted);font-size:15px;position:relative}

  .card-page .places{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  @media (max-width:980px){.card-page .places{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:520px){.card-page .places{grid-template-columns:1fr}}
  .card-page .place{background:#fff;border:1px solid var(--line);border-radius:20px;padding:24px;transition:transform .2s,box-shadow .2s}
  .card-page .place:hover{transform:translateY(-3px);box-shadow:0 14px 30px -16px rgba(0,0,0,.18)}
  .card-page .place .ico{width:44px;height:44px;border-radius:12px;background:#fff5ec;color:var(--terracotta);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px}
  .card-page .place h4{font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;margin-bottom:8px}
  .card-page .place p{color:var(--muted);font-size:14px}

  .card-page .faq{max-width:820px;margin:0 auto}
  .card-page details{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 26px;margin-bottom:14px;cursor:pointer}
  .card-page details[open]{box-shadow:0 14px 30px -16px rgba(0,0,0,.12)}
  .card-page summary{font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;list-style:none;display:flex;justify-content:space-between;align-items:center}
  .card-page summary::after{content:"+";color:var(--terracotta);font-size:24px;font-weight:300;transition:transform .2s}
  .card-page details[open] summary::after{content:"−"}
  .card-page details p{margin-top:14px;color:var(--muted);font-size:15px}

  .card-page .final{text-align:center;padding:120px 0}
  .card-page .final h2{font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(34px,5vw,60px);line-height:1.05;letter-spacing:-.01em;margin-bottom:20px;text-transform:uppercase;max-width:900px;margin-left:auto;margin-right:auto}
  .card-page .final p{color:#3a3a3a;font-size:18px;max-width:620px;margin:0 auto 36px}
  .card-page .final code{background:#fff;padding:4px 12px;border-radius:8px;color:var(--terracotta);font-weight:700;font-family:inherit}

`;

const Card = () => {
  useEffect(() => {
    document.title = "Votre carte numérique sur One World Morocco";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Un lien court et personnalisé — oneworldmorocco.com/yourname. Offres, contacts et photos en un tap, sur un domaine de voyage de confiance.";
    if (meta) meta.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  const heroSectionRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const hero = heroSectionRef.current;
    if (!hero) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let mx = 0, my = 0, tx = 0, ty = 0, sy = 0, ticking = false;
    const update = () => {
      tx += (mx - tx) * 0.08;
      ty += (my - ty) * 0.08;
      hero.style.setProperty('--mx', tx.toFixed(3));
      hero.style.setProperty('--my', ty.toFixed(3));
      hero.style.setProperty('--sy', sy.toFixed(3));
      if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) {
        requestAnimationFrame(update);
      } else ticking = false;
    };
    const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const onLeave = () => { mx = 0; my = 0; kick(); };
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      sy = Math.max(-1, Math.min(1, -r.top / r.height));
      kick();
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Scroll-driven parallax on bg image (mirrors homepage: translateY = scrollY * 0.3)
  useEffect(() => {
    const el = heroBgRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        el.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(1.05)`;
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <HomeMindtripHeader />
      <div className="card-page">
        <style>{CSS}</style>


      {/* HERO */}
      <section className="hero" ref={heroSectionRef}>
        <picture>
          <source media="(max-width: 767px)" srcSet={heroImageMobile} />
          <source media="(max-width: 1023px)" srcSet={heroImageTablet} />
          <img ref={heroBgRef} src={heroImageDesktop} alt="" className="hero-bg" loading="eager" fetchPriority="high" />
        </picture>
        <div className="hero-overlay-tablet" aria-hidden />
        <div className="hero-overlay-mobile" aria-hidden />
        <div className="hero-content">
        <div className="wrap hero-grid">
          <div>
            <h1 className="hero-rise" style={{ animationDelay: '.45s', animationFillMode: 'forwards' }}>Votre carte de visite numérique sur <span className="accent">One World Morocco</span></h1>
            <p className="lead hero-rise" style={{ animationDelay: '.66s', animationFillMode: 'forwards' }}>
              Un lien court et personnalisé que les voyageurs retiennent vraiment — <code>oneworldmorocco.com/yourname</code>.
              Un seul tap affiche vos offres, vos contacts et vos photos, sur un domaine de voyage de confiance.
              Le QR n'est qu'une façon parmi d'autres de le partager.
            </p>
            <ul className="bullets hero-rise" style={{ animationDelay: '.78s', animationFillMode: 'forwards' }}>
              <li><span className="check">✓</span><div style={{marginTop:-2}}>URL courte et mémorisable :<br/><strong>oneworldmorocco.com/yourname</strong></div></li>
              <li><span className="check">✓</span><div style={{marginTop:-2}}>Tous vos canaux numériques rassemblés au même endroit</div></li>
              <li><span className="check">✓</span><div style={{marginTop:-2}}>Un profil type Linktree partageable</div></li>
              <li><span className="check">✓</span>Partagez par lien, QR, NFC ou carte imprimée</li>
              <li><span className="check">✓</span>Mettez à jour à tout moment — le lien reste le même</li>
            </ul>
            <div className="btn-row hero-rise" style={{ animationDelay: '.92s', animationFillMode: 'forwards' }}>
              <Link to="/join" className="btn-primary" data-track-event="club_cta_click" data-track-location="card_hero" data-track-target="join">CRÉEZ VOTRE PAGE →</Link>
              <a href="#avantages" className="btn-ghost">Voir les avantages ↓</a>
            </div>
          </div>

          <div className="phone-wrap">
            <div className="url-label">Votre URL personnalisée</div>
            <div className="phone">
              <div className="phone-inner">
                <div className="phone-bar">
                  <span className="lock">🔒</span>
                  <span>oneworldmorocco.com/<span className="slug">riad-zahra</span></span>
                </div>
                <div className="phone-body">
                  <div className="logo-circle">RZ</div>
                  <div className="biz-name">Riad Zahra</div>
                  <div className="biz-sub">Riad de charme · Marrakech</div>
                  <div className="icons-row">
                    <div className="ic">📞</div>
                    <div className="ic">💬</div>
                    <div className="ic">🌐</div>
                    <div className="ic">📍</div>
                  </div>
                </div>
                <div className="offer">
                  <span className="pct">−25%</span>
                  <span><span className="lbl">Séjour 3 nuits</span><span className="sub">Toute l'année</span></span>
                </div>
                <div className="offer">
                  <span className="pct">−15%</span>
                  <span><span className="lbl">Hammam & spa</span><span className="sub">Réservation directe</span></span>
                </div>
                <div className="offer">
                  <span className="pct">−10%</span>
                  <span><span className="lbl">Dîner sur la terrasse</span><span className="sub">Tous les soirs</span></span>
                </div>
                <div className="gallery"><div/><div/><div/></div>
                <div className="share-btn">↗ Partager</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* STEPS */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Comment ça marche</div>
            <h2>Trois étapes pour votre lien personnalisé</h2>
            <p>De l'inscription à <strong>oneworldmorocco.com/yourname</strong> — prêt à partager.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="num">1</span>
              <h3>Réclamez votre lien</h3>
              <p>Choisissez votre identifiant. Votre carte numérique vit à l'adresse <strong>oneworldmorocco.com/yourname</strong> — courte, mémorisable, sur un domaine de confiance.</p>
            </div>
            <div className="step">
              <span className="num">2</span>
              <h3>Partagez-le partout</h3>
              <p>Ajoutez le lien sur Instagram, WhatsApp, dans votre signature e-mail, sur des tags NFC — ou imprimez le QR sur les reçus, les menus et les cartes de visite.</p>
            </div>
            <div className="step">
              <span className="num">3</span>
              <h3>Convertissez sur place</h3>
              <p>Un seul tap affiche vos offres, contacts et photos. Les voyageurs enregistrent votre carte, réservent et reviennent — sur un domaine qu'ils connaissent déjà.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="avantages">
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Gratuit pour les pros du tourisme</div>
            <h2>UN LIEN SUR LEQUEL LES UTILISATEURS <span style={{color:"var(--terracotta)"}}>CLIQUENT VRAIMENT</span></h2>
            <p>Ajoutez <strong>oneworldmorocco.com/yourname</strong> à Instagram, TikTok, votre signature e-mail — et même à votre carte de visite imprimée.</p>
          </div>
          <div className="steps">
            <div className="step">
              <h3>Un domaine de confiance</h3>
              <p>oneworldmorocco.com — reconnu, sûr, facile à taper. Les voyageurs cliquent sans hésiter.</p>
            </div>
            <div className="step">
              <h3>Un lien, tous les canaux</h3>
              <p>Bio Instagram, WhatsApp, signature e-mail, NFC, impression. Le même lien partout.</p>
            </div>
            <div className="step">
              <h3>Tout en un seul endroit</h3>
              <p>Offres, contacts, photos. Mettez à jour une fois — chaque partage reste à jour.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLACES */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">Diffusion</div>
            <h2>Où partager votre lien</h2>
            <p>Les meilleurs emplacements pour transformer une première impression en réservation — hors ligne comme en ligne.</p>
          </div>
          <div className="places">
            <div className="place"><div className="ico">🧾</div><h4>Reçu / Addition</h4><p>Imprimez un QR sur chaque reçu — les clients scannent en partant.</p></div>
            <div className="place"><div className="ico">📋</div><h4>Menu / Chevalet</h4><p>Collez un QR sur chaque menu ou chevalet — scan rapide pendant le repas.</p></div>
            <div className="place"><div className="ico">🚪</div><h4>Porte / Vitrine</h4><p>Autocollant QR à l'entrée — les passants scannent et entrent.</p></div>
            <div className="place"><div className="ico">🎁</div><h4>Panier de bienvenue</h4><p>Glissez une carte dans les paniers d'hôtel et les jeux de clés Airbnb.</p></div>
            <div className="place"><div className="ico">💼</div><h4>Carte de visite</h4><p>Imprimez sur chaque flyer, carte de visite, brochure que vous distribuez.</p></div>
            <div className="place"><div className="ico">💬</div><h4>WhatsApp / SMS</h4><p>Envoyez le lien dans les réponses WhatsApp et les SMS de confirmation.</p></div>
            <div className="place"><div className="ico">📱</div><h4>Bio Instagram / TikTok</h4><p>Ajoutez le lien à vos bios Instagram, TikTok et Facebook.</p></div>
            <div className="place"><div className="ico">✉️</div><h4>Signature e-mail</h4><p>Ajoutez votre carte à chaque e-mail envoyé — invisible jusqu'à ce qu'on ait besoin de vous.</p></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="wrap">
          <div className="section-head">
            <div className="kicker">FAQ</div>
            <h2>Questions fréquentes</h2>
          </div>
          <div className="faq">
            <details>
              <summary>À quoi ressemble l'URL ?</summary>
              <p>Courte et personnalisée — <strong>oneworldmorocco.com/yourname</strong>. Facile à retenir, facile à taper, d'aspect professionnel.</p>
            </details>
            <details>
              <summary>Dois-je imprimer des cartes physiques ?</summary>
              <p>Non — la page numérique fonctionne seule (QR, lien, e-mail). Nous proposons des cartes premium si vous le souhaitez.</p>
            </details>
            <details>
              <summary>Puis-je mettre à jour les offres plus tard ?</summary>
              <p>Oui — mettez à jour offres, contacts et photos à tout moment depuis votre tableau de bord. Le QR reste le même.</p>
            </details>
            <details>
              <summary>Les voyageurs lui feront-ils confiance ?</summary>
              <p>Les pages sont vérifiées — les voyageurs voient le domaine oneworldmorocco.com, des offres officielles, de vrais avis. La confiance s'installe immédiatement.</p>
            </details>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="wrap">
          <h2>Votre lien. Votre carte. Sur un domaine en lequel les voyageurs ont confiance.</h2>
          <p><code>oneworldmorocco.com/yourname</code> — court, mémorable, prêt à être partagé par lien, QR ou NFC.</p>
          <Link to="/join" className="btn-primary" data-track-event="club_cta_click" data-track-location="card_footer" data-track-target="join">Créez votre carte gratuite →</Link>
        </div>
      </section>

      </div>
      <Footer variant="verified" />
    </>
  );
};

export default Card;
