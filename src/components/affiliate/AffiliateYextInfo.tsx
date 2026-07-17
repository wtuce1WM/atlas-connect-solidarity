import { Cloud, Share2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import YextSyncButton from "./YextSyncButton";

interface AffiliateYextInfoProps {
  businessId: string;
  businessName: string;
}

const AffiliateYextInfo = ({ businessId, businessName }: AffiliateYextInfoProps) => {
  return (
    <div className="space-y-5">
      <div className="p-3 rounded-lg border border-border bg-white/5">
        <div className="flex items-start gap-3">
          <Cloud className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Qu'est-ce que Yext ?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Yext est un service qui centralise la fiche de votre établissement et la diffuse
              sur un réseau d'annuaires (Google Maps, Apple Maps, Bing, Facebook, TripAdvisor, etc.)
              pour garantir la cohérence de vos informations partout.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">Données diffusées</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Nom de l'établissement</li>
            <li>Adresse, ville, pays</li>
            <li>Téléphone et email</li>
            <li>Site web</li>
            <li>Réseaux sociaux (Facebook, Instagram, X)</li>
            <li>Horaires d'ouverture</li>
            <li>Google Place ID</li>
          </ul>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <p className="text-sm font-medium text-foreground">Données non diffusées</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Photos et vidéos</li>
            <li>Description détaillée</li>
            <li>Catégories enrichies</li>
            <li>Avis clients</li>
            <li>Offres et promotions</li>
            <li>Analytics de visibilité</li>
          </ul>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Profondeur de la réponse</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          La synchronisation ne fait que normaliser les données de base (NAP + horaires)
          auprès des annuaires partenaires. La réponse de Yext se limite à confirmer
          que l'entité est bien créée ou mise à jour. Elle n'inclut pas d'indicateurs
          de performance, de portée de diffusion ou de statut détaillé par plateforme.
        </p>
      </div>

      <div className="p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-medium text-foreground">Boutons de synchronisation</p>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li><strong>Diffuser</strong> : envoie ou met à jour votre fiche chez Yext.</li>
          <li><strong>Statut</strong> : vérifie si votre établissement est déjà synchronisé.</li>
        </ul>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <YextSyncButton businessId={businessId} businessName={businessName} />
      </div>

      <a
        href="https://www.yext.com/fr"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        En savoir plus sur Yext <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};

export default AffiliateYextInfo;
