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
import ServiceCategory from "./ServiceCategory";

const services = [
  {
    icon: Hammer,
    title: "Construction",
    description: "Builders, masons, and construction workers",
    count: 245,
    color: "terracotta" as const,
  },
  {
    icon: Heart,
    title: "Healthcare",
    description: "Nurses, caregivers, and health aides",
    count: 189,
    color: "majorelle" as const,
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "Tutors, teachers, and mentors",
    count: 312,
    color: "atlas" as const,
  },
  {
    icon: Palette,
    title: "Artisans",
    description: "Traditional crafts and handmade goods",
    count: 423,
    color: "gold" as const,
  },
  {
    icon: Wrench,
    title: "Repairs",
    description: "Plumbing, electrical, and appliances",
    count: 156,
    color: "terracotta" as const,
  },
  {
    icon: Truck,
    title: "Transport",
    description: "Delivery and moving services",
    count: 98,
    color: "majorelle" as const,
  },
  {
    icon: Leaf,
    title: "Agriculture",
    description: "Farming and garden services",
    count: 134,
    color: "atlas" as const,
  },
  {
    icon: ChefHat,
    title: "Catering",
    description: "Cooks and food preparation",
    count: 201,
    color: "gold" as const,
  },
  {
    icon: Camera,
    title: "Photography",
    description: "Events and portrait photography",
    count: 87,
    color: "terracotta" as const,
  },
  {
    icon: Scissors,
    title: "Beauty",
    description: "Hair, makeup, and wellness",
    count: 276,
    color: "majorelle" as const,
  },
  {
    icon: Home,
    title: "Cleaning",
    description: "Home and office cleaning",
    count: 342,
    color: "atlas" as const,
  },
  {
    icon: Briefcase,
    title: "Business",
    description: "Admin and office support",
    count: 118,
    color: "gold" as const,
  },
];

const ServicesSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
            Explore <span className="text-primary">Services</span> & <span className="text-secondary">Jobs</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Browse through categories to find skilled professionals or discover
            opportunities to share your talents with your community.
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
              <ServiceCategory key={service.title} {...service} />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: "2,500+", label: "Service Providers", color: "text-primary" },
            { value: "150+", label: "Cities Covered", color: "text-secondary" },
            { value: "50K+", label: "Jobs Completed", color: "text-atlas" },
            { value: "98%", label: "Satisfaction Rate", color: "text-gold" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-4xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="mt-1 text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
