// Creates original, untagged demo audio on demand. Uploaded audio takes its place.
const sampleRate = 22050;
function renderDemoAudio(track) {
  const samples = new Float32Array(track.duration * sampleRate);
  const beat = 60 / track.bpm;
  const genre = categories.indexOf(track.genre);
  let noiseSeed = track.seed;
  const noise = () => {
    noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
    return noiseSeed / 2147483648 - 1;
  };
  function voice(length, waveform) {
    return Float32Array.from({length:Math.floor(length*sampleRate)}, (_,i) => waveform(i/sampleRate));
  }
  function mix(sound, at, volume) {
    const offset = Math.round(at * sampleRate);
    const count = Math.min(sound.length, samples.length - offset);
    for (let i=0;i<count;i++) samples[offset+i] += sound[i]*volume;
  }
  const kick = voice(.32,t=>Math.sin(2*Math.PI*(49*t+6*(1-Math.exp(-40*t))))*Math.exp(-12*t));
  const clap = voice(.22,t=>(noise()*.73+Math.sin(2*Math.PI*182*t)*.27)*Math.exp(-22*t));
  const hat = voice(.085,t=>(noise()*.7+Math.sin(2*Math.PI*7000*t)*.3)*Math.exp(-52*t));
  const tones = new Map();
  function note(midi, type) {
    const id=type+midi;
    if (!tones.has(id)) {
      const hz=440*2**((midi-69)/12);
      const bass=type==='bass';
      tones.set(id,voice(beat*(bass?1.55:2.65),t=>{
        const phase=2*Math.PI*hz*t;
        const envelope=Math.min(1,t*150)*Math.exp(-t*(bass?2.3:2.75));
        return (Math.sin(phase+Math.sin(phase*2)*.36)+.22*Math.sin(phase*2)+.12*Math.sin(phase*3))*envelope;
      }));
    }
    return tones.get(id);
  }
  const keyNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const root=48+Math.max(0,keyNames.indexOf(track.key.split(' ')[0]));
  const chords=[0,8,3,10];
  const count=Math.ceil(track.duration/(beat*4));
  for(let bar=0;bar<count;bar++){
    const start=bar*beat*4;
    const chord=root+chords[(bar+track.seed)%chords.length];
    const stripped=bar%16<2 || (bar%16>=12 && bar%16<14);
    const voicing=[0, bar%4===0?3:4, 7, 10];
    voicing.forEach((step,i)=>mix(note(chord+step,'keys'),start+i*.018,.082));
    if (bar%8!==7) {
      const melody=[7,12,10,3,(bar%2?15:19)];
      for(let step=0;step<melody.length;step++){
        const at=start+beat*(.5+step*.65+(step%2)*.12);
        const pitch=root+12+melody[(step+track.seed+bar)%melody.length];
        mix(note(pitch,'keys'),at,.066);
        mix(note(pitch,'keys'),at+beat*.75,.019);
      }
    }
    if(stripped) continue;
    const kicks=genre===1?[0,1.5,2.75,3.5]:genre===2?[0,.75,2.5,3.25]:[0,1.75,2.5];
    kicks.forEach((when,i)=>{
      mix(kick,start+when*beat,genre===2?.64:.5);
      if(i<3)mix(note(chord-24+(i===2?7:0),'bass'),start+when*beat,.28);
    });
    (genre===2?[2]:[1,3]).forEach(when=>mix(clap,start+when*beat,.26));
    for(let step=0;step<8;step++) mix(hat,start+beat*(step*.5+(step%2)*.035),step%2?.086:.129);
    if(bar%2 && genre!==0) mix(hat,start+beat*3.75,.1);
  }
  const buffer=new ArrayBuffer(44+samples.length*2);
  const view=new DataView(buffer);
  function word(position,value){
    for(let i=0;i<value.length;i++) view.setUint8(position+i,value.charCodeAt(i));
  }
  word(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');
  view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){
    const gain=Math.min(1,i/2000,(samples.length-i)/(sampleRate*1.25));
    view.setInt16(44+i*2,Math.tanh(samples[i]*1.35)*gain*32767,true);
  }
  return URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
}