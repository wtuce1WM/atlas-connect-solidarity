// Shared SVG curve smoothing (Catmull-Rom → cubic Bézier) used by embed widgets.
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  // Duplicate endpoints for natural start/end tangents.
  const P = [first, ...points, last];

  const toCubic = (i: number) => {
    const p0 = P[i - 1];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    return `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };

  return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ` + points.slice(0, -1).map((_, i) => toCubic(i + 1)).join(" ");
}
