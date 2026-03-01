import { useState, useEffect } from "react";
import { Loader2, Download } from "lucide-react";

interface ProxyPdfViewerProps {
  pdfUrl: string;
  title?: string;
  downloadName?: string;
}

const ProxyPdfViewer = ({ pdfUrl, title = "Document PDF", downloadName = "document.pdf" }: ProxyPdfViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPdf = async () => {
      setLoading(true);
      setError(false);
      try {
        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;
        const res = await fetch(proxyUrl, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        if (!res.ok) throw new Error("Fetch failed");
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const blob = new Blob([buffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPdf();
    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Impossible de charger le document</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden border bg-muted">
        <object
          data={blobUrl}
          type="application/pdf"
          className="w-full h-full"
          aria-label={title}
        >
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title={title}
          />
        </object>
      </div>
      <a
        href={blobUrl}
        download={downloadName}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        Télécharger
      </a>
    </div>
  );
};

export default ProxyPdfViewer;
