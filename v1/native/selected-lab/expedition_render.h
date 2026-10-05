#ifndef CRITTER_LAB_EXPEDITION_RENDER_H
#define CRITTER_LAB_EXPEDITION_RENDER_H
/* Copied field/history facts consumed by the retained native UI. */
#include "kit.h"
#include "../ui/expedition_view.h"

int kit_field_projection(const DeviceKit *kit, ExpeditionFieldView *out);
unsigned kit_received_count(const DeviceKit *kit);
int kit_received_projection(const DeviceKit *kit, unsigned index,
                            ExpeditionReceivedView *out);

#endif
