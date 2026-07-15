import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, ExternalLink, Bookmark, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const T = {
  fr: { loading: "Chargement…", empty: "Aucune conversation sauvegardée. Bookmarkez une conversation depuis l'Assistant IA ou l'onglet IA pour la retrouver ici.", startedOn: "Démarrée le", open: "Ouvrir", share: "Partager", del: "Supprimer", confirmDel: "Supprimer cette conversation ?", copied: "Lien copié", clubBadge: "Club", locale: "fr-FR" },
  en: { loading: "Loading…", empty: "No saved conversation. Bookmark a chat from the AI Assistant or AI tab to find it here.", startedOn: "Started on", open: "Open", share: "Share", del: "Delete", confirmDel: "Delete this conversation?", copied: "Link copied", clubBadge: "Club", locale: "en-GB" },
  ar: { loading: "جارٍ التحميل…", empty: "لا توجد محادثات محفوظة. احفظ محادثة من مساعد الذكاء لتجدها هنا.", startedOn: "بُدئت في", open: "فتح", share: "مشاركة", del: "حذف", confirmDel: "حذف هذه المحادثة؟", copied: "تم نسخ الرابط", clubBadge: "نادي", locale: "ar-MA" },
} as const;


type Row = {
  id: string;
  title: string;
  city: string | null;
  created_at: string;
  updated_at: string;
  is_bookmarked: boolean;
  is_public: boolean;
  kind: string | null;
};

interface Props {
  userId: string;
}

const AiChatsList = ({ userId }: Props) => {
  const { language } = useLanguage();
  const t = T[language as keyof typeof T] || T.fr;
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Row[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_chats")
      .select("id,title,city,created_at,updated_at,is_bookmarked,is_public,kind")
      .eq("user_id", userId)
      .eq("is_bookmarked", true)
      .order("created_at", { ascending: false });
    setChats((data as any as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDel)) return;
    await supabase.from("ai_chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const linkFor = (c: Row) =>
    c.kind === "club" ? `/club?assistant=${c.id}` : `/search?tab=ia&aiChat=${c.id}`;

  const handleShare = async (c: Row) => {
    const url = `${window.location.origin}${linkFor(c)}`;
    if (navigator.share) {
      try { await navigator.share({ title: c.title, url }); } catch {/* noop */}
    } else {
      await navigator.clipboard.writeText(url);
      alert(t.copied);
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
        {t.empty}
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
              {c.kind === "club" && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#C04F17] text-white align-middle">{t.clubBadge}</span>
              )}
            </div>
            <div className="text-xs text-white/70">
              {c.city ? `${c.city} · ` : ""}
              {t.startedOn} {new Date(c.created_at).toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
          <Link
            to={linkFor(c)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title={t.open}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => handleShare(c)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title={t.share}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c.id)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/20 transition-colors text-red-200"
            title={t.del}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
};


export default AiChatsList;
