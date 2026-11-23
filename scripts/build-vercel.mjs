import './prepare-web.mjs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Vercel publishes only this generated directory, never the repository root.
const project = resolve('.');
const output = resolve(project, 'dist');
if (output !== resolve('dist') || output === project) throw new Error('Invalid output directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve('web/public'), output, { recursive: true });
await cp(resolve('web/index.html'), resolve(output, 'index.html'));
console.log('Vercel storefront built to dist/. Backend sources and secrets are excluded.');
