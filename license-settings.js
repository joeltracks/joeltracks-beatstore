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
