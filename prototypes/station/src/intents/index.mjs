// The intents of every screen (see README.md): the rule call behind a key on a focused target, DOM-free, for the page's host and the Node host.
import * as frame from "./frame.mjs";
import * as home from "./home.mjs";
import * as incubator from "./incubator.mjs";
import * as library from "./library.mjs";
import * as habitat from "./habitat.mjs";
import * as create from "./create.mjs";
import * as pods from "./pods.mjs";

export const INTENTS = { frame, home, incubator, library, habitat, create, pods };
// A face intent { screen, target, verb } to its screen's function; the frame's verbs (room keys, dock, wake) are the same on every screen.
export function dispatch(h, { screen, target, verb }, extra) {
  if (verb && (verb.startsWith("room:") || verb === "dock" || verb === "wake")) return frame.intent(h, target, verb);
  const m = INTENTS[screen]; return m ? m.intent(h, target, verb, extra) : undefined;
}
