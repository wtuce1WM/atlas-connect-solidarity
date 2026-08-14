import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { IconType } from "react-icons";
import {
  VIDEO_ICON_CATALOG,
  ICON_FAMILY_LABELS,
  searchVideoIcons,
  parseIconKey,
  type CuratedIcon,
  type IconFamily,
} from "@/lib/videoIconCatalog";

/**
 * Picker d'icônes du Storyboard — liste curatée (src/lib/videoIconCatalog.ts).
 * On ne stocke jamais de SVG : uniquement la clé "famille:NomIcone".
 * Accessibilité : aperçu géant au survol ET au clic (mauvaise vue assumée).
 */

const familyCache: Partial<Record<IconFamily, Record<string, IconType>>> = {};

async function loadFamily(family: IconFamily): Promise<Record<string, IconType>> {
  if (familyCache[family]) return familyCache[family]!;
  let mod: any;
  switch (family) {
    case "tb": mod = await import("react-icons/tb"); break;
    case "fa6": mod = await import("react-icons/fa6"); break;
    case "md": mod = await import("react-icons/md"); break;
    case "io5": mod = await import("react-icons/io5"); break;
    case "bs": mod = await import("react-icons/bs"); break;
    case "hi2": mod = await import("react-icons/hi2"); break;
    case "ri": mod = await import("react-icons/ri"); break;
    case "si": mod = await import("react-icons/si"); break;
    default: return {};
  }
  const map: Record<string, IconType> = {};
  for (const [k, v] of Object.entries(mod)) {
    if (typeof v === "function" && /^[A-Z]/.test(k)) map[k] = v as IconType;
  }
  familyCache[family] = map;
  return map;
}

/** Résout une clé "famille:Nom" en composant, avec chargement paresseux du pack. */
export const useIconComponent = (key: string | null | undefined): IconType | null => {
  const [comp, setComp] = useState<IconType | null>(null);
  useEffect(() => {
    let alive = true;
    setComp(null);
    const parsed = key ? parseIconKey(key) : null;
    if (!parsed) return;
    loadFamily(parsed.family).then((map) => {
      if (alive) setComp(map[parsed.name] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return comp;
};

/** Petit rendu d'icône par clé (utilisé dans les listes du back-office). */
export const IconByKey = ({ iconKey, size = 20 }: { iconKey: string | null | undefined; size?: number }) => {
  const Comp = useIconComponent(iconKey);
  if (!Comp) return <span className="inline-block rounded bg-muted" style={{ width: size, height: size }} />;
  return <Comp size={size} />;
};

const IconCell = ({
  icon,
  selected,
  onPick,
  onPreview,
}: {
  icon: CuratedIcon;
  selected: boolean;
  onPick: () => void;
  onPreview: (icon: CuratedIcon | null) => void;
}) => {
  const Comp = useIconComponent(icon.key);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => onPreview(icon)}
      onFocus={() => onPreview(icon)}
      onMouseLeave={() => onPreview(null)}
      title={`${icon.label} — ${icon.key}`}
      className={`flex h-16 flex-col items-center justify-center gap-1 rounded-md border p-1 transition-colors ${
        selected ? "border-primary bg-primary/10" : "hover:bg-muted"
      }`}
    >
      {Comp ? <Comp size={26} /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <span className="w-full truncate text-[10px] leading-tight text-muted-foreground">{icon.label}</span>
    </button>
  );
};

const BigPreview = ({ icon }: { icon: CuratedIcon | null }) => {
  const Comp = useIconComponent(icon?.key);
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/40 p-4 text-center">
      <div className="flex h-[132px] w-[132px] items-center justify-center">
        {icon && Comp ? (
          <Comp size={120} />
        ) : (
          <span className="text-xs text-muted-foreground">Survolez une icône</span>
        )}
      </div>
      {icon && (
        <>
          <span className="text-sm font-semibold">{icon.label}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{icon.key}</span>
          <span className="text-[10px] text-muted-foreground">
            {ICON_FAMILY_LABELS[parseIconKey(icon.key)!.family]}
          </span>
        </>
      )}
    </div>
  );
};

interface Props {
  value?: string | null;
  onChange: (iconKey: string) => void;
  label?: string;
}

const VideoIconPickerDialog = ({ value, onChange, label }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [hovered, setHovered] = useState<CuratedIcon | null>(null);
  const [pinned, setPinned] = useState<CuratedIcon | null>(null);

  const results = useMemo(() => searchVideoIcons(search, category), [search, category]);
  const preview = hovered ?? pinned;

  const pick = (icon: CuratedIcon) => {
    setPinned(icon);
    onChange(icon.key);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 justify-start gap-2 text-xs">
          <IconByKey iconKey={value} size={16} />
          <span className="truncate">{label ?? (value ? value.split(":")[1] : "Choisir une icône")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Icônes du storyboard</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (hammam, golf, taxi, whatsapp…)"
                className="h-8 flex-1 text-xs"
              />
              <span className="text-[11px] text-muted-foreground">{results.length} icônes</span>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  category === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Toutes
              </button>
              {VIDEO_ICON_CATALOG.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    category === cat.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <ScrollArea className="h-[380px] rounded-md border">
              <div className="grid grid-cols-4 gap-1.5 p-2 sm:grid-cols-6">
                {results.map((icon) => (
                  <IconCell
                    key={icon.key}
                    icon={icon}
                    selected={value === icon.key}
                    onPick={() => pick(icon)}
                    onPreview={setHovered}
                  />
                ))}
                {results.length === 0 && (
                  <p className="col-span-4 py-6 text-center text-xs text-muted-foreground sm:col-span-6">
                    Aucune icône trouvée
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="grid content-start gap-2">
            <BigPreview icon={preview} />
            <p className="text-[10px] leading-snug text-muted-foreground">
              Survolez une icône pour l'agrandir (120 px). Cliquez pour la sélectionner.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoIconPickerDialog;
