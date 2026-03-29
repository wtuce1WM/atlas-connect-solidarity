/**
 * Shared Emergency Numbers card for SOS Médecin and Pompiers easter eggs.
 */

interface EmergencyNumbersProps {
  variant: "sos" | "pompiers";
}

const EmergencyNumbers = ({ variant }: EmergencyNumbersProps) => {
  const isSos = variant === "sos";
  const accentColor = isSos ? "red" : "orange";
  const title = isSos
    ? "🚨 SOS Médecin — Numéros d'urgence au Maroc"
    : "🔥 Pompiers — Numéros d'urgence au Maroc";
  const subtitle = isSos
    ? "Appelez immédiatement si besoin d'aide médicale"
    : "Appelez immédiatement en cas d'incendie ou de danger";
  const footer = isSos
    ? "En cas d'urgence grave, composez le 150 (SAMU) ou rendez-vous aux urgences de l'hôpital le plus proche."
    : "En cas d'incendie, évacuez immédiatement et composez le 15. N'essayez pas d'éteindre un feu important seul.";

  const numbers = [
    { label: isSos ? "Pompiers / Secours" : "Sapeurs-Pompiers", desc: isSos ? "Incendie, accidents, sauvetage" : "Incendie, secours et sauvetage", number: "150", color: "orange" },
    { label: "Protection Civile", desc: isSos ? "Secours et premiers soins" : "Secours d'urgence et catastrophes", number: "190", color: isSos ? "orange" : "red" },
    { label: "Police Secours", desc: "Urgences police", number: "19", color: "blue" },
    { label: "Gendarmerie Royale", desc: "Zones rurales et périurbaines", number: "177", color: "yellow" },
  ];

  return (
    <div className={`max-w-lg mx-auto mt-28 mb-10 rounded-2xl overflow-hidden border border-${accentColor}-500/40 shadow-2xl bg-gradient-to-br from-black to-zinc-900`}>
      <div className={`px-6 py-5 border-b border-${accentColor}-500/20 bg-gradient-to-r from-${accentColor}-500/10 to-transparent`}>
        <p className={`text-${accentColor}-400 font-semibold text-lg flex items-center gap-2`}>
          {title}
        </p>
        <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>
      </div>
      <div className="px-6 py-5 space-y-3">
        {numbers.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className={`flex items-center justify-between rounded-xl border border-${n.color}-500/30 bg-${n.color}-500/5 px-4 py-3 hover:bg-${n.color}-500/10 transition-colors group`}
          >
            <div>
              <p className="text-white font-semibold text-sm">{n.label}</p>
              <p className="text-white/40 text-xs">{n.desc}</p>
            </div>
            <span className={`text-${n.color}-400 font-bold text-2xl group-hover:scale-110 transition-transform`}>
              {n.number}
            </span>
          </a>
        ))}
      </div>
      <div className={`px-6 py-3 border-t border-${accentColor}-500/20 bg-${accentColor}-500/5`}>
        <p className="text-white/30 text-xs italic">{footer}</p>
      </div>
    </div>
  );
};

export default EmergencyNumbers;
