#define _POSIX_C_SOURCE 200809L
#include "platform.h"
#include <time.h>
double platform_now_ms(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return (double)t.tv_sec * 1000.0 + (double)t.tv_nsec / 1e6; }
