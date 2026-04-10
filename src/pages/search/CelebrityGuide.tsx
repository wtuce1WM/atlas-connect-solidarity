import { Link } from "react-router-dom";

const CelebrityEntry = ({ name, desc, id }: { name: string; desc: string; id?: string }) => (
  <div className="flex gap-3">
    {id ? (
      <Link
        to={`/business/${id}`}
        className="text-gold font-semibold text-sm min-w-[160px] shrink-0 hover:text-gold/70 underline underline-offset-2 decoration-gold/40 transition-colors"
      >
        {name} ↗
      </Link>
    ) : (
      <span className="text-gold/50 font-semibold text-sm min-w-[160px] shrink-0">{name}</span>
    )}
    <span className="text-white/60 text-sm">{desc}</span>
  </div>
);

const CelebrityGuide = () => (
  <div className="max-w-2xl mx-auto mb-10 rounded-2xl overflow-hidden border border-gold/30 shadow-2xl bg-gradient-to-br from-black to-zinc-900">
    <div className="px-6 py-5 border-b border-gold/20 bg-gradient-to-r from-gold/10 to-transparent">
      <p className="text-gold font-semibold text-lg">👑 Guide insider — Célébrités à Marrakech</p>
      <p className="text-white/50 text-sm mt-0.5">Palaces, tables & nuits — les adresses qui font la légende</p>
    </div>

    <div className="px-6 py-5 space-y-5">
      {/* Hotels */}
      <div>
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌴 Palaces iconiques</p>
        <div className="space-y-2">
          <CelebrityEntry name="La Mamounia" id="3bb71910-c17e-4ce1-a130-42c369a645a7" desc="Le grand classique — jardins légendaires, histoire glamour, incontournable du Festival du Film." />
          <CelebrityEntry name="Royal Mansour" id="0961b2f5-c259-483a-b877-3d251acdbbd9" desc="Ultra-exclusif — chaque client dans son propre riad privé. Intimité maximale." />
          <CelebrityEntry name="Amanjena" id="e7019579-408a-4b3c-90d7-41c6dbff9063" desc="Refuge de stars en quête de calme absolu. Minimalisme chic, loin de l'agitation." />
          <CelebrityEntry name="Mandarin Oriental" id="590225e3-0887-4d79-a8f6-571ac148cca5" desc="Villas avec piscines privées, spa d'exception, discrétion totale." />
          <CelebrityEntry name="El Fenn" id="641ab942-63a5-499e-999a-e09915b1d02f" desc="Bohème & arty. Rooftop mythique, clientèle mode et cinéma." />
          <CelebrityEntry name="Selman Marrakech" id="5b09bebd-7cb5-4698-b447-bf5f198811f4" desc="Chic contemporain, haras privé de chevaux arabes, atmosphère glamour." />
          <CelebrityEntry name="Riad Kniza" id="307aa4e4-03b7-4006-808c-6df07c6b5eab" desc="Riad de charme discret, prisé par les célébrités en quête d'authenticité et de confidentialité en médina." />
        </div>
      </div>

      {/* Restaurants */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🍽️ Où dînent les célébrités</p>
        <div className="space-y-2">
          <CelebrityEntry name="Nobu Marrakech" id="c5a21f81-94fc-4b5e-8f89-822a43dabdec" desc="Cuisine japonaise iconique, rooftop vibrant, clientèle ultra-glam." />
          <CelebrityEntry name="Dar Yacout" id="da42a132-4948-4c5f-afa3-f0b37df6811e" desc="Institution marocaine théâtrale. Stars du cinéma et invités du Festival adorent." />
          <CelebrityEntry name="Restaurant Le Jardin" id="c6af063a-0636-4746-bd14-50060721e5f5" desc="Déjeuner chic et discret dans un riad végétal. Très apprécié des artistes." />
          <CelebrityEntry name="Rooftop Bar El Fenn" id="d04e2a2b-faa4-4675-b861-c8f90df30c7f" desc="Arty, solaire, intime. Un repaire créatif pour les célébrités low profile." />
        </div>
      </div>

      {/* Nightlife */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-gold/80 text-xs font-semibold uppercase tracking-widest mb-3">🌙 Où elles sortent la nuit</p>
        <div className="space-y-2">
          <CelebrityEntry name="Theatro Marrakech" id="be0d6bbb-6daa-4f25-b5c6-32c3650e7f6d" desc="Le club iconique — shows spectaculaires, DJ internationaux, ambiance VIP." />
          <CelebrityEntry name="So Lounge" desc="Glamour chic en Palmeraie, parfait pour soirées sélectes." />
          <CelebrityEntry name="Comptoir Darna" id="21dfaabb-56fe-4da0-9942-34b2803465cf" desc="Dîner-spectacle, danse orientale et jazz lounge. Très apprécié du cinéma français." />
          <CelebrityEntry name="555 Famous Club" desc="Ambiance internationale, soirées tardives, clientèle people." />
        </div>
      </div>
    </div>

    <div className="px-6 py-3 border-t border-gold/20 bg-gold/5">
      <p className="text-white/30 text-xs italic">Présence maximale : janvier–février (Couture Week), mai (Festival du Film), décembre–janvier.</p>
    </div>
  </div>
);

export default CelebrityGuide;
