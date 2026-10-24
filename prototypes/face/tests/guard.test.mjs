// The import guard (tools/guard.mjs): each rule fails on a tree that breaks it and passes the tree as it is. The real tree passes with no exemptions.
//   node --test prototypes/face/tests/guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "../tools/guard.mjs";
import { blank } from "../tools/blank.mjs";

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
  assert.match(fails({ "prototypes/station/src/main.mjs": `${IMP} { Scene } ${FRM} "/sandbox/ui/scene.mjs";` }).join("\n"), /main\.mjs imports ui\/scene\.mjs/, "an absolute /sandbox/ import");
  assert.match(fails({ "website/x.mjs": `${IMP} { Scene } ${FRM} "/sandbox/ui/scene.mjs";` }).join("\n"), /x\.mjs imports ui\/scene\.mjs/, "website is walked");
  assert.deepEqual(fails({ "prototypes/station/src/main.mjs": `// ${IMP} { Scene } ${FRM} "../../ui/scene.mjs";\nexport const x = 1;` }), [], "a comment imports nothing");
});
test("the canvas is touched only by the face's present and the named decoders", () => {
  assert.match(fails({ "prototypes/station/src/art.mjs": 'const c = document.createElement("canvas");' }).join("\n"), /art\.mjs:1 uses the canvas/);
  assert.match(fails({ "prototypes/ui/assets.mjs": "const g = cv.getContext('2d');" }).join("\n"), /ui\/assets\.mjs:1 uses the canvas/);
  assert.match(fails({ "prototypes/station/src/x.mjs": "ctx.putImageData(a, 0, 0);" }).join("\n"), /putImageData/);
  assert.match(fails({ "prototypes/ui/tests/x.test.mjs": "const c = { canvas: 1 };" }).join("\n"), /tests\/x\.test\.mjs:1 uses the canvas/);
  assert.match(fails({ "prototypes/ui/tools/x.mjs": "cv.getContext('2d');" }).join("\n"), /ui\/tools\/x\.mjs:1/);
  assert.match(fails({ "prototypes/station/src/face-lvgl.mjs": "ctx.putImageData(a, 0, 0);" }).join("\n"), /face-lvgl\.mjs:1 uses the canvas/, "only the marked lines of face-lvgl are exempt");
  assert.deepEqual(fails({ "prototypes/station/src/face-lvgl.mjs": "// guard:canvas begin\nctx.putImageData(a, 0, 0);\n// guard:canvas end\nexport const a = 1;", "prototypes/station/src/masters.mjs": 'document.createElement("canvas").getContext("2d");', "prototypes/station/src/art.mjs": "// a canvas in a comment\nexport const a = 1;" }), []);
  assert.deepEqual(fails({ "prototypes/station/src/paint2d.mjs": "const c = createCanvas(1, 1); c.getContext('2d').getImageData(0, 0, 1, 1);", "prototypes/station/src/specimen.mjs": "const o = out.getContext('2d'); o.putImageData(img, 0, 0);" }), [], "the specimen's painter and its port: a canvas subset on a Float32Array, no DOM");
  assert.match(fails({ "prototypes/station/src/specimen-cache.mjs": "const c = cv.getContext('2d');" }).join("\n"), /specimen-cache\.mjs:1 uses the canvas/, "only the two named files");
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
test("a screen object held in a variable cannot get past registerScreen", async () => {
  const { registerScreen } = await import("../../station/src/game.mjs");
  const draw = () => {};
  for (const k of ["draw", "nodes", "faceNodes"]) assert.throws(() => registerScreen("x", { [k]: draw }), new RegExp(k));
});
test("LVGL objects are made in face/src/prim/ only; the platform may make its display and its input device", () => {
  assert.match(fails({ "prototypes/face/src/vocab/x.c": "lv_obj_t *o = lv_label_create(parent);" }).join("\n"), /x\.c:1 calls lv_label_create outside face\/src\/prim\//);
  assert.match(fails({ "prototypes/face/src/face.c": "o = lv_image_create (scr);" }).join("\n"), /lv_image_create/);
  assert.deepEqual(fails({ "prototypes/face/src/prim/prim.c": "o = lv_obj_create(p);", "prototypes/face/src/platform/posix.c": "d = lv_display_create(1024, 600); i = lv_indev_create();", "prototypes/face/src/face.c": "/* lv_obj_create(x) in a comment */" }), []);
});

// The blanker reads the text once, so a comment marker inside a string, a regex or another comment hides nothing. Each case puts a canvas call after the marker, and the guard must still see it.
const PLANT = 'document.createElement("canvas").getContext("2d");', CLOSE = "/* a later comment */";   // a later comment closes the opener a misreading would have left open
test("a block-comment opener in a line comment hides nothing on the next line", () => {
  assert.match(fails({ "prototypes/station/src/x.mjs": `// x /* y\n${PLANT}\n${CLOSE}\n` }).join("\n"), /x\.mjs:2 uses the canvas/);
  assert.equal(blank("// x /* y\ncode();"), "\ncode();");
});
test("a block-comment opener in a string hides nothing after it", () => {
  assert.match(fails({ "prototypes/station/src/x.mjs": `const t = "image/*";\n${PLANT}\n${CLOSE}\n` }).join("\n"), /x\.mjs:2 uses the canvas/);
  assert.match(fails({ "prototypes/station/src/x.mjs": `const t = 'a/*';\nconst u = "//";\n${PLANT}\n${CLOSE}\n` }).join("\n"), /x\.mjs:3 uses the canvas/);
});
test("a regex holding quotes and a block-comment opener is one regex, and the code after it is seen", () => {
  assert.match(fails({ "prototypes/station/src/x.mjs": `const r = /["'\`]\\/*[/]x/g;\n${PLANT}\n${CLOSE}\n` }).join("\n"), /x\.mjs:2 uses the canvas/);
  assert.match(fails({ "prototypes/station/src/x.mjs": `const ok = s.replace(/'/g, "") + 1 / 2;\n${PLANT}\n${CLOSE}\n` }).join("\n"), /x\.mjs:2 uses the canvas/, "a division is not a regex");
});
test("a template holding ${} is read through, its braces and strings included, and the code after it is seen", () => {
  assert.match(fails({ "prototypes/station/src/x.mjs": 'const t = `a ${ { k: "}" }.k + `n${1}` } /* b`;\n' + PLANT + "\n" + CLOSE + "\n" }).join("\n"), /x\.mjs:2 uses the canvas/);
  assert.deepEqual(fails({ "prototypes/station/src/x.mjs": "const t = `// not a comment ${a}`;\n// a canvas in a comment\nconst u = 1;\n" }), []);
  assert.equal(blank("a `x${ /* c */ 1 }y` b // z"), "a `x${  1 }y` b ");
});
test("the planted canvas call in a copy of the Station's main.mjs fails the guard", () => {
  const lines = readFileSync(path.join(real, "prototypes/station/src/main.mjs"), "utf8").split("\n");
  lines.splice(40, 0, PLANT);   // line 41
  const f = fails({ "prototypes/station/src/main.mjs": lines.join("\n") });
  assert.ok(f.some((m) => /^station\/src\/main\.mjs:41 uses the canvas/.test(m)), f.join("\n"));
  assert.equal(f.length, 1, f.join("\n"));
});
test("the guard is ok on the tree", () => { assert.deepEqual(check(real).fails, []); });
test("the C blanker keeps quotes and comments and nothing else: a lv_*_create call after a comment marker in a string or a line comment is seen", () => {
  assert.match(fails({ "prototypes/face/src/x.c": 'const char *s = "a/*";\nlv_obj_t *o = lv_label_create(p);\n' }).join("\n"), /x\.c:2 calls lv_label_create/);
  assert.match(fails({ "prototypes/face/src/x.c": "// x /* y\no = lv_obj_create(p);\n" }).join("\n"), /x\.c:2 calls lv_obj_create/);
  assert.deepEqual(fails({ "prototypes/face/src/x.c": "/* lv_obj_create(p); */ // lv_obj_create(p);\nint a = 1;\n" }), []);
  assert.equal(blank("a = `b` / c; // d", { js: false }), "a = `b` / c; ");
});
test("a block comment between two tokens does not glue them into one word the guard cannot see", () => {
  assert.match(fails({ "prototypes/station/src/x.mjs": "var/**/canvas = document;\n" }).join("\n"), /x\.mjs:1 uses the canvas/);
  assert.match(fails({ "prototypes/station/src/x.mjs": "x = a/**/getContext;\n" }).join("\n"), /x\.mjs:1 uses the canvas/);
  assert.equal(blank("var/**/canvas"), "var canvas");
});
test("an import line with a trailing comment keeps its end: no space is left before the newline", () => {
  assert.equal(blank("a;/* c */\nx;"), "a;\nx;");
  assert.match(blank("import a from './w.mjs';/* c */\nx;"), /^import a from '\.\/w\.mjs';$/m);
  assert.match(blank("import a from './w.mjs'; // c\nx;"), /^import a from '\.\/w\.mjs'; $/m);
});
