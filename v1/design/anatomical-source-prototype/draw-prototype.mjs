// Disposable source-art construction, not a genomic resolver or species selector.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('sharp');
const directory = path.dirname(fileURLToPath(import.meta.url));
const add = (a, b) => a.map((value, index) => value + b[index]);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const mul = (a, value) => a.map(component => component * value);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = vector => mul(vector, 1 / Math.hypot(...vector));
const right = [Math.sqrt(3)/2, -.5, 0];
const up = [.25, Math.sqrt(3)/4, Math.sqrt(3)/2];
const towardViewer = cross(right, up);
const light = unit([-.55, -.6, .8]);
const palette = { body: '#269fa5', support: '#dfd2ae', rim: '#f1eddc', pupil: '#273036' };

const variants = [
  {
    id: 'compact', label: 'Compact / stocky',
    trunk: { center: [.25,0,.77], radii: [.62,.34,.38] },
    neck: { center: [-.36,0,1.01], radii: [.29,.245,.29] },
    head: { center: [-.66,0,1.22], radii: [.34,.33,.34] },
    muzzle: { projection: .20, width: .225, depth: .15 },
    jaw: { depth: .095, width: .20 },
    face: { eyeSeparation: .32, eyeHeight: .07, eyeRadii: [.025,.085,.105] },
    supports: { foreX: -.17, hindX: .65, rootZ: .76, jointZ: .36, width: .125, distalWidth: .10, terminalRadii: [.205,.15,.095] },
    crown: { form: 'rounded', spacing: .44, height: .155, width: .12 },
  },
  {
    id: 'lean', label: 'Lean / projecting',
    trunk: { center: [.26,0,1.01], radii: [.76,.235,.275] },
    neck: { center: [-.47,0,1.24], radii: [.255,.185,.245] },
    head: { center: [-.77,0,1.40], radii: [.275,.235,.275] },
    muzzle: { projection: .34, width: .145, depth: .12 },
    jaw: { depth: .075, width: .13 },
    face: { eyeSeparation: .245, eyeHeight: .05, eyeRadii: [.022,.07,.09] },
    supports: { foreX: -.22, hindX: .76, rootZ: .98, jointZ: .48, width: .085, distalWidth: .065, terminalRadii: [.14,.105,.08] },
    crown: { form: 'pointed', spacing: .34, height: .29, width: .09 },
  },
];

function makeScene(parameters) {
  const faces = [];
  const parts = [];
  const chains = [];
  function polygon(points, pigment, owner, center) {
    let normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
    const middle = mul(points.reduce((sum, point) => add(sum, point), [0,0,0]), 1 / points.length);
    if (dot(normal, sub(middle, center)) < 0) normal = mul(normal, -1);
    faces.push({ points, pigment, owner, normal, depth: dot(middle, towardViewer) });
  }
  function ellipsoid(owner, center, radii, pigment, longitude = 12, latitude = 6) {
    const rings = [];
    for (let row = 0; row <= latitude; row++) {
      const angle = Math.PI * row / latitude;
      rings.push(Array.from({length: longitude}, (_, column) => {
        const around = 2 * Math.PI * column / longitude;
        return add(center, [radii[0]*Math.sin(angle)*Math.cos(around), radii[1]*Math.sin(angle)*Math.sin(around), radii[2]*Math.cos(angle)]);
      }));
    }
    for (let row = 0; row < latitude; row++) {
      for (let column = 0; column < longitude; column++) {
        const next = (column + 1) % longitude;
        const points = row === 0 ? [rings[row][column],rings[row+1][column],rings[row+1][next]]
          : row === latitude-1 ? [rings[row][column],rings[row+1][column],rings[row][next]]
          : [rings[row][column],rings[row+1][column],rings[row+1][next],rings[row][next]];
        polygon(points, pigment, owner, center);
      }
    }
    parts.push({owner, primitive: 'coarse ellipsoid', center, radii, pigment});
  }
  function segment(owner, start, end, radiusStart, radiusEnd, pigment) {
    const axis = unit(sub(end,start));
    const tangent = unit(cross(axis, Math.abs(axis[2]) < .8 ? [0,0,1] : [1,0,0]));
    const second = cross(axis,tangent);
    const ring = (point,radius) => Array.from({length:8}, (_, index) => add(point, mul(add(mul(tangent,Math.cos(index*Math.PI/4)),mul(second,Math.sin(index*Math.PI/4))),radius)));
    const first = ring(start,radiusStart), last = ring(end,radiusEnd);
    const middle = mul(add(start,end),.5);
    for(let index=0;index<8;index++) polygon([first[index],last[index],last[(index+1)%8],first[(index+1)%8]],pigment,owner,middle);
    polygon(first,pigment,owner,middle);
    polygon(last,pigment,owner,middle);
    parts.push({owner,primitive:'tapered connected segment',start,end,radiusStart,radiusEnd,pigment});
  }

  for (const region of ['trunk','neck','head']) ellipsoid(region,parameters[region].center,parameters[region].radii,palette.body);
  const [headX,,headZ] = parameters.head.center;
  const headFront = headX-parameters.head.radii[0];
  const muzzleCenter = [headFront-.08,0,headZ-.13];
  ellipsoid('muzzle',muzzleCenter,[parameters.muzzle.projection,parameters.muzzle.width,parameters.muzzle.depth],palette.body);
  ellipsoid('lower-jaw',[muzzleCenter[0]+.025,0,muzzleCenter[2]-.11],[parameters.muzzle.projection*.88,parameters.jaw.width,parameters.jaw.depth],palette.body);

  for (const side of [-1,1]) {
    const eyeY = side*parameters.face.eyeSeparation/2;
    const eyeZ = headZ+parameters.face.eyeHeight;
    const normalized = (eyeY/parameters.head.radii[1])**2+(parameters.face.eyeHeight/parameters.head.radii[2])**2;
    const eyeX = headX-parameters.head.radii[0]*Math.sqrt(1-normalized)-.012;
    ellipsoid(`exterior-eye-${side}`, [eyeX,eyeY,eyeZ],parameters.face.eyeRadii,palette.rim,12,6);
    ellipsoid(`pupil-${side}`, [eyeX-.024,eyeY,eyeZ],[.012,parameters.face.eyeRadii[1]*.53,parameters.face.eyeRadii[2]*.57],palette.pupil,12,6);
    const crownCenter = [headX+.02,side*parameters.crown.spacing/2,headZ+parameters.head.radii[2]*.81];
    if(parameters.crown.form === 'rounded') {
      ellipsoid(`crown-${side}`,add(crownCenter,[0,0,.07]),[parameters.crown.width,parameters.crown.width,parameters.crown.height],palette.body,10,5);
    } else {
      const base = Array.from({length:6},(_,index)=>add(crownCenter,[parameters.crown.width*Math.cos(index*Math.PI/3),parameters.crown.width*Math.sin(index*Math.PI/3),0]));
      const tip = add(crownCenter,[-.025,side*.055,parameters.crown.height]);
      for(let index=0;index<6;index++) polygon([base[index],base[(index+1)%6],tip],palette.body,`crown-${side}`,add(crownCenter,[0,0,parameters.crown.height/3]));
      parts.push({owner:`crown-${side}`,primitive:'paired pointed head surface',base,tip,pigment:palette.body});
    }
    for(const pair of ['fore','hind']) {
      const support = parameters.supports;
      const rootX = support[`${pair}X`];
      const axialRatio = (rootX-parameters.trunk.center[0])/parameters.trunk.radii[0];
      const heightRatio = (support.rootZ-parameters.trunk.center[2])/parameters.trunk.radii[2];
      const transverseRoot = parameters.trunk.radii[1]*Math.sqrt(1-axialRatio**2-heightRatio**2);
      const root = [rootX,side*transverseRoot,support.rootZ];
      const joint = [root[0]+(pair==='fore'?-.06:-.13),side*(transverseRoot+.025),support.jointZ];
      const end = [root[0]+(pair==='fore'?-.10:-.035),side*(transverseRoot+.045),support.terminalRadii[2]];
      segment(`${pair}-${side}-proximal`,root,joint,support.width,support.width*.86,palette.support);
      ellipsoid(`${pair}-${side}-joint`,joint,[support.width*.90,support.width*.90,support.width*.90],palette.support,10,5);
      segment(`${pair}-${side}-distal`,joint,end,support.distalWidth,support.distalWidth*.85,palette.support);
      ellipsoid(`${pair}-${side}-terminal`,add(end,[-.055,0,0]),support.terminalRadii,palette.support,12,6);
      chains.push({pair,side,root,joint,end,terminalCenter:add(end,[-.055,0,0]),terminalRadii:support.terminalRadii});
    }
  }
  return {parameters,faces,parts,chains};
}

const scenes = variants.map(makeScene);
const projected = scenes.flatMap(scene=>scene.faces.flatMap(face=>face.points.map(point=>[dot(point,right),-dot(point,up)])));
const bounds = {left:Math.min(...projected.map(point=>point[0])),right:Math.max(...projected.map(point=>point[0])),top:Math.min(...projected.map(point=>point[1])),bottom:Math.max(...projected.map(point=>point[1]))};
const scale = Math.min(216/(bounds.right-bounds.left),216/(bounds.bottom-bounds.top));
const project = point => [128+(dot(point,right)-(bounds.left+bounds.right)/2)*scale,128+(-dot(point,up)-(bounds.top+bounds.bottom)/2)*scale];
function shade(hex,normal) {
  const value = .75+.25*Math.max(0,dot(normal,light));
  return '#'+hex.slice(1).match(/../g).map(component=>Math.round(parseInt(component,16)*value).toString(16).padStart(2,'0')).join('');
}
function renderScene(scene,silhouette=false) {
  const polygons = scene.faces.toSorted((a,b)=>a.depth-b.depth).map(face=>{
    const pigment = silhouette ? '#172328' : shade(face.pigment,face.normal);
    return `<polygon points="${face.points.map(point=>project(point).map(value=>value.toFixed(3)).join(',')).join(' ')}" fill="${pigment}" stroke="${pigment}" stroke-width=".4" stroke-linejoin="round"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><title>${scene.parameters.label}; provisional anatomical source art</title><rect width="256" height="256" fill="#f7f5ee"/>${polygons}</svg>`;
}
const inner = svg => svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
for(const scene of scenes) {
  const svg = renderScene(scene);
  await fs.writeFile(path.join(directory,`${scene.parameters.id}.svg`),svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(directory,`${scene.parameters.id}.png`));
}
const text = (x,y,message,size=13) => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="#263237">${message}</text>`;
const rows = scenes.map((scene,index)=>text(index*256+16,48,scene.parameters.label)+`<g transform="translate(${index*256} 58)">${inner(renderScene(scene))}</g><g transform="translate(${index*256} 334)">${inner(renderScene(scene,true))}</g>`).join('');
const comparison = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="614" viewBox="0 0 512 614"><rect width="512" height="614" fill="#f7f5ee"/>${text(16,23,'Proposed anatomy · common camera / world scale',16)}${rows}${text(16,328,'Same constructed shapes · black silhouettes',11)}${text(16,605,'Visual source prototype; not evaluated genomes or finished pet art.',11)}</svg>`;
await fs.writeFile(path.join(directory,'comparison.svg'),comparison);
await sharp(Buffer.from(comparison)).png().toFile(path.join(directory,'comparison.png'));

// Separate source trace: top-view contact chains, not translucent skin in the reference.
let traceParts = text(16,23,'Support trace · same four rooted chains / top view',15);
for(const [index,scene] of scenes.entries()) {
  const mapping = point=>[index*256+128+(point[0]-.12)*80,115+point[1]*125];
  traceParts += text(index*256+16,48,scene.parameters.label,12);
  for(const chain of scene.chains) {
    const points = [chain.root,chain.joint,chain.end].map(mapping);
    const terminal = mapping(chain.terminalCenter);
    traceParts += `<ellipse cx="${terminal[0]}" cy="${terminal[1]}" rx="${chain.terminalRadii[0]*80}" ry="${chain.terminalRadii[1]*125}" fill="#dfd2ae" stroke="#273036" stroke-width="1"/>`;
    traceParts += `<polyline points="${points.map(point=>point.join(',')).join(' ')}" fill="none" stroke="#269fa5" stroke-width="3"/>`;
    for(const point of points) traceParts += `<circle cx="${point[0]}" cy="${point[1]}" r="2.5" fill="#273036"/>`;
  }
}
traceParts += text(16,207,'Root → joint → end; dots are trace markers, not added anatomy.',11);
const trace = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="222" viewBox="0 0 512 222"><rect width="512" height="222" fill="#f7f5ee"/>${traceParts}</svg>`;
await fs.writeFile(path.join(directory,'support-trace.svg'),trace);
await sharp(Buffer.from(trace)).png().toFile(path.join(directory,'support-trace.png'));
const record = {
  status:'Provisional visual construction parameters; not genomic inputs, resolved expression, inheritance or canonical content.',
  grammar:'head + projecting muzzle + lower jaw + neck + trunk; exterior paired ocular anchors; fore/hind paired two-link supports with terminal masses; paired head surfaces',
  coordinates:'X longitudinal (head negative); Y paired transverse; Z upward. Orthographic shallow three-quarter with opaque depth-sorted faces.',
  camera:{right,up,towardViewer,bounds,scale,pixelCell:256},
  surfaceOwners:{headTrunkMuzzleJawNeckCrown:palette.body,supportJointTerminal:palette.support,ocularRim:palette.rim,ocularPupil:palette.pupil,material:'smooth skin; no fur, scales, markings or new pigment patches'},
  causes:['All region centers/radii are explicit parameters. Muzzle derives from head front; jaw derives from muzzle.', 'Eye anchor X lies on head ellipsoid at declared local Y/Z; ocular rim/pupil are exterior mounts.', 'Four support roots use declared fore/hind X and height, with paired Y solved on the trunk ellipsoid. Joints and ends derive from declared offsets/heights. Connected tapered segments join exact endpoints.', 'Terminal masses center on distal endpoints with the same small forward offset; crown positions derive from head radii and paired spacing.', 'Compact/lean use identical composition operators; parameter contrasts alter growth/projection/width/end/crown form. No animal-name selector.', 'Light only shades the owner pigment; mesh facets carry no additional inherited traits.'],
  examples:scenes.map(scene=>({parameters:scene.parameters,constructedParts:scene.parts,supportChains:scene.chains})),
  limits:['No evaluated genome, old-locus mapping, valid G/E, rig, movement, tissue collision or biology claim.', 'Four supports are explicitly proposed fore/hind pairing, not remapped old 0/1/3 groups.', 'Faces use simple per-polygon painter depth; no full mesh union or general occlusion engine.', 'No tail, toe digits, hoof split, insect regions or wings; two relatives do not establish broad creature range.'],
};
await fs.writeFile(path.join(directory,'parameters.json'),JSON.stringify(record,null,2)+'\n');
console.log('Produced two 256px source references, shared colour/silhouette sheet and separate four-support trace.');
