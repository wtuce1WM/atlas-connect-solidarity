import { useEffect } from "react";

const Solidarity = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/scripts/solidarity.js";
    script.async = false;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      document.body.classList.remove("menu-open");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .allocation-row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 1rem; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid hsl(var(--border)); }
        .allocation-row strong { display: block; }
        .allocation-row small { color: hsl(var(--muted-foreground)); font-size: 0.8rem; }
        .bar { display: block; height: 8px; background: hsl(var(--muted)); border-radius: 999px; overflow: hidden; }
        .bar > span { display: block; height: 100%; background: var(--bar-color, #007f75); border-radius: 999px; }
        .audience-btn { padding: 0.5rem 1rem; border: 1px solid hsl(var(--border)); border-radius: 999px; background: transparent; cursor: pointer; transition: all 0.2s; }
        .audience-btn.active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
        .rail-nav { display: flex; gap: 1rem; flex-wrap: wrap; }
        .rail-nav a { color: hsl(var(--foreground)); text-decoration: none; }
        .rail-nav a:hover { text-decoration: underline; }
        body.menu-open .mobile-menu { display: block; }
        .mobile-menu { display: none; }
      `}</style>

      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">One World Morocco — Solidarity</h1>
          <button data-menu-button className="md:hidden px-3 py-2 border rounded">Menu</button>
          <nav className="rail-nav hidden md:flex">
            <a href="#calculator">Calculateur</a>
            <a href="#audience">Audiences</a>
            <a href="#partner">Partenaires</a>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">Impact</p>
        <h2 className="text-4xl font-bold mt-2">
          <span data-hero-nights>0</span> € collectés ce mois
        </h2>
        <p className="text-muted-foreground mt-4 max-w-2xl">
          Simulez la contribution mensuelle de votre organisation et visualisez la répartition par axe d'impact.
        </p>
      </section>

      <section id="calculator" className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold">Calculateur</h3>
          <div>
            <label className="block text-sm mb-2">
              Volume de nuitées : <output data-volume-output className="font-semibold">0</output>
            </label>
            <input
              data-volume
              type="range"
              min={1000}
              max={200000}
              step={1000}
              defaultValue={62500}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">
              Taux de contribution : <output data-rate-output className="font-semibold">0%</output>
            </label>
            <input data-rate type="range" min={1} max={20} step={1} defaultValue={5} className="w-full" />
          </div>
          <div className="p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Total estimé</p>
            <p data-total className="text-3xl font-bold mt-1">0 €</p>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-4">Répartition</h3>
          <div data-allocation-list />
        </div>
      </section>

      <section id="audience" className="max-w-6xl mx-auto px-6 py-12">
        <h3 className="text-2xl font-semibold mb-6">Audiences</h3>
        <div className="flex flex-wrap gap-3 mb-8">
          <button data-audience="hotel" className="audience-btn active">Hôtelier</button>
          <button data-audience="ota" className="audience-btn">OTA</button>
          <button data-audience="institution" className="audience-btn">Institution</button>
          <button data-audience="marketplace" className="audience-btn">Marketplace</button>
        </div>
        <div className="p-8 border rounded-lg space-y-4">
          <p data-audience-tag className="text-sm uppercase tracking-wider text-primary" />
          <h4 data-audience-title className="text-2xl font-bold" />
          <p data-audience-copy className="text-muted-foreground" />
          <div className="pt-4 border-t border-border">
            <p data-audience-metric className="text-3xl font-bold" />
            <p data-audience-caption className="text-sm text-muted-foreground" />
          </div>
        </div>
      </section>

      <section id="partner" className="max-w-6xl mx-auto px-6 py-12">
        <h3 className="text-2xl font-semibold mb-6">Devenir partenaire</h3>
        <form data-partner-form className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm mb-1">Organisation</label>
            <input name="organisation" className="w-full px-4 py-2 border rounded bg-background" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Type</label>
            <select name="type" className="w-full px-4 py-2 border rounded bg-background">
              <option>Hôtelier</option>
              <option>OTA</option>
              <option>Institution</option>
              <option>Marketplace</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Volume mensuel estimé (€)</label>
            <input name="volume" type="number" min={0} defaultValue={5000} className="w-full px-4 py-2 border rounded bg-background" />
          </div>
          <button type="submit" className="px-6 py-3 bg-primary text-primary-foreground rounded font-semibold">
            Simuler
          </button>
          <p data-form-result className="text-sm text-muted-foreground mt-4" />
        </form>
      </section>
    </div>
  );
};

export default Solidarity;
