import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { claimTask, setTasksHidden, taskStatus } from '../../game/actions/tasks.js';
import { authed, setFlash } from '../session.js';
import { tasksView } from '../views/tasks.js';
import { backUrl, formAction, loadGamePage, sendPage } from './helpers.js';

export const tasksRouter = Router();

tasksRouter.get('/tasks', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const st = taskStatus(db, ctx.user.id);
  sendPage(req, res, 'Tasks', tasksView({ tribe: page.state.tribe, list: st.list, hidden: st.hidden, csrf: ctx.csrf }), { chrome: page.chrome });
});

tasksRouter.post(
  '/tasks/claim',
  formAction(z.object({ id: z.string().max(40) }), (req, res, d) => {
    const ctx = authed(req);
    const t = claimTask(db, ctx.user.id, ctx.villageId, d.id, ctx.now);
    setFlash(res, 'ok', `Task done: ${t.title} — reward collected${t.reward.gold ? ` (+${t.reward.gold} Gold)` : ''}.`);
    res.redirect(303, backUrl(req, '/tasks'));
  }, '/tasks'),
);

tasksRouter.post(
  '/tasks/hide',
  formAction(z.object({ hidden: z.enum(['0', '1']) }), (req, res, d) => {
    setTasksHidden(db, authed(req).user.id, d.hidden === '1');
    setFlash(res, 'ok', d.hidden === '1' ? 'Task panel hidden. You can show it again on the Tasks page.' : 'Task panel shown.');
    res.redirect(303, '/tasks');
  }, '/tasks'),
);
