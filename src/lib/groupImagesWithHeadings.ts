/**
 * Detects an image immediately followed by an <h2> (or <h3>) and wraps them
 * together in a flex container so the image renders on the same line as the heading.
 *
 * Handles both:
 *   <p><img ...></p><h2>Title</h2>
 *   <img ...><h2>Title</h2>
 */
export function groupImagesWithHeadings(html: string): string {
  if (!html || typeof window === "undefined") return html;
  try {
    const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
    const root = doc.getElementById("root");
    if (!root) return html;

    const children = Array.from(root.children);
    for (let i = 0; i < children.length - 1; i++) {
      const current = children[i];
      const next = children[i + 1];
      if (!(next.tagName === "H2" || next.tagName === "H3")) continue;

      let img: HTMLImageElement | null = null;
      // Case 1: <p><img/></p>
      if (current.tagName === "P" && current.children.length === 1 && current.children[0].tagName === "IMG") {
        img = current.children[0] as HTMLImageElement;
      }
      // Case 2: bare <img/>
      else if (current.tagName === "IMG") {
        img = current as HTMLImageElement;
      }
      if (!img) continue;

      const wrapper = doc.createElement("div");
      wrapper.className = "img-h2-row";
      wrapper.appendChild(img.cloneNode(true));
      wrapper.appendChild(next.cloneNode(true));

      current.replaceWith(wrapper);
      next.remove();
      // Refresh children list since DOM changed
      children.splice(i, 2, wrapper as unknown as Element);
    }

    return root.innerHTML;
  } catch {
    return html;
  }
}
