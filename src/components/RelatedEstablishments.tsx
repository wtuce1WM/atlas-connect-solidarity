import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ExternalLink, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RelatedBusiness {
  id: string;
  name: string;
  city: string;
  address: string | null;
  google_maps_url: string | null;
  logo_url: string | null;
}

interface RelatedEstablishmentsProps {
  currentBusinessId: string;
  ice: string;
}

const RelatedEstablishments = ({ currentBusinessId, ice }: RelatedEstablishmentsProps) => {
  const [relatedBusinesses, setRelatedBusinesses] = useState<RelatedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedBusinesses = async () => {
      if (!ice || ice.trim() === "") {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, city, address, google_maps_url, logo_url")
        .eq("ice", ice)
        .eq("is_active", true)
        .neq("id", currentBusinessId);

      if (error) {
        console.error("Error fetching related businesses:", error);
      } else if (data && data.length > 0) {
        setRelatedBusinesses(data);
      }
      setIsLoading(false);
    };

    fetchRelatedBusinesses();
  }, [currentBusinessId, ice]);

  if (isLoading || relatedBusinesses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Autres établissements
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ces établissements font partie de la même entreprise (ICE: {ice})
        </p>
        <div className="space-y-4">
          {relatedBusinesses.map((business) => (
            <div
              key={business.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {business.logo_url && (
                <div className="w-12 h-12 rounded-md border bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src={business.logo_url}
                    alt={`Logo ${business.name}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/business/${business.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                >
                  {business.name}
                </Link>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-1">{business.address || business.city}</span>
                </div>
                {business.google_maps_url && (
                  <a
                    href={business.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Voir sur Google Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RelatedEstablishments;
