/**
 * Normalise un numéro de téléphone pour les liens tel:, wa.me/, skype:, etc.
 * Supprime tous les caractères non numériques sauf le '+' initial.
 * Ex: "+212 661-43 92 21" → "+212661439221"
 *     "0661 43 92 21"    → "0661439221"
 */
export const cleanPhone = (num: string): string =>
  num.replace(/(?!^\+)[^\d]/g, '');

/**
 * Construit une URL WhatsApp valide à partir d'un numéro brut.
 * Supprime tous les non-chiffres (y compris le +).
 */
export const whatsappUrl = (num: string, message?: string): string => {
  const digits = num.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
