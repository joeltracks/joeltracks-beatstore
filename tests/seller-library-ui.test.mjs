import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const uploads = await readFile(new URL('../seller-uploads.js', import.meta.url), 'utf8');
const auth = await readFile(new URL('../seller-auth.js', import.meta.url), 'utf8');
function workspace() {
  const timers = [], clicks = [];
  const ctx = vm.createContext({
    document: { addEventListener(name, handler) { if (name === 'click') clicks.push(handler); }, getElementById() { return null; } },
    window: { addEventListener() {} }, setTimeout(fn) { timers.push(fn); },
    escapeHTML: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    icon: () => '', categories: ['R&B Beats', 'Afro Beats', 'Trap Beats'], tiers: [],
    route: () => 'studio-catalog', nav() {}, afterRender() {},
    empty: title => '<p>' + title + '</p>', formatCount: String, cash: String,
  });
  vm.runInContext(uploads + '\n' + auth, ctx);
  vm.runInContext("sellerView={stage:'ready'};sellerChecked=true;sellerOverview={recentOrders:[],paidOrders:0,revenueCents:0,pendingOrders:0};", ctx);
  return { ctx, timers, clicks, run: source => vm.runInContext(source, ctx) };
}
const data = { beats: [], limits: { mp3: 52428800, wav: 262144000, stems: 536870912, cover: 10485760 }, storageAvailable: true };

test('a failed library request stops retrying until the seller explicitly retries', async () => {
  const { ctx, timers, clicks, run } = workspace();
  let requests = 0;
  ctx.sellerAPI = async () => { if (++requests === 1) throw new Error('Storage temporarily unavailable'); return data; };
  assert.match(run('sellerLibraryContent()'), /Loading your private drafts and upload form/);
  assert.equal(timers.length, 1);
  await timers.shift()();
  for (let n = 0; n < 5; n++) {
    const html = run('sellerLibraryContent()');
    assert.match(html, /Couldn’t load your beat library/);
    assert.match(html, /Retry loading library/);
    assert.doesNotMatch(html, /Loading your private drafts/);
  }
  assert.equal(timers.length, 0);
  assert.equal(requests, 1);
  await clicks[0]({ target: { closest: () => ({ dataset: { uploadAction: 'refresh' } }) } });
  assert.equal(requests, 2);
  assert.match(run('sellerLibraryContent()'), /id="seller-beat-form"/);
  assert.doesNotMatch(run('sellerLibraryContent()'), /Storage temporarily unavailable/);
});

test('overview exposes uploads before orders and the library exposes all file inputs and explicit editing', () => {
  const { ctx, run } = workspace();
  ctx.route = () => 'studio';
  const overview = run('sellerDashboard()');
  assert.match(overview, /Beat library & files/);
  assert(overview.indexOf('Upload a beat') < overview.indexOf('Recent orders'));
  ctx.route = () => 'studio-catalog';
  ctx.libraryData = { ...data, beats: [{ id: 'test-id', title: '<Existing beat>', genre: 'R&B Beats', bpm: 88, key: 'C min', tags: ['soulful'], assets: [] }] };
  run("sellerBeatData=libraryData;sellerEditingId='test-id'");
  const library = run('sellerDashboard()');
  assert.match(library, /Edit beat & files/);
  assert.match(library, /Saved beats \(1\)/);
  assert.match(library, /Edit &lt;Existing beat>/);
  for (const kind of ['mp3', 'wav', 'stems', 'cover']) assert.match(library, new RegExp('type="file" name="' + kind + '"'));
  assert.match(library, /Leaving a field empty keeps an existing file/);
  assert.match(library, /data-id="test-id"/);
});
