import { test } from 'node:test';
import assert from 'node:assert/strict';
import configuration from '../cloudflare.config.ts';

// These names connect existing live resources; swapping them would put paid files
// into the future public-media bucket. Development must never use live objects.
test('Cloudflare delivery binds to the private bucket separately from preview media',()=>{
  assert.equal(configuration.accountId,'1b4bc53beb85cda4d8618ee8a695585f');
  const env=configuration.worker.env;
  assert.deepEqual(env.PRIVATE_FILES,{type:'r2',name:'joeltracks-private',dev:{remote:false}});
  assert.deepEqual(env.MEDIA_FILES,{type:'r2',name:'joeltracks-media',dev:{remote:false}});
  assert.notEqual(env.PRIVATE_FILES.name,env.MEDIA_FILES.name);
});
