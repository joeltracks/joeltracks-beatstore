import { serve } from '@hono/node-server';
import { readFile } from 'node:fs/promises';
import { extname, resolve, relative, sep } from 'node:path';
import { createApp, processAccessEmails, type Bindings } from './app.ts';

const root = resolve('.');
const extensions = new Set(['.html', '.css', '.js', '.svg', '.jpg', '.png', '.ico', '.woff2']);
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const runtimeFiles = new Set(['index.html', 'app.js', 'seller-auth.js', 'catalog.js', 'design.js', 'license-settings.js', 'storefront.js', 'graphics.js', 'license-proposals.js', 'beat-details.js', 'footer.js', 'bulk-deals.js', 'motion.js', 'launch.js', 'launch.css', 'style.css', 'type-motion.css', 'refresh.css', 'refinement.css', 'storefront.css', 'beat-details.css', 'footer.css', 'bulk-deals.css', 'design-system/tokens.css']);
const env: Bindings = {
  APP_ORIGIN: process.env.APP_ORIGIN || 'http://127.0.0.1:4173',
  SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY, SELLER_SESSION_SECRET: process.env.SELLER_SESSION_SECRET,
  ACCESS_SECRET: process.env.ACCESS_SECRET, RESEND_API_KEY: process.env.RESEND_API_KEY, MAIL_FROM: process.env.MAIL_FROM,
  ASSETS: { async fetch(request) {
    let path: string;
    try { path = decodeURIComponent(new URL(request.url).pathname).replace(/^\//, '') || 'index.html'; } catch { return new Response('Not found', { status: 404 }); }
    const full = resolve(root, path);
    if (!full.startsWith(root + sep) || !extensions.has(extname(path))) return new Response('Not found', { status: 404 });
    const canonicalPath = relative(root, full).split(sep).join('/');
    if (!runtimeFiles.has(canonicalPath) && !/^(assets\/(?:fonts|vendor|graphics\/(?:icons|footer)|branding\/soft-seal)\/)[^?]*$/.test(canonicalPath)) return new Response('Not found', { status: 404 });
    try { return new Response(await readFile(full), { headers: { 'Content-Type': types[extname(path)] || 'application/octet-stream' } }); }
    catch { return new Response('Not found', { status: 404 }); }
  } }
};
if (new URL(env.APP_ORIGIN).hostname !== '127.0.0.1' && new URL(env.APP_ORIGIN).hostname !== 'localhost') throw new Error('Local development must use a loopback APP_ORIGIN.');
const app = createApp();
serve({ fetch: request => app.fetch(request, env), hostname: '127.0.0.1', port: Number(new URL(env.APP_ORIGIN).port || 4173) });
// Only configured real credentials enable sends. No fake order or development email is seeded.
const timer = setInterval(() => processAccessEmails(env).catch(() => console.error('Access mail processing unavailable.')), 15000);
timer.unref();
console.log('Joel Tracks local app: ' + env.APP_ORIGIN);
