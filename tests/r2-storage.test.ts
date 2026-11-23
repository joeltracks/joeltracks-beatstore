import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {createUploadStorage,UploadError} from '../server/uploads.ts';

test('R2 S3 client signs multipart PUTs and streams exact checksum verification locally',{timeout:20000},async()=>{
  const mf=new Miniflare({workers:[{config:{name:'storage-test',compatibilityDate:'2026-11-23',env:{PRIVATE_FILES:{type:'r2',name:'joeltracks-private',dev:{experimentalS3Credentials:{accessKeyId:'test-key',secretAccessKey:'test-only-secret'}}}},manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:'export default {fetch(){return new Response("ok")}}'}}}}}]});
  try{
    const endpoint=(await mf.ready).origin+'/cdn-cgi/local/r2/s3',s=createUploadStorage('test','test-key','test-only-secret',endpoint);
    const key='staging/test-fixture',bytes=new Uint8Array([73,68,51,1]),id=await s.create(key,'audio/mpeg');
    const link=await s.sign(key,id,1,bytes.length),url=new URL(link);
    assert.equal(url.searchParams.get('partNumber'),'1');assert.match(url.searchParams.get('X-Amz-SignedHeaders')!,/content-length/);assert.equal(url.searchParams.get('X-Amz-Expires'),'600');assert(!link.includes('test-only-secret'));
    const uploaded=await fetch(link,{method:'PUT',body:bytes});assert.equal(uploaded.status,200);
    // Miniflare 5's experimental S3 endpoint does not implement ListParts;
    // route tests separately cover authoritative manifests and replacements.
    await s.complete(key,id,[{part:1,etag:uploaded.headers.get('etag')!,size:bytes.length}]);
    assert.equal((await s.head(key))!.size,bytes.length);
    const checksum=createHash('sha256').update(bytes).digest('hex');
    await s.verify(key,bytes.length,checksum,'audio/mpeg');
    await assert.rejects(s.verify(key,bytes.length,'a'.repeat(64),'audio/mpeg'),UploadError);
    await s.remove(key);assert.equal(await s.head(key),null);
    const pending=await s.create('staging/abort-test','audio/mpeg');await s.abort('staging/abort-test',pending);
  }finally{await mf.dispose();}
});
