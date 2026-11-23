import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { MPEGDecoder } from 'mpg123-decoder';
import { createSHA256 } from 'hash-wasm';
import { createHash } from 'node:crypto';

const workerSource = await readFile(new URL('../seller-audio-worker.js', import.meta.url), 'utf8');
const encoderSource = await readFile(new URL('../assets/vendor/lame.min.js', import.meta.url), 'utf8');
function converter() {
  const messages = [], ctx = vm.createContext({ Blob, self: { postMessage: m => messages.push(m) } });
  ctx.importScripts = path => { assert.equal(path, '/assets/vendor/lame.min.js'); vm.runInContext(encoderSource, ctx); };
  vm.runInContext(workerSource, ctx);
  return { ctx, messages, async convert(file) { await ctx.self.onmessage({ data: { file } }); return messages.at(-1); } };
}
function wav({ bits = 16, channels = 2, rate = 44100, type = 1, extensible = false, seconds = 0.5 } = {}) {
  const frames = Math.floor(rate * seconds), align = channels * bits / 8, fmtSize = extensible ? 40 : 16;
  const size = frames * align, dataOffset = 12 + 8 + fmtSize + 12 + 8;
  const bytes = Buffer.alloc(dataOffset + size + size % 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(fmtSize, 16);
  bytes.writeUInt16LE(extensible ? 65534 : type, 20); bytes.writeUInt16LE(channels, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * align, 28); bytes.writeUInt16LE(align, 32); bytes.writeUInt16LE(bits, 34);
  if (extensible) { bytes.writeUInt16LE(22, 36); bytes.writeUInt16LE(bits, 38); bytes.writeUInt32LE(type, 44); Buffer.from([0,0,16,0,128,0,0,170,0,56,155,113]).copy(bytes, 48); }
  // Odd-length ancillary chunks must not shift the audio payload by one byte.
  const junk = 20 + fmtSize; bytes.write('JUNK', junk); bytes.writeUInt32LE(3, junk + 4); bytes.write('abc', junk + 8);
  bytes.write('data', dataOffset - 8); bytes.writeUInt32LE(size, dataOffset - 4);
  for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < channels; channel++) {
    const value = Math.sin(2 * Math.PI * (channel ? 880 : 440) * frame / rate) * 0.5, offset = dataOffset + frame * align + channel * bits / 8;
    if (type === 3) bits === 32 ? bytes.writeFloatLE(value, offset) : bytes.writeDoubleLE(value, offset);
    else if (bits === 8) bytes.writeUInt8(Math.round(value * 127 + 128), offset);
    else bytes.writeIntLE(Math.round(value * (2 ** (bits - 1) - 1)), offset, bits / 8);
  }
  return { bytes, file: new File([bytes], 'original.wav', { type: 'audio/wav' }), dataOffset, frames };
}

test('real WAV conversions decode as full-length non-silent MP3 audio with correct channels and pitch', async () => {
  for (const options of [ {}, { bits: 24, channels: 1 }, { bits: 32, type: 3 }, { bits: 32, rate: 96000 }, { bits: 24, extensible: true }, { bits: 8, channels: 1, rate: 22050 }, { bits: 64, type: 3, rate: 48000 } ]) {
    const source = wav(options), { convert, messages } = converter(), result = await convert(source.file);
    assert.equal(result.type, 'complete', result.message);
    assert.equal(result.blob.type, 'audio/mpeg');
    const decoder = new MPEGDecoder(); await decoder.ready;
    try {
      const encoded = new Uint8Array(await result.blob.arrayBuffer()), decoded = decoder.decode(encoded);
      assert.equal(decoded.errors.length, 0);
      assert.equal(encoded[3] >> 6 === 3, options.channels === 1, 'MP3 channel mode changed');
      assert(Math.abs(decoded.samplesDecoded / decoded.sampleRate - 0.5) < 0.15, 'Audio duration changed');
      for (const [index, channel] of decoded.channelData.entries()) {
        const middle = channel.slice(Math.floor(channel.length * 0.3), Math.floor(channel.length * 0.8));
        const rms = Math.sqrt(middle.reduce((sum, x) => sum + x*x, 0) / middle.length);
        assert(rms > 0.25 && rms < 0.45, 'Converted audio is silent or materially changed in level');
        let crossings = 0; for (let i = 1; i < middle.length; i++) if (middle[i-1] <= 0 && middle[i] > 0) crossings++;
        const frequency = crossings / (middle.length / decoded.sampleRate);
        assert(Math.abs(frequency - (index && options.channels !== 1 ? 880 : 440)) < 15, 'Pitch/sample rate changed');
      }
    } finally { decoder.free(); }
    const progress = messages.filter(m => m.type === 'progress');
    assert.equal(progress[0].loaded, 0); assert.equal(progress.at(-1).loaded, progress.at(-1).total);
    assert.deepEqual(new Uint8Array(await source.file.arrayBuffer()), new Uint8Array(source.bytes), 'Original WAV changed');
  }
});

test('conversion is deterministic so an MP3 upload can resume from the original WAV', async () => {
  const { file } = wav(), first = await converter().convert(file), second = await converter().convert(file);
  assert.equal(first.type, 'complete'); assert.equal(second.type, 'complete');
  assert.deepEqual(await first.blob.arrayBuffer(), await second.blob.arrayBuffer());
});

test('malformed, compressed, multichannel and invalid-sample WAVs fail with no MP3', async () => {
  const truncated = wav(); truncated.bytes.writeUInt32LE(0xffffffff, 4);
  const compressed = wav(); compressed.bytes.writeUInt16LE(6, 20);
  const multichannel = wav(); multichannel.bytes.writeUInt16LE(6, 22);
  const nan = wav({ type: 3, bits: 32 }); nan.bytes.writeFloatLE(NaN, nan.dataOffset);
  for (const bytes of [Buffer.from('not audio'), truncated.bytes, compressed.bytes, multichannel.bytes, nan.bytes]) {
    const { convert, messages } = converter(), result = await convert(new File([bytes], 'bad.wav'));
    assert.equal(result.type, 'error'); assert(!messages.some(m => m.type === 'complete'));
  }
});

test('WAV-only client workflow uploads the original and generated MP3 through checksum verification', async () => {
  const source=wav({bits:24}), messages=[], assets=new Map();
  const ctx=vm.createContext({File,Blob,hashwasm:{createSHA256},document:{addEventListener(){},getElementById(){return null;}},window:{addEventListener(){}}});
  vm.runInContext(await readFile(new URL('../seller-uploads.js',import.meta.url),'utf8'),ctx);
  ctx.uploadFeedback=()=>messages.push(vm.runInContext('uploadRun.phase',ctx));
  ctx.convertSellerWav=async file=>{
    const result=await converter().convert(file);assert.equal(result.type,'complete');
    return new File([result.blob],'original.mp3',{type:'audio/mpeg'});
  };
  ctx.sellerAPI=async(path,data)=>{
    if(path==='beats/beat-id/uploads'){const id=String(assets.size+1);assets.set(id,{...data,parts:[]});return {id};}
    const [,id,action]=path.split('/'),asset=assets.get(id);
    if(action==='part')return {url:id};
    if(action==='complete'){
      const bytes=Buffer.concat(asset.parts);
      assert.equal(bytes.length,asset.size);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
      asset.verified=true;return {};
    }
    return {status:'uploading',parts:[],partSize:10485760};
  };
  ctx.putPart=async(id,blob)=>{assets.get(id).parts.push(Buffer.from(await blob.arrayBuffer()));};
  ctx.sourceFile=source.file;
  vm.runInContext("sellerBeatData={beats:[],limits:{wav:262144000,mp3:52428800}};",ctx);
  const prepared=await vm.runInContext("prepareSellerFiles([{kind:'wav',file:sourceFile}])",ctx);
  for(const item of prepared){ctx.item=item;await vm.runInContext("sendFile(item.file,'beat-id',item.kind)",ctx);}
  assert.deepEqual([...assets.values()].map(a=>a.kind),['wav','mp3']);
  assert([...assets.values()].every(a=>a.verified));
  assert.deepEqual(Buffer.concat(assets.get('1').parts),source.bytes);
  assert(messages.includes('hash')&&messages.includes('upload')&&messages.includes('verify'));
});
