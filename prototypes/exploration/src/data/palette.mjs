// The screen palette (data; maps 1:1 to an LVGL palette): 51 colours, the first 48 and the three sage. Every pixel the screen shows is one of these; the art code uses the names.
// The colours are the design tokens' own output (prototypes/ui/tokens, built from tokens.json): one list for the page, the tools and the tests.
export { PALETTE } from "../../../ui/tokens/out/companion-colors.mjs";

// One step darker (storm light, shade, outlines) and one step lighter (highlights).
export const DARK_OF = { void: 'void', ink: 'void', night: 'ink', slate: 'night', stone: 'slate', mist: 'stone', fog: 'mist', bone: 'fog', white: 'bone',
  paper: 'sand', sand: 'clay', clay: 'bark', bark: 'soil', soil: 'ink', pine: 'ink', forest: 'pine', leaf: 'forest', grass: 'leaf', sprout: 'grass', lime: 'sprout',
  deep: 'ink', sea: 'deep', river: 'sea', sky: 'river', ice: 'sky', tealD: 'ink', teal: 'tealD', aqua: 'teal', mint: 'aqua',
  plumD: 'ink', plum: 'plumD', lilac: 'plum', lavender: 'lilac', wine: 'night', red: 'wine', coral: 'red', peach: 'coral', blush: 'peach',
  rust: 'soil', orange: 'rust', amber: 'orange', gold: 'bark', yellow: 'gold', cream: 'yellow', magenta: 'wine', pink: 'magenta', rock: 'stone', rockL: 'rock', sageL: 'sage', sage: 'sageD', sageD: 'ink' };
export const LIGHT_OF = { void: 'ink', ink: 'night', night: 'slate', slate: 'stone', stone: 'mist', mist: 'fog', fog: 'bone', bone: 'white', white: 'white',
  paper: 'bone', sand: 'paper', clay: 'sand', bark: 'clay', soil: 'bark', pine: 'forest', forest: 'leaf', leaf: 'grass', grass: 'sprout', sprout: 'lime', lime: 'cream',
  deep: 'sea', sea: 'river', river: 'sky', sky: 'ice', ice: 'white', tealD: 'teal', teal: 'aqua', aqua: 'mint', mint: 'white',
  plumD: 'plum', plum: 'lilac', lilac: 'lavender', lavender: 'white', wine: 'red', red: 'coral', coral: 'peach', peach: 'blush', blush: 'bone',
  rust: 'orange', orange: 'amber', amber: 'cream', gold: 'yellow', yellow: 'cream', cream: 'white', magenta: 'pink', pink: 'blush', rock: 'rockL', rockL: 'fog', sageL: 'bone', sage: 'sageL', sageD: 'sage' };
