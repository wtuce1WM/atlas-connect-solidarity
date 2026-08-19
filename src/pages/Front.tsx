import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";

const HERO_VIDEO_URL =
  "https://plnphgdrawpsnumnejzc.supabase.co/storage/v1/object/public/studio-videos/1wm_montage_storyboard-home-portrait-20_vertical_20260818-1320_3376434b.mp4";

const Front = () => {
  useSEO({
    title: "ONE WORLD MOROCCO — Entrée immersive",
    description:
      "Découvrez le Maroc authentique à travers une expérience vidéo immersive. Hôtels, riads, restaurants et activités sélectionnés avec soin.",
    canonical: "/front",
  });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={HERO_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Vidéo de présentation immersive One World Morocco"
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero-overlay)" }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-josefin text-4xl font-bold tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
          ONE WORLD MOROCCO
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-primary-foreground/90 md:text-xl lg:text-2xl">
          L&apos;expérience marocaine authentique, en images et en adresses sélectionnées.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="text-base">
            <Link to="/search">Explorer les adresses</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary-foreground/30 bg-transparent text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/videos">Voir les vidéos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Front;
