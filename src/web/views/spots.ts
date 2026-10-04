/**
 * Click areas for the village centre (540×448 picture). Building pictures are 75×100 and overlap
 * their neighbours, so clicks go to an SVG layer of ellipses over each building's footprint instead.
 * Positions match scripts/gen-positions.py (top-left of each 75×100 building, slot = 18 + d).
 */
const D: [number, number][] = [
  [115, 52], [198, 27], [258, 17], [332, 32], [388, 81], [80, 91], [161, 98], [247, 81], [395, 122], [66, 161],
  [192, 126], [155, 152], [402, 180], [84, 200], [227, 196], [354, 213], [158, 236], [286, 247], [144, 267], [262, 276],
];

/** Ellipse height/width ratio (the village is seen from above at an angle). */
const ASPECT = 0.72;
const MAX_RX = 36;

export interface Spot {
  slot: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

function centres(): { slot: number; cx: number; cy: number; max: number }[] {
  const out = D.map(([x, y], i) => ({ slot: 19 + i, cx: x + 37.5, cy: y + 74, max: MAX_RX }));
  out.push({ slot: 39, cx: 350, cy: 240, max: 40 }); // rally point (69×120 picture at 316,161)
  out.push({ slot: 40, cx: 255, cy: 372, max: 30 }); // wall gate at the bottom of the ring
  return out;
}

/** Same-aspect ellipses never overlap when each radius is at most half the scaled distance to every neighbour. */
export const TOWN_SPOTS: Spot[] = (() => {
  const c = centres();
  return c.map((a) => {
    let r = a.max;
    for (const b of c) {
      if (b === a) continue;
      const d = Math.hypot(a.cx - b.cx, (a.cy - b.cy) / ASPECT);
      r = Math.min(r, d / 2 - 0.5);
    }
    return { slot: a.slot, cx: a.cx, cy: a.cy, rx: Math.round(r * 10) / 10, ry: Math.round(r * ASPECT * 10) / 10 };
  });
})();
