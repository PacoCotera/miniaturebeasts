// Words of the screens outside the game (content): the release's one-time notice, a save kept as stored, a load that failed.

// The release's one-time notice, shown on this device the first time it opens after the reset, then never again. The copywriter's words (keys: reset.notice.companion,
// reset.button.companion). No numbers, no talk of versions or saves.
export const RESET_TEXT = { lines: ['The world has changed.', 'New mibis live in it now.'], button: 'Explore' };

// A save the page keeps as stored and does not play. A newer page wrote it: ✓ reloads. Or it cannot be shown: ✓ arms (`armed` shows), ✓ again starts a new world beside it.
export const KEPT_TEXT = { newer: 'Newer save · untouched · reload plays it', broken: 'This save can’t be shown · kept untouched', armed: 'The mibis stay with the old save',
  reload: 'Reload', start: 'Start a new world', confirm: 'Confirm: new world' };

// The art or the place did not load: said plainly, one way on.
export const LOAD_FAILED = { line: 'The land didn’t load · reload', button: 'Reload' };
