import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Download, Search } from "lucide-react";

type BusinessLite = {
  id: string;
  name: string;
  slug?: string | null;
  city?: string | null;
};

interface Props {
  businesses: BusinessLite[];
}

const SITE_BASE = "https://oneworldmorocco.com";

function buildUrl(b: BusinessLite) {
  return `${SITE_BASE}/fiche/${b.slug || b.id}`;
}

export default function QRCodeManagement({ businesses }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [size, setSize] = useState(220);
  const [showLabel, setShowLabel] = useState(true);
  const [showUrl, setShowUrl] = useState(false);
  const [perRow, setPerRow] = useState(3);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? businesses.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            (b.city || "").toLowerCase().includes(q) ||
            (b.slug || "").toLowerCase().includes(q),
        )
      : businesses;
    return list.slice(0, 200);
  }, [businesses, query]);

  const selectedItems = useMemo(
    () => businesses.filter((b) => selected[b.id]),
    [businesses, selected],
  );

  const toggle = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const handlePrint = () => {
    if (!printRef.current || selectedItems.length === 0) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR Codes</title>
      <style>
        @page { margin: 12mm; }
        body { font-family: 'Josefin Sans', system-ui, sans-serif; margin: 0; padding: 0; color: #000; }
        .grid { display: grid; grid-template-columns: repeat(${perRow}, 1fr); gap: 18px; }
        .item { break-inside: avoid; page-break-inside: avoid; text-align: center; padding: 12px; border: 1px solid #eee; border-radius: 8px; }
        .item .name { font-weight: 600; margin-top: 10px; font-size: 14px; }
        .item .city { font-size: 12px; color: #666; }
        .item .url { font-size: 10px; color: #888; word-break: break-all; margin-top: 4px; }
        svg { display: block; margin: 0 auto; }
      </style></head><body>${html}<script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  };

  const downloadSvg = (b: BusinessLite) => {
    const node = document.getElementById(`qr-svg-${b.id}`);
    if (!node) return;
    const svg = node.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${b.slug || b.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>QR Codes — Génération & Impression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Rechercher un établissement</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nom, ville, slug…"
                />
              </div>
            </div>
            <div>
              <Label>Taille (px)</Label>
              <Input
                type="number"
                min={80}
                max={600}
                value={size}
                onChange={(e) => setSize(Number(e.target.value) || 220)}
              />
            </div>
            <div>
              <Label>Par ligne (impression)</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={perRow}
                onChange={(e) => setPerRow(Number(e.target.value) || 3)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showLabel}
                onCheckedChange={(v) => setShowLabel(!!v)}
              />
              Afficher le nom
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showUrl}
                onCheckedChange={(v) => setShowUrl(!!v)}
              />
              Afficher l'URL
            </label>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected({})}
                disabled={selectedItems.length === 0}
              >
                Tout désélectionner
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                disabled={selectedItems.length === 0}
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimer ({selectedItems.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((b) => {
          const url = buildUrl(b);
          return (
            <Card
              key={b.id}
              className={`cursor-pointer transition ${selected[b.id] ? "ring-2 ring-primary" : ""}`}
              onClick={() => toggle(b.id)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div
                  id={`qr-svg-${b.id}`}
                  className="bg-white p-2 rounded"
                >
                  <QRCodeSVG value={url} size={size} level="M" />
                </div>
                <div className="font-semibold text-sm">{b.name}</div>
                {b.city && (
                  <div className="text-xs text-muted-foreground">{b.city}</div>
                )}
                <div className="text-[10px] text-muted-foreground break-all">
                  {url}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={!!selected[b.id]}
                    onCheckedChange={() => toggle(b.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSvg(b);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> SVG
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            Aucun établissement trouvé.
          </div>
        )}
      </div>

      {/* Hidden print template */}
      <div ref={printRef} className="hidden">
        <div className="grid">
          {selectedItems.map((b) => {
            const url = buildUrl(b);
            return (
              <div key={b.id} className="item">
                <QRCodeSVG value={url} size={size} level="M" />
                {showLabel && <div className="name">{b.name}</div>}
                {showLabel && b.city && <div className="city">{b.city}</div>}
                {showUrl && <div className="url">{url}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
