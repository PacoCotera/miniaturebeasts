"""Writes viewer.html: one self-contained page (three.js, GLTFLoader, OrbitControls and the s20.glb inline) with orbit controls, modes Coat / Normal / Parts in colours / Wireframe (the per-vertex _PART attribute and asset.extras.parts names), clip buttons (Rest, stand, waddle, breathe, idle),
the glow pulse and the blink as runtime effects. Usage: python viewer_s20.py s20.glb viewer.html"""
import sys, json, base64
T = "/home/mb/mb/tools-3d/web/node_modules/three"
rd = lambda p: open(f"{T}/{p}", encoding="utf8").read()
glb, out = sys.argv[1], sys.argv[2]
src = dict(three=rd("build/three.module.min.js"), gltf=rd("examples/jsm/loaders/GLTFLoader.js"), orbit=rd("examples/jsm/controls/OrbitControls.js"), bgu=rd("examples/jsm/utils/BufferGeometryUtils.js"))
js = lambda s: json.dumps(s).replace("</", "<\\/")
b64 = base64.b64encode(open(glb, "rb").read()).decode()
HTML = r"""<!doctype html><html><head><meta charset="utf-8"><title>Tuliko (S20), one continuous body (glb in three.js)</title>
<style>html,body{margin:0;height:100%;background:#e9e7e2;font-family:'DejaVu Sans',sans-serif;font-size:15px;color:#222}
#ui{position:fixed;left:12px;top:10px;z-index:2;max-width:820px}button{font:inherit;font-size:15px;padding:6px 14px;margin:2px;border:1px solid #888;background:#fff;border-radius:4px;cursor:pointer}
button.on{background:#2b6fd6;color:#fff;border-color:#2b6fd6}#msg{margin:6px 4px;color:#555}canvas{display:block}
#legend{display:none;position:fixed;right:12px;top:10px;font-size:14px;line-height:1.45;background:#fff;padding:6px 10px;border-radius:4px;border:1px solid #bbb}</style></head><body>
<div id="ui"><b>Tuliko (S20)</b> (<span id="cnt"></span>) &nbsp;
<span id="modes"><button data-m="coat" class="on">Coat</button><button data-m="normal">Normal</button><button data-m="parts">Parts in colours</button><button data-m="wire">Wireframe</button><button data-m="cage">Cage</button></span><br>
<span id="clips"></span> <button id="bonesbtn">Bones: off</button><button id="blinkbtn">Blink: on</button><button id="glowbtn">Glow pulse: on</button>
<div id="msg">Drag to orbit, wheel to zoom, right-drag to pan. Clips loop; Rest is the bind pose. The blink draws the eye patches (open, half, closed, half); the lantern and freckles pulse 0.8-1.0 over 2.4 s.</div></div>
<div id="legend"></div><div id="blegend" style="display:none;position:fixed;right:12px;bottom:12px;font-size:14px;line-height:1.45;background:#fff;padding:6px 10px;border-radius:4px;border:1px solid #bbb"></div><div id="tip" style="display:none;position:fixed;z-index:3;background:#222;color:#fff;font-size:14px;padding:3px 8px;border-radius:3px;pointer-events:none"></div>
<script>
const SRC = %SRC%;
const GLB = "%GLB%";
(async () => {
  const url = (t) => URL.createObjectURL(new Blob([t], { type: "text/javascript" }));
  const threeURL = url(SRC.three);
  const bguURL = url(SRC.bgu.replace(/from\s+['"]three['"]/g, `from '${threeURL}'`));
  const gltfURL = url(SRC.gltf.replace(/from\s+['"]three['"]/g, `from '${threeURL}'`).replace(/from\s+['"]\.\.\/utils\/BufferGeometryUtils\.js['"]/g, `from '${bguURL}'`));
  const orbitURL = url(SRC.orbit.replace(/from\s+['"]three['"]/g, `from '${threeURL}'`));
  const THREE = await import(threeURL), { GLTFLoader } = await import(gltfURL), { OrbitControls } = await import(orbitURL);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement); renderer.setClearColor(0xe9e7e2);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe6f5, 0x8a8478, 1.2));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.4); sun.position.set(3, 4, 2.5); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
  // glTF is y-up; the body is z-up (x forward): the page turns the model, not the data
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root);
  cam.position.set(5.6, 2.6, -4.2); const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.set(-0.35, 1.2, 0); ctl.update();
  const bin = Uint8Array.from(atob(GLB), c => c.charCodeAt(0));
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(bin.buffer, "", res, rej));
  root.add(gltf.scene);
  const parts = gltf.parser.json.asset.extras.parts;
  let mesh, cageMesh; gltf.scene.traverse(o => { if (o.isSkinnedMesh) { if (o.name === "cage") cageMesh = o; else mesh = o; } });
  { const c = gltf.parser.json.asset.extras.counts; document.getElementById("cnt").textContent = gltf.parser.json.asset.extras.build + " \u00b7 " + c.render_vertices + " verts (cage " + c.cage_vertices + "), " + c.render_triangles + " triangles, subdivision level " + c.level; }
  cageMesh.frustumCulled = false; cageMesh.visible = false; cageMesh.material = new THREE.MeshBasicMaterial({ color: 0x0a2a7a, wireframe: true, depthTest: true });
  mesh.frustumCulled = false;
  const geo = mesh.geometry, pa = geo.getAttribute("_part");
  const pal = parts.map((_, i) => new THREE.Color().setHSL((i * 0.137) % 1, 0.62, 0.55));
  const pcol = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) { const c = pal[Math.round(pa.getX(i))] || pal[0]; pcol[3 * i] = c.r; pcol[3 * i + 1] = c.g; pcol[3 * i + 2] = c.b; }
  // the coat comes from the glb's own material (baseColor, emissive and roughness textures on the cage's UVs); Parts mode paints per-part colours as vertex colours
  const pcolAttr = new THREE.BufferAttribute(pcol, 3);
  const coatMat = mesh.material; coatMat.roughness = 1.3; coatMat.metalness = 0; coatMat.needsUpdate = true;
  const emissive0 = coatMat.emissiveIntensity;
  const ex = gltf.parser.json.asset.extras;
  // the blink: the eye patches are drawn over a canvas copy of the base atlas (open, half, closed, half)
  let blinkCanvas = null, blinkCtx = null, blinkTex = null, patches = [], baseImage = coatMat.map ? coatMat.map.image : null;
  if (ex.blink && ex.blink.patches && baseImage) {
    const A = ex.blink.atlas;
    blinkCanvas = document.createElement("canvas"); blinkCanvas.width = A; blinkCanvas.height = A; blinkCtx = blinkCanvas.getContext("2d"); blinkCtx.drawImage(baseImage, 0, 0);
    blinkTex = new THREE.CanvasTexture(blinkCanvas); blinkTex.flipY = false; blinkTex.colorSpace = THREE.SRGBColorSpace; blinkTex.wrapS = blinkTex.wrapT = THREE.ClampToEdgeWrapping; blinkTex.anisotropy = 4;
    for (const p of ex.blink.patches) { const t = await gltf.parser.getDependency("texture", p.image); patches[p.name] = { img: t.image, rect: p.rect }; }
  }
  const showFrame = (name) => { if (!blinkCtx) return; blinkCtx.drawImage(baseImage, 0, 0); if (name && patches[name]) { const p = patches[name]; blinkCtx.drawImage(p.img, p.rect[0], p.rect[1]); }
    coatMat.map = blinkTex; coatMat.needsUpdate = true; blinkTex.needsUpdate = true; };
  const glowU = { value: 1.0 };
  const mats = {
    coat: coatMat,
    normal: new THREE.MeshNormalMaterial({ flatShading: false }),
    parts: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
    wire: new THREE.MeshBasicMaterial({ color: 0x1a3d8f, wireframe: true })        // the shipped (render) mesh's triangles
  };
  const setMode = (m) => {
    if (m === "parts") { geo.setAttribute("color", pcolAttr); mats.parts.needsUpdate = true; }
    mesh.material = mats[m === "cage" ? "coat" : m]; cageMesh.visible = (m === "cage");
    if (m === "cage") { mats.coat.polygonOffset = true; mats.coat.polygonOffsetFactor = 1; mats.coat.polygonOffsetUnits = 1; } else { mats.coat.polygonOffset = false; }
    document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    const lg = document.getElementById("legend"); lg.style.display = m === "parts" ? "block" : "none";
    lg.innerHTML = parts.map((n, i) => `<div><span style="display:inline-block;width:14px;height:14px;background:#${pal[i % pal.length].getHexString()};margin-right:6px;vertical-align:middle"></span>${n}</div>`).join("");
    window.__mode = m; };
  document.querySelectorAll("#modes button").forEach(b => b.onclick = () => setMode(b.dataset.m)); setMode("coat");
  const mixer = new THREE.AnimationMixer(gltf.scene); let cur = null;
  const cl = document.getElementById("clips");
  const addBtn = (name, clip) => { const b = document.createElement("button"); b.textContent = name; b.onclick = () => { if (cur) cur.stop(); document.querySelectorAll("#clips button").forEach(x => x.classList.remove("on"));
      if (clip) { cur = mixer.clipAction(clip); cur.reset().play(); b.classList.add("on"); } else { cur = null; mixer.stopAllAction(); gltf.scene.traverse(o => { if (o.isBone) { o.position.copy(o.userData.p0); o.quaternion.copy(o.userData.q0); o.scale.set(1, 1, 1); } }); b.classList.add("on"); } }; cl.appendChild(b); return b; };
  gltf.scene.traverse(o => { if (o.isBone) { o.userData.p0 = o.position.clone(); o.userData.q0 = o.quaternion.clone(); } });
  const rb = addBtn("Rest", null); rb.classList.add("on");
  gltf.animations.forEach(a => addBtn(a.name, a));
  let blinkOn = true, glowOn = true;
  document.getElementById("blinkbtn").onclick = (e) => { blinkOn = !blinkOn; e.target.textContent = "Blink: " + (blinkOn ? "on" : "off"); };
  document.getElementById("glowbtn").onclick = (e) => { glowOn = !glowOn; e.target.textContent = "Glow pulse: " + (glowOn ? "on" : "off"); };

  // ---- Bones: joint-to-joint bones with joint dots, drawn on top of every mode (depthTest off), coloured by the spine's named ranges (and limb / appendage), the head pivot = the spine's end highlighted,
  // names on hover and in a legend, following the playing clip (each point is carried by its bone: local = rest point - the bone's rest head, to world through the bone's current matrix)
  const BN = ex.bones;
  const RC = { head: 0xe8452c, neck: 0xf0a020, back: 0x3aa655, seat: 0x1c9aa8, tail: 0x8a4fd0, limb: 0x2b6fd6, appendage: 0xd8509a };
  const bonesGroup = new THREE.Group(); bonesGroup.visible = false; scene.add(bonesGroup);
  const sane = (n) => n.replace(/\s/g, "_").replace(/[\[\]\.:\/]/g, "");        // GLTFLoader strips dots from node names
  const boneObj = {}; gltf.scene.traverse(o => { if (o.isBone) boneObj[o.name] = o; });
  const restHead = (b) => { const v = new THREE.Vector3(); for (let o = b; o && o.isBone; o = o.parent) v.add(o.position); return v; };
  const pts = BN.points.map(q => ({ name: q.name, bone: boneObj[sane(q.bone)], local: new THREE.Vector3(...q.p).sub(restHead(boneObj[sane(q.bone)])), w: new THREE.Vector3() }));
  const onTop = (m) => { m.depthTest = false; m.depthWrite = false; m.transparent = true; return m; };
  const cylG = new THREE.CylinderGeometry(1, 1, 1, 8), sphG = new THREE.SphereGeometry(1, 14, 10);
  const segM = new THREE.InstancedMesh(cylG, onTop(new THREE.MeshBasicMaterial({ color: 0xffffff })), BN.segs.length);
  const dotM = new THREE.InstancedMesh(sphG, onTop(new THREE.MeshBasicMaterial({ color: 0xffffff })), pts.length);
  segM.renderOrder = 998; dotM.renderOrder = 999; segM.frustumCulled = false; dotM.frustumCulled = false;
  BN.segs.forEach((sg, i) => segM.setColorAt(i, new THREE.Color(RC[sg.range])));
  pts.forEach((p, i) => dotM.setColorAt(i, new THREE.Color(0xffffff)));
  const pivI = BN.pivot;
  dotM.setColorAt(pivI, new THREE.Color(0xff1010));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 8, 28), onTop(new THREE.MeshBasicMaterial({ color: 0xff1010 }))); ring.renderOrder = 1000; ring.frustumCulled = false;
  bonesGroup.add(segM, dotM, ring);
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), D3 = new THREE.Vector3(), SC = new THREE.Vector3(), MID = new THREE.Vector3();
  const updateBones = () => {
    if (!bonesGroup.visible) return;
    gltf.scene.updateMatrixWorld(true);
    pts.forEach((p, i) => { p.w.copy(p.local); p.bone.localToWorld(p.w); const r = i === pivI ? 0.045 : 0.02; M4.compose(p.w, Q4.identity(), SC.set(r, r, r)); dotM.setMatrixAt(i, M4); });
    BN.segs.forEach((sg, i) => { const a = pts[sg.a].w, b = pts[sg.b].w; D3.subVectors(b, a); const L = D3.length(); MID.addVectors(a, b).multiplyScalar(0.5); Q4.setFromUnitVectors(UP, D3.normalize()); M4.compose(MID, Q4, SC.set(0.011, L, 0.011)); segM.setMatrixAt(i, M4); });
    segM.instanceMatrix.needsUpdate = true; dotM.instanceMatrix.needsUpdate = true; if (segM.instanceColor) segM.instanceColor.needsUpdate = true; if (dotM.instanceColor) dotM.instanceColor.needsUpdate = true;
    ring.position.copy(pts[pivI].w); ring.quaternion.copy(cam.quaternion); ring.scale.setScalar(0.085);
  };
  const bl = document.getElementById("blegend");
  bl.innerHTML = "<b>Bones</b> (on top of every mode)" + BN.ranges.map(r => `<div><span style="display:inline-block;width:14px;height:14px;background:#${new THREE.Color(RC[r]).getHexString()};margin-right:6px;vertical-align:middle"></span>${r}${r === "head" ? "" : ""}</div>`).join("") + `<div><span style="display:inline-block;width:14px;height:14px;border-radius:7px;background:#ff1010;margin-right:6px;vertical-align:middle"></span>head pivot = the spine's end (the head's underside)</div><div style="color:#555">hover a joint for its name</div>`;
  document.getElementById("bonesbtn").onclick = (e) => { bonesGroup.visible = !bonesGroup.visible; e.target.textContent = "Bones: " + (bonesGroup.visible ? "on" : "off"); e.target.classList.toggle("on", bonesGroup.visible); bl.style.display = bonesGroup.visible ? "block" : "none"; window.__bones = bonesGroup.visible; updateBones(); };
  const ray = new THREE.Raycaster(), tip = document.getElementById("tip"), mouse = new THREE.Vector2();
  renderer.domElement.addEventListener("mousemove", (ev) => {
    if (!bonesGroup.visible) { tip.style.display = "none"; return; }
    mouse.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, cam);
    let best = null, bd = 0.05;
    pts.forEach(p => { const d = ray.ray.distanceToPoint(p.w); if (d < bd) { bd = d; best = p; } });
    if (best) { tip.textContent = best.name + " (bone " + best.bone.name + ")"; tip.style.left = ev.clientX + 14 + "px"; tip.style.top = ev.clientY + 10 + "px"; tip.style.display = "block"; } else tip.style.display = "none"; });
  window.__ready = true;
  addEventListener("resize", () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const clock = new THREE.Clock(); let nextBlink = 3.0, blinkT = -1;
  const seq = [null, "half", "closed", "half"];
  (function loop() { requestAnimationFrame(loop); const dt = clock.getDelta(), t = clock.elapsedTime; mixer.update(dt); ctl.update(); updateBones();
    coatMat.emissiveIntensity = emissive0 * (glowOn ? 0.9 + 0.1 * Math.sin(2 * Math.PI * t / 2.4) : 1.0);
    if (window.__mode === "coat" && blinkOn && blinkCtx) {
      if (blinkT < 0 && t > nextBlink) { blinkT = 0; }
      if (blinkT >= 0) { blinkT += dt; const k = Math.floor(blinkT / 0.07); if (k < 4) { showFrame(seq[k]); } else { showFrame(null); blinkT = -1; nextBlink = t + 3 + 3 * Math.random(); } }
    }
    renderer.render(scene, cam); })();
})();
</script></body></html>"""
open(out, "w").write(HTML.replace("%SRC%", js(src)).replace("%GLB%", b64))
print("viewer", len(HTML) // 1024, "KB template")
