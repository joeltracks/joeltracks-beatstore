// Browser-only, bounded PCM WAV -> MP3 conversion. The source WAV is never modified.
// Separate, unmodified LGPL encoder: https://github.com/zhuker/lamejs (1.2.1).
// Attribution, source links and license texts: /assets/vendor/lamejs-NOTICE.txt.
importScripts('/assets/vendor/lame.min.js');

async function wavFormat(file) {
  const fail = () => { throw new Error('Use a mono or stereo PCM/float WAV, or export an MP3 and upload it directly.'); };
  const read = async (start, size) => new DataView(await file.slice(start, start + size).arrayBuffer());
  const text = (view, start) => String.fromCharCode(...new Uint8Array(view.buffer, start, 4));
  if (file.size < 44) fail();
  const header = await read(0, 12);
  if (text(header, 0) !== 'RIFF' || text(header, 8) !== 'WAVE') fail();
  const end = header.getUint32(4, true) + 8;
  if (end > file.size || end < 44) fail();
  let format, audio;
  for (let offset = 12, count = 0; offset + 8 <= end; count++) {
    if (count > 1024) fail();
    const chunk = await read(offset, 8), name = text(chunk, 0), size = chunk.getUint32(4, true);
    if (offset + 8 + size > end) fail();
    if (name === 'fmt ') {
      if (size < 16 || size > 65536 || format) fail();
      const v = await read(offset + 8, Math.min(size, 40));
      let type = v.getUint16(0, true);
      const channels = v.getUint16(2, true), rate = v.getUint32(4, true), align = v.getUint16(12, true), bits = v.getUint16(14, true);
      if (type === 65534) {
        if (size < 40 || v.getUint16(16, true) < 22) fail();
        const valid = v.getUint16(18, true);
        if (!valid || valid > bits) fail();
        const guid = [0,0,16,0,128,0,0,170,0,56,155,113];
        if (!guid.every((b, i) => v.getUint8(28 + i) === b)) fail();
        type = v.getUint32(24, true);
      }
      if (![1,2].includes(channels) || rate < 8000 || rate > 192000 || align !== channels * bits / 8 ||
          v.getUint32(8, true) !== rate * align || !(type === 1 && [8,16,24,32].includes(bits) || type === 3 && [32,64].includes(bits))) fail();
      format = { type, channels, rate, align, bits };
    } else if (name === 'data') {
      if (audio) fail();
      audio = { offset: offset + 8, size };
    }
    offset += 8 + size + size % 2;
  }
  if (!format || !audio || !audio.size || audio.size % format.align) fail();
  return { ...format, ...audio };
}

function pcmSample(view, offset, type, bits) {
  let value;
  if (type === 3) value = bits === 32 ? view.getFloat32(offset, true) : view.getFloat64(offset, true);
  else if (bits === 8) value = (view.getUint8(offset) - 128) / 128;
  else if (bits === 16) return view.getInt16(offset, true);
  else if (bits === 24) value = ((view.getUint8(offset) | view.getUint8(offset + 1) << 8 | view.getInt8(offset + 2) << 16)) / 8388608;
  else value = view.getInt32(offset, true) / 2147483648;
  if (!Number.isFinite(value)) throw new Error('The WAV contains invalid audio samples. Export a fresh WAV and try again.');
  return Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767));
}

async function wavToMp3(file, maxOutput, onProgress) {
  const format = await wavFormat(file), { type, channels, rate, align, bits, offset, size } = format;
  // Conservative CBR estimate, including encoder padding. Reject before allocating output.
  if (size / align / rate * 40000 + 16384 > maxOutput) throw new Error('This WAV is too long for the MP3 file limit. Export a smaller MP3 and upload it directly.');
  const encoder = new lamejs.Mp3Encoder(channels, rate, 320), chunks = [];
  let outputSize = 0;
  const append = encoded => {
    if (!encoded.length) return;
    outputSize += encoded.length;
    if (outputSize > maxOutput) throw new Error('The generated MP3 exceeds the upload limit.');
    chunks.push(new Uint8Array(encoded));
  };
  onProgress(0, size);
  // At most ~1 MB PCM in memory per block, plus the bounded MP3 result.
  const block = 1152 * 64 * align;
  for (let consumed = 0; consumed < size; consumed += block) {
    const length = Math.min(block, size - consumed);
    const view = new DataView(await file.slice(offset + consumed, offset + consumed + length).arrayBuffer());
    const frames = length / align;
    for (let start = 0; start < frames; start += 1152) {
      const count = Math.min(1152, frames - start), left = new Int16Array(count), right = channels === 2 ? new Int16Array(count) : null;
      for (let i = 0; i < count; i++) {
        left[i] = pcmSample(view, (start + i) * align, type, bits);
        if (right) right[i] = pcmSample(view, (start + i) * align + bits / 8, type, bits);
      }
      append(right ? encoder.encodeBuffer(left, right) : encoder.encodeBuffer(left));
    }
    onProgress(consumed + length, size);
  }
  append(encoder.flush());
  if (!outputSize) throw new Error('MP3 conversion produced no audio.');
  return new Blob(chunks, { type: 'audio/mpeg' });
}

self.onmessage = async ({ data }) => {
  try {
    if (!(data.file instanceof Blob) || !data.file.size || data.file.size > 250 * 1024 * 1024) throw new Error('Choose a WAV within the 250 MB limit.');
    const blob = await wavToMp3(data.file, 50 * 1024 * 1024, (loaded, total) => self.postMessage({ type: 'progress', loaded, total }));
    self.postMessage({ type: 'complete', blob });
  } catch (error) { self.postMessage({ type: 'error', message: error.message || 'WAV conversion failed. Export an MP3 and upload it directly.' }); }
};
