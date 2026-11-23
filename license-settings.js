// Shared license configuration. No simulated payments or seller operations.
function hydrateLicenses(saved) {
  const delivery={basic:['mp3'],premium:['mp3','wav'],unlimited:['mp3','wav','stems'],custom:[]};
  for(const item of tiers){
    const candidate=saved[item.id]||{};
    const defaults=dashboardLicenseDefaults(item.id);
    const suppliedDefaults=['grant','limits','terms'].some(key=>typeof candidate[key]==='string'&&!candidate[key].trim())&&!candidate.usageDefaultsVersion;
    Object.assign(item,{publishing:50,major:90,indie:70,...defaults,version:1,delivery:delivery[item.id],usageDefaultsVersion:1});
    if(item.id!=='custom'&&Number.isFinite(candidate.price)&&candidate.price>0)item.price=candidate.price;
    for(const key of ['publishing','major','indie'])if(Number.isFinite(candidate[key])&&candidate[key]>=0&&candidate[key]<=100)item[key]=candidate[key];
    for(const key of ['grant','limits','terms'])if(typeof candidate[key]==='string'&&(candidate[key].trim()||candidate.usageDefaultsVersion))item[key]=candidate[key];
    if(Number.isInteger(candidate.version)&&candidate.version>0)item.version=candidate.version;
    if(suppliedDefaults)item.version++;
    if(Array.isArray(candidate.delivery)&&candidate.delivery.length&&candidate.delivery.every(file=>['mp3','wav','stems'].includes(file)))item.delivery=[...new Set(candidate.delivery)];
    item.files=item.id==='custom'?'Negotiated':item.delivery.map(file=>file==='stems'?'Stems':file.toUpperCase()).join(' + ');
  }
}

function startingPrice(){return cash(Math.min(...tiers.filter(item=>item.price).map(item=>item.price)));}

// File availability is per beat, not a change to the license's promised package.
// Public catalog flags must come from finalized uploads, never selected/pending files.
function licenseAvailability(track, license) {
  const required=license?.delivery;
  if(!track||!license||license.id==='custom'||!Array.isArray(required)||!required.length||
    required.some(file=>!['mp3','wav','stems'].includes(file))) return {enabled:false,missing:[]};
  const missing=required.filter(file=>{
    if(Object.hasOwn(track.fileAvailability||{},file))return track.fileAvailability[file]!==true;
    const upload=track.files?.[file];
    return !(typeof Blob!=='undefined'&&upload instanceof Blob&&upload.size>0);
  });
  return {enabled:missing.length===0,missing};
}
function missingLicenseFiles(track, license) {
  return licenseAvailability(track,license).missing.map(file=>file==='stems'?'stems':file.toUpperCase()).join(' + ');
}
