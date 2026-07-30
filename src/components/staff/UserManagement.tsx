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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Users, Loader2, Pencil, Eye, EyeOff, Video, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StaffRole = "admin" | "staff" | "video_studio";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "staff" | "affiliate" | "video_studio";
  created_at: string;
  email?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<StaffRole>("staff");
  const [editRole, setEditRole] = useState<StaffRole>("staff");
  const [adding, setAdding] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState<StaffRole>("video_studio");
  const [granting, setGranting] = useState(false);
  const [updating, setUpdating] = useState(false);
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
          .in("role", ["admin", "staff", "video_studio"])
          .order("created_at", { ascending: false });

        if (rolesError) {
          throw rolesError;
        }
        setUsers((roles || []) as UserRole[]);
      } else {
        // Filter out affiliates from the result
        const filteredData = (data || []).filter((u: UserRole) => u.role === "admin" || u.role === "staff" || u.role === "video_studio");
        setUsers(filteredData);
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

    if (!newUserPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer un mot de passe.",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setAdding(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Non authentifié");
      }

      const response = await supabase.functions.invoke('create-staff-user', {
        body: {
          email: newUserEmail.trim().toLowerCase(),
          password: newUserPassword,
          role: newUserRole
        }
      });

      if (response.error) {
        // Parse the error message from the response
        const errorBody = response.error.message;
        if (errorBody.includes("already been registered")) {
          throw new Error("Un compte existe déjà avec cette adresse email.");
        }
        throw new Error(errorBody || "Erreur lors de la création");
      }

      if (response.data?.error) {
        const errorMsg = response.data.error;
        if (errorMsg.includes("already been registered")) {
          throw new Error("Un compte existe déjà avec cette adresse email.");
        }
        throw new Error(errorMsg);
      }

      toast({
        title: "Succès",
        description: `Compte créé pour ${newUserEmail} avec le rôle ${newUserRole}.`,
      });

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("staff");
      setAddDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur.",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleGrantRole = async () => {
    const email = grantEmail.trim().toLowerCase();
    if (!email) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez entrer une adresse email." });
      return;
    }
    setGranting(true);
    try {
      const { data, error } = await supabase.rpc("add_user_role_by_email" as any, {
        _email: email,
        _role: grantRole as any,
      });
      if (error) throw error;
      if (!data) throw new Error("Aucun compte trouvé avec cette adresse email.");
      toast({ title: "Succès", description: `Accès « ${grantRole} » accordé à ${email}.` });
      setGrantEmail("");
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'accorder cet accès.",
      });
    } finally {
      setGranting(false);
    }
  };

  const handleEditUser = (user: UserRole) => {
    setEditingUser(user);
    // Cast is safe because we filter out affiliates in fetchUsers
    setEditRole(user.role as StaffRole);
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    if (editingUser.user_id === currentUserId) {
      toast({
        variant: "destructive",
        title: "Action interdite",
        description: "Vous ne pouvez pas modifier votre propre rôle.",
      });
      return;
    }

    if (editRole === editingUser.role) {
      setEditDialogOpen(false);
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: editRole })
        .eq("id", editingUser.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: `Rôle mis à jour en ${editRole}.`,
      });

      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le rôle.",
      });
    } finally {
      setUpdating(false);
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
              Créer un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
              <DialogDescription>
                Créez un nouveau compte avec email et mot de passe.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="utilisateur@exemple.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 caractères"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={newUserRole}
                  onValueChange={(value: StaffRole) => setNewUserRole(value)}
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
                    <SelectItem value="video_studio">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        Studio Vidéo
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
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grant access to existing account — visible card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Donner un accès à un compte existant</CardTitle>
          </div>
          <CardDescription>
            Attribue un accès Studio Vidéo, Staff ou Admin à un membre du Club ou un affilié déjà inscrit, via son email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="grant-email">Email du compte</Label>
              <Input
                id="grant-email"
                type="email"
                placeholder="membre@exemple.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64 space-y-2">
              <Label>Accès</Label>
              <Select value={grantRole} onValueChange={(value: StaffRole) => setGrantRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video_studio">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Studio Vidéo
                    </div>
                  </SelectItem>
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
            </div>
            <Button
              onClick={handleGrantRole}
              disabled={granting}
              className="w-full md:w-auto bg-gold hover:bg-gold/90 text-gold-foreground"
            >
              {granting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accorder l'accès
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            « Studio Vidéo » donne un accès complet à /studio-video sans ouvrir le backoffice. Le compte doit déjà exister (Club ou Affilié).
          </p>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de {editingUser?.email || "l'utilisateur"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select
                value={editRole}
                onValueChange={(value: StaffRole) => setEditRole(value)}
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
                  <SelectItem value="video_studio">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Studio Vidéo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updating || editingUser?.user_id === currentUserId}
              className="bg-gold hover:bg-gold/90 text-gold-foreground"
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      {user.role === "admin" ? "Admin" : user.role === "video_studio" ? "Studio Vidéo" : "Staff"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        disabled={user.user_id === currentUserId}
                        className="hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(user.id, user.user_id)}
                        disabled={user.user_id === currentUserId}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
