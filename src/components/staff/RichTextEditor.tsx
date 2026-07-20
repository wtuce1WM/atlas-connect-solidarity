import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";
import { useCallback, useEffect, useMemo, useRef } from "react";
import RichTextToolbar from "./RichTextToolbar";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxHeight?: string;
  bgClass?: string;
}

const stripInlineColors = (html: string): string => {
  if (!html || typeof window === "undefined") return html;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("[style]").forEach((el) => {
      const s = (el as HTMLElement).style;
      s.removeProperty("color");
      s.removeProperty("background-color");
      s.removeProperty("background");
      if (!s.length) el.removeAttribute("style");
    });
    doc.querySelectorAll("font[color]").forEach((el) => el.removeAttribute("color"));
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

const RichTextEditor = ({ content, onChange, placeholder, maxHeight, bgClass }: RichTextEditorProps) => {
  const isInternalChange = useRef(false);


  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
    TextStyle,
    Color,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: "text-primary underline" },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Youtube.configure({ inline: false, ccLanguage: "fr" }),
  ], []);

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-josefin-headings max-w-none min-h-[300px] p-3 focus:outline-none [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_img]:max-w-full [&_img]:rounded-md [&_iframe]:max-w-full [&_iframe]:rounded-md",
      },
      transformPastedHTML(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("[style]").forEach((el) => {
          const s = (el as HTMLElement).style;
          s.removeProperty("color");
          s.removeProperty("background-color");
          s.removeProperty("background");
          if (!s.length) el.removeAttribute("style");
        });
        doc.querySelectorAll("font[color]").forEach((el) => el.removeAttribute("color"));
        return doc.body.innerHTML;
      },
    },
  });

  useEffect(() => {
    if (editor && !isInternalChange.current && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
    isInternalChange.current = false;
  }, [content, editor]);

  if (!editor) return null;

  const isCustomBg = !!bgClass;
  const isLightText = bgClass?.includes("text-white");

  return (
    <div
      className={`rounded-md overflow-y-auto ${bgClass || "border bg-background text-white"}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className={`sticky top-0 z-10 rounded-t-md border-b ${isCustomBg ? (isLightText ? "bg-black/30 border-white/10" : "bg-[#BED1FF] border-black/10") : "bg-background border-b"}`}>
        <RichTextToolbar editor={editor} />
      </div>
      <EditorContent editor={editor} className={isCustomBg ? (isLightText ? "[&_.prose]:text-white" : "[&_.prose]:text-black") : "[&_.prose]:text-white"} />
    </div>
  );
};

export default RichTextEditor;
