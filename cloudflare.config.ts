import { bindings, defineConfig, triggers } from 'cf/config';

export default defineConfig({
  accountId: '1b4bc53beb85cda4d8618ee8a695585f',
  worker: {
    name: 'joeltracks-beatstore',
    entrypoint: './server/worker.ts',
    compatibilityDate: '2026-11-23',
    compatibilityFlags: ['nodejs_compat'],
    assets: { runWorkerFirst: ['/api/*', '/access', '/studio', '/studio/*'] },
    env: {
      ASSETS: bindings.assets(),
      // Both remote buckets remain private. Local development uses isolated storage.
      MEDIA_FILES: bindings.r2({ name: 'joeltracks-media', dev: { remote: false } }),
      PRIVATE_FILES: bindings.r2({ name: 'joeltracks-private', dev: { remote: false } }),
      APP_ORIGIN: bindings.secret(),
      SUPABASE_URL: bindings.secret(),
      SUPABASE_SECRET_KEY: bindings.secret(),
      SUPABASE_PUBLISHABLE_KEY: bindings.secret(),
      SELLER_SESSION_SECRET: bindings.secret(),
      R2_ACCESS_KEY_ID: bindings.secret(),
      R2_SECRET_ACCESS_KEY: bindings.secret(),
      ACCESS_SECRET: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      MAIL_FROM: bindings.secret()
    },
    triggers: [triggers.scheduled({ schedule: '* * * * *' })]
  }
});
