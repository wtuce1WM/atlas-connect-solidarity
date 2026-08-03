/** Ordre d'affichage des articles /blog : épinglés d'abord, puis sort_order décroissant, puis date. */
export const compareBlogOrder = (
  a: { is_pinned?: boolean | null; sort_order?: number | null; date: string },
  b: { is_pinned?: boolean | null; sort_order?: number | null; date: string },
) => {
  const pa = a.is_pinned ? 1 : 0;
  const pb = b.is_pinned ? 1 : 0;
  if (pa !== pb) return pb - pa;
  const sa = a.sort_order ?? 0;
  const sb = b.sort_order ?? 0;
  if (sa !== sb) return sb - sa;
  return new Date(b.date).getTime() - new Date(a.date).getTime();
};
