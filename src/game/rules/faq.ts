/**
 * Game guide / FAQ: topics with structured, escape-safe content (rendered by src/web/views/help.ts)
 * and a simple ranked keyword search. Content lives in ./faqdata.ts.
 */
import { FAQ_TOPICS } from './faqdata.js';

export type FaqCategory =
  | 'start'
  | 'resources'
  | 'buildings'
  | 'troops'
  | 'combat'
  | 'defence'
  | 'hero'
  | 'oases'
  | 'expansion'
  | 'market'
  | 'alliance'
  | 'gold'
  | 'endgame'
  | 'stats'
  | 'account'
  | 'strategy';

export const FAQ_CATEGORIES: { id: FaqCategory; title: string; icon: string; blurb: string }[] = [
  { id: 'start', title: 'Getting started', icon: 'menu/home', blurb: 'Your first hours, protection and the screens' },
  { id: 'resources', title: 'Resources & fields', icon: 'res/crop', blurb: 'Production, storage, crop, oases bonus' },
  { id: 'buildings', title: 'Buildings', icon: 'menu/admin', blurb: 'What each building does and when to build it' },
  { id: 'troops', title: 'Troops & training', icon: 'menu/rally', blurb: 'Units, research, upgrades, training' },
  { id: 'combat', title: 'Attacking & raiding', icon: 'ui/attack', blurb: 'Raids, attacks, scouting, siege, simulator' },
  { id: 'defence', title: 'Defence & protection', icon: 'ui/reinforce', blurb: 'Walls, cranny, traps, reinforcements' },
  { id: 'hero', title: 'Hero', icon: 'menu/hero', blurb: 'Training, skills, experience, revival' },
  { id: 'oases', title: 'Oases', icon: 'res/wood', blurb: 'Animals, looting and capturing oases' },
  { id: 'expansion', title: 'New villages', icon: 'menu/send', blurb: 'Settlers, culture points, conquering' },
  { id: 'market', title: 'Market & trade', icon: 'menu/market', blurb: 'Merchants, offers, NPC trade, Gold market' },
  { id: 'alliance', title: 'Alliance', icon: 'menu/alliance', blurb: 'Founding, members, diplomacy, chat' },
  { id: 'gold', title: 'Gold & services', icon: 'res/gold', blurb: 'Gold Club, boosts, finish now, protection' },
  { id: 'endgame', title: 'Endgame', icon: 'menu/stats', blurb: 'Natars, artifacts, World Wonder' },
  { id: 'stats', title: 'Statistics & medals', icon: 'menu/stats', blurb: 'Rankings, weekly Top 10 and prizes' },
  { id: 'account', title: 'Account & wallet', icon: 'menu/profile', blurb: 'Profile, avatar, wallet, token perks' },
  { id: 'strategy', title: 'Strategy & tips', icon: 'menu/help', blurb: 'What works best, per tribe and per phase' },
];

/**
 * Inline text uses **bold** and [label](/path) links (internal paths only); everything else is
 * plain text and is escaped when rendered.
 */
export type FaqBlock =
  | { p: string }
  | { steps: string[] }
  | { tips: string[] }
  | { note: string }
  | { table: { head: string[]; rows: string[][] } };

export interface FaqTopic {
  id: string;
  category: FaqCategory;
  title: string;
  /** Words players might type (synonyms, misspellings, other languages' common terms welcome). */
  keywords: string[];
  /** One or two sentences: the short answer. */
  summary: string;
  body: FaqBlock[];
  related?: string[];
  links?: { href: string; label: string }[];
}

export const FAQ: FaqTopic[] = FAQ_TOPICS;

export function faqTopic(id: string): FaqTopic | undefined {
  return FAQ.find((t) => t.id === id);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\*\*|\[|\]\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9%+]+/g, ' ')
    .trim();

function blockText(b: FaqBlock): string {
  if ('p' in b) return b.p;
  if ('note' in b) return b.note;
  if ('steps' in b) return b.steps.join(' ');
  if ('tips' in b) return b.tips.join(' ');
  return [...b.table.head, ...b.table.rows.flat()].join(' ');
}

/** Words that carry no meaning in a search. */
const STOP = new Set(['how', 'to', 'do', 'i', 'a', 'an', 'the', 'is', 'what', 'my', 'can', 'of', 'in', 'on', 'for', 'and', 'or', 'it', 'does', 'why', 'where', 'when', 'with', 'me', 'get', 'you', 'your']);

/** Ranked keyword search: title and keywords count most, then the summary, then the body. */
export function searchFaq(query: string, limit = 30): { topic: FaqTopic; score: number }[] {
  const words = norm(query).split(' ').filter((w) => w && !STOP.has(w));
  if (words.length === 0) return [];
  const out: { topic: FaqTopic; score: number }[] = [];
  for (const t of FAQ) {
    const title = norm(t.title);
    const keys = norm(t.keywords.join(' '));
    const summary = norm(t.summary);
    const body = norm(t.body.map(blockText).join(' '));
    let score = 0;
    let hits = 0;
    for (const w of words) {
      const re = new RegExp(`(^| )${w.replace(/[^a-z0-9%+]/g, '')}`);
      const exact = new RegExp(`(^| )${w.replace(/[^a-z0-9%+]/g, '')}( |$)`);
      let s = 0;
      if (exact.test(title)) s += 12;
      else if (re.test(title)) s += 8;
      if (exact.test(keys)) s += 10;
      else if (re.test(keys)) s += 6;
      if (re.test(summary)) s += 4;
      if (re.test(body)) s += 1;
      if (s > 0) hits++;
      score += s;
    }
    // Topics matching every word rank above those matching only some.
    if (score > 0) out.push({ topic: t, score: score + (hits === words.length ? 20 : 0) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
