import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-center text-sm text-foreground mb-4">
      Tous les paiements effectués dans l'aperçu sont en mode test.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        En savoir plus
      </a>
    </div>
  );
}
