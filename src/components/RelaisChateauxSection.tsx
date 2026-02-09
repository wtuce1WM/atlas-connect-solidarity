import LabelSection from "./LabelSection";
import relaisLogo from "@/assets/relais-chateaux-logo.png";
import symboleMaroc from "@/assets/symbole-maroc-2.webp";

const RELAIS_CHATEAUX_LABEL_ID = "4be8e4aa-99fb-4502-a531-7eec608efe5a";

const RelaisChateauxSection = () => (
  <LabelSection
    labelId={RELAIS_CHATEAUX_LABEL_ID}
    logoSrc={relaisLogo}
    logoAlt="Relais & Châteaux"
    title={{
      fr: "Établissements Relais & Châteaux",
      en: "Relais & Châteaux Establishments",
      ar: "مؤسسات Relais & Châteaux",
    }}
    subtitle={{
      fr: "Découvrez les adresses d'exception au Maroc, membres du prestigieux réseau Relais & Châteaux",
      en: "Discover exceptional addresses in Morocco, members of the prestigious Relais & Châteaux network",
      ar: "اكتشف العناوين الاستثنائية في المغرب، أعضاء شبكة Relais & Châteaux المرموقة",
    }}
    highlightedText="Relais & Châteaux"
    backgroundEmblem={symboleMaroc}
  />
);

export default RelaisChateauxSection;
