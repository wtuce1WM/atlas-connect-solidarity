import { MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const GeoPromptDialog = ({ open, onOpenChange, onAccept }: Props) => {
  const { language } = useLanguage();

  const t = {
    fr: {
      title: "Affiner par votre position ?",
      desc: "Vous n'avez pas précisé de ville. Activez la géolocalisation pour voir d'abord les résultats près de vous.",
      accept: "Activer la géolocalisation",
      later: "Plus tard",
    },
    en: {
      title: "Refine by your location?",
      desc: "You didn't specify a city. Enable geolocation to see results near you first.",
      accept: "Enable geolocation",
      later: "Later",
    },
    ar: {
      title: "تحسين حسب موقعك؟",
      desc: "لم تحدد مدينة. فعّل تحديد الموقع لرؤية النتائج القريبة منك أولاً.",
      accept: "تفعيل تحديد الموقع",
      later: "لاحقاً",
    },
  }[language === "en" || language === "ar" ? language : "fr"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {t.title}
          </DialogTitle>
          <DialogDescription className="text-center">{t.desc}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => { onAccept(); onOpenChange(false); }}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            {t.accept}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-9 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.later}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeoPromptDialog;
