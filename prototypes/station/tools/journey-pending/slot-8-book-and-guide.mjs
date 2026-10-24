// The guide's doors into the Library, as journey steps: "Open the guide" on Pods' overview figure lands on the Library's Level 1 with the ring on that species (Library 4 moves it to Level 2). The card's species word up close is live
// and runs in the journey proper (journey.mjs, library-l1-found); the figure's step is PENDING until the figure is a focus target (its ring shape and its graph edges are not ruled yet: pods.json regions.overview.figure.target).
// Each step is `run({ page, press, ui, line, expect, frameShot, loika })` with the journey's own helpers; journey.mjs imports `steps` and prints the list; it runs none of them.
export const milestone = "the Pods figure's target (its ring shape and graph edges ruled)";
export const steps = [
  { id: "pods-figure-guide", what: "on an identified pod ▶ is the figure (✓ Open the guide, 'every …'); ✓ opens the Library's Level 1 with the ring on that species, ← Home; the pod's pad is pod, figure, kin, hatch",
    run: async ({ page, press, line, expect, loika }) => {
      await press("right", 150); const fg = await page.evaluate(() => window.__st.UI.pods.focus.cur); let l = await line(); expect(fg === "figure" && l.ok === "Open the guide" && /^every /.test(l.subject), "▶ from the pod is the figure: " + JSON.stringify([fg, l]));
      await press("confirm", 300); const gj = await page.evaluate(() => ({ screen: window.__st.UI.screen, cur: window.__st.props?.focus?.cur })); l = await line();
      expect(gj.screen === "library" && gj.cur === "cell.S01" && l.back === "Home", "✓ on the figure opens Level 1 on the species: " + JSON.stringify([gj, l]));
      await press("research", 250); await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika.id); await page.waitForTimeout(150);
    } },
];
