# Conventions UI

Design system de référence. Toute nouvelle UI doit s'y conformer.

## Couleurs (tokens HSL uniquement)

- **Primary** — Terracotta (défini dans `index.css`)
- **Gold** — `#D4AF37` — accents premium, badges, CTA secondaires
- **WhatsApp** — `#25D366` — bouton WhatsApp uniquement
- **Theme** — Dark theme par défaut

**Règle stricte :** jamais de classes Tailwind couleur en dur dans les composants (`text-white`, `bg-black`…). Toujours via tokens sémantiques (`text-foreground`, `bg-background`, `text-primary`…).

## Typographie

- **Headings / noms de fiches** — Montserrat
- **Body / texte courant** — Avenir (fallback : Avenir Next, Nunito Sans)
- **Jamais** de serif générique.

## Composants

- Composants shadcn dans `src/components/ui/` — ne pas modifier directement, customiser via variantes.
- Radix Select **verrouillé** en `2.1.6`.
- dnd-kit **verrouillé** en `9.0.0`.
- **Interdit** : nester un `<Checkbox />` dans un `<button>`.

## Z-index overlays

Les panneaux ouverts récursivement doivent utiliser z-index >= 85 pour passer au-dessus des slidepanels.

## Icônes

Bibliothèque `react-icons` (40 000+ icônes). Format `prefixe:NomIcone` en BO.
