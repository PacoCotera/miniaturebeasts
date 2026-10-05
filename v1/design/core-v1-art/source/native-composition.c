/* Authored presentation geometry from the retained07 shoulder/bevel grammar.
 * Coordinates and palette are editable; these routines contain no game state. */
static void art_span(int x, int y, int width, int height, unsigned row,
                     unsigned canvas_width, uint8_t *pixels, uint32_t rgb) {
  if ((int)row < y || (int)row >= y + height)
    return;
  for (int column = x; column < x + width; ++column) {
    if (column < 0 || column >= (int)canvas_width)
      continue;
    uint8_t *target = pixels + column * 3;
    target[0] = (uint8_t)(rgb >> 16);
    target[1] = (uint8_t)(rgb >> 8);
    target[2] = (uint8_t)rgb;
  }
}

static void art_shoulder(int x, int y, int width, int height, int shoulder,
                         unsigned row, unsigned canvas_width,
                         uint8_t *pixels, uint32_t rgb) {
  int position = (int)row - y;
  if (position < 0 || position >= height)
    return;
  int inset = position < 8 || position >= height - 8 ? shoulder : 0;
  art_span(x + inset, y, width - inset * 2, height, row, canvas_width, pixels, rgb);
}

void core_art_panel_row(int x, int y, int width, int height, unsigned row,
                        unsigned canvas_width, uint8_t *pixels) {
  art_shoulder(x + 3, y + 5, width, height, 16, row, canvas_width, pixels, 0x0a131au);
  art_shoulder(x - 2, y - 2, width + 4, height + 4, 16, row, canvas_width, pixels, 0x08131bu);
  art_shoulder(x, y, width, height, 16, row, canvas_width, pixels, 0x44535bu);
  art_shoulder(x + 2, y + 2, width - 4, height - 4, 14, row, canvas_width, pixels, CORE_ART_BLUE_RGB);
  art_shoulder(x + 4, y + 4, width - 8, height - 8, 12, row, canvas_width, pixels, 0x0b1821u);
  art_shoulder(x + 6, y + 6, width - 12, height - 12, 10, row, canvas_width, pixels, CORE_ART_FIELD_RGB);
  art_span(x + 34, y + 2, width / 3, 1, row, canvas_width, pixels, CORE_ART_BLUE_HIGHLIGHT_RGB);
  art_span(x + 2, y + 42, 1, height / 5, row, canvas_width, pixels, CORE_ART_BLUE_HIGHLIGHT_RGB);
  art_span(x + width - 3, y + height - 83, 1, 44, row, canvas_width, pixels, 0x399bc8u);
}

static void art_action_shape(int x, int y, int width, int height, unsigned row,
                             unsigned canvas_width, uint8_t *pixels,
                             uint32_t rgb) {
  int position = (int)row - y;
  if (position < 0 || position >= height)
    return;
  int edge = position < height / 2 ? position : height - position - 1;
  int inset = edge < 2 ? 6 : edge < 4 ? 3 : 0;
  art_span(x + inset, y, width - inset * 2, height, row, canvas_width, pixels, rgb);
}

void core_art_focus_row(int x, int y, int width, int height, unsigned row,
                        unsigned canvas_width, uint8_t *pixels) {
  /* Authored falloff bands live outside the graphite center. */
  art_action_shape(x - 5, y - 5, width + 10, height + 10, row, canvas_width, pixels, 0x34352fu);
  art_action_shape(x - 3, y - 3, width + 6, height + 6, row, canvas_width, pixels, 0x5a4d35u);
  art_action_shape(x - 1, y - 1, width + 2, height + 2, row, canvas_width, pixels, 0x08131bu);
  art_action_shape(x, y, width, height, row, canvas_width, pixels, 0x526066u);
  art_action_shape(x + 2, y + 2, width - 4, height - 4, row, canvas_width, pixels, 0x0b141au);
  art_action_shape(x + 4, y + 4, width - 8, height - 8, row, canvas_width, pixels, 0xd6a858u);
  art_action_shape(x + 5, y + 5, width - 10, height - 10, row, canvas_width, pixels, CORE_ART_FIELD_RGB);
  art_span(x + 12, y + 4, width - 24, 1, row, canvas_width, pixels, CORE_ART_FOCUS_RGB);
}
