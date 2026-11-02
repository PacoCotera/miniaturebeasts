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
<div id="ui"><b>Tuliko (S20)</b> (one continuous cage, level 2, coat on a texture) &nbsp;
<span id="modes"><button data-m="coat" class="on">Coat</button><button data-m="normal">Normal</button><button data-m="parts">Parts in colours</button><button data-m="wire">Wireframe</button></span><br>
<span id="clips"></span> <button id="blinkbtn">Blink: on</button><button id="glowbtn">Glow pulse: on</button>
<div id="msg">Drag to orbit, wheel to zoom, right-drag to pan. Clips loop; Rest is the bind pose. The blink draws the eye patches (open, half, closed, half); the lantern and freckles pulse 0.8-1.0 over 2.4 s.</div></div>
<div id="legend"></div>
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
  let mesh; gltf.scene.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
  mesh.frustumCulled = false;
  const geo = mesh.geometry, pa = geo.getAttribute("_part");
  const pal = parts.map((_, i) => new THREE.Color().setHSL((i * 0.137) % 1, 0.62, 0.55));
  const pcol = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) { const c = pal[Math.round(pa.getX(i))] || pal[0]; pcol[3 * i] = c.r; pcol[3 * i + 1] = c.g; pcol[3 * i + 2] = c.b; }
  // the coat comes from the glb's own material (baseColor, emissive and roughness textures on the cage's UVs); Parts mode paints per-part colours as vertex colours
  const pcolAttr = new THREE.BufferAttribute(pcol, 3);
  const coatMat = mesh.material; coatMat.roughness = 1.0; coatMat.metalness = 0; coatMat.needsUpdate = true;
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
    wire: new THREE.MeshBasicMaterial({ color: 0x1a3d8f, wireframe: true })
  };
  const setMode = (m) => {
    if (m === "parts") { geo.setAttribute("color", pcolAttr); mats.parts.needsUpdate = true; }
    mesh.material = mats[m]; document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
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
  window.__ready = true;
  addEventListener("resize", () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const clock = new THREE.Clock(); let nextBlink = 3.0, blinkT = -1;
  const seq = [null, "half", "closed", "half"];
  (function loop() { requestAnimationFrame(loop); const dt = clock.getDelta(), t = clock.elapsedTime; mixer.update(dt); ctl.update();
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
