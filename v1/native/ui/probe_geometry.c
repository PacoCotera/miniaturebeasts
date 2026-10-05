#include "companion_probe_view.h"

unsigned probe_path_neighbors(const ExpeditionMapView *map, unsigned cell) {
  if (!map || cell >= EXPEDITION_MAP_CELLS || !map->paths[cell]) return 0;
  unsigned x = cell % EXPEDITION_MAP_COLUMNS, y = cell / EXPEDITION_MAP_COLUMNS;
  return (y && map->paths[cell - EXPEDITION_MAP_COLUMNS] ? 1u : 0u) |
         (x + 1 < EXPEDITION_MAP_COLUMNS && map->paths[cell + 1] ? 2u : 0u) |
         (y + 1 < EXPEDITION_MAP_ROWS && map->paths[cell + EXPEDITION_MAP_COLUMNS] ? 4u : 0u) |
         (x && map->paths[cell - 1] ? 8u : 0u);
}
void probe_camera(const ExpeditionMapView *map, int width, int height, int *x, int *y) {
  int center_x = map->avatar_x * 32 + 16 - width / 2;
  int center_y = map->avatar_y * 32 + 16 - height / 2;
  int max_x = EXPEDITION_MAP_COLUMNS * 32 - width;
  int max_y = EXPEDITION_MAP_ROWS * 32 - height;
  *x = center_x < 0 ? 0 : center_x > max_x ? max_x : center_x;
  *y = center_y < 0 ? 0 : center_y > max_y ? max_y : center_y;
}
