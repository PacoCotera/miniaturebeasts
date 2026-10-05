#ifndef CRITTER_CARGO_VIEW_H
#define CRITTER_CARGO_VIEW_H
#include "kit.h"
#include "../ui/companion_cargo_view.h"

int kit_cargo_facts(const DeviceKit *kit, CompanionCargoFacts *facts);
int kit_cargo_projection(const DeviceKit *kit, CompanionCargoView *view);
#endif
