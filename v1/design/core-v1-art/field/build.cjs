// Preserve Gemini RGB; measured crops, authored silhouette alpha, explicit nearest native derivatives.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const directory = __dirname;
const recipe = JSON.parse(fs.readFileSync(path.join(directory, 'crops.json'), 'utf8'));
const sourcePath = path.join(directory, recipe.source);
const outputDirectory = path.join(directory, 'exports');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = fs.readFileSync(sourcePath);
const images = new Map();
const records = [];

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const first = points[i], second = points[j];
    if ((first[1] > y) !== (second[1] > y) &&
        x < (second[0] - first[0]) * (y - first[1]) / (second[1] - first[1]) + first[0]) inside = !inside;
  }
  return inside;
}

async function save(name, png, provenance) {
  const filename = path.join(outputDirectory, `${name}.png`);
  fs.writeFileSync(filename, png);
  const {data, info} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if (info.width !== 32 || info.height !== 32) throw new Error(`Invalid native footprint: ${name}`);
  images.set(name, png);
  records.push({name, file:`exports/${name}.png`, width:32, height:32,
    pngSha256:hash(png), rgbaSha256:hash(data), ...provenance});
}

function rotatedMask(mask) {
  return ((mask << 1) & 15) | ((mask >> 3) & 1);
}

async function main() {
  fs.mkdirSync(outputDirectory, {recursive:true});
  const sourceInfo = await sharp(sourceBytes).metadata();
  for (const crop of recipe.crops) {
    const [left, top, width, height] = crop.rectangle;
    const {data, info} = await sharp(sourceBytes).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if (crop.silhouette) for (let y=0; y<height; ++y) for (let x=0; x<width; ++x) {
      if (!insidePolygon(left+x+0.5,top+y+0.5,crop.silhouette)) data[(y*width+x)*4+3] = 0;
    }
    const png = await sharp(data,{raw:info}).resize(32,32,{fit:crop.silhouette?'contain':'fill',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
    await save(crop.name,png,{rectangle:crop.rectangle, silhouette:crop.silhouette || null,
      method:crop.silhouette?'Authored silhouette alpha; aspect-preserving nearest fit':'Measured square terrain crop; nearest native derivative',pathMask:crop.pathMask});
  }
  for (const name of ['shrub','tree','boulder']) {
    const png=await sharp(images.get('grass-a')).composite([{input:images.get(name),left:0,top:0}]).png().toBuffer();
    await save(`${name}-ground`,png,{derivedFrom:[name,'grass-a'],method:'Native object alpha over retained quiet sourcegrass; opaque single-cell terrain'});
  }
  await save('path-0',images.get('grass-a'),{derivedFrom:'grass-a',pathMask:0,meaning:'Non-path fallback; no isolated-path claim'});
  const baseNames = ['path-end-w','path-ns','path-ew','path-es','path-new','path-cross'];
  const assigned = new Set([0]);
  for (const name of baseNames) {
    const base = records.find(record=>record.name===name);
    let mask = base.pathMask;
    for (let rotation=0; rotation<4; ++rotation) {
      if (!assigned.has(mask)) {
        const png = await sharp(images.get(name)).rotate(rotation*90).png().toBuffer();
        await save(`path-${mask}`,png,{derivedFrom:name,rotation:rotation*90,pathMask:mask});
        assigned.add(mask);
      }
      mask = rotatedMask(mask);
    }
  }
  if (assigned.size !== 16) throw new Error('Incomplete legal neighbor-mask art');
  const columns = 8, cellWidth=80, cellHeight=72;
  const rows = Math.ceil(records.length/columns);
  const composites=[];
  for (let i=0; i<records.length; ++i) {
    const x=(i%columns)*cellWidth, y=Math.floor(i/columns)*cellHeight;
    composites.push({input:images.get(records[i].name),left:x+24,top:y+4});
    const label=Buffer.from(`<svg width="80" height="24"><text x="40" y="16" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#d5e0e3">${records[i].name}</text></svg>`);
    composites.push({input:label,left:x,top:y+39});
  }
  await sharp({create:{width:columns*cellWidth,height:rows*cellHeight,channels:4,background:'#202b32'}}).composite(composites).png().toFile(path.join(directory,'native-contact-1x.png'));
  await sharp(path.join(directory,'native-contact-1x.png')).resize(columns*cellWidth*3,rows*cellHeight*3,{kernel:'nearest'}).png().toFile(path.join(directory,'native-contact-3x.png'));
  const joinNames=[['grass-a','path-4','grass-a'],['path-2','path-15','path-8'],['grass-a','path-1','grass-a']];
  const joins=[];
  for(let y=0;y<3;++y) for(let x=0;x<3;++x) joins.push({input:images.get(joinNames[y][x]),left:x*32,top:y*32});
  await sharp({create:{width:96,height:96,channels:4,background:'#202b32'}}).composite(joins).png().toFile(path.join(directory,'path-joins-1x.png'));
  const crossing=[];
  for(let y=0;y<3;++y) for(let x=0;x<5;++x) crossing.push({input:images.get(y===1?'path-10':x===2?'water':'grass-a'),left:x*32,top:y*32});
  await sharp({create:{width:160,height:96,channels:4,background:'#202b32'}}).composite(crossing).png().toFile(path.join(directory,'water-crossing-1x.png'));
  const route=JSON.parse(fs.readFileSync(path.join(directory,'source/permitted-route-proof.json'),'utf8').replace(/^\uFEFF/,''));
  const paths=new Set(route.paths), worldLayers=[];
  for(let index=0;index<220;++index) {
    const x=index%20, y=Math.floor(index/20);
    let name='grass-a';
    if(paths.has(index)) {
      const mask=(y>0&&paths.has(index-20)?1:0)|(x<19&&paths.has(index+1)?2:0)|(y<10&&paths.has(index+20)?4:0)|(x>0&&paths.has(index-1)?8:0);
      name=`path-${mask}`;
    } else if((index*17+y*7)%11===0) name='tree-ground';
    else if((index*11+x*3)%17===0) name='boulder-ground';
    else if((index*13+y)%19===0) name='moss';
    worldLayers.push({input:images.get(name),left:x*32,top:y*32});
  }
  const placeNames=['camp','moss-bend','relay','stone-shelf','cache'];
  for(const site of route.sites) worldLayers.push({input:images.get(placeNames[site.id]),left:site.tile[0]*32,top:site.tile[1]*32});
  const player=Buffer.from('<svg width="32" height="32"><path d="M16 2L23 9L16 16L9 9Z" fill="#67cef5" stroke="#f2fbfa" stroke-width="2"/></svg>');
  worldLayers.push({input:player,left:route.position[0]*32,top:route.position[1]*32});
  const world=await sharp({create:{width:640,height:352,channels:4,background:'#202b32'}}).composite(worldLayers).png().toBuffer();
  fs.writeFileSync(path.join(directory,'permitted-world-art-proof.png'),world);
  const cameraX=Math.max(0,Math.min(256,route.position[0]*32+16-192));
  const cameraY=Math.max(0,Math.min(64,route.position[1]*32+16-144));
  await sharp(world).extract({left:cameraX,top:cameraY,width:384,height:288}).png().toFile(path.join(directory,'native-viewport-1x.png'));
  // One disposable composition comparison. Existing route/player remain exact;
  // these explicit cosmetic groups are not new runtime terrain or map authority.
  const patches=new Set([49,50,69,149,150,169]);
  const groupedObjects=new Map([[51,'tree-ground'],[70,'tree-ground'],[71,'shrub-ground'],[151,'shrub-ground'],[170,'tree-ground'],[171,'tree-ground'],[190,'boulder-ground']]);
  const groupedLayers=[];
  for(let index=0;index<220;++index) {
    const x=index%20, y=Math.floor(index/20);
    let name=patches.has(index)?'grass-b':groupedObjects.get(index)||'grass-a';
    if(paths.has(index)) {
      const mask=(y>0&&paths.has(index-20)?1:0)|(x<19&&paths.has(index+1)?2:0)|(y<10&&paths.has(index+20)?4:0)|(x>0&&paths.has(index-1)?8:0);
      name=`path-${mask}`;
    }
    groupedLayers.push({input:images.get(name),left:x*32,top:y*32});
  }
  for(const site of route.sites) groupedLayers.push({input:images.get(placeNames[site.id]),left:site.tile[0]*32,top:site.tile[1]*32});
  groupedLayers.push({input:player,left:route.position[0]*32,top:route.position[1]*32});
  const groupedWorld=await sharp({create:{width:640,height:352,channels:4,background:'#202b32'}}).composite(groupedLayers).png().toBuffer();
  await sharp(groupedWorld).extract({left:cameraX,top:cameraY,width:384,height:288}).png().toFile(path.join(directory,'native-viewport-grouped-comparison.png'));
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({status:'Actual native extraction candidate; atlas source and composed output require independent review',source:recipe.source,sourceSha256:hash(sourceBytes),sourceDimensions:[sourceInfo.width,sourceInfo.height],recipeSha256:hash(fs.readFileSync(path.join(directory,'crops.json'))),sourceLimit:'Provider did not follow grid/pixel constraints; native derivatives are explicit resamples, not generated native pixels. Lower unrelated brass artwork excluded.',assets:records},null,2)+'\n');
  process.stdout.write(JSON.stringify({assets:records.length,sourceSha256:hash(sourceBytes),native:'32x32',proof:'native-contact-1x.png'})+'\n');
}
main().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
