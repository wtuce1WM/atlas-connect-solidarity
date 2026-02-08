import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Hotel,
  Utensils,
  Car,
  Hammer,
  ShoppingBag,
  Briefcase,
  Compass,
  Wheat,
  Factory,
  GraduationCap,
  HeartPulse,
  Dumbbell,
  Sparkles,
  Palette,
  Laptop,
  Plane,
  Ship,
  Train,
  Bus,
  Bike,
  Home,
  Building,
  Building2,
  Store,
  Coffee,
  Wine,
  UtensilsCrossed,
  ChefHat,
  Bed,
  Bath,
  Sofa,
  Lamp,
  Armchair,
  TreePine,
  Mountain,
  Waves,
  Sun,
  Moon,
  Star,
  Heart,
  Music,
  Camera,
  Film,
  Mic,
  Headphones,
  Gamepad2,
  Trophy,
  Medal,
  Target,
  Gem,
  Crown,
  Gift,
  ShoppingCart,
  CreditCard,
  Wallet,
  Banknote,
  PiggyBank,
  Landmark,
  Scale,
  Gavel,
  FileText,
  BookOpen,
  Library,
  Newspaper,
  Megaphone,
  Users,
  UserCheck,
  Baby,
  Dog,
  Cat,
  Flower2,
  Leaf,
  Apple,
  Carrot,
  Fish,
  Beef,
  Egg,
  Milk,
  Cookie,
  Cake,
  IceCream,
  Pizza,
  Sandwich,
  Salad,
  Soup,
  Pill,
  Stethoscope,
  Syringe,
  Thermometer,
  Activity,
  Scissors,
  Paintbrush,
  Wrench,
  Settings,
  Cog,
  Zap,
  Flame,
  Droplets,
  Wind,
  Snowflake,
  Umbrella,
  MapPin,
  Map,
  Globe,
  Navigation,
  Signpost,
  Milestone,
  Flag,
  Tent,
  Binoculars,
  type LucideIcon
} from "lucide-react";

// Map of icon names to components
const ICONS: Record<string, LucideIcon> = {
  Hotel,
  Utensils,
  Car,
  Hammer,
  ShoppingBag,
  Briefcase,
  Compass,
  Wheat,
  Factory,
  GraduationCap,
  HeartPulse,
  Dumbbell,
  Sparkles,
  Palette,
  Laptop,
  Plane,
  Ship,
  Train,
  Bus,
  Bike,
  Home,
  Building,
  Building2,
  Store,
  Coffee,
  Wine,
  UtensilsCrossed,
  ChefHat,
  Bed,
  Bath,
  Sofa,
  Lamp,
  Armchair,
  TreePine,
  Mountain,
  Waves,
  Sun,
  Moon,
  Star,
  Heart,
  Music,
  Camera,
  Film,
  Mic,
  Headphones,
  Gamepad2,
  Trophy,
  Medal,
  Target,
  Gem,
  Crown,
  Gift,
  ShoppingCart,
  CreditCard,
  Wallet,
  Banknote,
  PiggyBank,
  Landmark,
  Scale,
  Gavel,
  FileText,
  BookOpen,
  Library,
  Newspaper,
  Megaphone,
  Users,
  UserCheck,
  Baby,
  Dog,
  Cat,
  Flower2,
  Leaf,
  Apple,
  Carrot,
  Fish,
  Beef,
  Egg,
  Milk,
  Cookie,
  Cake,
  IceCream,
  Pizza,
  Sandwich,
  Salad,
  Soup,
  Pill,
  Stethoscope,
  Syringe,
  Thermometer,
  Activity,
  Scissors,
  Paintbrush,
  Wrench,
  Settings,
  Cog,
  Zap,
  Flame,
  Droplets,
  Wind,
  Snowflake,
  Umbrella,
  MapPin,
  Map,
  Globe,
  Navigation,
  Signpost,
  Milestone,
  Flag,
  Tent,
  Binoculars,
};

// Export ICONS map for use in other components
export { ICONS };

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const iconNames = Object.keys(ICONS);
  const filteredIcons = search
    ? iconNames.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : iconNames;

  const SelectedIcon = value && ICONS[value] ? ICONS[value] : null;

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10"
          type="button"
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4" />
              <span>{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Choisir une icône...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            {filteredIcons.map((iconName) => {
              const IconComponent = ICONS[iconName];
              const isSelected = value === iconName;
              return (
                <Button
                  key={iconName}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => handleSelect(iconName)}
                  title={iconName}
                  type="button"
                >
                  <IconComponent className="h-5 w-5" />
                </Button>
              );
            })}
            {filteredIcons.length === 0 && (
              <p className="col-span-6 text-center text-sm text-muted-foreground py-4">
                Aucune icône trouvée
              </p>
            )}
          </div>
        </ScrollArea>
        {value && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleClear}
              type="button"
            >
              Supprimer l'icône
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
