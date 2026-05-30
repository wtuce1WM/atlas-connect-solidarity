/** Convert Issuu/Calaméo/FlipHTML5 URLs to embeddable format, or return as-is */
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
  // FlipHTML5: use the direct basic embed endpoint, avoiding the full website wrapper/promo layer.
  const flipHtml5Match = url.match(/fliphtml5\.com\/([^/]+)\/([^/?#]+)/i);
  if (flipHtml5Match) {
    return `https://online.fliphtml5.com/${flipHtml5Match[1]}/${flipHtml5Match[2]}/`;
  }
  return url;
}
