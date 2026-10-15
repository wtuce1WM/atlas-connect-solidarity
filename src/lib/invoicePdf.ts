import { jsPDF } from "jspdf";
import logoAsset from "@/assets/owm-invoice-logo.png.asset.json";

export const OWM_LEGAL = [
  "One World Morocco SAS",
  "84 bd Mohammed Zerktouni",
  "N°18 Résidence Alice 1er étage",
  "Gueliz",
  "40000 Marrakech",
  "info@oneworldmorocco.com",
  "RCS n°185205",
  "ICE : 003939548000076",
];

export type PdfInvoice = {
  number: string | null; created_at: string; status: string; paid_at: string | null;
  currency: string; total_ht: number; total_vat: number; total_ttc: number;
};
export type PdfItem = { label: string; quantity: number; unit_price_ht: number; vat_rate: number; vat_exempt: boolean; line_total_ttc: number };

let logoData: Promise<string> | null = null;
const loadLogo = () =>
  (logoData ??= fetch(logoAsset.url).then((r) => r.blob()).then(
    (b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); }),
  ));

const n = (v: number, c: string) => `${Number(v ?? 0).toFixed(2)} ${c}`;
const d = (s: string) => new Date(s).toLocaleDateString("fr-FR");

export async function buildInvoicePdf(inv: PdfInvoice, items: PdfItem[], client: { name: string; email?: string | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  try { doc.addImage(await loadLogo(), "PNG", 15, 12, 24, 24); } catch { /* logo indisponible */ }
  doc.setFontSize(9); doc.setTextColor(60);
  OWM_LEGAL.forEach((l, i) => doc.text(l, 15, 44 + i * 4.5));

  doc.setTextColor(20); doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text("FACTURE", 195, 22, { align: "right" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`N° ${inv.number ?? "—"}`, 195, 29, { align: "right" });
  doc.text(`Date : ${d(inv.created_at)}`, 195, 34, { align: "right" });
  if (inv.status === "paid") doc.text(`Payée le ${inv.paid_at ? d(inv.paid_at) : "—"}`, 195, 39, { align: "right" });

  doc.setFont("helvetica", "bold"); doc.text("Facturé à", 120, 52);
  doc.setFont("helvetica", "normal"); doc.text(client.name, 120, 58);
  if (client.email) doc.text(client.email, 120, 63);

  let y = 90;
  doc.setFillColor(193, 97, 60); doc.rect(15, y - 6, 180, 9, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold");
  doc.text("Désignation", 18, y); doc.text("Qté", 115, y, { align: "right" });
  doc.text("PU HT", 140, y, { align: "right" }); doc.text("TVA", 160, y, { align: "right" });
  doc.text("Total TTC", 192, y, { align: "right" });
  doc.setTextColor(20); doc.setFont("helvetica", "normal");
  y += 9;
  for (const it of items) {
    const lines = doc.splitTextToSize(it.label, 85) as string[];
    doc.text(lines, 18, y);
    doc.text(String(it.quantity), 115, y, { align: "right" });
    doc.text(Number(it.unit_price_ht).toFixed(2), 140, y, { align: "right" });
    doc.text(it.vat_exempt ? "Exo." : `${it.vat_rate}%`, 160, y, { align: "right" });
    doc.text(n(it.line_total_ttc, inv.currency), 192, y, { align: "right" });
    y += lines.length * 5 + 3;
    doc.setDrawColor(220); doc.line(15, y - 3, 195, y - 3);
    if (y > 250) { doc.addPage(); y = 20; }
  }
  y += 5;
  doc.text(`Total HT : ${n(inv.total_ht, inv.currency)}`, 192, y, { align: "right" });
  doc.text(`TVA : ${n(inv.total_vat, inv.currency)}`, 192, y + 6, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(`Total TTC : ${n(inv.total_ttc, inv.currency)}`, 192, y + 14, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
  doc.text("One World Morocco SAS · 84 bd Mohammed Zerktouni, N°18 Résidence Alice 1er étage, Gueliz, 40000 Marrakech", 105, 284, { align: "center" });
  doc.text("RCS n°185205 · ICE : 003939548000076 · info@oneworldmorocco.com", 105, 288, { align: "center" });
  return doc;
}
