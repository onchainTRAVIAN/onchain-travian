import type { FaqTopic } from './faq.js';

/** Guide content (filled by the guide writer). */
export const FAQ_TOPICS: FaqTopic[] = [
  {
    id: 'capture-oasis',
    category: 'oases',
    title: 'How do I capture an oasis?',
    keywords: ['oasis', 'capture', 'conquer oasis', 'take oasis', 'annex', 'bonus'],
    summary: "Attack (not raid) a free oasis within 3 fields with your hero, kill every animal, and have a Hero's Mansion of level 10 or more.",
    body: [{ steps: ["Build the **Hero's Mansion** to level 10 (15 and 20 hold a 2nd and 3rd oasis)."] }],
    links: [{ href: '/simulator', label: 'Combat simulator' }],
  },
];
