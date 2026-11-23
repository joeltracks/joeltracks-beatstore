import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  publicDir: './web/public',
  plugins: [cloudflare()],
  build: { outDir: './dist/client', emptyOutDir: true }
});
