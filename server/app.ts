import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { createRepository, type Repository } from './repository.ts';
import { hash, keyedHash, randomToken, seal, unseal, validToken, safeFilename } from './security.ts';

interface AssetBody {
  body: ReadableStream; size: number; etag: string;
  range?: { offset: number; length: number };
  httpMetadata?: { contentType?: string };
}
export interface Bindings {
  APP_ORIGIN: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  ACCESS_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  PRIVATE_FILES?: { get(key: string, options?: { range?: Headers }): Promise<AssetBody | null>; head(key: string): Promise<{ size: number } | null> };
  ASSETS?: { fetch(request: Request): Promise<Response> };
}
interface Dependencies {
  repository?: Repository;
  sendMail?: (job: { id: string; email: string; url: string }) => Promise<void>;
}
const genericMessage = 'If these details match a paid order, we’ll email an access link. Check your inbox and spam folder.';
function origin(env: Bindings) {
  try {
    const url = new URL(env.APP_ORIGIN);
    return url.protocol === 'https:' || url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) ? url.origin : '';
  } catch { return ''; }
}
function configured(env: Bindings, dependencies: Dependencies) {
  return Boolean(origin(env) && env.ACCESS_SECRET && env.ACCESS_SECRET.length >= 32 &&
    (dependencies.repository || env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) &&
    (dependencies.sendMail || env.RESEND_API_KEY && env.MAIL_FROM));
}
function repository(env: Bindings, dependencies: Dependencies) {
  if (dependencies.repository) return dependencies.repository;
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error('DATABASE_UNAVAILABLE');
  return createRepository(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
}
function cookieName(env: Bindings) { return origin(env).startsWith('https:') ? '__Host-jt-order' : 'jt-order-local'; }
async function deliver(env: Bindings, job: { id: string; payload: string }, dependencies: Dependencies) {
  const { email, url } = await unseal(env.ACCESS_SECRET!, job.payload);
  if (dependencies.sendMail) return dependencies.sendMail({ id: job.id, email, url });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'order-access/' + job.id },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [email], subject: 'Access your Joel Tracks purchase',
      text: 'Open your secure purchase page:\n\n' + url + '\n\nConfirm access on the page to view your files and agreement. This link expires 15 minutes after it was requested and can be used once. If you did not request it, you can ignore this email.\n\nJoel Tracks'
    }), signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('EMAIL_UNAVAILABLE');
}
export async function processAccessEmails(env: Bindings, dependencies: Dependencies = {}) {
  if (!configured(env, dependencies)) return;
  const db = repository(env, dependencies);
  for (let count = 0; count < 3; count++) {
    const job = await db.claimMail();
    if (!job) return;
    try { await deliver(env, job, dependencies); await db.completeMail(job.id); }
    catch { await db.failMail(job.id); console.error(JSON.stringify({ event: 'access_email_retry', jobId: job.id })); }
  }
}
export function createApp(dependencies: Dependencies = {}) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.use('/api/*', bodyLimit({ maxSize: 4096, onError: c => c.json({ error: 'Request is too large.' }, 413) }));
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Frame-Options', 'DENY');
    if (c.req.path.startsWith('/api/') || c.req.path === '/access') c.header('Cache-Control', 'private, no-store');
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      if (!origin(c.env) || c.req.header('Origin') !== origin(c.env)) return c.json({ error: 'Request not permitted. Reload this page and try again.' }, 403);
      if (!c.req.header('Content-Type')?.startsWith('application/json')) return c.json({ error: 'Use a JSON request.' }, 415);
      if (Number(c.req.header('Content-Length') || 0) > 4096) return c.json({ error: 'Request is too large.' }, 413);
      const body = await c.req.text();
      if (new TextEncoder().encode(body).length > 4096) return c.json({ error: 'Request is too large.' }, 413);
      try { JSON.parse(body); } catch { return c.json({ error: 'Invalid request.' }, 400); }
    }
    await next();
  });
  app.onError((_error, c) => {
    console.error(JSON.stringify({ event: 'access_api_error', path: c.req.path }));
    return c.json({ error: 'This service is temporarily unavailable. Please try again or contact JT.' }, 503);
  });
  app.get('/api/health', c => c.json({ status: 'ok' }));
  app.get('/api/catalog', c => c.json({ beats: [], state: 'awaiting-publication', checkoutAvailable: false }));
  app.post('/api/checkout', c => c.json({ error: 'Checkout is not open yet. Please contact JT about licensing.' }, 503));
  app.get('/api/access/status', c => c.json({ available: configured(c.env, dependencies) }));
  app.post('/api/access/request', async c => {
    if (!configured(c.env, dependencies)) return c.json({ error: 'Purchase-access emails are not available yet. Please email JT for help with your files.' }, 503);
    const input = await c.req.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return c.json({ error: 'Enter your purchase email and order reference.' }, 400);
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const reference = typeof input.reference === 'string' ? input.reference.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^[A-Za-z0-9-]{3,80}$/.test(reference)) return c.json({ error: 'Enter your purchase email and order reference.' }, 400);
    const token = randomToken();
    const url = origin(c.env) + '/access#token=' + token;
    const payload = await seal(c.env.ACCESS_SECRET!, { email, url });
    // Trusted Cloudflare header in Workers; local requests share a rate bucket. Never trust arbitrary X-Forwarded-For.
    const ip = c.req.header('CF-Connecting-IP') || 'local';
    await repository(c.env, dependencies).request({ reference, email, tokenHash: await hash(token), payload,
      ipHash: await keyedHash(c.env.ACCESS_SECRET!, 'ip:' + ip), emailHash: await keyedHash(c.env.ACCESS_SECRET!, 'email:' + email) });
    // Match and non-match responses never reveal whether an order/email exists; delivery is handled by the outbox.
    return c.json({ message: genericMessage }, 202);
  });
  app.post('/api/access/exchange', async c => {
    if (!configured(c.env, dependencies)) return c.json({ error: 'Purchase access is not available yet.' }, 503);
    const input = await c.req.json();
    const token = input?.token;
    if (!validToken(token)) return c.json({ error: 'This link is invalid or expired. Request a new link.' }, 400);
    const session = randomToken();
    if (!await repository(c.env, dependencies).exchange(await hash(token), await hash(session))) return c.json({ error: 'This link is invalid or expired. Request a new link.' }, 400);
    setCookie(c, cookieName(c.env), session, { httpOnly: true, secure: origin(c.env).startsWith('https:'), sameSite: 'Lax', path: '/', maxAge: 1800 });
    return c.json({ authenticated: true });
  });
  app.get('/api/access/order', async c => {
    if (!configured(c.env, dependencies)) return c.json({ error: 'Purchase access is not available yet.' }, 503);
    const token = getCookie(c, cookieName(c.env));
    const order = validToken(token) ? await repository(c.env, dependencies).order(await hash(token)) : null;
    if (!order) return c.json({ error: 'Request a fresh access link to view your purchase.' }, 401);
    return c.json({ reference: order.reference, currency: order.currency, totalCents: order.totalCents, paidAt: order.paidAt, items: order.items,
      files: order.files.map(file => ({ id: file.id, name: file.name, type: file.type, url: '/api/access/files/' + encodeURIComponent(file.id) })) });
  });
  app.on(['GET', 'HEAD'], '/api/access/files/:id', async c => {
    if (!configured(c.env, dependencies)) return c.json({ error: 'Purchase access is not available yet.' }, 503);
    const token = getCookie(c, cookieName(c.env));
    const order = validToken(token) ? await repository(c.env, dependencies).order(await hash(token)) : null;
    const file = order?.files.find(item => item.id === c.req.param('id'));
    if (!file) return c.json({ error: 'File not available for this purchase.' }, 404);
    if (!c.env.PRIVATE_FILES) return c.json({ error: 'File delivery is not available yet. Contact JT for your files.' }, 503);
    if (c.req.method === 'HEAD') {
      const metadata = await c.env.PRIVATE_FILES.head(file.key);
      if (!metadata) return c.json({ error: 'This file is temporarily unavailable.' }, 404);
      return new Response(null, { headers: {
        'Content-Type': file.type || 'application/octet-stream', 'Content-Length': String(metadata.size),
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(safeFilename(file.name)),
        'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store'
      } });
    }
    const range = c.req.header('Range');
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return c.json({ error: 'Unsupported byte range.' }, 416);
    if (range) {
      const metadata = await c.env.PRIVATE_FILES.head(file.key);
      if (!metadata) return c.json({ error: 'This file is temporarily unavailable.' }, 404);
      const [start, end] = range.slice(6).split('-');
      if ((start && (Number(start) >= metadata.size || end && Number(end) < Number(start))) || (!start && Number(end) === 0)) {
        return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + metadata.size, 'Cache-Control': 'private, no-store' } });
      }
    }
    const object = await c.env.PRIVATE_FILES.get(file.key, range ? { range: new Headers({ Range: range }) } : undefined);
    if (!object) return c.json({ error: 'This file is temporarily unavailable. Contact JT.' }, 404);
    const headers = new Headers({ 'Content-Type': file.type || 'application/octet-stream', 'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(safeFilename(file.name)),
      'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (object.range) {
      headers.set('Content-Range', 'bytes ' + object.range.offset + '-' + (object.range.offset + object.range.length - 1) + '/' + object.size);
      headers.set('Content-Length', String(object.range.length));
    } else headers.set('Content-Length', String(object.size));
    return new Response(c.req.method === 'HEAD' ? null : object.body, { status: object.range ? 206 : 200, headers });
  });
  app.post('/api/access/logout', async c => {
    const token = getCookie(c, cookieName(c.env));
    if (validToken(token) && configured(c.env, dependencies)) await repository(c.env, dependencies).revoke(await hash(token));
    deleteCookie(c, cookieName(c.env), { path: '/', secure: origin(c.env).startsWith('https:') });
    return c.json({ authenticated: false });
  });
  app.all('/api/*', c => c.json({ error: 'Endpoint not available.' }, 404));
  app.all('/studio/*', c => c.text('Seller access is not open yet.', 503));
  app.all('/studio', c => c.text('Seller access is not open yet.', 503));
  app.all('*', async c => {
    if (!c.env.ASSETS) return c.text('Not found', 404);
    const url = new URL(c.req.url);
    if (url.pathname === '/access') url.pathname = '/';
    return await c.env.ASSETS.fetch(new Request(url, { method: c.req.method, headers: c.req.raw.headers }));
  });
  return app;
}
