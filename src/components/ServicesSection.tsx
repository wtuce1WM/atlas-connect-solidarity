import { useRef } from "react";
import {
  Hammer,
  Heart,
  GraduationCap,
  Truck,
  Palette,
  Wrench,
  Leaf,
  ChefHat,
  Camera,
  Scissors,
  Home,
  Briefcase,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ServiceCategory from "./ServiceCategory";

const ServicesSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const services = [
    {
      icon: Hammer,
      titleKey: "category.construction",
      descKey: "category.construction.desc",
      count: 245,
      color: "terracotta" as const,
    },
    {
      icon: Heart,
      titleKey: "category.healthcare",
      descKey: "category.healthcare.desc",
      count: 189,
      color: "majorelle" as const,
    },
    {
      icon: GraduationCap,
      titleKey: "category.education",
      descKey: "category.education.desc",
      count: 312,
      color: "atlas" as const,
    },
    {
      icon: Palette,
      titleKey: "category.artisans",
      descKey: "category.artisans.desc",
      count: 423,
      color: "gold" as const,
    },
    {
      icon: Wrench,
      titleKey: "category.repairs",
      descKey: "category.repairs.desc",
      count: 156,
      color: "terracotta" as const,
    },
    {
      icon: Truck,
      titleKey: "category.transport",
      descKey: "category.transport.desc",
      count: 98,
      color: "majorelle" as const,
    },
    {
      icon: Leaf,
      titleKey: "category.agriculture",
      descKey: "category.agriculture.desc",
      count: 134,
      color: "atlas" as const,
    },
    {
      icon: ChefHat,
      titleKey: "category.catering",
      descKey: "category.catering.desc",
      count: 201,
      color: "gold" as const,
    },
    {
      icon: Camera,
      titleKey: "category.photography",
      descKey: "category.photography.desc",
      count: 87,
      color: "terracotta" as const,
    },
    {
      icon: Scissors,
      titleKey: "category.beauty",
      descKey: "category.beauty.desc",
      count: 276,
      color: "majorelle" as const,
    },
    {
      icon: Home,
      titleKey: "category.cleaning",
      descKey: "category.cleaning.desc",
      count: 342,
      color: "atlas" as const,
    },
    {
      icon: Briefcase,
      titleKey: "category.business",
      descKey: "category.business.desc",
      count: 118,
      color: "gold" as const,
    },
  ];

  const stats = [
    { value: "2,500+", labelKey: "stats.providers", color: "text-primary" },
    { value: "150+", labelKey: "stats.cities", color: "text-secondary" },
    { value: "50K+", labelKey: "stats.jobs", color: "text-atlas" },
    { value: "98%", labelKey: "stats.satisfaction", color: "text-gold" },
  ];

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">
            {t("services.title")} <span className="text-primary">{t("services.titleServices")}</span> {t("services.titleAnd")} <span className="text-secondary">{t("services.titleJobs")}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("services.description")}
          </p>
        </div>

        {/* Scrollable Categories */}
        <div className="relative">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card p-3 shadow-lg transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="scrollbar-hide flex gap-6 overflow-x-auto scroll-smooth pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {services.map((service) => (
              <ServiceCategory
                key={service.titleKey}
                icon={service.icon}
                title={t(service.titleKey)}
                description={t(service.descKey)}
                count={service.count}
                color={service.color}
                providersLabel={t("services.providers")}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <div className={`text-4xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="mt-1 text-muted-foreground">{t(stat.labelKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
