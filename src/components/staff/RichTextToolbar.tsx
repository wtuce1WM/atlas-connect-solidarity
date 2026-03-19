import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, Heading2, Heading3, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Strikethrough, Highlighter, Superscript, Subscript,
  Quote, Minus, ImagePlus, TableIcon, Youtube, Palette,
  Plus, Trash2, ArrowDown, ArrowRight,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextToolbarProps {
  editor: Editor;
}

const COLORS = [
  "#000000", "#e03131", "#2f9e44", "#1971c2", "#f08c00",
  "#9c36b5", "#0c8599", "#e8590c", "#d6336c", "#495057",
];

const ToolbarButton = ({
  active, onClick, disabled, children, title,
}: {
  active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string;
}) => (
  <Button
    type="button"
    variant={active ? "secondary" : "ghost"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 p-0"
    title={title}
  >
    {children}
  </Button>
);

const Sep = () => <div className="w-px h-8 bg-border mx-1" />;

const MAX_GRID = 8;

const TableGridPicker = ({ onSelect }: { onSelect: (rows: number, cols: number) => void }) => {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1 text-center">
        {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Choisir la taille"}
      </p>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${MAX_GRID}, 1fr)` }}>
        {Array.from({ length: MAX_GRID * MAX_GRID }, (_, i) => {
          const r = Math.floor(i / MAX_GRID) + 1;
          const c = (i % MAX_GRID) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              type="button"
              className={`w-4 h-4 rounded-[2px] border transition-colors ${active ? "bg-primary border-primary" : "bg-muted border-border hover:border-muted-foreground/40"}`}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onSelect(r, c)}
            />
          );
        })}
      </div>
    </div>
  );
};

const RichTextToolbar = ({ editor }: RichTextToolbarProps) => {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL du lien:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("URL de l'image:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt("URL de la vidéo YouTube:");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
      {/* Text formatting */}
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barré">
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Surligner">
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Exposant">
        <Superscript className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Indice">
        <Subscript className="h-4 w-4" />
      </ToolbarButton>

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Couleur du texte">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => editor.chain().focus().setColor(color).run()}
              />
            ))}
          </div>
          <button
            type="button"
            className="mt-1 text-xs text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            Réinitialiser
          </button>
        </PopoverContent>
      </Popover>

      <Sep />

      {/* Headings */}
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Sep />

      {/* Alignment */}
      <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Aligner à gauche">
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centrer">
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Aligner à droite">
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justifier">
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Sep />

      {/* Lists & links */}
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("link")} onClick={setLink} title="Lien">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>

      <Sep />

      {/* Media & table */}
      <ToolbarButton onClick={addImage} title="Insérer image">
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addYoutube} title="Insérer vidéo YouTube">
        <Youtube className="h-4 w-4" />
      </ToolbarButton>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant={editor.isActive("table") ? "secondary" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Tableau">
            <TableIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 space-y-1" align="start">
          {!editor.isActive("table") && (
            <TableGridPicker onSelect={(rows, cols) => {
              editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
            }} />
          )}
          {editor.isActive("table") && (
            <>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs gap-2" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <ArrowRight className="h-3 w-3" /> Ajouter colonne
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs gap-2" onClick={() => editor.chain().focus().addRowAfter().run()}>
                <ArrowDown className="h-3 w-3" /> Ajouter ligne
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs gap-2 text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}>
                <Trash2 className="h-3 w-3" /> Supprimer tableau
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Spacer + undo/redo */}
      <div className="flex-1" />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

export default RichTextToolbar;
