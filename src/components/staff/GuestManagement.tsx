import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Mail, Phone, MapPin, LogIn } from "lucide-react";

interface ClubMemberWithSignIn {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  user_id: string | null;
  last_sign_in_at: string | null;
}

const GuestManagement = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<ClubMemberWithSignIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_club_members_with_last_sign_in");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les membres du club.",
      });
    } else {
      setMembers((data as ClubMemberWithSignIn[]) || []);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invités du Club</h2>
          <p className="text-muted-foreground">
            Membres inscrits via l'espace Club OWM ({members.length})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gold" />
            Liste des membres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun membre inscrit pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pseudonyme</TableHead>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        Tél / WhatsApp
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Localisation
                      </div>
                    </TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <LogIn className="h-3.5 w-3.5" />
                        Dernière connexion
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.nickname}</TableCell>
                      <TableCell>
                        {[member.first_name, member.last_name].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{member.email || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {member.phone || member.whatsapp ? (
                          <div className="space-y-0.5">
                            {member.phone && <div>{member.phone}</div>}
                            {member.whatsapp && member.whatsapp !== member.phone && (
                              <div className="text-muted-foreground">WA: {member.whatsapp}</div>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {[member.city, member.country].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(member.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {member.last_sign_in_at ? formatDate(member.last_sign_in_at) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestManagement;
