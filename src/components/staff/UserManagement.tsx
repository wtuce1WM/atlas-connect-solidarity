import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Users, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "staff";
  created_at: string;
  email?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "staff">("staff");
  const [adding, setAdding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    try {
      // Use the security definer function to get roles with emails
      const { data, error } = await supabase.rpc('get_user_roles_with_emails' as any);

      if (error) {
        // Fallback to regular query if function doesn't exist or user is not admin
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("*")
          .order("created_at", { ascending: false });

        if (rolesError) {
          throw rolesError;
        }
        setUsers(roles || []);
      } else {
        setUsers(data || []);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les utilisateurs.",
      });
    }
    
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer une adresse email.",
      });
      return;
    }

    setAdding(true);

    try {
      // Use the security definer function to add the role
      const { data, error } = await supabase.rpc('add_user_role_by_email' as any, {
        _email: newUserEmail.trim().toLowerCase(),
        _role: newUserRole
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: `Rôle ${newUserRole} attribué à ${newUserEmail}.`,
      });

      setNewUserEmail("");
      setNewUserRole("staff");
      setAddDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'ajouter l'utilisateur.",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRole = async (roleId: string, userId: string) => {
    if (userId === currentUserId) {
      toast({
        variant: "destructive",
        title: "Action interdite",
        description: "Vous ne pouvez pas supprimer votre propre rôle.",
      });
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce rôle ?")) {
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le rôle.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Rôle supprimé avec succès.",
      });
      fetchUsers();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gold/10 p-3 rounded-lg">
            <Users className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gestion des utilisateurs</h2>
            <p className="text-muted-foreground text-sm">
              {users.length} utilisateur{users.length > 1 ? "s" : ""} avec accès au backoffice
            </p>
          </div>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-gold-foreground">
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
              <DialogDescription>
                L'utilisateur doit d'abord créer un compte sur la page de connexion staff.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email de l'utilisateur</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="utilisateur@exemple.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={newUserRole}
                  onValueChange={(value: "admin" | "staff") => setNewUserRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Staff
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gold" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Les admins peuvent gérer les utilisateurs. Les staff peuvent uniquement gérer les entreprises.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={adding}
                className="bg-gold hover:bg-gold/90 text-gold-foreground"
              >
                {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Box */}
      <div className="bg-muted border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Note :</strong> Pour ajouter un utilisateur, celui-ci doit d'abord créer un compte 
          sur <code className="bg-background px-1 rounded border">/staff/login</code>. 
          Ensuite, vous pouvez lui attribuer un rôle ici.
        </p>
      </div>

      {/* Table */}
      <div className="bg-background rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email / ID Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Date d'ajout</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      {user.email ? (
                        <span className="font-medium">{user.email}</span>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {user.user_id.slice(0, 8)}...
                        </span>
                      )}
                      {user.user_id === currentUserId && (
                        <Badge variant="outline" className="w-fit mt-1">Vous</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className={user.role === "admin" ? "bg-gold text-gold-foreground" : ""}
                    >
                      {user.role === "admin" ? "Admin" : "Staff"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(user.id, user.user_id)}
                      disabled={user.user_id === currentUserId}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
