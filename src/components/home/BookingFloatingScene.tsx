import { useEffect, useRef, useState } from "react";
import cloudImg from "@/assets/home-mindtrip/cloud.png";
import petalsImg from "@/assets/home-mindtrip/rose-petals.png";

/**
 * Scène illustrée pour l'étape "Réservez" :
 * - Nuages et pétales de rose flottants (animation CSS)
 * - Effet parallaxe au mouvement de la souris
 * - Calendrier stylisé centré comme point d'ancrage
 */
const BookingFloatingScene = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      setP({ x, y });
    };
    const onLeave = () => setP({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const tx = (depth: number) => ({
    transform: `translate3d(${p.x * depth}px, ${p.y * depth}px, 0)`,
  });

  // Calendrier : J+30 / J+35 cohérent avec le widget hôtels
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 30);
  const checkOut = new Date(today);
  checkOut.setDate(today.getDate() + 35);

  const monthLabel = checkIn.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const year = checkIn.getFullYear();
  const month = checkIn.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // lundi=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const inRange = (d: number) => {
    const date = new Date(year, month, d);
    return date >= new Date(year, month, checkIn.getDate()) &&
           (checkOut.getMonth() === month
             ? date <= new Date(year, month, checkOut.getDate())
             : date >= new Date(year, month, checkIn.getDate()));
  };

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(28_55%_92%)] via-[hsl(20_45%_88%)] to-[hsl(15_55%_82%)]"
      aria-hidden="true"
    >
      <style>{`
        @keyframes float-slow { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes float-med  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-22px) } }
        @keyframes drift      { 0%,100% { transform: translate(0,0) rotate(0deg) } 50% { transform: translate(10px,-18px) rotate(8deg) } }
        @keyframes drift-rev  { 0%,100% { transform: translate(0,0) rotate(0deg) } 50% { transform: translate(-12px,-14px) rotate(-10deg) } }
      `}</style>
        {/* Nuages — arrière-plan, parallaxe faible */}
        <div className="absolute -top-6 -left-10 w-[55%] opacity-80" style={tx(-14)}>
          <div style={{ animation: "float-slow 9s ease-in-out infinite" }}>
            <img src={cloudImg} alt="" className="w-full select-none" draggable={false} />
          </div>
        </div>
        <div className="absolute top-6 right-[-8%] w-[45%] opacity-70" style={tx(-20)}>
          <div style={{ animation: "float-med 11s ease-in-out infinite" }}>
            <img src={cloudImg} alt="" className="w-full select-none" draggable={false} />
          </div>
        </div>
        <div className="absolute bottom-2 left-[20%] w-[40%] opacity-60" style={tx(-10)}>
          <div style={{ animation: "float-slow 13s ease-in-out infinite" }}>
            <img src={cloudImg} alt="" className="w-full select-none" draggable={false} />
          </div>
        </div>

        {/* Calendrier — point d'ancrage central, parallaxe douce */}
        <div className="absolute inset-0 flex items-center justify-center" style={tx(8)}>
          <div className="w-[62%] max-w-[320px] rounded-2xl border border-white/60 bg-background/85 p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="font-josefin text-[10px] uppercase tracking-[0.25em] text-primary">Séjour</span>
              <span className="font-josefin text-xs capitalize text-foreground/80">{monthLabel}</span>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center font-roboto text-[9px] text-foreground/50">
              {["L","M","M","J","V","S","D"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1 text-center font-roboto text-[11px]">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const isIn = d === checkIn.getDate() && month === checkIn.getMonth();
                const isOut = d === checkOut.getDate() && month === checkOut.getMonth();
                const between = month === checkIn.getMonth() && d > checkIn.getDate() && d < checkOut.getDate();
                if (isIn || isOut) {
                  return (
                    <div key={i} className="flex h-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground">
                      {d}
                    </div>
                  );
                }
                if (between) {
                  return (
                    <div key={i} className="flex h-6 items-center justify-center bg-primary/15 text-foreground">
                      {d}
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex h-6 items-center justify-center text-foreground/70">
                    {d}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pétales — avant-plan, parallaxe forte */}
        <div className="pointer-events-none absolute -top-6 right-[12%] w-[28%]" style={tx(28)}>
          <div style={{ animation: "drift 7s ease-in-out infinite" }}>
            <img src={petalsImg} alt="" className="w-full select-none" draggable={false} />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-[-6%] left-[-4%] w-[38%]" style={tx(36)}>
          <div style={{ animation: "drift-rev 9s ease-in-out infinite" }}>
            <img src={petalsImg} alt="" className="w-full select-none" draggable={false} />
          </div>
        </div>
        <div className="pointer-events-none absolute top-[35%] right-[-4%] w-[22%] opacity-90" style={tx(40)}>
          <div style={{ animation: "drift 8.5s ease-in-out infinite" }}>
            <img src={petalsImg} alt="" className="w-full select-none" draggable={false} />
          </div>
        </div>
    </div>
  );
};

export default BookingFloatingScene;
