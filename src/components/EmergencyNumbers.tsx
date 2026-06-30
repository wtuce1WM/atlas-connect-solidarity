/**
 * Shared Emergency Numbers card for SOS Médecin and Pompiers easter eggs.
 */
import { useLanguage } from "@/contexts/LanguageContext";

interface EmergencyNumbersProps {
  variant: "sos" | "pompiers";
}

const LABELS = {
  fr: {
    title_sos: "🚨 SOS Médecin — Numéros d'urgence au Maroc",
    title_pompiers: "🔥 Pompiers — Numéros d'urgence au Maroc",
    subtitle_sos: "Appelez immédiatement si besoin d'aide médicale",
    subtitle_pompiers: "Appelez immédiatement en cas d'incendie ou de danger",
    footer_sos: "En cas d'urgence grave, composez le 150 (SAMU) ou rendez-vous aux urgences de l'hôpital le plus proche.",
    footer_pompiers: "En cas d'incendie, évacuez immédiatement et composez le 15. N'essayez pas d'éteindre un feu important seul.",
    pompiers_secours: "Pompiers / Secours",
    sapeurs_pompiers: "Sapeurs-Pompiers",
    desc_incendie_sos: "Incendie, accidents, sauvetage",
    desc_incendie_pompiers: "Incendie, secours et sauvetage",
    protection_civile: "Protection Civile",
    desc_secours_sos: "Secours et premiers soins",
    desc_secours_pompiers: "Secours d'urgence et catastrophes",
    police_secours: "Police Secours",
    desc_police: "Urgences police",
    gendarmerie: "Gendarmerie Royale",
    desc_gendarmerie: "Zones rurales et périurbaines",
    open_24h: "Ouvert 24h/24",
  },
  en: {
    title_sos: "🚨 SOS Doctor — Emergency Numbers in Morocco",
    title_pompiers: "🔥 Fire Brigade — Emergency Numbers in Morocco",
    subtitle_sos: "Call immediately if you need medical assistance",
    subtitle_pompiers: "Call immediately in case of fire or danger",
    footer_sos: "In case of a serious emergency, dial 150 (SAMU) or go to the nearest hospital emergency room.",
    footer_pompiers: "In case of fire, evacuate immediately and dial 15. Do not try to extinguish a large fire alone.",
    pompiers_secours: "Fire & Rescue",
    sapeurs_pompiers: "Fire Brigade",
    desc_incendie_sos: "Fire, accidents, rescue",
    desc_incendie_pompiers: "Fire, rescue and relief",
    protection_civile: "Civil Protection",
    desc_secours_sos: "Rescue and first aid",
    desc_secours_pompiers: "Emergency rescue and disasters",
    police_secours: "Police Emergency",
    desc_police: "Police emergencies",
    gendarmerie: "Royal Gendarmerie",
    desc_gendarmerie: "Rural and peri-urban areas",
    open_24h: "Open 24/7",
  },
  ar: {
    title_sos: "🚨 طبيب الطوارئ — أرقام الطوارئ في المغرب",
    title_pompiers: "🔥 رجال الإطفاء — أرقام الطوارئ في المغرب",
    subtitle_sos: "اتصل فوراً إذا كنت بحاجة إلى مساعدة طبية",
    subtitle_pompiers: "اتصل فوراً في حالة حريق أو خطر",
    footer_sos: "في حالة الطوارئ الخطيرة، اتصل بـ 150 (SAMU) أو توجه إلى أقرب مستشفى.",
    footer_pompiers: "في حالة الحريق، أخلِ المكان فوراً واتصل بـ 15. لا تحاول إخماد حريق كبير بمفردك.",
    pompiers_secours: "الإطفاء / الإنقاذ",
    sapeurs_pompiers: "فرقة الإطفاء",
    desc_incendie_sos: "الحرائق، الحوادث، الإنقاذ",
    desc_incendie_pompiers: "الحرائق، الإنقاذ والنجدة",
    protection_civile: "الحماية المدنية",
    desc_secours_sos: "الإنقاذ والإسعافات الأولية",
    desc_secours_pompiers: "الإنقاذ الطارئ والكوارث",
    police_secours: "شرطة الطوارئ",
    desc_police: "طوارئ الشرطة",
    gendarmerie: "الدرك الملكي",
    desc_gendarmerie: "المناطق الريفية وشبه الحضرية",
    open_24h: "مفتوح 24/7",
  },
};

const EmergencyNumbers = ({ variant }: EmergencyNumbersProps) => {
  const { language } = useLanguage();
  const L = LABELS[language as keyof typeof LABELS] ?? LABELS.fr;

  const isSos = variant === "sos";
  const accentColor = isSos ? "red" : "orange";
  const title = isSos ? L.title_sos : L.title_pompiers;
  const subtitle = isSos ? L.subtitle_sos : L.subtitle_pompiers;
  const footer = isSos ? L.footer_sos : L.footer_pompiers;

  const numbers = [
    {
      label: isSos ? L.pompiers_secours : L.sapeurs_pompiers,
      desc: isSos ? L.desc_incendie_sos : L.desc_incendie_pompiers,
      number: "150",
      color: "orange",
    },
    {
      label: L.protection_civile,
      desc: isSos ? L.desc_secours_sos : L.desc_secours_pompiers,
      number: "190",
      color: isSos ? "orange" : "red",
    },
    { label: L.police_secours, desc: L.desc_police, number: "19", color: "blue" },
    { label: L.gendarmerie, desc: L.desc_gendarmerie, number: "177", color: "yellow" },
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
