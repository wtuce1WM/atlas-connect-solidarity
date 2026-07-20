import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Download, ExternalLink, QrCode, Globe2, Mail } from "lucide-react";
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
          <Globe2 className="h-4 w-4" /> Redirection 301 depuis votre domaine (gratuit, DIY)
        </h3>
        <p className="text-sm text-white/70">
          Vous possédez déjà un nom de domaine (ex : <span className="font-mono">www.votresite.com</span>) ? La méthode la plus simple et la moins coûteuse est de le faire rediriger vers votre site vitrine 1WM via une <strong>redirection HTTP 301 permanente</strong>. Cela se configure chez votre registrar (OVH, Gandi, GoDaddy, Namecheap, IONOS, Cloudflare…) sans intervention de notre part.
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
            Une redirection 301 classique conserve la valeur SEO et transmet votre trafic vers votre page officielle 1WM.
          </p>
        </div>

        <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-white/90">Vrai domaine personnalisé (hébergement sous votre URL)</h5>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/60">Sur demande</span>
          </div>
          <p className="text-xs text-white/70">
            Si vous souhaitez que l'URL affichée dans le navigateur reste <span className="font-mono text-white/90">www.votresite.com</span> tout en servant le site vitrine 1WM, il faut un setup DNS/proxy manuel (reverse proxy + SSL). Ce n'est pas activé par défaut car il a un coût de mise en place et de maintenance.
          </p>
          <a
            href="mailto:contact@oneworldmorocco.com?subject=Demande%20domaine%20personnalis%C3%A9%20-%20affili%C3%A9&body=Bonjour%2C%0A%0AJe%20souhaite%20faire%20servir%20mon%20site%20vitrine%201WM%20sous%20mon%20propre%20domaine.%0A%0ADomaine%20souhait%C3%A9%20%3A%20www................%0A%0ACe%20domaine%20est%20enregistr%C3%A9%20chez%20%3A%20................%0A%0AMerci%20de%20me%20pr%C3%A9ciser%20les%20%C3%A9tapes%20et%20le%20co%C3%BBt%20de%20setup.%0A%0ACordialement"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Mail className="h-3 w-3" /> Demander un devis pour un vrai domaine personnalisé
          </a>
        </div>
      </div>

    </div>
  );
};

export default AffiliateToolsTab;
