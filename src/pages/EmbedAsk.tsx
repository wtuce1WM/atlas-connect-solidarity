// Public embed: iframe-friendly, business-scoped AI concierge.
// Route: /embed/ask/:slug
// - No header/nav/footer.
// - No auth required (uses public anon key for the edge function).
// - Streams via /functions/v1/embed-ai-chat.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Send, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const LANG_LABELS: Record<string, { placeholder: string; hint: string; opener: (name: string) => string }> = {
  fr: {
    placeholder: "Posez votre question…",
    hint: "Assistant IA propulsé par One World Morocco",
    opener: (n) => `Bonjour 👋 Je suis l'assistant de **${n}**. Comment puis-je vous aider ?`,
  },
  en: {
    placeholder: "Ask a question…",
    hint: "AI assistant powered by One World Morocco",
    opener: (n) => `Hi 👋 I'm the assistant for **${n}**. How can I help?`,
  },
  ar: {
    placeholder: "اطرح سؤالك…",
    hint: "مساعد ذكي بواسطة One World Morocco",
    opener: (n) => `مرحبًا 👋 أنا مساعد **${n}**. كيف يمكنني مساعدتك؟`,
  },
};

const EmbedAsk = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const lang = (["fr", "en", "ar"].includes(params.get("lang") || "") ? params.get("lang") : "fr") as "fr" | "en" | "ar";
  const initialTheme = params.get("theme") === "light" ? "light" : "dark";
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("embed-ask-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return initialTheme;
  });
  useEffect(() => {
    try { window.localStorage.setItem("embed-ask-theme", theme); } catch { /* noop */ }
  }, [theme]);

  const [businessName, setBusinessName] = useState<string>("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const L = LANG_LABELS[lang];

  // Fetch business name for header + opening message.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      const name = data?.name || "";
      setBusinessName(name);
      if (name) {
        setMsgs([{ role: "assistant", content: L.opener(name) }]);
      } else {
        setError(lang === "en" ? "Establishment not found." : lang === "ar" ? "المؤسسة غير موجودة." : "Établissement introuvable.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => { inputRef.current?.focus(); }, [businessName]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || !businessName) return;
    setInput("");
    setError(null);
    const userMsg: Msg = { role: "user", content: text };
    // Skip the opening assistant "greeting" when building history for the model.
    const history = msgs.filter((_, i) => !(i === 0 && msgs[0].role === "assistant"));
    const nextUi: Msg[] = [...msgs, userMsg, { role: "assistant", content: "" }];
    setMsgs(nextUi);
    setStreaming(true);
    const assistantIdx = nextUi.length - 1;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-ai-chat`;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anon}`,
          apikey: anon,
        },
        body: JSON.stringify({
          businessSlug: slug,
          language: lang,
          messages: [...history, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "chunk" && typeof evt.delta === "string") {
              acc += evt.delta;
              setMsgs((cur) => {
                const copy = cur.slice();
                copy[assistantIdx] = { role: "assistant", content: acc };
                return copy;
              });
            } else if (evt.type === "error") {
              throw new Error(evt.message || "stream_error");
            }
          } catch { /* skip */ }
        }
      }
      if (!acc) {
        setMsgs((cur) => {
          const copy = cur.slice();
          copy[assistantIdx] = {
            role: "assistant",
            content: lang === "en" ? "Sorry, I couldn't answer right now." : lang === "ar" ? "عذرًا، لا أستطيع الإجابة الآن." : "Désolé, je ne peux pas répondre pour le moment.",
          };
          return copy;
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setMsgs((cur) => cur.slice(0, -1));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const bg = theme === "light" ? "bg-white" : "bg-neutral-950";
  const surface = theme === "light" ? "bg-white text-neutral-900" : "bg-neutral-950 text-neutral-100";
  const userBubble = theme === "light" ? "bg-neutral-900 text-white" : "bg-white text-neutral-900";
  const asstBubble = theme === "light" ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-50";
  const border = theme === "light" ? "border-neutral-200" : "border-neutral-800";
  const inputBg = theme === "light" ? "bg-white" : "bg-neutral-900";

  return (
    <div dir={dir} className={`fixed inset-0 flex flex-col ${surface}`}>
      <header className={`px-4 py-3 border-b ${border} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-full bg-[#C24B3F] flex items-center justify-center text-white text-sm font-semibold">
          {(businessName || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-sm">{businessName || "…"}</div>
          <div className="text-[11px] opacity-60 truncate">{L.hint}</div>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Dark mode" : "Light mode"}
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${border} opacity-70 hover:opacity-100 transition-opacity`}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </header>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${bg}`}>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? userBubble : asstBubble}`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
        {streaming && msgs[msgs.length - 1]?.role === "assistant" && !msgs[msgs.length - 1]?.content && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${asstBubble}`}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}
        {error && <div className="text-xs text-red-500">{error}</div>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className={`p-3 border-t ${border} ${bg}`}
      >
        <div className={`flex items-end gap-2 rounded-2xl border ${border} ${inputBg} px-3 py-2`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder={L.placeholder}
            disabled={streaming || !businessName}
            className={`flex-1 resize-none bg-transparent outline-none text-sm max-h-32 ${theme === "light" ? "placeholder:text-neutral-400" : "placeholder:text-neutral-500"}`}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim() || !businessName}
            aria-label="Send"
            className="w-8 h-8 rounded-full bg-[#C24B3F] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmbedAsk;
