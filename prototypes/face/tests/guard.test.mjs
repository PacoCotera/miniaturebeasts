// The import guard (tools/guard.mjs): each rule fails on a tree that breaks it and passes the tree as it is. The real tree passes with no exemptions.
//   node --test prototypes/face/tests/guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
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

// Rules 7a, 7b, the ratchet and 8: a screen is a binding table, and every kit component carries its contract header. Each planted tree is the real face's screens, vocab and kit-ratchet.json with one change.
const faceSrc = path.join(real, "prototypes/face/src");
function kitFiles(change = {}) {
  const files = { "prototypes/face/kit-ratchet.json": readFileSync(path.join(real, "prototypes/face/kit-ratchet.json"), "utf8") };
  for (const f of readdirSync(path.join(faceSrc, "screens"))) if (f.endsWith(".c")) files[`prototypes/face/src/screens/${f}`] = readFileSync(path.join(faceSrc, "screens", f), "utf8");
  for (const d of ["common", "station"]) for (const f of readdirSync(path.join(faceSrc, "vocab", d))) if (f.endsWith(".c")) files[`prototypes/face/src/vocab/${d}/${f}`] = readFileSync(path.join(faceSrc, "vocab", d, f), "utf8");
  return { ...files, ...change };
}
const screen = (f) => readFileSync(path.join(faceSrc, "screens", f), "utf8");
const plant = (f, at, line) => { const l = screen(f).split("\n"); l.splice(at - 1, 0, line); return l.join("\n"); };   // `line` becomes line `at` of a copy of the screen
test("the real screens, vocab and ratchet pass rules 7a, 7b, the ratchet and 8 as planted trees do", () => { assert.deepEqual(fails(kitFiles()), []); });
test("rule 7a: a prim_node call in a screen fails; one in a comment does not, and a comment between the name and its bracket hides nothing", () => {
  const f = fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, '  prim_node(v_id("x"), FN_RECT, 0, 0, 1, 1, 0, 0, 0);') }));
  assert.deepEqual(f, ["face/src/screens/bench.c:30 calls prim_node (rule 7a: a screen draws through v_* and the kit)"]);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, '  /* prim_node(v_id("x"), FN_RECT, 0, 0, 1, 1, 0, 0, 0); */ // prim_node(1);') })), []);
  assert.match(fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, '  prim_node/* c */(v_id("x"), FN_RECT, 0, 0, 1, 1, 0, 0, 0);') })).join("\n"), /bench\.c:30 calls prim_node/);
  assert.match(fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, '  prim_node (v_id("x"), FN_RECT, 0, 0, 1, 1, 0, 0, 0);') })).join("\n"), /bench\.c:30 calls prim_node/);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, '#define PN prim_node') })), ["face/src/screens/bench.c:30 calls prim_node (rule 7a: a screen draws through v_* and the kit)"], "a macro that names it");
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, "static void (*pn)(uint32_t, int, int, int, int, int, uint32_t, int, int) = prim_node;") })), ["face/src/screens/bench.c:30 calls prim_node (rule 7a: a screen draws through v_* and the kit)"], "a function pointer to it");
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/bench.c": plant("bench.c", 30, '  (prim_node)(v_id("x"), FN_RECT, 0, 0, 1, 1, 0, 0, 0);') })), ["face/src/screens/bench.c:30 calls prim_node (rule 7a: a screen draws through v_* and the kit)"], "the name in brackets");
});
test("rule 7b: a static spec accessor in a screen fails; a computation over the spec does not", () => {
  const f = fails(kitFiles({ "prototypes/face/src/screens/cargo.c": plant("cargo.c", 25, "static int cs(const char *path, int d) { return v_si(C, path, d); }") }));
  assert.deepEqual(f, ["face/src/screens/cargo.c:25 defines the static spec accessor cs (rule 7b: one call of v_si on its path; use the v_* reader)"]);
  assert.match(fails(kitFiles({ "prototypes/face/src/screens/cargo.c": plant("cargo.c", 25, 'static void cr(const char *k, int r[4])\n{\n  v_srect(C, v_fmt("regions.%s.rect", k), r);\n}') })).join("\n"), /cargo\.c:25 defines the static spec accessor cr \(rule 7b: one call of v_srect/);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/cargo.c": plant("cargo.c", 25, "static const char *pic(const char *path) { return v_sstr(C, path); }") })), ["face/src/screens/cargo.c:25 defines the static spec accessor pic (rule 7b: one call of v_sstr on its path; use the v_* reader)"], "a v_sstr accessor");
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/cargo.c": plant("cargo.c", 25, "static int cn(const char *const path) { return spec_int(C, path, 0); }") })), ["face/src/screens/cargo.c:25 defines the static spec accessor cn (rule 7b: one call of spec_int on its path; use the v_* reader)"], "a path written as a const pointer");
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/cargo.c": plant("cargo.c", 25, 'static int top(const char *k) { int r[4]; v_srect(C, k, r); return r[1] + r[3]; }\nstatic int fixed(void) { return v_si(C, "a.b", 0); }') })), []);
});
test("the ratchet: one more direct drawing call in a screen fails, and so does a screen it does not name that draws directly", () => {
  const counts = JSON.parse(readFileSync(path.join(real, "prototypes/face/kit-ratchet.json"), "utf8")).counts;
  const f = fails(kitFiles({ "prototypes/face/src/screens/habitat.c": plant("habitat.c", 40, '  /* v_rect("c", 0, 0, 1, 1, "x"); */ v_rect("x", 0, 0, 1, 1, "ink");') }));
  assert.deepEqual(f, [`face/src/screens/habitat.c makes ${counts.habitat + 1} direct v_rect/v_text/v_sprite/v_sprite_window/v_sprite_hidden calls; the ratchet allows ${counts.habitat} (face/kit-ratchet.json)`]);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/fresh.c": 'void fresh(void) { v_rect("t", 0, 0, 10, 16, "ink"); }\n' })), ["face/src/screens/fresh.c makes 1 direct v_rect/v_text/v_sprite/v_sprite_window/v_sprite_hidden calls; the ratchet allows 0 (face/kit-ratchet.json)"]);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/fresh.c": 'void fresh(void) { v_slot("t", "a", NULL, 0, 0, 1, 1, 1); }\n' })), [], "a screen that draws through the toolbox's slot and the kit has nothing to count");
});
test("the text ratchet: one more px-form text call in a screen fails, a screen it does not name enters at 0, and a call by role or in a comment counts for nothing", () => {
  const text = JSON.parse(readFileSync(path.join(real, "prototypes/face/kit-ratchet.json"), "utf8")).text, PX = "(v_line_at, v_line_in, v_run, v_price, v_text, v_measure, v_run_width, v_clip, v_wrap, v_cap_top, v_cap_in)";
  const why = (f, n, a) => `face/src/screens/${f} makes ${n} px-form text calls ${PX}; the text ratchet allows ${a} (face/kit-ratchet.json "text": draw words by role, v_say and v_role_*)`;
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/cargo.c": plant("cargo.c", 40, '  /* v_measure("c", 16); */ int w_ = v_measure ("x", 16); (void)w_;') })), [why("cargo.c", text.cargo + 1, text.cargo)]);
  for (const call of ['v_line_at("t", "a", 0, 0, 0, 16, "ink", 0);', 'v_line_in("t", "a", 0, 9, 0, 0, 16, "ink");', 'v_run("t", "a", 0, 0, 16, "ink", 0);', 'v_price("t", "a", 0, 0, 16, c, "ink");', 'v_run_width("a", 16);', 'v_clip("a", 9, 16, b, 9);', 'v_wrap("a", 9, 16, b, 9, 1);', 'v_cap_top(0, 0, 16);', 'v_cap_in(0, 9, 16);'])
    assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/fresh.c": `void fresh(void) { ${call} }\n` })), [why("fresh.c", 1, 0)], call);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/screens/fresh.c": 'void fresh(void) { v_say("t", "a", 0, 0, 1, "label", "pane", 0); v_role_width("a", "label"); v_say_run("r", "a", 0, 0, "verb", "band", 0); v_role_cap_in(0, 9, "label"); }\n' })), [], "the role forms are not counted");
  assert.deepEqual(Object.keys(text).sort(), readdirSync(path.join(faceSrc, "screens")).filter((f) => f.endsWith(".c")).map((f) => f.replace(/\.c$/, "")).sort(), "the text table names every screen file at today's count");
});
test("the ratchet carries screenSpecific: a missing list, or one that names a file that does not exist, fails", () => {
  const r = JSON.parse(readFileSync(path.join(real, "prototypes/face/kit-ratchet.json"), "utf8"));
  assert.ok(Array.isArray(r.screenSpecific) && r.screenSpecific.length > 0 && r.screenSpecific.every((s) => s.file && s.what && s.ruling));
  const { screenSpecific, ...bare } = r;
  assert.deepEqual(fails(kitFiles({ "prototypes/face/kit-ratchet.json": JSON.stringify(bare) })), ['face/kit-ratchet.json has no "screenSpecific" list']);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/kit-ratchet.json": JSON.stringify({ ...r, screenSpecific: [...screenSpecific, { file: "nowhere.c", what: "x", ruling: "x" }] }) })), ["face/kit-ratchet.json screenSpecific names nowhere.c, which is not a file in face/src/screens/"]);
});
test("rule 8: a kit component with no contract header, or a header that lacks one of its parts, fails", () => {
  const body = "void kit_probe(const char *id, int x) {\n  v_rect(id, x, 0, 1, 1, \"ink\");\n}\n";
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/vocab/common/probe.c": "/* a probe with no contract */\n#include \"../vocab.h\"\n" + body })), ['face/src/vocab/common/probe.c:3 defines kit_probe with no header comment beginning "/* kit_probe (" (rule 8)']);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/vocab/common/probe.c": "/* kit_probe (common/): a probe.\n   Props: id, x. Region and layer: the caller's. Node id: v_id(id). */\n" + body })), ["face/src/vocab/common/probe.c:3 kit_probe's header lacks Returns (rule 8)"]);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/vocab/common/probe.c": "/* kit_probe (common/): a probe.\n   Props: id, x. Region and layer: the caller's. Node ids: v_id(id). Returns nothing. */\n" + body })), []);
  assert.deepEqual(fails(kitFiles({ "prototypes/face/src/vocab/common/probe.c": "void kit_probe(const char *id, int x);\nvoid other(void) { kit_probe(\"a\", 1); }\n" })), [], "a declaration and a call are not definitions");
});
