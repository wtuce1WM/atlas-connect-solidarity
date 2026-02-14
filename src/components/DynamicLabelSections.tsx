import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LabelSection from "./LabelSection";

interface LabelVisibility {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_ar: string | null;
  logo_url: string | null;
  show_on_home: boolean;
  show_on_category: boolean;
  show_on_city: boolean;
  show_on_service: boolean;
  show_on_neighborhood: boolean;
}

type PageType = "home" | "category" | "city" | "service" | "neighborhood";

const PAGE_FIELD_MAP: Record<PageType, string> = {
  home: "show_on_home",
  category: "show_on_category",
  city: "show_on_city",
  service: "show_on_service",
  neighborhood: "show_on_neighborhood",
};

const descriptionMap: Record<string, { fr: string; en: string; ar: string }> = {};

const DynamicLabelSections = ({ pageType, lightMode }: { pageType: PageType; lightMode?: boolean }) => {
  const [labels, setLabels] = useState<LabelVisibility[]>([]);

  useEffect(() => {
    const fetchLabels = async () => {
      const field = PAGE_FIELD_MAP[pageType];
      const { data } = await supabase
        .from("labels" as any)
        .select("id, name_fr, name_en, name_ar, description_fr, description_en, description_ar, logo_url, show_on_home, show_on_category, show_on_city, show_on_service, show_on_neighborhood")
        .eq(field, true)
        .order("sort_order", { ascending: true });

      setLabels((data as unknown as LabelVisibility[]) || []);
    };
    fetchLabels();
  }, [pageType]);

  if (labels.length === 0) return null;

  return (
    <>
      {labels.map((label) => (
        <LabelSection
          key={label.id}
          labelId={label.id}
          titleFr={label.name_fr}
          titleEn={label.name_en || label.name_fr}
          titleAr={label.name_ar || label.name_fr}
          descriptionFr={label.description_fr || `Découvrez les établissements membres du prestigieux réseau ${label.name_fr}`}
          descriptionEn={label.description_en || `Discover establishments that are members of the prestigious ${label.name_en || label.name_fr} network`}
          descriptionAr={label.description_ar || `اكتشف المؤسسات الأعضاء في شبكة ${label.name_ar || label.name_fr} المرموقة`}
          useLogo2
          pageType={pageType}
          lightMode={lightMode}
        />
      ))}
    </>
  );
};

export default DynamicLabelSections;
