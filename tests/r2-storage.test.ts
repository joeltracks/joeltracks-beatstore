import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {createUploadStorage,UploadError} from '../server/uploads.ts';
import {createPublicationStorage} from '../server/publications.ts';
import type {Asset} from '../server/uploads.ts';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

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

test('publication reads actual MP3 duration and signs only a short-lived GET to the immutable source',{timeout:30000},async()=>{
  const mf=new Miniflare({workers:[{config:{name:'publication-storage',compatibilityDate:'2026-11-23',env:{PRIVATE_FILES:{type:'r2',name:'joeltracks-private',dev:{experimentalS3Credentials:{accessKeyId:'test-key',secretAccessKey:'test-only-secret'}}}},manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:'export default {fetch(){return new Response("ok")}}'}}}}}]});
  try{
    const context=vm.createContext({});vm.runInContext(await readFile('assets/vendor/lame.min.js','utf8'),context);
    const bytes=vm.runInContext("(()=>{const encoder=new lamejs.Mp3Encoder(1,44100,320),pcm=new Int16Array(44100);for(let i=0;i<pcm.length;i++)pcm[i]=Math.sin(2*Math.PI*440*i/44100)*12000;return [new Uint8Array(encoder.encodeBuffer(pcm)),new Uint8Array(encoder.flush())];})()",context) as Uint8Array[];
    const audio=Buffer.concat(bytes),endpoint=(await mf.ready).origin+'/cdn-cgi/local/r2/s3';
    const upload=createUploadStorage('test','test-key','test-only-secret',endpoint),publication=createPublicationStorage('test','test-key','test-only-secret',endpoint);
    const beatId='20000000-0000-4000-8000-000000000001',assetId='20000000-0000-4000-8000-000000000002',key=`beats/${beatId}/${assetId}`;
    const id=await upload.create(key,'audio/mpeg'),link=await upload.sign(key,id,1,audio.length);
    const put=await fetch(link,{method:'PUT',body:audio});assert.equal(put.status,200);await upload.complete(key,id,[{part:1,etag:put.headers.get('etag')!,size:audio.length}]);
    const asset:Asset={id:assetId,beat_id:beatId,kind:'mp3',filename:'actual.mp3',content_type:'audio/mpeg',byte_size:audio.length,sha256:createHash('sha256').update(audio).digest('hex'),staging_key:'staging/test',final_key:key,multipart_id:null,status:'ready',is_current:true,expires_at:new Date().toISOString()};
    const duration=await publication.inspect({snapshot:{},mp3:asset,cover:null,previousVersion:null});assert(duration>0.9&&duration<1.2);
    const preview=await publication.sign({key,contentType:'audio/mpeg',size:audio.length}),url=new URL(preview);
    assert.equal(url.searchParams.get('X-Amz-Expires'),'600');assert.equal(url.searchParams.get('response-cache-control'),'no-store');assert.equal(url.searchParams.get('response-content-type'),'audio/mpeg');
    const read=await fetch(preview);assert.equal(read.status,200);assert.deepEqual(Buffer.from(await read.arrayBuffer()),audio);
    const range=await fetch(preview,{headers:{Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
  }finally{await mf.dispose();}
});
