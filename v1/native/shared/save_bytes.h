#ifndef SAVE_BYTES_H
#define SAVE_BYTES_H
#include <stddef.h>

enum {
  SAVE_BYTES_NOT_COMMITTED = -1,
  SAVE_BYTES_COMMITTED = 0,
  SAVE_BYTES_COMMITTED_DURABILITY_UNCERTAIN = 1
};

int save_bytes_lock(const char *path);
int save_bytes_write(const char *path, const void *data, size_t length);
int save_bytes_write_status(const char *path, const void *data, size_t length);
#endif
