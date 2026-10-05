import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Folder served at /static (src/web/public in dev, dist/web/public in production). */
export const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'public');

const exists = new Map<string, boolean>();
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
  for (let stage = levelStage(level); stage >= 2; stage--) {
    const rel = `img/${dir}/${stem}-${stage}.svg`;
    if (has(rel)) return `/static/${rel}`;
  }
  return `/static/img/${dir}/${stem}.svg`;
}

/** Wall overlay: wooden spikes for every tribe at levels 1–4, then the tribe's own wall by stage. */
export function wallImage(stem: string, level: number): string {
  if (level >= 1 && level < 5 && has('img/walls/spikes.svg')) return '/static/img/walls/spikes.svg';
  return stagedImage('walls', stem, level);
}
