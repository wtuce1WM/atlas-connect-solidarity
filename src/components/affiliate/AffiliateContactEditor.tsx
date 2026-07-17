import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, MapPin, Home, Building2, Map, Navigation, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AffiliateContactEditorProps {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  neighborhood: string;
  city: string;
  region: string;
  googleMapsUrl: string;
  latitude: number | string;
  longitude: number | string;
  onPhoneChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onNeighborhoodChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onGoogleMapsUrlChange: (v: string) => void;
  onLatitudeChange: (v: number | null) => void;
  onLongitudeChange: (v: number | null) => void;
}

const extractCoordsFromMapsUrl = (url: string): { lat: number; lng: number } | null => {
  if (!url) return null;
  const dataBlock = url.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataBlock) return { lat: parseFloat(dataBlock[1]), lng: parseFloat(dataBlock[2]) };
  const allMatches = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  if (allMatches.length > 0) {
    const last = allMatches[allMatches.length - 1];
    return { lat: parseFloat(last[1]), lng: parseFloat(last[2]) };
  }
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
};

const Row = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <div className="h-4 w-4 shrink-0">{icon}</div>
    <span className="w-[130px] text-sm font-medium text-foreground shrink-0">{label}</span>
    <div className="flex-1">{children}</div>
  </div>
);

const AffiliateContactEditor = ({
  phone, whatsapp, email,
  address, neighborhood, city, region,
  googleMapsUrl, latitude, longitude,
  onPhoneChange, onWhatsappChange, onEmailChange,
  onAddressChange, onNeighborhoodChange, onCityChange, onRegionChange,
  onGoogleMapsUrlChange, onLatitudeChange, onLongitudeChange,
}: AffiliateContactEditorProps) => {
  const { toast } = useToast();

  const handleExtract = () => {
    const coords = extractCoordsFromMapsUrl(googleMapsUrl);
    if (!coords) {
      toast({ title: "Extraction impossible", description: "Aucun point GPS trouvé dans cette URL Google Maps.", variant: "destructive" });
      return;
    }
    onLatitudeChange(coords.lat);
    onLongitudeChange(coords.lng);
    toast({ title: "Points GPS extraits ✓", description: `Lat: ${coords.lat}, Lng: ${coords.lng}` });
  };

  return (
    <div className="space-y-4">
      <Row icon={<Phone className="h-4 w-4 text-emerald-500" />} label="Téléphone">
        <Input value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="+212 5XX XX XX XX" className="text-xs" />
      </Row>
      <Row icon={<MessageCircle className="h-4 w-4 text-green-500" />} label="WhatsApp">
        <Input value={whatsapp} onChange={(e) => onWhatsappChange(e.target.value)} placeholder="+212 6XX XX XX XX" className="text-xs" />
      </Row>
      <Row icon={<span className="text-blue-500 text-center text-xs font-bold block">@</span>} label="Email">
        <Input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="contact@example.com" className="text-xs" type="email" />
      </Row>

      <div className="border-t border-border pt-4 space-y-4">
        <Row icon={<Home className="h-4 w-4 text-orange-500" />} label="Adresse">
          <Input value={address} onChange={(e) => onAddressChange(e.target.value)} placeholder="123 rue..." className="text-xs" />
        </Row>
        <Row icon={<Building2 className="h-4 w-4 text-orange-500" />} label="Quartier">
          <Input value={neighborhood} onChange={(e) => onNeighborhoodChange(e.target.value)} placeholder="Gueliz, Medina..." className="text-xs" />
        </Row>
        <Row icon={<MapPin className="h-4 w-4 text-orange-500" />} label="Ville">
          <Input value={city} onChange={(e) => onCityChange(e.target.value)} placeholder="Marrakech" className="text-xs" />
        </Row>
        <Row icon={<Map className="h-4 w-4 text-orange-500" />} label="Région">
          <Input value={region} onChange={(e) => onRegionChange(e.target.value)} placeholder="Marrakech-Safi" className="text-xs" />
        </Row>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <Row icon={<MapPin className="h-4 w-4 text-blue-500" />} label="URL Google Maps">
          <div className="flex gap-2">
            <Input
              value={googleMapsUrl}
              onChange={(e) => onGoogleMapsUrlChange(e.target.value)}
              placeholder="https://www.google.com/maps/place/..."
              className="text-xs flex-1"
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleExtract} disabled={!googleMapsUrl}>
              <Wand2 className="h-3.5 w-3.5 mr-1" /> Extraire GPS
            </Button>
          </div>
        </Row>
        <Row icon={<Navigation className="h-4 w-4 text-blue-500" />} label="Latitude">
          <Input
            value={latitude ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              onLatitudeChange(v === "" ? null : Number(v));
            }}
            placeholder="31.6295"
            className="text-xs"
            type="number"
            step="any"
          />
        </Row>
        <Row icon={<Navigation className="h-4 w-4 text-blue-500" />} label="Longitude">
          <Input
            value={longitude ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              onLongitudeChange(v === "" ? null : Number(v));
            }}
            placeholder="-7.9811"
            className="text-xs"
            type="number"
            step="any"
          />
        </Row>
      </div>
    </div>
  );
};

export default AffiliateContactEditor;
