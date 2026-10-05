import { PUBLIC_DIR } from './web/assets.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { csrfGuard, requireAuth, sessionMiddleware } from './web/session.js';
import { authRouter } from './web/routes/auth.js';
import { villageRouter } from './web/routes/village.js';
import { troopsRouter } from './web/routes/troops.js';
import { mapRouter } from './web/routes/map.js';
import { socialRouter } from './web/routes/social.js';
import { economyRouter } from './web/routes/economy.js';
import { heroRouter } from './web/routes/hero.js';
import { communityRouter } from './web/routes/community.js';
import { shopRouter } from './web/routes/shop.js';
import { goldmarketRouter } from './web/routes/goldmarket.js';
import { goldclubRouter } from './web/routes/goldclub.js';
import { productionRouter } from './web/routes/production.js';
import { simulatorRouter } from './web/routes/simulator.js';
import { tasksRouter } from './web/routes/tasks.js';
import { adminRouter } from './web/routes/admin.js';
import { walletRouter } from './web/routes/wallet.js';
import { sendPage } from './web/routes/helpers.js';
import { html } from './web/html.js';

const here = dirname(fileURLToPath(import.meta.url));
// Static assets live in src/web/public; the build copies them next to dist.

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
        },
      },
      strictTransportSecurity: config.NODE_ENV === 'production',
      // Send the Referer only within the game, so actions can return the player to the page they came from.
      referrerPolicy: { policy: 'same-origin' },
    }),
  );
  app.use('/static', express.static(PUBLIC_DIR, { maxAge: config.NODE_ENV === 'production' ? '1d' : 0 }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(csrfGuard);

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use(authRouter);
  app.use(socialRouter);
  app.use(communityRouter);
  app.use(adminRouter);
  app.use(walletRouter);
  app.use(['/fields', '/village', '/slot', '/build', '/train', '/troops', '/map', '/research', '/market', '/hero', '/shop', '/celebrate', '/goldmarket', '/traps', '/oasis', '/places', '/goldclub', '/production', '/simulator', '/tasks'], requireAuth);
  app.use(villageRouter);
  app.use(troopsRouter);
  app.use(mapRouter);
  app.use(economyRouter);
  app.use(heroRouter);
  app.use(shopRouter);
  app.use(goldmarketRouter);
  app.use(goldclubRouter);
  app.use(productionRouter);
  app.use(simulatorRouter);
  app.use(tasksRouter);

  app.use((req: Request, res: Response) => {
    sendPage(req, res, 'Not found', html`<h1>Lost in the wilderness</h1><p>This page does not exist.</p><div class="actions"><a class="btn" href="/">Back to safety</a></div>`, {
      status: 404,
    });
  });

  // Error handler: registered last.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    try {
      sendPage(req, res, 'Error', html`<h1>Something went wrong</h1><p>Please try again in a moment.</p><div class="actions"><a class="btn" href="/">Home</a></div>`, {
        status: 500,
      });
    } catch {
      res.status(500).type('text').send('Internal error');
    }
  });

  return app;
}
