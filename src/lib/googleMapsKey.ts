/**
 * Clé Google Maps utilisée pour les iframes Embed (place / streetview / directions / view).
 *
 * ⚠️ Cette clé est publique par nature (incluse dans l'URL des iframes côté navigateur).
 * Elle DOIT être restreinte par HTTP referrers dans la Google Cloud Console
 * (oneworldmorocco.com, *.lovable.app, localhost) et limitée aux APIs Maps Embed
 * uniquement, avec un quota journalier.
 *
 * Valeur lue depuis l'environnement (VITE_GOOGLE_MAPS_EMBED_KEY).
 * Pour rotation : mettre à jour la variable d'environnement.
 */
export const GOOGLE_MAPS_EMBED_KEY: string =
  (import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined) ?? "";
