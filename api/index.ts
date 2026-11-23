import { createApp, type Bindings } from '../server/app.ts';

const app = createApp();

// Public API adapter for Vercel's Web Standard Node.js runtime.
// Mail and PRIVATE_FILES bindings are deliberately absent: Cloudflare's scheduled
// dispatcher/R2 binding have not been migrated or activated on this deployment.
// Forwarding mail credentials alone would accept link requests without a runner.
export default {
  fetch(request: Request) {
    const env: Bindings = { APP_ORIGIN: process.env.APP_ORIGIN || '' };
    return app.fetch(request, env);
  }
};
