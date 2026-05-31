import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PRESENTATION_HTML_FR = `
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #C9A84C;
    --deep-red: #8B1A1A;
    --sand: #D4B483;
    --charcoal: #1a1a1a;
    --cream: #F5EDD8;
    --teal: #2A7B7B;
  }
  body {
    background: #000;
    font-family: 'Cormorant Garamond', serif;
    overflow: hidden;
    width: 100%;
    height: 100%;
    cursor: none;
  }
  .cursor {
    position: fixed; width: 12px; height: 12px; background: var(--gold);
    border-radius: 50%; pointer-events: none; z-index: 9999;
    transform: translate(-50%, -50%); transition: transform 0.1s; mix-blend-mode: difference;
  }
  #intro {
    position: fixed; inset: 0; background: #000; z-index: 100;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    animation: introFade 1s ease 4s forwards;
  }
  @keyframes introFade { to { opacity: 0; pointer-events: none; } }
  .intro-logo {
    width: 180px; height: 180px; border: 2px solid var(--gold); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin-bottom: 2rem;
    animation: rotateBorder 8s linear infinite; position: relative;
  }
  .intro-logo::before {
    content: ''; position: absolute; inset: -8px; border-radius: 50%;
    border: 1px solid rgba(201,168,76,0.3); animation: rotateBorder 12s linear infinite reverse;
  }
  @keyframes rotateBorder { to { transform: rotate(360deg); } }
  .hamsa-svg { width: 80px; height: 80px; fill: var(--gold); animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  .intro-title {
    font-family: 'Cinzel Decorative', serif; font-size: clamp(1.2rem, 3vw, 2rem);
    color: var(--gold); letter-spacing: 0.3em; text-align: center; animation: fadeInUp 1s ease 0.5s both;
  }
  .intro-sub {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 1.1rem;
    color: var(--sand); letter-spacing: 0.15em; margin-top: 0.5rem; animation: fadeInUp 1s ease 1s both;
  }
  .intro-tagline {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 0.9rem;
    color: rgba(201,168,76,0.6); letter-spacing: 0.2em; margin-top: 1rem; animation: fadeInUp 1s ease 1.5s both;
  }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  #presentation { position: fixed; inset: 0; opacity: 0; animation: showPresentation 0.5s ease 4.5s forwards; }
  @keyframes showPresentation { to { opacity: 1; } }
  .slide {
    position: absolute; inset: 0; opacity: 0; transition: opacity 1.2s ease;
    display: flex; align-items: center; justify-content: center;
  }
  .slide.active { opacity: 1; }
  .slide-bg {
    position: absolute; inset: 0; background-size: cover; background-position: center;
    transform: scale(1.08); transition: transform 8s ease; filter: brightness(0.45) saturate(1.2);
  }
  .slide.active .slide-bg { transform: scale(1); }
  .slide::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%),
      linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%);
    z-index: 1; pointer-events: none;
  }
  .slide-deco { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
  .slide-deco::before {
    content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: min(60vw, 60vh); height: min(60vw, 60vh); border: 1px solid rgba(201,168,76,0.15); border-radius: 50%;
  }
  .slide-deco::after {
    content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg);
    width: min(42vw, 42vh); height: min(42vw, 42vh); border: 1px solid rgba(201,168,76,0.1);
  }
  .slide-content {
    position: relative; z-index: 10; text-align: center; padding: 2rem; max-width: 800px;
    transform: translateY(30px); opacity: 0; transition: transform 1.2s ease 0.3s, opacity 1.2s ease 0.3s;
  }
  .slide.active .slide-content { transform: translateY(0); opacity: 1; }
  .slide-label {
    font-family: 'Cormorant Garamond', serif; font-size: 0.75rem; letter-spacing: 0.4em;
    color: var(--gold); text-transform: uppercase; margin-bottom: 1rem; opacity: 0.8;
  }
  .slide-title {
    font-family: 'Cinzel Decorative', serif; font-size: clamp(1.5rem, 4vw, 3.5rem);
    color: #fff; line-height: 1.2; text-shadow: 0 2px 20px rgba(0,0,0,0.8); margin-bottom: 1rem;
  }
  .slide-title span { color: var(--gold); }
  .slide-quote {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: clamp(1rem, 2vw, 1.4rem); color: var(--cream); opacity: 0.9;
    line-height: 1.7; max-width: 600px; margin: 0 auto 1.5rem;
  }
  .slide-divider { width: 60px; height: 1px; background: var(--gold); margin: 1rem auto; position: relative; }
  .slide-divider::before, .slide-divider::after {
    content: '◆'; position: absolute; top: 50%; transform: translateY(-50%); color: var(--gold); font-size: 0.4rem;
  }
  .slide-divider::before { right: calc(100% + 6px); }
  .slide-divider::after { left: calc(100% + 6px); }
  .corner { position: absolute; width: 40px; height: 40px; z-index: 10; opacity: 0.5; }
  .corner-tl { top: 20px; left: 20px; border-top: 1px solid var(--gold); border-left: 1px solid var(--gold); }
  .corner-tr { top: 20px; right: 20px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); }
  .corner-bl { bottom: 20px; left: 20px; border-bottom: 1px solid var(--gold); border-left: 1px solid var(--gold); }
  .corner-br { bottom: 20px; right: 20px; border-bottom: 1px solid var(--gold); border-right: 1px solid var(--gold); }
  #nav {
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 50;
    display: flex; align-items: center; gap: 1.5rem; opacity: 0; animation: showPresentation 0.5s ease 5s forwards;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(201,168,76,0.3); cursor: pointer; transition: all 0.3s; }
  .dot.active { background: var(--gold); transform: scale(1.4); }
  .nav-btn {
    background: none; border: 1px solid rgba(201,168,76,0.4); color: var(--gold);
    width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 0.9rem;
    display: flex; align-items: center; justify-content: center; transition: all 0.3s;
  }
  .nav-btn:hover { background: rgba(201,168,76,0.1); border-color: var(--gold); }
  #topbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 20px 30px;
    display: flex; justify-content: space-between; align-items: center; opacity: 0;
    animation: showPresentation 0.5s ease 5s forwards;
  }
  .brand { font-family: 'Cinzel Decorative', serif; font-size: 0.7rem; letter-spacing: 0.3em; color: var(--gold); opacity: 0.8; }
  .slide-counter { font-family: 'Cormorant Garamond', serif; font-size: 0.8rem; color: rgba(201,168,76,0.5); letter-spacing: 0.2em; }
  #progress { position: fixed; top: 0; left: 0; height: 2px; background: linear-gradient(to right, var(--deep-red), var(--gold)); z-index: 60; transition: width 0.5s ease; }
  .calligraphy-mark {
    position: absolute; font-family: 'Amiri', serif; font-size: clamp(8rem, 20vw, 18rem);
    color: rgba(201,168,76,0.04); z-index: 1; pointer-events: none; line-height: 1; user-select: none;
  }
  @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  .shimmer-text {
    background: linear-gradient(90deg, var(--gold) 0%, #fff 40%, var(--gold) 60%, #C9A84C 100%);
    background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; animation: shimmer 4s linear infinite;
  }
  .particles { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
  .particle {
    position: absolute; width: 2px; height: 2px; background: var(--gold);
    border-radius: 50%; animation: float linear infinite; opacity: 0;
  }
  @keyframes float {
    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
    10% { opacity: 0.6; } 90% { opacity: 0.3; }
    100% { transform: translateY(-10vh) rotate(720deg); opacity: 0; }
  }
  #autoplay-bar {
    position: fixed; bottom: 0; left: 0; height: 3px; background: rgba(201,168,76,0.3);
    z-index: 60; animation: autoplayProgress 6s linear infinite;
  }
  @keyframes autoplayProgress { from { width: 0; } to { width: 100%; } }
</style>

<div class="cursor" id="cursor"></div>

<div id="intro">
  <div class="intro-logo">
    <svg class="hamsa-svg" viewBox="0 0 100 100">
      <path d="M50 5 C50 5 20 25 20 55 C20 75 35 95 50 95 C65 95 80 75 80 55 C80 25 50 5 50 5Z M50 40 C45 40 42 44 42 48 C42 52 45 56 50 56 C55 56 58 52 58 48 C58 44 55 40 50 40Z"/>
    </svg>
  </div>
  <div class="intro-title">ONE WORLD MOROCCO</div>
  <div class="intro-sub">Le Monde sous un Autre Angle</div>
  <div class="intro-tagline">Bienvenue · مرحباً · Welcome</div>
</div>

<div id="topbar">
  <div class="brand">ONE WORLD MOROCCO</div>
  <div class="slide-counter"><span id="current-num">01</span> / 10</div>
</div>

<div id="progress" style="width: 10%"></div>

<div id="nav">
  <button class="nav-btn" onclick="changeSlide(-1)">‹</button>
  <div class="dot active" onclick="goToSlide(0)"></div>
  <div class="dot" onclick="goToSlide(1)"></div>
  <div class="dot" onclick="goToSlide(2)"></div>
  <div class="dot" onclick="goToSlide(3)"></div>
  <div class="dot" onclick="goToSlide(4)"></div>
  <div class="dot" onclick="goToSlide(5)"></div>
  <div class="dot" onclick="goToSlide(6)"></div>
  <div class="dot" onclick="goToSlide(7)"></div>
  <div class="dot" onclick="goToSlide(8)"></div>
  <div class="dot" onclick="goToSlide(9)"></div>
  <button class="nav-btn" onclick="changeSlide(1)">›</button>
</div>

<div id="autoplay-bar"></div>

<div id="presentation">
  <!-- Slide 1 -->
  <div class="slide active" data-slide="0">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="calligraphy-mark" style="top:10%;right:-5%">友</div>
    <div class="particles" id="particles-0"></div>
    <div class="slide-content">
      <div class="slide-label">Bienvenue · مرحباً · Welcome</div>
      <h1 class="slide-title">ONE WORLD<br><span>MOROCCO</span></h1>
      <div class="slide-divider"></div>
      <p class="slide-quote">« Là où l'Atlantique rencontre le Sahara, où l'ancien côtoie l'éternel — le Maroc révèle le monde sous un autre angle. »</p>
    </div>
  </div>

  <!-- Slide 2 -->
  <div class="slide" data-slide="1">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1548018560-c7196e4f5bef?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="calligraphy-mark" style="bottom:5%;left:-3%">友</div>
    <div class="particles" id="particles-1"></div>
    <div class="slide-content">
      <div class="slide-label">Luxe · الفخامة</div>
      <h2 class="slide-title"><span>SOYEZ LES PLUS COOL</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Terrasses rooftop surplombant les médinas, couchers de soleil sur l'Atlantique — quand le confort rencontre l'âme du Maroc.</p>
    </div>
  </div>

  <!-- Slide 3 -->
  <div class="slide" data-slide="2">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1545071677-2e5cfbc62e3e?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="particles" id="particles-2"></div>
    <div class="slide-content">
      <div class="slide-label">Culture · الثقافة</div>
      <h2 class="slide-title"><span>RACINES & ÂME</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Une tapisserie tissée de fils amazighs, arabes, africains et andalous — la culture marocaine, c'est le monde en un seul pays.</p>
    </div>
  </div>

  <!-- Slide 4 -->
  <div class="slide" data-slide="3">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1507209696998-3c532be9b1d3?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="calligraphy-mark" style="top:15%;left:-5%">友</div>
    <div class="particles" id="particles-3"></div>
    <div class="slide-content">
      <div class="slide-label">Aventure · المغامرة</div>
      <h2 class="slide-title"><span>RÊVES DE DÉSERT</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Campements éclairés de lanternes sous un milliard d'étoiles. L'appel du Sahara. Jemaa el-Fna vibrant d'histoires ancestrales au crépuscule.</p>
    </div>
  </div>

  <!-- Slide 5 -->
  <div class="slide" data-slide="4">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1577828553530-8fda5599648e?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="particles" id="particles-4"></div>
    <div class="slide-content">
      <div class="slide-label">Tradition · التقاليد</div>
      <h2 class="slide-title"><span>RITUELS INTEMPORELS</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Le thé à la menthe versé avec cérémonie. Le minaret de la Koutoubia embrassé par le couchant. Chaque geste, un acte d'hospitalité.</p>
    </div>
  </div>

  <!-- Slide 6 -->
  <div class="slide" data-slide="5">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="particles" id="particles-5"></div>
    <div class="slide-content">
      <div class="slide-label">Connexion · الوصل</div>
      <h2 class="slide-title"><span>VOYAGES PARTAGÉS</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Là où les voyageurs deviennent une famille. Les dunes au coucher du soleil avec de nouveaux amis. Les tanneries de Fès. L'architecture millénaire.</p>
    </div>
  </div>

  <!-- Slide 7 -->
  <div class="slide" data-slide="6">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="particles" id="particles-6"></div>
    <div class="slide-content">
      <div class="slide-label">Transformation · التحول</div>
      <h2 class="slide-title">GARDEZ VOS PIÈCES —<br><span>CHANGEZ DE VIE</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Le Maroc ne vous montre pas juste quelque chose de nouveau. Il vous transforme. Une cour de riad sous le clair de lune. Des épices millénaires.</p>
    </div>
  </div>

  <!-- Slide 8 -->
  <div class="slide" data-slide="7">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1504730030853-eff311f57d3c?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="particles" id="particles-7"></div>
    <div class="slide-content">
      <div class="slide-label">Mystique · الغموض</div>
      <h2 class="slide-title"><span>SOUS LA LUNE DE SANG</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">La Hamsa veille sur les barques bleues. Protection ancestrale. Beauté intemporelle. Le Maroc parle en symboles.</p>
    </div>
  </div>

  <!-- Slide 9 -->
  <div class="slide" data-slide="8">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="particles" id="particles-8"></div>
    <div class="slide-content">
      <div class="slide-label">Global · عالمي</div>
      <h2 class="slide-title"><span>ONE WORLD</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">De Times Square à la médina. Des cathédrales gothiques aux arches marocaines. Toutes les croyances, toutes les cultures — un seul monde, un seul foyer.</p>
    </div>
  </div>

  <!-- Slide 10 -->
  <div class="slide" data-slide="9">
    <div class="slide-bg" style="background-image: url('https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=1920')"></div>
    <div class="slide-deco"></div>
    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
    <div class="calligraphy-mark" style="top:10%;right:-5%">友</div>
    <div class="particles" id="particles-9"></div>
    <div class="slide-content">
      <div class="slide-label">One World Morocco</div>
      <h2 class="slide-title">LE MONDE SOUS<br><span>UN AUTRE ANGLE</span></h2>
      <div class="slide-divider"></div>
      <p class="slide-quote">Découvrez le Maroc tel qu'il est vraiment — à travers ses habitants, sa terre, son esprit. Rejoignez-nous. Le voyage commence ici.</p>
      <div class="shimmer-text" style="font-family:'Cinzel Decorative',serif;font-size:0.8rem;letter-spacing:0.3em;margin-top:1rem;">ONEWORLDMOROCCO.COM</div>
    </div>
  </div>
</div>

<script>
  let current = 0;
  const total = 10;
  let autoTimer;
  function goToSlide(n) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    current = n;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    document.getElementById('current-num').textContent = String(current + 1).padStart(2, '0');
    document.getElementById('progress').style.width = ((current + 1) / total * 100) + '%';
    resetAutoplay();
  }
  function changeSlide(dir) { goToSlide((current + dir + total) % total); }
  function resetAutoplay() {
    clearInterval(autoTimer);
    const bar = document.getElementById('autoplay-bar');
    if (bar) { bar.style.animation = 'none'; bar.offsetHeight; bar.style.animation = 'autoplayProgress 6s linear infinite'; }
    autoTimer = setInterval(() => changeSlide(1), 6000);
  }
  for (let i = 0; i < total; i++) {
    const container = document.getElementById('particles-' + i);
    if (container) {
      for (let j = 0; j < 15; j++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 12) + 's';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
        container.appendChild(p);
      }
    }
  }
  document.addEventListener('mousemove', e => {
    const c = document.getElementById('cursor');
    if (c) { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') changeSlide(1);
    if (e.key === 'ArrowLeft') changeSlide(-1);
  });
  resetAutoplay();
<\/script>
`;

const BlogPresentationFR = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body>${PRESENTATION_HTML_FR}</body></html>`);
        doc.close();
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div className="w-full" style={{ height: "100vh" }}>
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title="One World Morocco — Présentation FR"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default BlogPresentationFR;
