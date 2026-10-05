#ifndef REPLACEMENT_STORE_H
#define REPLACEMENT_STORE_H
#include "model.h"
int replacement_store_read(const char *path, ReplacementState *state);
int replacement_store_write(const char *path, const ReplacementState *state);
#endif
