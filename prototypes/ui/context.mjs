// The context a component is given: the screen's spec file and the type set to measure with. Components never
// reach a canvas; they place text by the atlas metrics, so a view's nodes are the same in Node and in the page.
export const makeCtx = (spec, type) => ({ spec, type, measure: (text, px) => type.measure(text, px), cap: (px) => type.face(px).cap, line: (px) => { const f = type.face(px); return f.ascent - f.descent; } });   // a text node's height: the face's ascent over its descent
