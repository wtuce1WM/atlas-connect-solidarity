import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, ExternalLink, Tag, LayoutTemplate } from "lucide-react";
import type { CtaUrlItem } from "@/components/affiliate/AffiliateContactEditor";

export const CTA_SELECT_OPTIONS = [
  "Acheter en ligne", "Achetez", "Accréditations", "App Store", "Application",
  "Billetterie", "Boissons", "Carte des soins", "Carte des vins", "Cocktails",
  "Consulter notre offre", "Contactez-moi", "Contactez nous", "Day Pass",
  "En savoir +", "Forfaits", "Google Play", "Hammam", "Hotel", "La carte",
  "Les boissons", "Menu", "Nos services", "Notre offre", "Plus d'informations",
  "Programme", "Réserver en ligne", "Réserver une chambre", "Réserver une table", "Réservez", "Restaurant", "Riad",
  "Séances", "Site web", "Spa", "WhatsApp",
];

const getCtaOptions = (current: string) =>
  current && !CTA_SELECT_OPTIONS.includes(current)
    ? [current, ...CTA_SELECT_OPTIONS]
    : CTA_SELECT_OPTIONS;

interface Props {
  businessName: string;
  ctaUrls: CtaUrlItem[];
  carouselBadge: string;
  poiBusinessStyle: string;
  onFieldChange: (field: string, value: any) => void;
}

const AffiliateCtasEditor = ({ businessName, ctaUrls, carouselBadge, poiBusinessStyle, onFieldChange }: Props) => {
  return (
    <div className="space-y-5">
      {ctaUrls && ctaUrls.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Boutons d'action (CTA) affichés sur la fiche
          </p>
          {ctaUrls.map((item) => (
            <div key={item.urlField} className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <div className="flex items-center gap-1.5 shrink-0" title="Ouvrir en lien externe">
                  <Switch
                    checked={!!item.forceExternal}
                    onCheckedChange={(checked) => onFieldChange(item.externalField, checked)}
                  />
                  <span className="text-[10px] text-muted-foreground">⚡ Externe</span>
                </div>
                <Input
                  value={item.url}
                  onChange={(e) => onFieldChange(item.urlField, e.target.value)}
                  placeholder="https://"
                  className="text-xs flex-1 min-w-[180px]"
                />
                <Select
                  value={item.cta || "__none__"}
                  onValueChange={(v) => onFieldChange(item.ctaField, v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="text-xs h-9 w-[200px] shrink-0">
                    <SelectValue placeholder="🎯 Contenu du CTA" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-background z-50">
                    <SelectItem value="__none__">—</SelectItem>
                    {getCtaOptions(item.cta).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {item.forceExternal && (
                <div className="pl-6">
                  <span className="text-[11px] text-orange-500">⚡ Lien externe activé</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" /> BIENVENUE
          </Label>
          <Select
            value={carouselBadge || "__none__"}
            onValueChange={(v) => onFieldChange("carousel_badge", v === "__none__" ? null : v)}
          >
            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="__none__">Aucun</SelectItem>
              <SelectItem value="nos_offres">Nos offres</SelectItem>
              <SelectItem value="immergez_vous">Immergez-vous</SelectItem>
              <SelectItem value="bienvenue_a">Bienvenue à {businessName}</SelectItem>
              <SelectItem value="bienvenue_au">Bienvenue au {businessName}</SelectItem>
              <SelectItem value="bienvenue_chez">Bienvenue chez {businessName}</SelectItem>
              <SelectItem value="bienvenue">Bienvenue</SelectItem>
              <SelectItem value="bienvenue_a_l">Bienvenue à l'{businessName}</SelectItem>
              <SelectItem value="bienvenue_a_la">Bienvenue à la {businessName}</SelectItem>
              <SelectItem value="bienvenue_aux">Bienvenue aux {businessName}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-primary" /> PROPOSITION
          </Label>
          <Select
            value={poiBusinessStyle || "aucun"}
            onValueChange={(v) => onFieldChange("poi_business_style", v)}
          >
            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="aucun">Aucun</SelectItem>
              <SelectItem value="emmene_a">{businessName || "…"} vous emmène à</SelectItem>
              <SelectItem value="propose">{businessName || "…"} vous propose</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AffiliateCtasEditor;
