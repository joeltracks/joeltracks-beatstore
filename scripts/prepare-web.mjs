import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Build from an explicit allowlist. The repository root contains private tooling and backend files.
const root = resolve('.');
const target = resolve('web');
if (target !== resolve(root, 'web') || target === root) throw new Error('Invalid generated-output directory.');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const html = await readFile('index.html', 'utf8');
const linked = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)].map(match=>match[1]);
const rootFiles = new Set(['index.html', ...linked.filter(path=>!path.startsWith('assets/')&&!path.startsWith('http'))]);
for(const file of rootFiles) {
  const destination=resolve(target,file);
  if(!destination.startsWith(target))throw new Error('Invalid asset path');
  await mkdir(resolve(destination,'..'),{recursive:true});
  await cp(resolve(root,file),destination);
}
for(const directory of ['assets/fonts','assets/vendor','assets/graphics/icons','assets/graphics/footer','assets/branding/soft-seal']) {
  await cp(resolve(root,directory),resolve(target,directory),{
    recursive:true,filter:path=>!/(?:[\\/]review[\\/]|[\\/]review$|[\\/]USAGE\.md$|[\\/]PLAN\.md$)/.test(path)
  });
}
// Vite copies these classic scripts without changing their shared global scope or execution order.
await mkdir(resolve(target,'public'),{recursive:true});
for(const file of await readdir(target)) {
  if(file==='index.html'||file==='public')continue;
  await cp(resolve(target,file),resolve(target,'public',file),{recursive:true});
}
await writeFile(resolve(target,'public','_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n');
console.log('Prepared public files from the runtime allowlist.');
