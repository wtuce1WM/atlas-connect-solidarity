import { Search } from "lucide-react";
import { useState } from "react";
import earthVideo from "@/assets/earth-morocco-zoom.mp4";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={earthVideo} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-serif text-5xl font-bold tracking-tight text-white md:text-7xl">
            <span className="text-gold">Solidarity</span> Morocco
          </h1>
          <p className="text-lg text-white/90 md:text-xl">
            Connecting communities through work & services
          </p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          <div className="group relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-terracotta via-majorelle to-atlas opacity-60 blur-sm transition-opacity group-hover:opacity-80" />
            <div className="relative flex items-center overflow-hidden rounded-xl bg-white/95 backdrop-blur-sm">
              <Search className="ml-5 h-6 w-6 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for jobs, services, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-4 py-5 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="m-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Quick Tags */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["Artisans", "Home Services", "Teaching", "Healthcare", "Construction"].map((tag) => (
            <span
              key={tag}
              className="cursor-pointer rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition-all hover:border-gold hover:bg-gold/20"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center text-white/70">
            <span className="mb-2 text-sm">Explore Services</span>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
