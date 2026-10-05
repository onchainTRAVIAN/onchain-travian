import { FAQ, FAQ_CATEGORIES, type FaqBlock, type FaqCategory, type FaqTopic } from '../../game/rules/faq.js';
import { html, type SafeHtml } from '../html.js';
import { icon } from './layout.js';

/** **bold** and [label](/internal/path) inside otherwise escaped text. */
export function inline(s: string): SafeHtml {
  const parts = s.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)\s]*\))/g);
  return html`${parts.map((p) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(p);
    if (b) return html`<b>${b[1]}</b>`;
    const l = /^\[([^\]]+)\]\((\/[^)\s]*)\)$/.exec(p);
    if (l && !l[2]?.startsWith('//')) return html`<a href="${l[2]}">${l[1]}</a>`;
    return html`${p}`;
  })}`;
}

function block(b: FaqBlock): SafeHtml {
  if ('p' in b) return html`<p>${inline(b.p)}</p>`;
  if ('note' in b) return html`<div class="fnote">${inline(b.note)}</div>`;
  if ('steps' in b) return html`<ol class="fsteps">${b.steps.map((s) => html`<li>${inline(s)}</li>`)}</ol>`;
  if ('tips' in b) return html`<div class="ftips"><b>What works best</b><ul>${b.tips.map((s) => html`<li>${inline(s)}</li>`)}</ul></div>`;
  return html`<div class="tblwrap"><table class="ftable"><thead><tr>${b.table.head.map((h) => html`<th>${inline(h)}</th>`)}</tr></thead>
    <tbody>${b.table.rows.map((r) => html`<tr>${r.map((c) => html`<td>${inline(c)}</td>`)}</tr>`)}</tbody></table></div>`;
}

const CHIPS = ['capture oasis', 'cranny', 'raid', 'protection', 'gold club', 'hero skills', 'new village', 'catapult', 'crop', 'traps'];

function searchBox(q: string): SafeHtml {
  return html`<form method="get" action="/help" class="fsearch" role="search">
      <label for="faqq" class="sr">Search the guide</label>
      <input id="faqq" type="search" name="q" value="${q}" placeholder="Search the guide — e.g. capture oasis, cranny, hero…" autocomplete="off" data-faq-index="/help/index.json">
      <button type="submit">Search</button>
    </form>
    <div id="faqlive" class="flive" hidden></div>`;
}

function topicLink(t: FaqTopic, showCat = false): SafeHtml {
  const cat = FAQ_CATEGORIES.find((c) => c.id === t.category);
  return html`<li><a href="/help/${t.id}">${t.title}</a>${showCat && cat ? html` <span class="fcat">${cat.title}</span>` : ''}<span class="fsum">${t.summary}</span></li>`;
}

function head(title: string, sub: string): SafeHtml {
  return html`<div class="vtitle"><h1>${title}</h1><span class="vmeta">${sub}</span></div>`;
}

export function helpHome(d: { q: string; results: { topic: FaqTopic; score: number }[] | null; category: FaqCategory | null }): SafeHtml {
  const cats = FAQ_CATEGORIES.map((c) => ({ ...c, topics: FAQ.filter((t) => t.category === c.id) })).filter((c) => c.topics.length > 0);
  const chosen = d.category ? cats.find((c) => c.id === d.category) : undefined;
  return html`${head('Game guide', `${FAQ.length} topics · search or browse`)}
    ${searchBox(d.q)}
    ${d.results
      ? html`<section class="spanel fres"><h3 class="sp-head">${d.results.length ? `Results for “${d.q}”` : `Nothing found for “${d.q}”`}<span>${d.results.length}</span></h3>
          ${d.results.length
            ? html`<ul class="flist">${d.results.map((r) => topicLink(r.topic, true))}</ul>`
            : html`<p class="pad small">Try fewer or other words, or one of these: ${CHIPS.map((c) => html`<a href="/help?q=${encodeURIComponent(c)}" class="fchip">${c}</a> `)}</p>`}</section>`
      : html`<p class="fchips">${CHIPS.map((c) => html`<a href="/help?q=${encodeURIComponent(c)}" class="fchip">${c}</a> `)}</p>`}
    ${chosen
      ? html`<section class="spanel"><h3 class="sp-head">${chosen.title}<span><a href="/help">all topics</a></span></h3><ul class="flist">${chosen.topics.map((t) => topicLink(t))}</ul></section>`
      : html`<div class="fcats">${cats.map(
          (c) => html`<section class="spanel fcatbox"><h3 class="sp-head"><a href="/help?c=${c.id}">${icon(c.icon, '', 16)} ${c.title}</a><span>${c.topics.length}</span></h3>
            <p class="small muted pad">${c.blurb}</p>
            <ul class="flist short">${c.topics.slice(0, 5).map((t) => html`<li><a href="/help/${t.id}">${t.title}</a></li>`)}
              ${c.topics.length > 5 ? html`<li><a href="/help?c=${c.id}" class="more">all ${c.topics.length} topics »</a></li>` : ''}</ul></section>`,
        )}</div>`}`;
}

export function helpTopic(t: FaqTopic): SafeHtml {
  const cat = FAQ_CATEGORIES.find((c) => c.id === t.category);
  const siblings = FAQ.filter((x) => x.category === t.category);
  const i = siblings.findIndex((x) => x.id === t.id);
  const prev = i > 0 ? siblings[i - 1] : undefined;
  const next = i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : undefined;
  const related = (t.related ?? []).map((id) => FAQ.find((x) => x.id === id)).filter((x): x is FaqTopic => !!x);
  return html`<p class="fcrumb"><a href="/help">Game guide</a> › <a href="/help?c=${t.category}">${cat?.title ?? ''}</a></p>
    ${searchBox('')}
    <article class="spanel ftopic">
      <h1 class="ftitle">${t.title}</h1>
      <div class="fanswer">${inline(t.summary)}</div>
      <div class="fbody">${t.body.map(block)}</div>
      ${t.links?.length ? html`<p class="flinks">${t.links.filter((l) => l.href.startsWith('/') && !l.href.startsWith('//')).map((l) => html`<a class="btn small secondary" href="${l.href}">${l.label}</a> `)}</p>` : ''}
    </article>
    ${related.length ? html`<section class="spanel"><h3 class="sp-head">Related topics</h3><ul class="flist">${related.map((r) => topicLink(r, true))}</ul></section>` : ''}
    <p class="fnav">${prev ? html`<a href="/help/${prev.id}">« ${prev.title}</a>` : html`<span></span>`}${next ? html`<a href="/help/${next.id}">${next.title} »</a>` : ''}</p>`;
}
