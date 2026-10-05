import { svgBar } from './parts.js';
import type { TaskStatus } from '../../game/actions/tasks.js';
import { TASK_CHAPTERS, type TaskReward } from '../../game/rules/tasks.js';
import { faqTopic } from '../../game/rules/faq.js';
import type { TribeId } from '../../game/rules/units.js';
import { hasAsset } from '../assets.js';
import { fmtNum } from '../format.js';
import { html, type SafeHtml } from '../html.js';
import { csrfField, icon, resIcon } from './layout.js';

export function rewardChips(r: TaskReward): SafeHtml {
  return html`<span class="trew">${(['wood', 'clay', 'iron', 'crop'] as const).map((k) => (r[k] ? html`<span>${resIcon(k)}${fmtNum(r[k])}</span>` : ''))}${r.gold ? html`<span class="tgold">${icon('res/gold', 'Gold', 14, 10)}${r.gold}</span>` : ''}</span>`;
}

function meter(have: number, need: number): SafeHtml {
  return html`<span class="tprog">${svgBar((have / Math.max(1, need)) * 100, 'tprog')}<span class="small muted">${fmtNum(have)}/${fmtNum(need)}</span></span>`;
}

function claimForm(s: TaskStatus, csrf: string, cls = ''): SafeHtml {
  return html`<form method="post" action="/tasks/claim" class="inline">${csrfField(csrf)}<input type="hidden" name="id" value="${s.task.id}"><button type="submit" class="${cls}">Collect reward</button></form>`;
}

export function advisorSrc(tribe: TribeId): string {
  return hasAsset(`img/advisor/${tribe}.svg`) ? `/static/img/advisor/${tribe}.svg` : `/static/img/units/big/${tribe}-1.svg`;
}

/** Right-hand "Task overview" panel: advisor, current task, progress and reward. */
export function taskPanel(d: { tribe: TribeId; current: TaskStatus | null; claimable: number; total: number; done: number; csrf: string }): SafeHtml {
  const c = d.current;
  return html`<section class="sp taskbox"><h3 class="sp-head"><a href="/tasks">Task overview</a><span>${d.done}/${d.total}</span></h3>
    <div class="tk-body">
      <span class="tk-adv"><img src="${advisorSrc(d.tribe)}" width="64" height="88" alt="Advisor">${d.claimable ? html`<img class="tk-alert" src="/static/img/${hasAsset('img/advisor/alert.svg') ? 'advisor/alert' : 'ui/rep-y'}.svg" width="22" height="22" alt="Reward ready">` : ''}</span>
      <div class="tk-text">${c
        ? html`<b>${c.task.title}</b>
          ${c.done && !c.claimed
            ? html`<p class="small good">Done! Your reward is ready.</p>${rewardChips(c.task.reward)}<p>${claimForm(c, d.csrf, 'small')}</p>`
            : html`<p class="small">${c.task.how}</p>${c.need ? meter(c.have ?? 0, c.need) : ''}${rewardChips(c.task.reward)}<p><a class="btn small secondary" href="${c.link}">Show me</a></p>`}`
        : html`<b>All tasks done!</b><p class="small">You know your way around. Good luck, ruler!</p>`}
      </div>
    </div>
    ${d.claimable > 1 ? html`<p class="tk-more small"><a href="/tasks">${d.claimable} rewards ready »</a></p>` : html`<p class="tk-more small"><a href="/tasks">All tasks »</a></p>`}
  </section>`;
}

export function tasksView(d: { tribe: TribeId; list: TaskStatus[]; hidden: boolean; csrf: string }): SafeHtml {
  const done = d.list.filter((s) => s.claimed).length;
  return html`<div class="vtitle"><h1>Tasks</h1><span class="vmeta">${done} of ${d.list.length} done · rewards go to your current village</span></div>
    <div class="spanel tk-intro"><img src="${advisorSrc(d.tribe)}" width="64" height="88" alt="">
      <p>Welcome, ruler! These tasks walk you through the game step by step. Each one gives resources, and a few key steps also give Gold. Already done some? Just collect the rewards.</p>
      <form method="post" action="/tasks/hide" class="inline">${csrfField(d.csrf)}<input type="hidden" name="hidden" value="${d.hidden ? '0' : '1'}"><button type="submit" class="small secondary">${d.hidden ? 'Show the task panel' : 'Hide the task panel'}</button></form></div>
    ${TASK_CHAPTERS.map((title, ch) => {
      const items = d.list.filter((s) => s.task.chapter === ch);
      const all = items.every((s) => s.claimed);
      return html`<details class="spanel tk-chapter"${all ? '' : html` open`}><summary class="sp-head">${ch + 1}. ${title}<span>${items.filter((s) => s.claimed).length}/${items.length}</span></summary>
        <ul class="tk-list">${items.map((s) => {
          const guide = s.task.guide && faqTopic(s.task.guide) ? s.task.guide : null;
          return html`<li class="${s.claimed ? 'claimed' : s.done ? 'ready' : ''}">
            <span class="tk-state">${s.claimed ? icon('ui/rep-g', 'Done', 18) : s.done ? icon('ui/rep-y', 'Reward ready', 18) : html`<span class="tk-dot"></span>`}</span>
            <div class="tk-main"><b>${s.task.title}</b><span class="small">${s.task.how}</span>
              ${!s.done && s.need ? meter(s.have ?? 0, s.need) : ''}
              <span class="tk-reward">${rewardChips(s.task.reward)}</span></div>
            <div class="tk-act">${s.claimed
              ? html`<span class="small muted">collected</span>`
              : s.done
                ? claimForm(s, d.csrf, 'small')
                : html`<a class="btn small secondary" href="${s.link}">Show me</a>${guide ? html` <a class="small" href="/help/${guide}">learn more</a>` : ''}`}</div></li>`;
        })}</ul></details>`;
    })}`;
}
