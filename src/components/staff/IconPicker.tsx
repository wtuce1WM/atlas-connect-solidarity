import { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { IconType } from "react-icons";

// ── Lucide curated set (kept for backward compat) ──
import {
  Hotel, Utensils, Car, Hammer, ShoppingBag, Briefcase, Compass, Wheat,
  Factory, GraduationCap, HeartPulse, Dumbbell, Sparkles, Palette, Laptop,
  Plane, Ship, Train, Bus, Bike, Home, Building, Building2, Store, Coffee,
  Wine, UtensilsCrossed, ChefHat, Bed, Bath, Sofa, Lamp, Armchair, TreePine,
  Mountain, Waves, Sun, Moon, Star, Heart, Music, Camera, Film, Mic,
  Headphones, Gamepad2, Trophy, Medal, Target, Gem, Crown, Gift,
  ShoppingCart, CreditCard, Wallet, Banknote, PiggyBank, Landmark, Scale,
  Gavel, FileText, BookOpen, Library, Newspaper, Megaphone, Users, UserCheck,
  Baby, Dog, Cat, Flower2, Leaf, Apple, Carrot, Fish, Beef, Egg, Milk,
  Cookie, Cake, IceCream, Pizza, Sandwich, Salad, Soup, Pill, Stethoscope,
  Syringe, Thermometer, Activity, Scissors, Paintbrush, Wrench, Settings,
  Cog, Zap, Flame, Droplets, Wind, Snowflake, Umbrella, MapPin, Map, Globe,
  Navigation, Signpost, Milestone, Flag, Tent, Binoculars,
  type LucideIcon,
} from "lucide-react";

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  Hotel, Utensils, Car, Hammer, ShoppingBag, Briefcase, Compass, Wheat,
  Factory, GraduationCap, HeartPulse, Dumbbell, Sparkles, Palette, Laptop,
  Plane, Ship, Train, Bus, Bike, Home, Building, Building2, Store, Coffee,
  Wine, UtensilsCrossed, ChefHat, Bed, Bath, Sofa, Lamp, Armchair, TreePine,
  Mountain, Waves, Sun, Moon, Star, Heart, Music, Camera, Film, Mic,
  Headphones, Gamepad2, Trophy, Medal, Target, Gem, Crown, Gift,
  ShoppingCart, CreditCard, Wallet, Banknote, PiggyBank, Landmark, Scale,
  Gavel, FileText, BookOpen, Library, Newspaper, Megaphone, Users, UserCheck,
  Baby, Dog, Cat, Flower2, Leaf, Apple, Carrot, Fish, Beef, Egg, Milk,
  Cookie, Cake, IceCream, Pizza, Sandwich, Salad, Soup, Pill, Stethoscope,
  Syringe, Thermometer, Activity, Scissors, Paintbrush, Wrench, Settings,
  Cog, Zap, Flame, Droplets, Wind, Snowflake, Umbrella, MapPin, Map, Globe,
  Navigation, Signpost, Milestone, Flag, Tent, Binoculars,
};

// Export for backward compat
export const ICONS = LUCIDE_ICONS;

// ── React Icons lazy loaders ──
type IconPack = Record<string, IconType>;
const packCache: Record<string, IconPack> = {};

async function loadPack(packId: string): Promise<IconPack> {
  if (packCache[packId]) return packCache[packId];
  let mod: any;
  switch (packId) {
    case "fa6": mod = await import("react-icons/fa6"); break;
    case "md":  mod = await import("react-icons/md"); break;
    case "hi2": mod = await import("react-icons/hi2"); break;
    case "bs":  mod = await import("react-icons/bs"); break;
    case "ri":  mod = await import("react-icons/ri"); break;
    case "tb":  mod = await import("react-icons/tb"); break;
    case "gi":  mod = await import("react-icons/gi"); break;
    default: return {};
  }
  const icons: IconPack = {};
  for (const [k, v] of Object.entries(mod)) {
    if (typeof v === "function" && /^[A-Z]/.test(k)) icons[k] = v as IconType;
  }
  packCache[packId] = icons;
  return icons;
}

const PACKS = [
  { id: "lucide", label: "Lucide" },
  { id: "fa6", label: "Font Awesome" },
  { id: "md", label: "Material" },
  { id: "hi2", label: "Heroicons" },
  { id: "bs", label: "Bootstrap" },
  { id: "ri", label: "Remix" },
  { id: "tb", label: "Tabler" },
  { id: "gi", label: "Game Icons" },
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

function parseIconValue(val: string) {
  if (!val) return { pack: "lucide", name: "" };
  const idx = val.indexOf(":");
  if (idx > 0) return { pack: val.slice(0, idx), name: val.slice(idx + 1) };
  return { pack: "lucide", name: val };
}

const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(() => parseIconValue(value).pack);
  const [reactIcons, setReactIcons] = useState<IconPack>({});
  const [loadingPack, setLoadingPack] = useState(false);

  // Load react-icons pack when tab changes
  useEffect(() => {
    if (activeTab === "lucide") return;
    setLoadingPack(true);
    loadPack(activeTab).then((icons) => {
      setReactIcons(icons);
      setLoadingPack(false);
    });
  }, [activeTab]);

  // Filtered icon names
  const filteredLucide = useMemo(() => {
    const names = Object.keys(LUCIDE_ICONS);
    return search ? names.filter(n => n.toLowerCase().includes(search.toLowerCase())) : names;
  }, [search]);

  const filteredReactIcons = useMemo(() => {
    const names = Object.keys(reactIcons);
    if (!search) return names.slice(0, 500);
    return names.filter(n => n.toLowerCase().includes(search.toLowerCase())).slice(0, 500);
  }, [search, reactIcons]);

  // Resolve current icon for display
  const { pack: currentPack, name: currentName } = parseIconValue(value);
  const [previewIcon, setPreviewIcon] = useState<{ component: any; name: string } | null>(null);

  useEffect(() => {
    if (!value) { setPreviewIcon(null); return; }
    if (currentPack === "lucide") {
      const Icon = LUCIDE_ICONS[currentName];
      if (Icon) setPreviewIcon({ component: Icon, name: currentName });
    } else {
      loadPack(currentPack).then(icons => {
        const Icon = icons[currentName];
        if (Icon) setPreviewIcon({ component: Icon, name: currentName });
      });
    }
  }, [value, currentPack, currentName]);

  const handleSelect = (iconName: string) => {
    const stored = activeTab === "lucide" ? iconName : `${activeTab}:${iconName}`;
    onChange(stored);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const renderIconGrid = (isLucide: boolean) => {
    const icons = isLucide ? filteredLucide : filteredReactIcons;
    const packId = isLucide ? "lucide" : activeTab;

    if (loadingPack && !isLucide) {
      return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
    }

    return (
      <ScrollArea className="h-80">
        <div className="grid grid-cols-6 gap-1.5 p-3 sm:grid-cols-8">
          {icons.map((iconName) => {
            const IconComp = isLucide ? LUCIDE_ICONS[iconName] : reactIcons[iconName];
            if (!IconComp) return null;
            const isSelected = currentPack === packId && currentName === iconName;
            return (
              <Button
                key={iconName}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className="h-11 w-11 p-0"
                onClick={() => handleSelect(iconName)}
                title={iconName}
                type="button"
              >
                {isLucide ? (
                  <IconComp className="h-5 w-5" />
                ) : (
                  <IconComp size={20} />
                )}
              </Button>
            );
          })}
          {icons.length === 0 && (
            <p className="col-span-6 sm:col-span-8 text-center text-sm text-muted-foreground py-4">Aucune icône trouvée</p>
          )}
          {!isLucide && icons.length >= 500 && !search && (
            <p className="col-span-6 sm:col-span-8 text-center text-xs text-muted-foreground py-2">Utilisez la recherche pour trouver plus d'icônes…</p>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 h-10" type="button">
          {previewIcon ? (
            <>
              <previewIcon.component className="h-4 w-4" size={16} />
              <span className="truncate text-xs">{previewIcon.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Choisir une icône...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-[480px] p-0 sm:w-[480px]" align="start" collisionPadding={12}>
        <div className="p-2 border-b">
          <Input
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        {/* Simple button-based tabs instead of Radix Tabs */}
        <div className="border-b px-2 py-1.5 flex flex-wrap gap-1">
          {PACKS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveTab(p.id)}
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === p.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {renderIconGrid(activeTab === "lucide")}

        {value && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleClear} type="button">
              Supprimer l'icône
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
