import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NOTE_ID = "919622ac-3bfe-4e3e-ab64-0dfeb3bd1696";

const TestNoteViewer = () => {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<string>("none");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("knowledge_entries")
        .select("title, content")
        .eq("id", NOTE_ID)
        .maybeSingle();
      if (data) {
        setTitle(data.title);
        setContent(data.content);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Ville :</span>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            <SelectItem value="marrakech">Marrakech</SelectItem>
            <SelectItem value="essaouira">Essaouira</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!content ? (
        <div className="text-muted-foreground">Note introuvable.</div>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-li:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
};

export default TestNoteViewer;
