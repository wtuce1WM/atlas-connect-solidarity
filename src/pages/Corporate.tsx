import { useSEO } from "@/hooks/useSEO";

const Corporate = () => {
  useSEO({
    title: "One World Morocco — Plateforme Éthique de E-Commerce",
    description:
      "One World Morocco — Première Plateforme Éthique de E-Commerce du Maroc vers le reste du Monde. 0 commission, abonnement mensuel, 20% reversés à des causes humanitaires.",
    canonical: "/corporate",
  });

  return (
    <iframe
      src="/corporate.html"
      title="One World Morocco — Corporate"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
};

export default Corporate;
