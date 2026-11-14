"""Writes viewer.html: one self-contained page (three.js, GLTFLoader, OrbitControls and the glb all inline) with orbit controls and breathe / blink / walk buttons.
Run: python viewer_gen.py LOIKA.glb OUT/viewer.html"""
import sys, json, base64, re
glb, out = sys.argv[1:3]
look = json.load(open(__import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "../foundation/specimens.json")))["S01"]["look"]      # the house's own colours, not copies
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
VIEWER_BODY = 1.14      # round 4: a stand-in in the viewer for what Blender's body has and three's standard material lacks (the subsurface lift and the vinyl's sheen): +14 % in sRGB so the body's median matches the sprite's
from paint import CREAM_TUNE      # round 4: the cream the sprites paint is the house's cream times the mesh's tune: the viewer paints the same
colour = lambda k: ", ".join(f"{min(255.0, x * (CREAM_TUNE[i] if k == 'cream' else VIEWER_BODY if k == 'body' else 1.0)):.2f}" for i, x in enumerate(look[k]))
T = "/home/mb/mb/tools-3d/web/node_modules/three"
rd = lambda p: open(f"{T}/{p}", encoding="utf8").read()
src = dict(three=rd("build/three.module.min.js"), gltf=rd("examples/jsm/loaders/GLTFLoader.js"), orbit=rd("examples/jsm/controls/OrbitControls.js"), bgu=rd("examples/jsm/utils/BufferGeometryUtils.js"))
js = lambda s: json.dumps(s).replace("</", "<\\/")
b64 = base64.b64encode(open(glb, "rb").read()).decode()
html = """<!doctype html><html><head><meta charset="utf-8"><title>Loika, the mesh (glb in three.js)</title>
<style>html,body{margin:0;height:100%;background:#e9e7e2;font-family:'DejaVu Sans',sans-serif;font-size:15px;color:#222}
#ui{position:fixed;left:12px;top:10px;z-index:2}button{font:inherit;font-size:15px;padding:6px 14px;margin:2px;border:1px solid #888;background:#fff;border-radius:4px;cursor:pointer}
button.on{background:#2b6fd6;color:#fff;border-color:#2b6fd6}#msg{margin:6px 4px;color:#555;max-width:560px}canvas{display:block}</style></head><body>
<div id="ui"><b>Loika</b> (mesh, glb) &nbsp;<button id="b-breathe">breathe</button><button id="b-blink">blink</button><button id="b-walk">walk</button><button id="b-stand">stand</button> &nbsp;<button id="m-normal" class="on">normal</button><button id="m-parts">parts in colours</button><button id="m-wire">wireframe over parts</button>
<div id="legend" style="display:none;position:fixed;right:12px;top:10px;font-size:14px;line-height:1.45;background:#fff;padding:6px 10px;border-radius:4px;border:1px solid #bbb"></div>
<div id="msg">Drag to orbit, wheel to zoom, right-drag to pan. The buttons toggle a looping clip; the stand pose is the head's pose in every clip.</div></div>
<script>
const SRC = %SRC%;
const GLB = "%GLB%";
(async () => {
  const url = (t) => URL.createObjectURL(new Blob([t], { type: "text/javascript" }));
  const threeURL = url(SRC.three);
  const bguURL = url(SRC.bgu.replace(/from\\s+['"]three['"]/g, `from '${threeURL}'`));
  const gltfURL = url(SRC.gltf.replace(/from\\s+['"]three['"]/g, `from '${threeURL}'`).replace(/from\\s+['"]\\.\\.\\/utils\\/BufferGeometryUtils\\.js['"]/g, `from '${bguURL}'`));
  const orbitURL = url(SRC.orbit.replace(/from\\s+['"]three['"]/g, `from '${threeURL}'`));
  const THREE = await import(threeURL), { GLTFLoader } = await import(gltfURL), { OrbitControls } = await import(orbitURL);
  const W = () => innerWidth, Hh = () => innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W(), Hh()); document.body.appendChild(renderer.domElement);
  renderer.setClearColor(0xe9e7e2);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(%HSKY%, %HGND%, %HINT%));
  const sun = new THREE.DirectionalLight(%SUNC%, %SUNI%); sun.position.set(-2.4, 4.0, 3.2); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(28, W() / Hh(), 0.1, 100);
  cam.position.set(6.0, 2.6, 4.1);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.set(-0.05, 0.95, -0.35); ctl.enableDamping = true; ctl.update();
  const bin = Uint8Array.from(atob(GLB), (c) => c.charCodeAt(0)).buffer;
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(bin, "", res, rej));
  scene.add(gltf.scene);
  // the cream's edge and the smile's ink come from smooth per-vertex fields (COLOR_1) thresholded here with the sprite's own smoothsteps, so the level-2 mesh shows no steps or stipple
  const srgb = (r, g, b) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  gltf.scene.traverse((o) => {
    if (!(o.isMesh && o.geometry.attributes.color_1)) return;
    o.material.onBeforeCompile = (sh) => {
      sh.uniforms.cBody = { value: srgb(%BODY%) }; sh.uniforms.cCream = { value: srgb(%CREAM%) }; sh.uniforms.cInk = { value: srgb(%INK%) };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\\nattribute vec4 color_1;\\nvarying vec4 vPaint;").replace("#include <begin_vertex>", "#include <begin_vertex>\\nvPaint = vec4(color_1.x, color_1.y, color_1.z * 0.2 - 0.1, color_1.w * 0.1 - 0.05);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\\nvarying vec4 vPaint;\\nuniform vec3 cBody, cCream, cInk;").replace("#include <color_fragment>",
        "{ float e = smoothstep(-0.015, 0.015, vPaint.z) * smoothstep(0.0, 1.0, vPaint.x); float c = max(e, smoothstep(0.0, 1.0, vPaint.y)); float px = 1.0 / 110.0; float ik = smoothstep(-0.6 * px, 0.6 * px, vPaint.w); diffuseColor.rgb = mix(mix(cBody, cCream, c), cInk, ik); }");
    };
    o.material.needsUpdate = true;
  });
  // the owner's part view: every named mesh in its own colour, the body's _PART attribute (the cage part each vertex came from, names in asset.extras.parts) in colours, and a wireframe over it, to find surfaces that cross
  const partNames = (gltf.parser.json.asset.extras || {}).parts || [];
  const hue = (i, n) => new THREE.Color().setHSL(((i * 0.381966) % 1), 0.62, 0.52 + 0.1 * (i % 2));
  const meshColour = { eyeL: 0xffffff, eyeR: 0xdddddd, "lidL": 0xffd0d0, "lidR": 0xffb0b0, beans: 0xffe35a };
  const partsMat = new Map(), wireOf = [];
  let body = null;
  gltf.scene.traverse((o) => { if (!o.isMesh) return; o.userData.orig = o.material; if (o.geometry.attributes._part) body = o; });
  const legend = document.getElementById("legend");
  legend.innerHTML = partNames.map((n, i) => `<span style="display:inline-block;width:12px;height:12px;background:#${hue(i).getHexString()};margin-right:6px"></span>${n}`).join("<br>") + "<br>" + Object.entries(meshColour).map(([n, c]) => `<span style="display:inline-block;width:12px;height:12px;background:#${c.toString(16).padStart(6, "0")};border:1px solid #888;margin-right:6px"></span>${n}`).join("<br>");
  if (body) {
    const pa = body.geometry.attributes._part, col = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) { const c = hue(pa.getX(i)); col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b; }
    body.userData.partCol = new THREE.BufferAttribute(col, 3); body.userData.origCol = body.geometry.attributes.color;
    partsMat.set(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    const w = new THREE.SkinnedMesh(body.geometry, new THREE.MeshBasicMaterial({ color: 0x101010, wireframe: true, transparent: true, opacity: 0.4 }));
    w.bind(body.skeleton, body.bindMatrix); w.frustumCulled = false; w.visible = false; w.morphTargetInfluences = body.morphTargetInfluences; w.morphTargetDictionary = body.morphTargetDictionary;
    body.parent.add(w); wireOf.push(w);
  }
  let mode = "normal";
  const setMode = (m) => {
    mode = m;
    gltf.scene.traverse((o) => {
      if (!o.isMesh || wireOf.includes(o)) return;
      if (m === "normal") { o.material = o.userData.orig; if (o === body) o.geometry.setAttribute("color", body.userData.origCol); }
      else if (o === body) { o.geometry.setAttribute("color", body.userData.partCol); o.material = partsMat.get(o); }
      else { const k = o.name.replace(/\\./g, ""); const c = meshColour[k] ?? (o.name.startsWith("leaf") ? [0x7fd34a, 0x4aa33a, 0xb4e86a][+o.name.slice(-1)] : 0xcccccc); o.material = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide }); }
    });
    for (const w of wireOf) w.visible = m === "wire";
    for (const n of ["normal", "parts", "wire"]) document.getElementById("m-" + n).classList.toggle("on", n === m);
    legend.style.display = m === "normal" ? "none" : "block";
  };
  for (const n of ["normal", "parts", "wire"]) document.getElementById("m-" + n).onclick = () => setMode(n);
  window.__mode = setMode;
  const mixer = new THREE.AnimationMixer(gltf.scene), clips = {}, actions = {};
  for (const c of gltf.animations) { clips[c.name] = c; actions[c.name] = mixer.clipAction(c); }
  if (actions.stand) { actions.stand.play(); }
  const on = new Set();
  const setBtn = () => { for (const n of ["breathe", "blink", "walk"]) document.getElementById("b-" + n).classList.toggle("on", on.has(n)); };
  for (const n of ["breathe", "blink", "walk"]) document.getElementById("b-" + n).onclick = () => {
    if (!actions[n]) return;
    if (on.has(n)) { on.delete(n); actions[n].stop(); } else { on.add(n); actions[n].reset().play(); actions[n].setLoop(THREE.LoopRepeat, Infinity); }
    setBtn();
  };
  document.getElementById("b-stand").onclick = () => { for (const n of on) actions[n].stop(); on.clear(); setBtn(); };
  // a blink every few seconds on its own while 'blink' is on: the clip is 0.2 s, so loop it with a pause
  let last = performance.now(), blinkT = 0;
  const clock = new THREE.Clock();
  addEventListener("resize", () => { renderer.setSize(W(), Hh()); cam.aspect = W() / Hh(); cam.updateProjectionMatrix(); });
  if (location.hash === '#shot') document.getElementById('ui').style.display = 'none';
  window.__cam = (p, t) => { cam.position.set(...p); ctl.target.set(...t); ctl.update(); };
  window.__scene = scene; window.__ready = true; window.__clips = Object.keys(clips); window.__info = { clips: Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, v.duration])), morphs: [] };
  gltf.scene.traverse((o) => { if (o.isMesh && o.morphTargetDictionary) window.__info.morphs.push(Object.keys(o.morphTargetDictionary)); if (o.isSkinnedMesh) window.__info.bones = o.skeleton.bones.length; });
  // for the screenshots: freeze a clip at a time
  window.__pose = (name, t) => { for (const a of Object.values(actions)) a.stop(); if (actions.stand) actions.stand.play(); if (name !== "stand") { const a = actions[name]; a.reset().play(); a.paused = true; a.time = t; } mixer.update(0); mixer.update(0); renderer.render(scene, cam); };
  renderer.setAnimationLoop(() => { const dt = clock.getDelta(); mixer.update(dt); ctl.update(); renderer.render(scene, cam); });
})().catch((e) => { document.getElementById("msg").textContent = "failed: " + e; console.error(e); });
</script></body></html>"""
import os
LP = dict(HSKY=os.environ.get("HSKY", "0xf4ede2"), HGND=os.environ.get("HGND", "0xc8baa4"), HINT=os.environ.get("HINT", "2.4"), SUNC=os.environ.get("SUNC", "0xfffaf2"), SUNI=os.environ.get("SUNI", "1.25"))      # round 4: the viewer's light tuned to the Blender sprite's values (the report's three.js match)
for k, v in LP.items():
    html = html.replace("%" + k + "%", v)
html = html.replace("%BODY%", colour("body")).replace("%CREAM%", colour("cream")).replace("%INK%", colour("mouth")).replace("%SRC%", js(src)).replace("%GLB%", b64)
open(out, "w", encoding="utf8").write(html)
print("viewer", len(html) // 1024, "KB")
