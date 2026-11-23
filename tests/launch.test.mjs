import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('the public entry no longer loads synthesized audio or simulated seller payments',async()=>{
  const html=await readFile('index.html','utf8');assert.doesNotMatch(html,/src="(?:audio|seller)\.js/);assert.match(html,/src="launch\.js/);
  const catalog=await readFile('catalog.js','utf8');assert.doesNotMatch(catalog,/demo-\d|After Hours|Palm Wine/);
  const app=await readFile('app.js','utf8');assert.doesNotMatch(app,/JT-DEMO-|demoTracks\.slice|tracks=demoTracks/);
});
