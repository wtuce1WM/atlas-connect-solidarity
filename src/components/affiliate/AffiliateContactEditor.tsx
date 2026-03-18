import { Input } from "@/components/ui/input";
import { Phone, MessageCircle } from "lucide-react";

interface AffiliateContactEditorProps {
  phone: string;
  whatsapp: string;
  email: string;
  onPhoneChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}

const AffiliateContactEditor = ({
  phone, whatsapp, email,
  onPhoneChange, onWhatsappChange, onEmailChange,
}: AffiliateContactEditorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="w-[130px] text-sm font-medium text-foreground shrink-0">Téléphone</span>
        <Input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+212 5XX XX XX XX"
          className="text-xs"
        />
      </div>
      <div className="flex items-center gap-3">
        <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
        <span className="w-[130px] text-sm font-medium text-foreground shrink-0">WhatsApp</span>
        <Input
          value={whatsapp}
          onChange={(e) => onWhatsappChange(e.target.value)}
          placeholder="+212 6XX XX XX XX"
          className="text-xs"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 text-blue-500 shrink-0 text-center text-xs font-bold">@</span>
        <span className="w-[130px] text-sm font-medium text-foreground shrink-0">Email</span>
        <Input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="contact@example.com"
          className="text-xs"
          type="email"
        />
      </div>
    </div>
  );
};

export default AffiliateContactEditor;
