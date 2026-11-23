import { bindings, defineConfig, triggers } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'joeltracks-beatstore',
    entrypoint: './server/worker.ts',
    compatibilityDate: '2026-11-23',
    assets: { runWorkerFirst: ['/api/*', '/access', '/studio', '/studio/*'] },
    env: {
      ASSETS: bindings.assets(),
      APP_ORIGIN: bindings.secret(),
      SUPABASE_URL: bindings.secret(),
      SUPABASE_SECRET_KEY: bindings.secret(),
      ACCESS_SECRET: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      MAIL_FROM: bindings.secret()
    },
    triggers: [triggers.scheduled({ schedule: '* * * * *' })]
  }
});
