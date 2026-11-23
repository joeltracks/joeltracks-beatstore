import { createApp, type Bindings } from '../server/app.ts';

const app = createApp();

// Public and protected seller API adapter for Vercel's Web Standard Node.js runtime.
// Mail and PRIVATE_FILES bindings are deliberately absent: Cloudflare's scheduled
// dispatcher/R2 binding have not been migrated or activated on this deployment.
// Forwarding mail credentials alone would accept link requests without a runner.
export default {
  fetch(request: Request) {
    const env: Bindings = {
      APP_ORIGIN: process.env.APP_ORIGIN || '',
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
      SELLER_SESSION_SECRET: process.env.SELLER_SESSION_SECRET
    };
    return app.fetch(request, env);
  }
};
