// The field guide's journey steps, PENDING until the guide is built on the LVGL face (lvgl-switch.md §4 L2.1; this file is journey-pending/L2.1.mjs). They were written for the JavaScript face on the frozen `field-guide` branch (5927d91d)
// and are kept here as they ran there: each step is `run({ page, press, ui, line, expect, frameShot })` with the journey's own helpers. journey.mjs imports `steps` and prints the list; it runs
// none of them. At L2.1 the steps are re-pointed at the face (the same focused-target sequence, intents and save hash as the gate's check 5 asks) and moved into the journey proper.
// "guide-captures" reads window.__st.lib (the Library module), a test hook the pending build adds with the face's own hooks.
// The captures they name (guide-loika, guide-loika-species, book-belatz-face, book-belatz-portrait, guide-belatz-seven, guide-tuikis-eight, guide-tuikis-plate, guide-no-carriers) are produced
// from the LVGL face only; their goldens are committed once the UI designer and the art director sign them.
export const milestone = "L2.1 (Library: spread, Book and the field guide)";
export const steps = [
  { id: "pods-figure-guide", what: "on an identified pod ▶ is the figure (✓ Open the guide, 'every …'); ✓ opens the species' guide, ← reads Library; the pod's pad is pod, figure, kin, hatch; Compare takes one more ▶",
    run: async ({ page, press, line, expect, frameShot, loika }) => {
      await press("right", 150); const fg = await page.evaluate(() => window.__st.UI.pods.focus.cur); let l = await line(); expect(fg === "figure" && l.ok === "Open the guide" && /^every /.test(l.subject), "▶ from the pod is the figure: " + JSON.stringify([fg, l]));
      await press("confirm", 300); const gj = await page.evaluate(() => ({ screen: window.__st.UI.screen, f: window.__st.UI.lib.f, sp: window.__st.UI.lib.sp })); l = await line();
      expect(gj.screen === "library" && gj.f === "guide" && l.back === "Library", "✓ on the figure opens the species' guide: " + JSON.stringify([gj, l])); await frameShot("guide-loika");
      await press("back", 200); expect((await page.evaluate(() => window.__st.UI.lib.f)) === "spread", "← from the guide reads Library: the spread, never back to Pods");
      await press("research", 250); await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika.id); await page.waitForTimeout(150);
    } },
  { id: "book-visit", what: "the Book with the type face has no ✓ cap; with a living portrayed face ✓ Visit jumps to Habitat",
    run: async ({ page, line, expect }) => {
      let l = await line(); expect(l.back === "Library" && !l.ok, "the Book with the type face: ← Library, no ✓ cap: " + JSON.stringify(l));
      await page.evaluate(() => { const st = window.__st.ST, m = st.mibis.find((q) => (q.species ?? "S01") === "S01" && !q.released); m.portrait = { state: "delivered" }; st.face = st.face || {}; st.face.S01 = m.id; });
      l = await line(); expect(l.back === "Library" && /^Visit /.test(l.ok), "the Book with a living face: ← Library, ✓ Visit: " + JSON.stringify(l));
    } },
  { id: "habitat-species-row", what: "Habitat's pad: stage, species, chapter plates, Cross, door row, strip; the species word on the card opens the guide",
    run: async ({ page, press, ui, line, expect }) => {
      for (const [k, f] of [["right", "species"], ["down", "ch0"], ["left", "stage"], ["right", "species"], ["down", "ch0"]]) { await press(k, 80); const u = await ui(); expect(u.hab === f, "Habitat " + k + " → " + f + ": " + JSON.stringify(u)); }
      await press("habitat", 300); await press("right", 100); await press("confirm", 300); const l = await line();
      expect((await page.evaluate(() => window.__st.UI.screen === "library" && window.__st.UI.lib.f === "guide")) && l.back === "Library", "the species word on Habitat's card opens the guide: " + JSON.stringify(l));
    } },
  { id: "book-guide-turn", what: "the Book: ▶ turns to the guide, ◀ from the first column turns back, ← reads Library on both",
    run: async ({ page, press, ui, line, expect, frameShot }) => {
      await page.evaluate(() => { const u = window.__st.UI; u.lib.sp = "S01"; u.lib.f = "book"; u.screen = "library"; }); await press("right", 300); const u = await ui(); expect(u.screen === "library" && (await page.evaluate(() => window.__st.UI.lib.f)) === "guide", "▶ turns to the guide: " + JSON.stringify(u));
      const l = await line(); expect(l.back === "Library", "the guide's way back is Library: " + JSON.stringify(l)); await page.waitForTimeout(200); await frameShot("guide-loika-species");
      await press("left", 300); expect((await page.evaluate(() => window.__st.UI.lib.f)) === "book", "◀ from the first column turns back to the face spread");
      await press("right", 300); await press("back", 200); expect((await page.evaluate(() => window.__st.UI.lib.f)) === "spread", "← from the guide is the Library spread");
    } },
  { id: "guide-captures", what: "Belatz (seven chapters), Tuikis (eight), the Book's face with its type and with a portrait, and a guide with no carrier; each guide opens on a look a living mibi carries",
    run: async ({ page, press, expect, frameShot }) => {
      const showLib = async (sp, f) => { await page.evaluate(([sp, f]) => { const u = window.__st.UI; u.screen = "library"; u.lib.sp = sp; u.lib.f = f; u.lib.g = null; }, [sp, f]); await page.waitForTimeout(250); };
      await page.evaluate(() => { const st = window.__st.ST; window.__st.sitOut = st.mibis.filter((m) => !m.released).map((m) => m.id); for (const m of st.mibis) if (window.__st.sitOut.includes(m.id)) m.released = true; window.__st.seeded = [];
        for (const [sp, seed] of [["S09", 11], ["S03", 5]]) for (const m of window.__st.seedAdults(sp, seed, 2).mibis) { m.read = window.__st.frameOf(sp).chapters.map((c) => c.id); window.__st.seeded.push(m.id); } });
      const openCarried = (sp) => page.evaluate((sp) => { const w = window.__st, fg = w.lib.fieldGuide(w.ST, sp, w.settings), col = fg.chapters.findIndex((c) => !c.sealed && c.traits.length), t = fg.chapters[col].traits[0], look = t.found.slice().sort((x, y) => t.possible.indexOf(x) - t.possible.indexOf(y)).findIndex((l) => w.lib.lookCarriers(w.ST, sp, t.id, l).length > 0);
        w.UI.screen = "library"; w.UI.lib.sp = sp; w.UI.lib.f = "guide"; w.UI.lib.g = { zone: "grid", col, row: 0, plate: 0, carrier: 0, open: { col, row: 0 }, look }; return look; }, sp);
      await showLib("S09", "book"); await frameShot("book-belatz-face");
      expect((await openCarried("S09")) >= 0, "Belatz opens on a look a living mibi carries"); await page.waitForTimeout(250); await frameShot("guide-belatz-seven");
      expect((await openCarried("S03")) >= 0, "Tuikis opens on a look a living mibi carries"); await page.waitForTimeout(250); await frameShot("guide-tuikis-eight");
      await press("up", 150); await frameShot("guide-tuikis-plate");
      await page.evaluate(() => { const st = window.__st.ST, m = st.mibis.find((q) => q.species === "S09" && !q.released); m.portrait = { state: "delivered" }; st.face = st.face || {}; st.face.S09 = m.id; });
      await showLib("S09", "book"); await frameShot("book-belatz-portrait");
      await page.evaluate(() => { for (const m of window.__st.ST.mibis) if (m.species === "S09") m.released = true; });
      await showLib("S09", "guide"); await frameShot("guide-no-carriers");
      await page.evaluate(() => { const st = window.__st.ST, w = window.__st; st.mibis = st.mibis.filter((m) => !w.seeded.includes(m.id)); for (const m of st.mibis) if (w.sitOut.includes(m.id)) m.released = false; });
    } },
];
