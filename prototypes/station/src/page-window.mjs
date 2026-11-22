// Her page at the phone window: what the window pans to. DOM-free, so the pan state is tested (tests/intents.test.mjs).
export const PAGE_BODY = [30, 70, 530, 450], PAGE_CHAPTER = [648, 60, 340, 470];   // reading.json read.ground / right.plate: her page at the phone window (530 lp wide)

// The box the window follows on her page: the chapter in hand whole once it is open (at "right" or "detail"), else the body and the rail whole.
// A chapter that is open but not yet read (a doing chapter at 0 sightings) has no ring box, yet the window still goes to it.
export function pageBox(pods, box) {
  const open = pods.at === "right" || pods.at === "detail" || pods.at === "board";
  if (pods.page == null || (!box && !open)) return box;
  return open ? PAGE_CHAPTER : PAGE_BODY;
}
