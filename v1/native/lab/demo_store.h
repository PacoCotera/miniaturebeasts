#ifndef DEMO_STORE_H
#define DEMO_STORE_H
#include "demo_domain.h"
int demo_store_lock(const char *path);
int demo_store_read(const char *path, Demo *demo);
int demo_store_write(const char *path, const Demo *demo);
#endif
