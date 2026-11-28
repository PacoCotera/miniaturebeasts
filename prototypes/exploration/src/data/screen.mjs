// The Companion's screen in device pixels (data): the 450×600 frame, the top bar, the bottom line, the view between them, and the world map's cell and corner.
export const SCR_W = 450, SCR_H = 600, HUD_H = 32, LINE_H = 36, VIEW_Y = HUD_H, VIEW_H = SCR_H - HUD_H - LINE_H;   // the view is 450×532
export const HUD_T = 3;   // the top bar's padding above (and below) its 26 px of contents
export const CELL = 26, MAP_X = 17, MAP_Y = VIEW_Y + 6;   // the map is 416×520 px, its 4 px frame on rows 34–561
