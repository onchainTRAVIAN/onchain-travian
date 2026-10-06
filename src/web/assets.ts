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
  // Raster art (scripts/art/kie): <stem>-<stage>.png (old-school buildings) or .webp, preferred when present.
  for (let stage = levelStage(level); stage >= 1; stage--) {
    for (const ext of ['png', 'webp']) {
      const rel = `img/${dir}/${stem}-${stage}.${ext}`;
      if (has(rel)) return assetUrl(rel);
    }
  }
  for (let stage = levelStage(level); stage >= 2; stage--) {
    const rel = `img/${dir}/${stem}-${stage}.svg`;
    if (has(rel)) return assetUrl(rel);
  }
  return assetUrl(`img/${dir}/${stem}.svg`);
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
