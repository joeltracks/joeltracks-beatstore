import { createApp, processAccessEmails, type Bindings } from './app.ts';
const app = createApp();
export default {
  fetch: app.fetch,
  async scheduled(_event: unknown, env: Bindings) { await processAccessEmails(env); }
};
