import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    "nav.services": "Services",
    "nav.jobs": "Jobs",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.signIn": "Sign In",
    "nav.joinNow": "Join Now",
    
    // Hero
    "hero.title": "ONE WORLD",
    "hero.titleSuffix": "Morocco",
    "hero.subtitle": "Connecting communities through work & services",
    "hero.searchPlaceholder": "Search for jobs, services, or skills...",
    "hero.searchButton": "Search",
    "hero.scrollText": "Explore Services",
    "hero.tags.artisans": "Artisans",
    "hero.tags.homeServices": "Home Services",
    "hero.tags.teaching": "Teaching",
    "hero.tags.healthcare": "Healthcare",
    "hero.tags.construction": "Construction",
    
    // Services Section
    "services.title": "Explore",
    "services.titleServices": "Services",
    "services.titleAnd": "&",
    "services.titleJobs": "Jobs",
    "services.description": "Browse through categories to find skilled professionals or discover opportunities to share your talents with your community.",
    "services.providers": "providers",
    
    // Service Categories
    "category.construction": "Construction",
    "category.construction.desc": "Builders, masons, and construction workers",
    "category.healthcare": "Healthcare",
    "category.healthcare.desc": "Nurses, caregivers, and health aides",
    "category.education": "Education",
    "category.education.desc": "Tutors, teachers, and mentors",
    "category.artisans": "Artisans",
    "category.artisans.desc": "Traditional crafts and handmade goods",
    "category.repairs": "Repairs",
    "category.repairs.desc": "Plumbing, electrical, and appliances",
    "category.transport": "Transport",
    "category.transport.desc": "Delivery and moving services",
    "category.agriculture": "Agriculture",
    "category.agriculture.desc": "Farming and garden services",
    "category.catering": "Catering",
    "category.catering.desc": "Cooks and food preparation",
    "category.photography": "Photography",
    "category.photography.desc": "Events and portrait photography",
    "category.beauty": "Beauty",
    "category.beauty.desc": "Hair, makeup, and wellness",
    "category.cleaning": "Cleaning",
    "category.cleaning.desc": "Home and office cleaning",
    "category.business": "Business",
    "category.business.desc": "Admin and office support",
    
    // Stats
    "stats.providers": "Service Providers",
    "stats.cities": "Cities Covered",
    "stats.jobs": "Jobs Completed",
    "stats.satisfaction": "Satisfaction Rate",
    
    // Footer
     // Hotel Search
     "hotel.title": "Find",
     "hotel.titleHighlight": "Hotel Booking Links",
     "hotel.description": "Search for any hotel to find booking links across multiple platforms including Booking.com, Expedia, Hotels.com, and more.",
     "hotel.namePlaceholder": "Hotel name (e.g., Four Seasons Marrakech)",
     "hotel.locationPlaceholder": "Location (optional)",
     "hotel.searchButton": "Search Hotels",
     "hotel.error": "Error",
     "hotel.nameRequired": "Please enter a hotel name",
     "hotel.searchFailed": "Failed to search for hotel. Please try again.",
     "hotel.foundOn": "Found on",
     "hotel.platforms": "platforms",
     "hotel.noResults": "No booking links found for this hotel. Try a more specific name or check the spelling.",
 
     // Footer
    "footer.description": "Empowering Moroccan communities through accessible work opportunities and trusted services.",
    "footer.services": "Services",
    "footer.findServices": "Find Services",
    "footer.postJob": "Post a Job",
    "footer.becomeProvider": "Become a Provider",
    "footer.businessSolutions": "Business Solutions",
    "footer.company": "Company",
    "footer.aboutUs": "About Us",
    "footer.ourMission": "Our Mission",
    "footer.careers": "Careers",
    "footer.press": "Press",
    "footer.contact": "Contact",
    "footer.location": "Casablanca, Morocco",
    "footer.rights": "All rights reserved.",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.cookies": "Cookie Policy",
  },
  fr: {
    // Header
    "nav.services": "Services",
    "nav.jobs": "Emplois",
    "nav.about": "À propos",
    "nav.contact": "Contact",
    "nav.signIn": "Connexion",
    "nav.joinNow": "Rejoindre",
    
    // Hero
    "hero.title": "ONE WORLD",
    "hero.titleSuffix": "Maroc",
    "hero.subtitle": "Connecter les communautés par le travail et les services",
    "hero.searchPlaceholder": "Rechercher des emplois, services ou compétences...",
    "hero.searchButton": "Rechercher",
    "hero.scrollText": "Explorer les services",
    "hero.tags.artisans": "Artisans",
    "hero.tags.homeServices": "Services à domicile",
    "hero.tags.teaching": "Enseignement",
    "hero.tags.healthcare": "Santé",
    "hero.tags.construction": "Construction",
    
    // Services Section
    "services.title": "Explorez",
    "services.titleServices": "Services",
    "services.titleAnd": "&",
    "services.titleJobs": "Emplois",
    "services.description": "Parcourez les catégories pour trouver des professionnels qualifiés ou découvrez des opportunités pour partager vos talents avec votre communauté.",
    "services.providers": "prestataires",
    
    // Service Categories
    "category.construction": "Construction",
    "category.construction.desc": "Maçons, ouvriers et constructeurs",
    "category.healthcare": "Santé",
    "category.healthcare.desc": "Infirmiers, aides-soignants et auxiliaires",
    "category.education": "Éducation",
    "category.education.desc": "Tuteurs, enseignants et mentors",
    "category.artisans": "Artisans",
    "category.artisans.desc": "Artisanat traditionnel et produits faits main",
    "category.repairs": "Réparations",
    "category.repairs.desc": "Plomberie, électricité et appareils",
    "category.transport": "Transport",
    "category.transport.desc": "Livraison et déménagement",
    "category.agriculture": "Agriculture",
    "category.agriculture.desc": "Services agricoles et jardinage",
    "category.catering": "Restauration",
    "category.catering.desc": "Cuisiniers et préparation alimentaire",
    "category.photography": "Photographie",
    "category.photography.desc": "Événements et portraits",
    "category.beauty": "Beauté",
    "category.beauty.desc": "Coiffure, maquillage et bien-être",
    "category.cleaning": "Nettoyage",
    "category.cleaning.desc": "Ménage maison et bureaux",
    "category.business": "Affaires",
    "category.business.desc": "Support administratif et bureau",
    
    // Stats
    "stats.providers": "Prestataires",
    "stats.cities": "Villes couvertes",
    "stats.jobs": "Travaux réalisés",
    "stats.satisfaction": "Taux de satisfaction",
    
    // Footer
     // Hotel Search
     "hotel.title": "Trouvez",
     "hotel.titleHighlight": "Liens de Réservation d'Hôtel",
     "hotel.description": "Recherchez n'importe quel hôtel pour trouver des liens de réservation sur plusieurs plateformes, notamment Booking.com, Expedia, Hotels.com, et plus.",
     "hotel.namePlaceholder": "Nom de l'hôtel (ex: Four Seasons Marrakech)",
     "hotel.locationPlaceholder": "Lieu (optionnel)",
     "hotel.searchButton": "Rechercher",
     "hotel.error": "Erreur",
     "hotel.nameRequired": "Veuillez entrer un nom d'hôtel",
     "hotel.searchFailed": "Échec de la recherche d'hôtel. Veuillez réessayer.",
     "hotel.foundOn": "Trouvé sur",
     "hotel.platforms": "plateformes",
     "hotel.noResults": "Aucun lien de réservation trouvé pour cet hôtel. Essayez un nom plus spécifique ou vérifiez l'orthographe.",
 
     // Footer
    "footer.description": "Autonomiser les communautés marocaines grâce à des opportunités de travail accessibles et des services de confiance.",
    "footer.services": "Services",
    "footer.findServices": "Trouver des services",
    "footer.postJob": "Publier une offre",
    "footer.becomeProvider": "Devenir prestataire",
    "footer.businessSolutions": "Solutions entreprises",
    "footer.company": "Entreprise",
    "footer.aboutUs": "À propos",
    "footer.ourMission": "Notre mission",
    "footer.careers": "Carrières",
    "footer.press": "Presse",
    "footer.contact": "Contact",
    "footer.location": "Casablanca, Maroc",
    "footer.rights": "Tous droits réservés.",
    "footer.privacy": "Politique de confidentialité",
    "footer.terms": "Conditions d'utilisation",
    "footer.cookies": "Politique des cookies",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
