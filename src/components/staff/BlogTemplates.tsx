import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutTemplate,
  FileText,
  ListOrdered,
  MapPin,
  Video,
  HelpCircle,
  Image,
  Bookmark,
  Code,
  User,
} from "lucide-react";

interface FieldRowProps {
  icon: ReactNode;
  label: string;
  description: string;
  optional?: boolean;
}

const FieldRow = ({ icon, label, description, optional }: FieldRowProps) => (
  <div className="flex items-start gap-3 py-2">
    <div className="mt-0.5 text-primary shrink-0">{icon}</div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-foreground">{label}</span>
        {optional && <Badge variant="outline" className="text-[10px] h-5">optionnel</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  </div>
);

const BlogTemplates = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Templates de blog</h2>
        <p className="text-sm text-muted-foreground">
          Deux modèles coexistent. Choisissez le template selon le format éditorial visé.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <ListOrdered className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Article structuré — template <code className="text-xs bg-muted px-1 py-0.5 rounded">article_template</code></CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Classements, Top 20, comparatifs, guides de quartier et fiches de proximité.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/90">
            Chaque article est découpé en <strong>entrées</strong> (établissements), avec un hero
            immersif, une intro, un résumé TL;DR et une FAQ. C'est le format utilisé par la série
            Top 20 et par les articles rattachés à un établissement (proximité).
          </p>

          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Structure et champs
            </h4>
            <div className="grid gap-1 divide-y divide-border">
              <FieldRow
                icon={<ListOrdered className="h-4 w-4" />}
                label="entries_*"
                description="Tableau d'établissements. Chaque entrée a un id, pretitle, title, hook, paragraphs, review et rank (optionnel N°1, 2, 3)."
              />
              <FieldRow
                icon={<LayoutTemplate className="h-4 w-4" />}
                label="hero_title_top / hero_title_bottom / hero_subtitle"
                description="Texte du hero en deux lignes + sous-titre."
              />
              <FieldRow
                icon={<FileText className="h-4 w-4" />}
                label="intro_*"
                description="Paragraphe d'introduction sous le hero."
              />
              <FieldRow
                icon={<HelpCircle className="h-4 w-4" />}
                label="tldr_*"
                description="Réponse courte 2-3 phrases pour les LLM / AIO."
                optional
              />
              <FieldRow
                icon={<HelpCircle className="h-4 w-4" />}
                label="faq_*"
                description="Questions/réponses en fin d'article, balisées FAQPage."
                optional
              />
              <FieldRow
                icon={<Video className="h-4 w-4" />}
                label="video_section_config"
                description="Badge de sélection des vidéos pour le bloc 'Les offres du moment'."
                optional
              />
              <FieldRow
                icon={<MapPin className="h-4 w-4" />}
                label="anchor_poi / anchor_business_id"
                description="Point d'ancrage sur la carte (ex. Riad Dar Najat)."
                optional
              />
              <FieldRow
                icon={<Image className="h-4 w-4" />}
                label="custom_hero_image_url"
                description="Image hero personnalisée. Sinon, première image du premier établissement."
                optional
              />
              <FieldRow
                icon={<Bookmark className="h-4 w-4" />}
                label="bookmark_slug"
                description="Slug de sauvegarde dans le Club."
                optional
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">Top 20</Badge>
            <Badge variant="secondary" className="text-xs">Proximité</Badge>
            <Badge variant="secondary" className="text-xs">Comparatif</Badge>
            <Badge variant="secondary" className="text-xs">Guide quartier</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Article personnalisé — template <code className="text-xs bg-muted px-1 py-0.5 rounded">custom</code></CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Articles éditoriaux libres, contenu HTML, storytelling ou pages institutionnelles.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground/90">
            Le contenu est un bloc HTML riche stocké dans <code className="text-xs bg-muted px-1 py-0.5 rounded">content_*</code>. Le rendu est libre, mais le SEO reste structuré (schema Article). A utiliser quand le format n'est pas un classement d'établissements.
          </p>

          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Structure et champs
            </h4>
            <div className="grid gap-1 divide-y divide-border">
              <FieldRow
                icon={<Code className="h-4 w-4" />}
                label="content_fr / content_en / content_ar"
                description="Corps HTML complet de l'article."
              />
              <FieldRow
                icon={<Image className="h-4 w-4" />}
                label="cover_image_url"
                description="Image principale en une."
                optional
              />
              <FieldRow
                icon={<User className="h-4 w-4" />}
                label="author_name"
                description="Auteur affiché sous le titre."
                optional
              />
              <FieldRow
                icon={<Bookmark className="h-4 w-4" />}
                label="bookmark_slug"
                description="Slug de sauvegarde dans le Club."
                optional
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">Éditorial libre</Badge>
            <Badge variant="secondary" className="text-xs">Storytelling</Badge>
            <Badge variant="secondary" className="text-xs">Institutionnel</Badge>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="rounded-lg border p-4 bg-muted/20">
        <h3 className="text-sm font-semibold mb-2">Quand utiliser quel template ?</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">article_template</strong> — dès que l'article liste,
            compare ou classe des établissements. L'affichage est cohérent (carte, avis, prix, FAQ).
          </li>
          <li>
            <strong className="text-foreground">custom</strong> — pour un texte libre sans entrées
            structurées (interview, histoire, page d'actualité, contenu éditorial long).
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BlogTemplates;
