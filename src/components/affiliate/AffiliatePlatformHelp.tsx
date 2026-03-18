import { ExternalLink } from "lucide-react";

interface PlatformHelpLink {
  name: string;
  editUrl: string;
  description: string;
}

const PLATFORM_HELP: PlatformHelpLink[] = [
  {
    name: "Google Business Profile",
    editUrl: "https://business.google.com/",
    description: "Modifiez vos horaires, téléphone et informations directement sur Google.",
  },
  {
    name: "Facebook",
    editUrl: "https://business.facebook.com/",
    description: "Accédez à votre page Facebook pour modifier horaires et coordonnées.",
  },
  {
    name: "TripAdvisor",
    editUrl: "https://www.tripadvisor.com/Owners",
    description: "Revendiquez et gérez votre fiche TripAdvisor (horaires, téléphone, photos).",
  },
  {
    name: "Instagram",
    editUrl: "https://www.instagram.com/accounts/edit/",
    description: "Mettez à jour votre bio, coordonnées et liens depuis l'app ou le web.",
  },
  {
    name: "Apple Business Connect",
    editUrl: "https://businessconnect.apple.com/",
    description: "Gérez votre fiche Apple Maps (horaires, téléphone, catégorie).",
  },
  {
    name: "Booking.com",
    editUrl: "https://admin.booking.com/",
    description: "Mettez à jour vos disponibilités et informations sur Booking.com.",
  },
];

const AffiliatePlatformHelp = () => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Les plateformes externes ne peuvent pas être mises à jour automatiquement. 
        Utilisez les liens ci-dessous pour accéder directement aux portails de gestion.
      </p>
      {PLATFORM_HELP.map((platform) => (
        <a
          key={platform.name}
          href={platform.editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors group"
        >
          <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground group-hover:text-primary">
              {platform.name}
            </p>
            <p className="text-xs text-muted-foreground">{platform.description}</p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default AffiliatePlatformHelp;
