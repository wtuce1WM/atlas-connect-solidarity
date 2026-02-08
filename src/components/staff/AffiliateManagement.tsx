import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, TrendingUp, DollarSign } from "lucide-react";

interface Affiliate {
  id: string;
  user_id: string;
  email?: string;
  created_at: string;
}

const AffiliateManagement = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    setLoading(true);
    // Get users with affiliate-related roles or simply show user_roles for now
    // This is a placeholder - you can expand with a dedicated affiliates table
    const { data, error } = await supabase
      .from('user_roles')
      .select('id, user_id, created_at, role')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les affiliés.",
      });
      setAffiliates([]);
    } else {
      // For now, show all users as potential affiliates tracking
      setAffiliates(data?.map(d => ({
        id: d.id,
        user_id: d.user_id,
        created_at: d.created_at,
      })) || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Affiliés</h2>
          <p className="text-muted-foreground">
            Suivez les performances et gérez les partenaires affiliés
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{affiliates.length}</p>
                <p className="text-muted-foreground text-sm">Affiliés actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-gold/10 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-muted-foreground text-sm">Clics ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-muted-foreground text-sm">Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gold" />
            Liste des Affiliés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : affiliates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun affilié enregistré pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Utilisateur</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-mono text-sm">
                      {affiliate.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {new Date(affiliate.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">Actif</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-500/50 bg-amber-50/50">
        <CardContent className="pt-6">
          <p className="text-amber-800 text-sm">
            <strong>Note :</strong> Cette section est un prototype. Pour une gestion complète des affiliés 
            (suivi des clics, commissions, liens personnalisés), une table dédiée et des fonctionnalités 
            supplémentaires peuvent être ajoutées.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateManagement;
