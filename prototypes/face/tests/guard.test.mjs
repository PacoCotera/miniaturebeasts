// The import guard (tools/guard.mjs): each rule fails on a tree that breaks it and passes the tree as it is. The real tree passes with no exemptions.
//   node --test prototypes/face/tests/guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "../tools/guard.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), real = path.resolve(here, "../../..");
function tree(files) {
  const root = mkdtempSync(path.join(tmpdir(), "mb-guard-")), put = (rel, s) => { const p = path.join(root, rel); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, s); };
  put("prototypes/face/removed.json", JSON.stringify({ paths: ["ui/scene.mjs", "station/src/screens/home.mjs"] }));
  for (const [rel, s] of Object.entries(files)) put(rel, s);
  return root;
}
// the words the guard looks for are assembled here, so this file is not itself an import of a removed path
const IMP = "imp" + "ort", FRM = "fr" + "om", SRC = "s" + "rc";
const fails = (files) => { const root = tree(files); try { return check(root).fails; } finally { rmSync(root, { recursive: true, force: true }); } };

test("the real tree passes, and the removed list is whole", () => { const r = check(real); assert.deepEqual(r.fails, []); assert.ok(r.removed >= 40 && r.files > 100); });
test("a removed path that exists again, and an import of one (static, dynamic, or a script tag), fail", () => {
  assert.match(fails({ "prototypes/ui/scene.mjs": "export const a = 1;" }).join("\n"), /ui\/scene\.mjs exists again/);
  assert.match(fails({ "prototypes/station/src/main.mjs": `${IMP} { Scene } ${FRM} "../../ui/scene.mjs";` }).join("\n"), /main\.mjs imports ui\/scene\.mjs/);
  assert.match(fails({ "prototypes/station/src/main.mjs": `const m = await ${IMP}("./screens/home.mjs");` }).join("\n"), /imports station\/src\/screens\/home\.mjs/);
  assert.match(fails({ "prototypes/station/index.html": `<script type="module" ${SRC}="../ui/scene.mjs"></script>` }).join("\n"), /index\.html imports ui\/scene\.mjs/);
  assert.deepEqual(fails({ "prototypes/station/src/main.mjs": `// ${IMP} { Scene } ${FRM} "../../ui/scene.mjs";\nexport const x = 1;` }), [], "a comment imports nothing");
});
test("the canvas is touched only by the face's present and the named decoders", () => {
  assert.match(fails({ "prototypes/station/src/art.mjs": 'const c = document.createElement("canvas");' }).join("\n"), /art\.mjs:1 uses the canvas/);
  assert.match(fails({ "prototypes/ui/assets.mjs": "const g = cv.getContext('2d');" }).join("\n"), /ui\/assets\.mjs:1 uses the canvas/);
  assert.match(fails({ "prototypes/station/src/x.mjs": "ctx.putImageData(a, 0, 0);" }).join("\n"), /putImageData/);
  assert.deepEqual(fails({ "prototypes/station/src/face-lvgl.mjs": "ctx.putImageData(a, 0, 0);", "prototypes/station/src/masters.mjs": 'document.createElement("canvas").getContext("2d");', "prototypes/station/src/art.mjs": "// a canvas in a comment\nexport const a = 1;" }), []);
});
test("JavaScript outside face/tests may not name an export of the node path", () => {
  assert.match(fails({ "prototypes/station/src/face-lvgl.mjs": "M._face_scene_begin();" }).join("\n"), /names an export of the node path/);
  assert.match(fails({ "prototypes/face/tools/x.mjs": "M._face_text();" }).join("\n"), /face\/tools\/x\.mjs:1/);
  assert.deepEqual(fails({ "prototypes/face/tests/node-scene.mjs": "M._face_scene_begin(); M._face_node(1);" }), []);
});
test("a screen registered with draw, nodes or faceNodes fails", () => {
  assert.match(fails({ "prototypes/station/src/screens/x.mjs": 'registerScreen("x", { draw, line, act });' }).join("\n"), /registers a screen with draw/);
  assert.match(fails({ "prototypes/station/src/screens/x.mjs": 'registerScreen("x", { nodes, faceNodes });' }).join("\n"), /with nodes/);
  assert.deepEqual(fails({ "prototypes/station/src/screens/x.mjs": 'registerScreen("x", { line, act, enter });' }), []);
});
test("LVGL objects are made in face/src/prim/ only; the platform may make its display and its input device", () => {
  assert.match(fails({ "prototypes/face/src/vocab/x.c": "lv_obj_t *o = lv_label_create(parent);" }).join("\n"), /x\.c:1 calls lv_label_create outside face\/src\/prim\//);
  assert.match(fails({ "prototypes/face/src/face.c": "o = lv_image_create (scr);" }).join("\n"), /lv_image_create/);
  assert.deepEqual(fails({ "prototypes/face/src/prim/prim.c": "o = lv_obj_create(p);", "prototypes/face/src/platform/posix.c": "d = lv_display_create(1024, 600); i = lv_indev_create();", "prototypes/face/src/face.c": "/* lv_obj_create(x) in a comment */" }), []);
});
