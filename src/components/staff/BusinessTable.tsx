import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BusinessTableProps {
  businesses: Business[];
  loading: boolean;
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
}

const BusinessTable = ({ businesses, loading, onEdit, onDelete }: BusinessTableProps) => {
  if (loading) {
    return (
      <div className="bg-background rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
        <p className="text-muted-foreground mt-4">Chargement des entreprises...</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="bg-background rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Aucune entreprise trouvée.</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Catégorie principale</TableHead>
              <TableHead>Type de compte</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((business) => (
              <TableRow key={business.id}>
                <TableCell>
                  <div className="font-medium">{business.name}</div>
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gold hover:underline inline-flex items-center gap-1"
                    >
                      Site web <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <div>{business.city}</div>
                  <div className="text-sm text-muted-foreground">{business.region}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {business.main_category ? (
                      <Badge variant="outline" className="font-normal w-fit">
                        {business.main_category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {business.categories && business.categories.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        → {business.categories[0]}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {(business as any).account_type ? (
                    <Badge 
                      variant="secondary"
                      className={
                        (business as any).account_type === "corporate_branding"
                          ? "bg-gold/10 text-gold"
                          : (business as any).account_type === "grande_structure"
                          ? "bg-purple-500/10 text-purple-600"
                          : (business as any).account_type === "structure_moyenne"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {(business as any).account_type === "petite_structure" && "Petite Structure"}
                      {(business as any).account_type === "structure_moyenne" && "Structure Moyenne"}
                      {(business as any).account_type === "grande_structure" && "Grande Structure"}
                      {(business as any).account_type === "corporate_branding" && "Corporate & Branding"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={business.wtuce_status === "verified" ? "default" : "secondary"}
                    className={
                      business.wtuce_status === "verified"
                        ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                    }
                  >
                    {business.wtuce_status === "verified" ? "Vérifié" : "En attente"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {business.phone && <div>{business.phone}</div>}
                    {business.email && (
                      <div className="text-muted-foreground">{business.email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(business)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(business.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BusinessTable;
