import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import handler from '../api/index.ts';

test('Vercel build emits its configured output with all entry assets and six logos', async () => {
  execFileSync(process.execPath, ['scripts/build-vercel.mjs'], { stdio: 'pipe' });
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'dist');
  const root = resolve(config.outputDirectory);
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)].map(match => match[1]);
  for (const ref of refs.filter(ref => !/^(?:https?:|#)/.test(ref))) assert((await stat(resolve(root, ref))).isFile(), ref);
  const logos = ['spotify.png', 'apple-music.svg', 'amazon-music.svg', 'youtube.svg', 'deezer.svg', 'tidal.png'];
  for (const logo of logos) assert((await stat(resolve(root, 'assets/graphics/footer/platforms', logo))).isFile());
  for (const file of ['seller-audio-worker.js','assets/vendor/lame.min.js','assets/vendor/lamejs-NOTICE.txt','assets/vendor/lamejs-LGPL-3.0.txt','assets/vendor/lamejs-GPL-3.0.txt']) assert((await stat(resolve(root,file))).isFile(),file);
  const files = await readdir(root, { recursive: true });
  for (const name of files) assert(!/(?:^|[\\/])(?:server|api|node_modules|\.git|\.env[^\\/]*|BACKEND_PLAN\.md|GUIDE\.md|seller\.js|audio\.js)(?:$|[\\/])/.test(name), name);
});

test('Vercel public API returns JSON and keeps unconfigured private features closed', async () => {
  const health = await handler.fetch(new Request('https://store.example/api/health'));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const catalog = await handler.fetch(new Request('https://store.example/api/catalog'));
  assert.deepEqual((await catalog.json()).beats, []);
  const access = await handler.fetch(new Request('https://store.example/api/access/status'));
  assert.equal((await access.json()).available, false);
  assert.equal((await handler.fetch(new Request('https://store.example/api/access/order'))).status, 503);
  const studio=await handler.fetch(new Request('https://store.example/studio'));
  assert.equal(studio.status,303);assert.equal(studio.headers.get('location'),'/#studio');
  assert.equal((await handler.fetch(new Request('https://store.example/api/seller/overview'))).status,503);
});

test('API routing is explicit and does not rewrite arbitrary missing files to the storefront', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert(config.rewrites.some((rule: { source: string; destination: string }) => rule.source === '/api/:path*' && rule.destination === '/api'));
  assert(config.rewrites.some((rule: { source: string; destination: string }) => rule.source === '/access' && rule.destination === '/index.html'));
  assert(!config.rewrites.some((rule: { source: string }) => ['/(.*)', '/:path*'].includes(rule.source)));
});
