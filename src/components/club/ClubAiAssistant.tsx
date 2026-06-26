import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Send, Trash2, MessageSquare, Bookmark, BookmarkCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

type ChatRow = {
  id: string;
  title: string;
  updated_at: string;
  is_bookmarked: boolean;
  messages: Msg[] | null;
};

interface Props { userId: string }

const ClubAiAssistant = ({ userId }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("assistant") || null;

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRow | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadChats = async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from("ai_chats")
      .select("id,title,updated_at,is_bookmarked,messages")
      .eq("user_id", userId)
      .eq("kind", "club" as any)
      .order("updated_at", { ascending: false })
      .limit(50);
    setChats((data as any as ChatRow[]) || []);
    setLoadingList(false);
  };

  useEffect(() => { if (userId) loadChats(); }, [userId]);

  useEffect(() => {
    if (!activeId) { setActiveChat(null); setMessages([]); return; }
    const found = chats.find((c) => c.id === activeId);
    if (found) {
      setActiveChat(found);
      setMessages(Array.isArray(found.messages) ? found.messages : []);
    }
  }, [activeId, chats]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  const openChat = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("assistant", id);
    setSearchParams(next, { replace: false });
  };

  const newChat = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("assistant");
    setSearchParams(next, { replace: false });
    setMessages([]);
    setActiveChat(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deleteChat = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await supabase.from("ai_chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) newChat();
  };

  const toggleBookmark = async () => {
    if (!activeChat) return;
    const next = !activeChat.is_bookmarked;
    await supabase.from("ai_chats").update({ is_bookmarked: next }).eq("id", activeChat.id);
    setActiveChat({ ...activeChat, is_bookmarked: next });
    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? { ...c, is_bookmarked: next } : c)));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);

    try {
      const { data, error } = await supabase.functions.invoke("club-ai-chat", {
        body: { chatId: activeId, messages: newMsgs },
      });
      if (error) throw error;
      const answer = (data as any)?.answer || "";
      const newId = (data as any)?.chatId as string | null;
      setMessages([...newMsgs, { role: "assistant", content: answer }]);
      if (newId && newId !== activeId) {
        const params = new URLSearchParams(searchParams);
        params.set("assistant", newId);
        setSearchParams(params, { replace: true });
      }
      loadChats();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de joindre l'assistant.", variant: "destructive" });
      setMessages(newMsgs);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const emptyHint = useMemo(() => (
    <div className="text-center py-10 px-4 text-[#194CFF]">
      <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-70" />
      <div className="text-sm font-semibold mb-1">Bonjour 👋</div>
      <div className="text-base opacity-80">Demandez-moi la météo, retrouvez une adresse sauvegardée, ou reprenez une conversation précédente.</div>
    </div>
  ), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 min-h-[520px]">
      {/* Threads */}
      <aside className="bg-[#BED1FF] rounded-xl p-3 flex flex-col gap-2 md:max-h-[640px]">
        <button
          onClick={newChat}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-[#194CFF] text-white text-sm font-semibold hover:bg-[#1240d6] transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle conversation
        </button>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-8 text-[#194CFF]"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : chats.length === 0 ? (
            <div className="text-sm text-[#194CFF] py-4 text-center opacity-70">Aucune conversation pour l'instant.</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {chats.map((c) => (
                <li key={c.id} className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeId === c.id ? "bg-white" : "hover:bg-white/60"}`}>
                  <button onClick={() => openChat(c.id)} className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-[#194CFF] truncate flex items-center gap-1">
                      {c.is_bookmarked && <Bookmark className="h-3 w-3" fill="currentColor" />}
                      {c.title}
                    </div>
                    <div className="text-[10px] text-[#194CFF]/70">
                      {new Date(c.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-red-600 hover:bg-red-100"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat */}
      <section className="bg-[#BED1FF] rounded-xl flex flex-col md:max-h-[640px] min-h-[520px]">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/40">
          <div className="text-sm font-semibold text-[#194CFF] truncate">
            {activeChat?.title || "Nouvelle conversation"}
          </div>
          {activeChat && (
            <button
              onClick={toggleBookmark}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/60 text-[#194CFF]"
              title={activeChat.is_bookmarked ? "Retirer le bookmark" : "Bookmarker"}
            >
              {activeChat.is_bookmarked ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !sending && emptyHint}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[80%] px-3 py-2 rounded-2xl bg-[#194CFF] text-white text-sm whitespace-pre-wrap">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[88%] text-[#0a1d6b] text-sm prose prose-sm max-w-none prose-strong:text-[#194CFF]">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-[#194CFF] text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> L'assistant réfléchit…
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/40 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Demandez la météo, un lieu, ou reprenez un chat…"
            className="flex-1 resize-none rounded-lg border border-white bg-white px-3 py-2 text-sm text-[#0a1d6b] placeholder:text-[#194CFF]/50 focus:outline-none focus:ring-2 focus:ring-[#194CFF]"
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-[#194CFF] text-white hover:bg-[#1240d6] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Envoyer"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ClubAiAssistant;
