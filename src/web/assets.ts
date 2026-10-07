import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Folder served at /static (src/web/public in dev, dist/web/public in production). */
export const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'public');

const exists = new Map<string, boolean>();
export function hasAsset(rel: string): boolean {
  return has(rel);
}
function has(rel: string): boolean {
  let e = exists.get(rel);
  if (e === undefined) {
    e = existsSync(join(PUBLIC_DIR, rel));
    exists.set(rel, e);
  }
  return e;
}

/** Look stage for a level: 1 (levels 1–4), 2 (5–9), 3 (10–14), 4 (15–19), 5 (20+). */
export function levelStage(level: number): number {
  if (level >= 20) return 5;
  return Math.max(1, Math.floor(level / 5) + 1);
}

/**
 * Picture of a building at its level: `img/<dir>/<stem>-<stage>.svg` when that stage was drawn,
 * otherwise the nearest lower stage, otherwise the base `<stem>.svg`.
 */
export function stagedImage(dir: string, stem: string, level: number): string {
  return assetUrl(stagedRel(dir, stem, level));
}

/** Path (under public/) of the picture `stagedImage` links. */
export function stagedRel(dir: string, stem: string, level: number): string {
  // Raster art (scripts/art/kie): <stem>-<stage>.png (old-school buildings) or .webp, preferred when present.
  for (let stage = levelStage(level); stage >= 1; stage--) {
    for (const ext of ['png', 'webp']) {
      const rel = `img/${dir}/${stem}-${stage}.${ext}`;
      if (has(rel)) return rel;
    }
  }
  for (let stage = levelStage(level); stage >= 2; stage--) {
    const rel = `img/${dir}/${stem}-${stage}.svg`;
    if (has(rel)) return rel;
  }
  return `img/${dir}/${stem}.svg`;
}

export interface ArtBox { x: number; y: number; w: number; h: number }
let artBoxes: Map<string, ArtBox> | null = null;

/**
 * Drawn area of a 75×100 building picture (from masks.json, scripts/gen-masks.py), so info pages can
 * frame the building itself instead of its mostly empty canvas. Null when the picture has no mask.
 */
export function artBox(rel: string): ArtBox | null {
  if (!artBoxes) {
    artBoxes = new Map();
    try {
      const j = JSON.parse(readFileSync(join(PUBLIC_DIR, 'masks.json'), 'utf8')) as { cell: number; masks: Record<string, { cols: number; rows: number; data: string[] }> };
      for (const [key, m] of Object.entries(j.masks)) {
        if (!key.endsWith('@75x100')) continue;
        let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
        m.data.forEach((row, r) => {
          for (let c = 0; c < m.cols; c++) {
            if ((parseInt(row[c >> 2] ?? '0', 16) >> (3 - (c & 3))) & 1) {
              x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r);
            }
          }
        });
        if (x1 >= 0) artBoxes.set(`img/${key.slice(0, -'@75x100'.length)}`, { x: x0 * j.cell, y: y0 * j.cell, w: (x1 - x0 + 1) * j.cell, h: (y1 - y0 + 1) * j.cell });
      }
    } catch {
      /* no masks: pictures show their whole canvas */
    }
  }
  return artBoxes.get(rel) ?? null;
}

/** A picture by path without extension: old-school PNG, then WebP, then the SVG. */
export function pic(relNoExt: string): string {
  for (const ext of ['png', 'webp']) if (has(`${relNoExt}.${ext}`)) return assetUrl(`${relNoExt}.${ext}`);
  return assetUrl(`${relNoExt}.svg`);
}

/** Wall overlay: wooden spikes for every tribe at levels 1–4, then the tribe's own wall by stage. */
export function wallImage(stem: string, level: number): string {
  if (level >= 1 && level < 5) {
    if (has('img/walls/spikes.png')) return assetUrl('img/walls/spikes.png');
    if (has('img/walls/spikes.svg')) return assetUrl('img/walls/spikes.svg');
  }
  return stagedImage('walls', stem, level);
}

/** Content hash of a static file, appended as ?v= so browsers fetch the new copy after a deploy. */
const versions = new Map<string, string>();
export function assetUrl(rel: string): string {
  let v = versions.get(rel);
  if (v === undefined) {
    try {
      v = createHash('sha1').update(readFileSync(join(PUBLIC_DIR, rel))).digest('hex').slice(0, 10);
    } catch {
      v = '0';
    }
    versions.set(rel, v);
  }
  return `/static/${rel}?v=${v}`;
}
