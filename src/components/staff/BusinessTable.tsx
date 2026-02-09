import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash2, ExternalLink, Copy, AlertTriangle, Link2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useBusinessBrokenFiles } from "@/hooks/useBusinessBrokenFiles";

type Business = Tables<"businesses">;
type Gamme = { id: string; name_fr: string; color_hex: string | null };

interface BusinessTableProps {
  businesses: Business[];
  gammes: Gamme[];
  loading: boolean;
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
  onDuplicate: (business: Business) => void;
}

const BusinessTable = ({ businesses, gammes, loading, onEdit, onDelete, onDuplicate }: BusinessTableProps) => {
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [businessToDuplicate, setBusinessToDuplicate] = useState<Business | null>(null);
  const { brokenFilesMap } = useBusinessBrokenFiles(businesses);

  const handleDuplicateClick = (business: Business) => {
    setBusinessToDuplicate(business);
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = () => {
    if (businessToDuplicate) {
      onDuplicate(businessToDuplicate);
    }
    setDuplicateDialogOpen(false);
    setBusinessToDuplicate(null);
  };
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
    <TooltipProvider>
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Catégorie principale</TableHead>
              <TableHead>Gamme</TableHead>
              <TableHead>Type de compte</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((business) => {
              const brokenInfo = brokenFilesMap[business.id];
              return (
              <TableRow key={business.id}>
                <TableCell className="w-10">
                  {brokenInfo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center p-1.5 bg-amber-500/10 text-amber-600 rounded-full cursor-help">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium mb-1">{brokenInfo.totalBroken} fichier(s) manquant(s)</p>
                        <ul className="text-xs space-y-0.5">
                          {brokenInfo.brokenImages > 0 && (
                            <li>• {brokenInfo.brokenImages} image(s)</li>
                          )}
                          {brokenInfo.brokenLogo && <li>• Logo</li>}
                          {brokenInfo.brokenPdf && <li>• PDF</li>}
                          {brokenInfo.brokenLabel && <li>• Label</li>}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{business.name}</span>
                    {business.kp_regroupement && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center p-1 bg-primary/10 text-primary rounded-full cursor-help">
                            <Link2 className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">KP: {business.kp_regroupement}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
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
                    <a
                      href={`/business/${business.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Fiche <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
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
                  {(() => {
                    const gamme = business.gamme_id ? gammes.find(g => g.id === business.gamme_id) : null;
                    if (!gamme) return <span className="text-muted-foreground">-</span>;
                    return (
                      <Badge
                        className="text-xs text-black border border-black"
                        style={{ backgroundColor: gamme.color_hex || '#666666' }}
                      >
                        {gamme.name_fr}
                      </Badge>
                    );
                  })()}
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
                          : (business as any).account_type === "institution"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {(business as any).account_type === "petite_structure" && "Petite Structure"}
                      {(business as any).account_type === "structure_moyenne" && "Structure Moyenne"}
                      {(business as any).account_type === "grande_structure" && "Grande Structure"}
                      {(business as any).account_type === "corporate_branding" && "Corporate & Branding"}
                      {(business as any).account_type === "institution" && "Institution"}
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
                  <Badge
                    variant={(business as any).is_active !== false ? "default" : "secondary"}
                    className={
                      (business as any).is_active !== false
                        ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    }
                  >
                    {(business as any).is_active !== false ? "Oui" : "Non"}
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
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateClick(business)}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(business.id)}
                      className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dupliquer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une copie de la fiche "{businessToDuplicate?.name}" sera créée. Vous pourrez ensuite la modifier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate}>
              Dupliquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
};

export default BusinessTable;
