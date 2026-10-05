#ifndef CRITTER_CADDY_LV_CONF_H
#define CRITTER_CADDY_LV_CONF_H
/* Same software formats/widget support as the current host UI; smaller single
 * Dock pool is a provisional harness bound, not a board memory guarantee. */
#include "../../selected-lab/lv_conf.h"
#undef LV_MEM_SIZE
#define LV_MEM_SIZE (96 * 1024)
#endif
