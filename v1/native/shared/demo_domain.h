#ifndef DEMO_DOMAIN_H
#define DEMO_DOMAIN_H
#include <stddef.h>
#include <stdint.h>
/* One bounded, single-owner authored fixture; no network or clock dependencies.
 */
typedef struct {
  unsigned revision, phase, selected, lab_page, probe_page, elapsed;
  unsigned event, reagent, finding;
  char last_id[65], last_payload[128];
} Demo;
typedef struct {
  const char *name, *label, *device;
} DemoAction;
void demo_init(Demo *demo);
int demo_valid(const Demo *demo);
size_t demo_actions(const Demo *demo, DemoAction *actions, size_t capacity);
const char *demo_apply(Demo *demo, const char *name);
#endif
