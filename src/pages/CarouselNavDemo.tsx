import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

// Mock carousel data
const CAROUSELS = [
  { id: "youtube", label: "YouTube", color: "bg-red-600", items: ["Short 1", "Short 2", "Short 3", "Vidéo 4", "Vidéo 5", "Vidéo 6"] },
  { id: "kp", label: "Nos établissements", color: "bg-blue-600", items: ["Hôtel A", "Hôtel B", "Hôtel C", "Hôtel D", "Hôtel E"] },
  { id: "destinations", label: "Destinations", color: "bg-emerald-600", items: ["Majorelle", "Palmeraie", "Médina", "Agdal", "Hivernage"] },
  { id: "poi", label: "Points d'intérêt", color: "bg-amber-600", items: ["Musée", "Jardin", "Souk", "Mosquée", "Place"] },
];

const MockCard = ({ label, color }: { label: string; color: string }) => (
  <div className={`${color} rounded-xl w-36 h-24 flex-shrink-0 flex items-center justify-center text-white text-xs font-medium shadow-md`}>
    {label}
  </div>
);

const MockCarousel = ({ carousel }: { carousel: typeof CAROUSELS[0] }) => (
  <div>
    <h4 className="text-sm font-semibold text-white/80 mb-2 px-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {carousel.label}
    </h4>
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {carousel.items.map((item) => (
        <MockCard key={item} label={item} color={carousel.color} />
      ))}
    </div>
  </div>
);

// --- Option 1: Scroll vertical ---
const ScrollVerticalDemo = () => (
  <div className="bg-black/90 rounded-2xl p-4 max-w-md mx-auto">
    <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      Option 1 — Scroll vertical
    </h3>
    <p className="text-white/50 text-xs mb-4">Les carrousels s'empilent, la zone est scrollable verticalement.</p>
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Simulated Info carousel */}
      <div className="bg-white/5 p-3 border-b border-white/10">
        <p className="text-white/40 text-xs text-center">↑ Carrousel Info (fixe) ↑</p>
      </div>
      {/* Scrollable area */}
      <div className="max-h-[260px] overflow-y-auto p-3 space-y-4 overscroll-contain">
        {CAROUSELS.map((c) => (
          <MockCarousel key={c.id} carousel={c} />
        ))}
      </div>
    </div>
    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
      <span>✓</span><span>Simple, tous les carrousels visibles en scrollant</span>
    </div>
    <div className="mt-1 flex items-center gap-2 text-xs text-red-400">
      <span>✗</span><span>Peut créer un conflit de scroll imbriqué</span>
    </div>
  </div>
);

// --- Option 2: Tabs ---
const TabsDemo = () => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="bg-black/90 rounded-2xl p-4 max-w-md mx-auto">
      <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        Option 2 — Tabs / Onglets
      </h3>
      <p className="text-white/50 text-xs mb-4">Un seul carrousel visible à la fois, navigation par onglets.</p>
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="bg-white/5 p-3 border-b border-white/10">
          <p className="text-white/40 text-xs text-center">↑ Carrousel Info (fixe) ↑</p>
        </div>
        {/* Tabs bar */}
        <div className="flex gap-1 px-2 pt-2 overflow-x-auto scrollbar-hide">
          {CAROUSELS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === i
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {/* Active carousel */}
        <div className="p-3">
          <MockCarousel carousel={CAROUSELS[activeTab]} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
        <span>✓</span><span>Compact, pas de scroll imbriqué, navigation claire</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-red-400">
        <span>✗</span><span>Un seul carrousel visible à la fois</span>
      </div>
    </div>
  );
};

// --- Option 3: Swipe vertical snap ---
const SwipeVerticalDemo = () => {
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-black/90 rounded-2xl p-4 max-w-md mx-auto">
      <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        Option 3 — Swipe vertical (pages)
      </h3>
      <p className="text-white/50 text-xs mb-4">Un carrousel par "page", swipe vertical pour changer.</p>
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="bg-white/5 p-3 border-b border-white/10">
          <p className="text-white/40 text-xs text-center">↑ Carrousel Info (fixe) ↑</p>
        </div>
        <div className="relative">
          {/* Page indicator */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
            {CAROUSELS.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  page === i ? "bg-white scale-125" : "bg-white/30"
                }`}
              />
            ))}
          </div>
          {/* Navigation arrows */}
          <div className="absolute right-8 top-2 flex gap-1 z-10">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronUp className="h-3 w-3 text-white" />
            </button>
            <button
              onClick={() => setPage(Math.min(CAROUSELS.length - 1, page + 1))}
              disabled={page === CAROUSELS.length - 1}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronDown className="h-3 w-3 text-white" />
            </button>
          </div>
          {/* Snap container */}
          <div
            ref={containerRef}
            className="h-[130px] overflow-hidden p-3"
          >
            <MockCarousel carousel={CAROUSELS[page]} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
        <span>✓</span><span>Élégant, économise de l'espace vertical</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-red-400">
        <span>✗</span><span>Moins découvrable, l'utilisateur doit savoir swiper</span>
      </div>
    </div>
  );
};

// --- Option 4: Accordion ---
const AccordionDemo = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-black/90 rounded-2xl p-4 max-w-md mx-auto">
      <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        Option 4 — Accordéon
      </h3>
      <p className="text-white/50 text-xs mb-4">Sections dépliables, ouvrir/fermer individuellement.</p>
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="bg-white/5 p-3 border-b border-white/10">
          <p className="text-white/40 text-xs text-center">↑ Carrousel Info (fixe) ↑</p>
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          {CAROUSELS.map((c, i) => (
            <div key={c.id} className="border-b border-white/5 last:border-b-0">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
                  <span className="text-sm text-white font-medium">{c.label}</span>
                  <span className="text-xs text-white/40">({c.items.length})</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-white/40 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-3 pb-3 animate-accordion-down">
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {c.items.map((item) => (
                      <MockCard key={item} label={item} color={c.color} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
        <span>✓</span><span>Complet, tous les titres visibles, on voit le nombre d'éléments</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-red-400">
        <span>✗</span><span>Un seul ouvert à la fois par défaut, plus "applicatif"</span>
      </div>
    </div>
  );
};

const CarouselNavDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Navigation des carrousels — Comparatif
        </h1>
        <p className="text-white/50 text-center text-sm mb-10">
          4 options pour gérer plusieurs carrousels sous le carrousel Info dans BookOnlineSlidePanel
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ScrollVerticalDemo />
          <TabsDemo />
          <SwipeVerticalDemo />
          <AccordionDemo />
        </div>
      </div>
    </div>
  );
};

export default CarouselNavDemo;
