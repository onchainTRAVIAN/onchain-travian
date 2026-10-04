/**
 * Click areas for the village centre (540×448 picture). Building pictures are 75×100 and overlap
 * their neighbours, so clicks go to an SVG layer instead: every point belongs to the nearest spot
 * (a Voronoi cell around the middle of the building picture), clipped to a maximum reach so
 * clicks on far-away grass do nothing.
 * Positions match scripts/gen-positions.py (top-left of each 75×100 building, slot = 18 + d).
 */
const D: [number, number][] = [
  [115, 52], [198, 27], [258, 17], [332, 32], [388, 81], [80, 91], [161, 98], [247, 81], [395, 122], [66, 161],
  [192, 126], [155, 152], [402, 180], [84, 200], [227, 196], [354, 213], [158, 236], [286, 247], [144, 267], [262, 276],
];

type P = [number, number];

export interface Spot {
  slot: number;
  /** Middle of the building picture (aim point). */
  cx: number;
  cy: number;
  /** Click area: SVG polygon points. */
  points: string;
  /** Hover outline: ellipse around the building. */
  rx: number;
  ry: number;
}

function sites(): { slot: number; x: number; y: number; reach: number; rx: number; ry: number }[] {
  const out = D.map(([x, y], i) => ({ slot: 19 + i, x: x + 37.5, y: y + 64, reach: 52, rx: 36, ry: 34 }));
  out.push({ slot: 39, x: 350, y: 228, reach: 60, rx: 40, ry: 46 }); // rally point (69×120 picture at 316,161)
  out.push({ slot: 40, x: 255, y: 374, reach: 30, rx: 28, ry: 16 }); // wall gate at the bottom of the ring
  return out;
}

/** Keep the part of polygon `poly` on the side of the bisector of a→b that is closer to a. */
function clip(poly: P[], a: P, b: P): P[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const side = (p: P) => (p[0] - mx) * nx + (p[1] - my) * ny; // < 0: closer to a
  const out: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as P;
    const q = poly[(i + 1) % poly.length] as P;
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

export const TOWN_SPOTS: Spot[] = (() => {
  const all = sites();
  return all.map((s) => {
    // Start from a circle of the spot's reach, then cut away everything closer to another spot.
    let poly: P[] = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      return [s.x + Math.cos(a) * s.reach, s.y + Math.sin(a) * s.reach] as P;
    });
    for (const o of all) if (o !== s) poly = clip(poly, [s.x, s.y], [o.x, o.y]);
    const points = poly.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ');
    return { slot: s.slot, cx: s.x, cy: s.y, points, rx: s.rx, ry: s.ry };
  });
})();
