import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download, ExternalLink, QrCode, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Props {
  slug: string | null;
  businessName: string;
}

const SITE = "https://oneworldmorocco.com";

const AffiliateToolsTab = ({ slug, businessName }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!slug) {
    return (
      <div className="text-sm text-white/70">
        Enregistrez d'abord un slug (onglet Texte) pour générer les liens et le QR code.
      </div>
    );
  }

  const publicUrl = `${SITE}/${slug}`;
  const shortUrl = `${SITE}/b/${slug}`;

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
      toast({ title: "Lien copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  };

  const downloadSvg = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr-${slug}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
    };
    img.src = url;
  };

  const renderUrlRow = (label: string, url: string, key: string) => (
    <div className="space-y-1.5">
      <Label className="text-white/80">{label}</Label>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2 font-mono"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => copy(url, key)} className="shrink-0 text-white border-white/20 hover:bg-white/10 hover:text-white">
          {copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="outline" size="sm" asChild className="shrink-0 text-white border-white/20 hover:bg-white/10 hover:text-white">
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Liens de partage
        </h3>
        {renderUrlRow("URL publique (fiche)", publicUrl, "public")}
        {renderUrlRow("CARTE DE VISITE DIGITALE", shortUrl, "short")}
      </div>

      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <QrCode className="h-4 w-4" /> QR Code
        </h3>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div ref={qrRef} className="bg-white p-3 rounded-lg shrink-0">
            <QRCodeSVG value={publicUrl} size={200} level="M" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/70 max-w-md">
              QR code pointant vers la fiche publique de <span className="font-semibold text-white">{businessName}</span>.
              Idéal pour vos supports imprimés (menu, vitrine, carte de visite).
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" size="sm" onClick={downloadPng}>
                <Download className="h-4 w-4 mr-1" /> Télécharger PNG
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={downloadSvg} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
                <Download className="h-4 w-4 mr-1" /> Télécharger SVG
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Globe2 className="h-4 w-4" /> Rediriger votre domaine vers cette page
        </h3>
        <p className="text-sm text-white/70">
          Vous possédez un nom de domaine (ex : <span className="font-mono">www.votresite.com</span>) et souhaitez
          qu'il affiche votre fiche One World Morocco ? Configurez une <strong>redirection HTTP 301</strong> chez
          votre registrar (OVH, Gandi, GoDaddy, Namecheap, IONOS, Cloudflare…) vers :
        </p>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={publicUrl}
            className="flex-1 rounded-md bg-white/10 border border-white/20 text-white text-sm px-3 py-2 font-mono"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => copy(publicUrl, "redirect")} className="shrink-0 text-white border-white/20 hover:bg-white/10 hover:text-white">
            {copied === "redirect" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="rounded-md bg-white/5 border border-white/10 p-3 text-xs text-white/70 space-y-2">
          <p className="font-semibold text-white/90">Étapes types chez votre registrar :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Connectez-vous à l'espace client de votre registrar.</li>
            <li>Cherchez la section « Redirection », « Web Forwarding » ou « URL Redirect ».</li>
            <li>Créez une redirection <strong>301 (permanente)</strong> depuis <span className="font-mono">votresite.com</span> et <span className="font-mono">www.votresite.com</span> vers l'URL ci-dessus.</li>
            <li>Enregistrez. La propagation DNS peut prendre jusqu'à quelques heures.</li>
          </ol>
          <p className="text-white/60">
            ⚠️ Évitez le « URL masking » ou « frame forwarding » : incompatible avec notre site et pénalisant pour le SEO.
            Une redirection 301 classique conserve toute la valeur SEO et transmet votre trafic vers votre fiche officielle.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AffiliateToolsTab;
