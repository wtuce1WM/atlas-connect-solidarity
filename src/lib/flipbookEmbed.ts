/** Convert Issuu/Calaméo URLs to embeddable format, or return as-is */
export function getFlipbookEmbedUrl(url: string): string {
  // Issuu: https://issuu.com/username/docs/docname → https://e.issuu.com/embed.html?d=docname&u=username
  const issuuMatch = url.match(/issuu\.com\/([^/]+)\/docs\/([^/?#]+)/);
  if (issuuMatch) {
    return `https://e.issuu.com/embed.html?d=${issuuMatch[2]}&u=${issuuMatch[1]}`;
  }
  // Calaméo: already embeddable
  if (url.includes("calameo.com")) {
    return url;
  }
  return url;
}
