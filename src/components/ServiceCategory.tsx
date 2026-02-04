import { LucideIcon } from "lucide-react";

interface ServiceCategoryProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  color: "terracotta" | "majorelle" | "atlas" | "gold";
  providersLabel?: string;
}

const colorClasses = {
  terracotta: "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground",
  majorelle: "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary hover:text-secondary-foreground",
  atlas: "bg-atlas/10 text-atlas border-atlas/20 hover:bg-atlas hover:text-atlas-foreground",
  gold: "bg-gold/10 text-gold border-gold/20 hover:bg-gold hover:text-gold-foreground",
};

const iconColorClasses = {
  terracotta: "bg-primary text-primary-foreground",
  majorelle: "bg-secondary text-secondary-foreground",
  atlas: "bg-atlas text-atlas-foreground",
  gold: "bg-gold text-gold-foreground",
};

const ServiceCategory = ({ icon: Icon, title, description, count, color, providersLabel = "providers" }: ServiceCategoryProps) => {
  return (
    <div
      className={`group min-w-[280px] cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl ${colorClasses[color]}`}
    >
      <div className={`mb-4 inline-flex rounded-xl p-3 ${iconColorClasses[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-3 text-sm opacity-80">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{count} {providersLabel}</span>
        <svg
          className="h-5 w-5 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </div>
    </div>
  );
};

export default ServiceCategory;
