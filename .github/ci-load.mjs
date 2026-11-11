// The one place that makes the browser tests fit a loaded CI machine (MB_CI_FAST=1: a pull request runs several jobs at once on the one dev server).
// Run before the tests with `node --import ./.github/ci-load.mjs --test ...`; node --test hands the option on to every test file it starts.
//  - Every page of every Chromium the tests launch gets 90 s for its waits and for page.goto (Playwright's default is 30 s), set on the context when it is made.
//  - `headroom` is the factor the timing bars measured under CPU throttling are multiplied by (1.5 here, 1 anywhere else): a test imports it and scales its bar.
// No retries and no skips: a slow machine gets more time, never a second try. Without MB_CI_FAST=1 nothing here changes anything.
import { createRequire } from "node:module";
import path from "node:path";

export const CI_FAST = process.env.MB_CI_FAST === "1";
export const headroom = CI_FAST ? 1.5 : 1;
export const PAGE_TIMEOUT_MS = 90000;

const MARK = Symbol.for("mb.ci-load");

function install() {
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { return; }   // the same lookup the tests make; none installed, nothing to set
  if (chromium[MARK]) return;
  chromium[MARK] = true;
  const launch = chromium.launch.bind(chromium);
  chromium.launch = async (...args) => {
    const browser = await launch(...args), newContext = browser.newContext.bind(browser);   // browser.newPage() goes through newContext
    browser.newContext = async (...a) => {
      const ctx = await newContext(...a);
      ctx.setDefaultTimeout(PAGE_TIMEOUT_MS); ctx.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
      return ctx;
    };
    return browser;
  };
}

if (CI_FAST) install();
