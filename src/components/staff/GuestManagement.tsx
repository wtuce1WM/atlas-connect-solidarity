import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Mail, Phone, MapPin, LogIn, Sparkles, Pencil, UserCog, Trash2, Bot } from "lucide-react";
import ClubMemberEditor from "@/components/staff/ClubMemberEditor";

interface PersonaTag {
  id: string;
  slug: string;
  name_fr: string;
}

interface PersonaOption {
  id: string;
  name_fr: string;
  sort_order: number;
}

interface AiUsageAgg {
  event_count: number;
  total_tokens: number;
  total_cost_usd: number;
  last_used_at: string | null;
}

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
  last_active_at: string | null;
  personas: PersonaTag[] | null;
}

const GuestManagement = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<ClubMemberWithSignIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPersonas, setAllPersonas] = useState<PersonaOption[]>([]);
  const [editingMember, setEditingMember] = useState<ClubMemberWithSignIn | null>(null);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<ClubMemberWithSignIn | null>(null);
  const [alsoDeleteAuth, setAlsoDeleteAuth] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [aiUsageByUser, setAiUsageByUser] = useState<Record<string, AiUsageAgg>>({});
  const [aiRange, setAiRange] = useState<"30d" | "all">("30d");

  const handleDelete = async () => {
    if (!deletingMember) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-club-member", {
      body: { member_id: deletingMember.id, also_delete_auth_user: alsoDeleteAuth },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Erreur", description: error?.message || (data as any)?.error });
      return;
    }
    toast({
      title: "Membre supprimé",
      description: (data as any)?.auth_user_deleted
        ? `${deletingMember.email || deletingMember.nickname} a été entièrement supprimé (compte + fiche).`
        : `Fiche membre supprimée. Le compte d'authentification est conservé.`,
    });
    setDeletingMember(null);
    setAlsoDeleteAuth(true);
    fetchMembers();
  };

  useEffect(() => {
    fetchMembers();
    fetchPersonas();
  }, []);

  useEffect(() => {
    fetchAiUsage(aiRange);
  }, [aiRange]);

  const fetchAiUsage = async (range: "30d" | "all") => {
    const since = range === "30d"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const { data, error } = await supabase.rpc("get_club_ai_usage_by_user", { p_since: since });
    if (error) {
      console.error("[AI usage] load error", error);
      return;
    }
    const map: Record<string, AiUsageAgg> = {};
    ((data as any[]) || []).forEach((r) => {
      if (r.user_id) {
        map[r.user_id] = {
          event_count: Number(r.event_count) || 0,
          total_tokens: Number(r.total_tokens) || 0,
          total_cost_usd: Number(r.total_cost_usd) || 0,
          last_used_at: r.last_used_at,
        };
      }
    });
    setAiUsageByUser(map);
  };

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_club_members_with_last_sign_in");
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les membres du club." });
    } else {
      setMembers((data as unknown as ClubMemberWithSignIn[]) || []);
    }
    setLoading(false);
  };

  const fetchPersonas = async () => {
    const { data } = await supabase
      .from("personas")
      .select("id, name_fr, sort_order")
      .order("sort_order", { ascending: true });
    setAllPersonas(data || []);
  };

  const openEdit = (member: ClubMemberWithSignIn) => {
    setEditingMember(member);
    setSelectedPersonaIds(new Set((member.personas || []).map((p) => p.id)));
  };

  const togglePersona = (id: string) => {
    setSelectedPersonaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!editingMember) return;
    setSaving(true);
    const memberId = editingMember.id;
    const currentIds = new Set((editingMember.personas || []).map((p) => p.id));
    const toAdd = [...selectedPersonaIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !selectedPersonaIds.has(id));

    if (toRemove.length) {
      const { error } = await supabase
        .from("club_member_personas")
        .delete()
        .eq("member_id", memberId)
        .in("persona_id", toRemove);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
        setSaving(false);
        return;
      }
    }
    if (toAdd.length) {
      const { error } = await supabase
        .from("club_member_personas")
        .insert(toAdd.map((persona_id) => ({ member_id: memberId, persona_id })));
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
        setSaving(false);
        return;
      }
    }
    toast({ title: "Enregistré", description: "Personas mis à jour." });
    setEditingMember(null);
    setSaving(false);
    fetchMembers();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const totalUsage = Object.values(aiUsageByUser).reduce(
    (acc, u) => ({
      tokens: acc.tokens + u.total_tokens,
      cost: acc.cost + u.total_cost_usd,
      events: acc.events + u.event_count,
    }),
    { tokens: 0, cost: 0, events: 0 },
  );

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
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gold" />
              Liste des membres
            </span>
            <div className="flex items-center gap-3 text-sm font-normal">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Bot className="h-4 w-4 text-gold" />
                <span>IA {aiRange === "30d" ? "30j" : "total"} :</span>
                <span className="font-medium text-foreground">
                  {totalUsage.tokens.toLocaleString("fr-FR")} tokens
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-medium text-foreground">
                  ${totalUsage.cost.toFixed(4)}
                </span>
              </div>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAiRange("30d")}
                  className={`px-2 py-1 text-xs ${aiRange === "30d" ? "bg-gold text-black" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                >
                  30j
                </button>
                <button
                  type="button"
                  onClick={() => setAiRange("all")}
                  className={`px-2 py-1 text-xs ${aiRange === "all" ? "bg-gold text-black" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                >
                  Total
                </button>
              </div>
            </div>
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
                    <TableHead><div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Email</div></TableHead>
                    <TableHead><div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Tél / WhatsApp</div></TableHead>
                    <TableHead><div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Localisation</div></TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead><div className="flex items-center gap-1"><LogIn className="h-3.5 w-3.5" />Dernière activité</div></TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1" title={`Usage IA sur ${aiRange === "30d" ? "les 30 derniers jours" : "toute la période"}`}>
                        <Bot className="h-3.5 w-3.5" />IA (tokens / $)
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const usage = member.user_id ? aiUsageByUser[member.user_id] : undefined;
                    return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.nickname}</TableCell>
                      <TableCell>{[member.first_name, member.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
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
                      <TableCell className="text-sm">{[member.city, member.country].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(member.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {member.last_active_at ? formatDate(member.last_active_at) : (member.last_sign_in_at ? formatDate(member.last_sign_in_at) : "—")}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {usage ? (
                          <div className="space-y-0.5" title={`${usage.event_count} appel(s)${usage.last_used_at ? ` · dernier ${formatDate(usage.last_used_at)}` : ""}`}>
                            <div className="font-medium">{usage.total_tokens.toLocaleString("fr-FR")} tk</div>
                            <div className="text-muted-foreground text-xs">${usage.total_cost_usd.toFixed(4)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingAccountId(member.id)} title="Éditer la fiche complète">
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(member)} title="Éditer les personas">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setDeletingMember(member); setAlsoDeleteAuth(true); }}
                            title="Supprimer le membre"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Personas — {editingMember?.nickname}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2">
            {allPersonas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun persona disponible.</p>
            ) : (
              allPersonas.map((p) => {
                const checked = selectedPersonaIds.has(p.id);
                return (
                  <Label
                    key={p.id}
                    htmlFor={`persona-${p.id}`}
                    className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      id={`persona-${p.id}`}
                      checked={checked}
                      onCheckedChange={() => togglePersona(p.id)}
                    />
                    <span className="text-sm">{p.name_fr}</span>
                  </Label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClubMemberEditor
        memberId={editingAccountId}
        open={!!editingAccountId}
        onClose={() => { setEditingAccountId(null); fetchMembers(); }}
      />

      <Dialog open={!!deletingMember} onOpenChange={(open) => !open && !deleting && setDeletingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Supprimer ce membre ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p>
              Vous êtes sur le point de supprimer la fiche de{" "}
              <strong>{deletingMember?.nickname}</strong>
              {deletingMember?.email ? <> ({deletingMember.email})</> : null}.
            </p>
            <Label className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={alsoDeleteAuth}
                onCheckedChange={(v) => setAlsoDeleteAuth(v === true)}
                className="mt-0.5"
              />
              <span className="space-y-1">
                <span className="block font-medium">Supprimer aussi le compte d'authentification</span>
                <span className="block text-xs text-muted-foreground">
                  Recommandé pour tester une ré-inscription complète (sinon l'email reste connu et un nouveau signup échouera).
                </span>
              </span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Cette action est irréversible (voyages, bookmarks et chats liés seront également supprimés).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMember(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestManagement;
