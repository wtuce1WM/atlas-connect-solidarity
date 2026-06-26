import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, ExternalLink, Bookmark, Share2 } from "lucide-react";

type Row = {
  id: string;
  title: string;
  city: string | null;
  updated_at: string;
  is_bookmarked: boolean;
  is_public: boolean;
};

interface Props {
  userId: string;
}

const AiChatsList = ({ userId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Row[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_chats")
      .select("id,title,city,updated_at,is_bookmarked,is_public")
      .eq("user_id", userId)
      .eq("is_bookmarked", true)
      .order("updated_at", { ascending: false });
    setChats((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await supabase.from("ai_chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const handleShare = async (id: string, title: string) => {
    const url = `${window.location.origin}/search?tab=ia&aiChat=${id}`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {/* noop */}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copié");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-12 text-white/90 text-sm font-medium">
        Aucune conversation sauvegardée. Bookmarkez une conversation IA depuis l'onglet IA pour la retrouver ici.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {chats.map((c) => (
        <li key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors">
          <Bookmark className="h-4 w-4 text-[#D4AF37] shrink-0" fill="currentColor" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {c.title}
            </div>
            <div className="text-xs text-white/70">
              {c.city ? `${c.city} · ` : ""}
              {new Date(c.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
          <Link
            to={`/search?tab=ia&aiChat=${c.id}`}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Ouvrir"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => handleShare(c.id, c.title)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Partager"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c.id)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/20 transition-colors text-red-200"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default AiChatsList;
