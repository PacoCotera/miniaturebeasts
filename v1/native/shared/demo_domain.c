#include "demo_domain.h"
#include <string.h>
void demo_init(Demo *d) { memset(d, 0, sizeof(*d)); }
int demo_valid(const Demo *d) {
  return d->phase <= 4 && d->selected <= 1 && d->lab_page <= 5 &&
         d->probe_page <= 2 && d->elapsed <= 2 && d->event <= 3 &&
         d->finding <= 1 && d->reagent <= 2 &&
         (d->phase == 0 || d->selected == 1) &&
         (d->phase >= 2 ||
          (d->elapsed == 0 && d->event == 0 && d->reagent == 0)) &&
         (d->phase != 2 || d->elapsed < 2) &&
         (d->elapsed != 0 || d->event == 0) &&
         (d->elapsed == 0 || d->event != 0) &&
         d->reagent + d->finding == d->elapsed &&
         (d->phase >= 4 || (d->lab_page <= 1 && !d->finding)) &&
         (d->phase != 4 || d->lab_page >= 2) &&
         (d->phase < 3 || d->elapsed == 2) &&
         (!d->finding || (d->phase == 4 && d->reagent == 1));
}
size_t demo_actions(const Demo *d, DemoAction *out, size_t cap) {
  size_t n = 0;
#define ACTION(key, text, surface)                                             \
  do {                                                                         \
    if (n < cap)                                                               \
      out[n] = (DemoAction){key, text, surface};                               \
    ++n;                                                                       \
  } while (0)
  if (d->phase == 0) {
    if (d->lab_page == 0) {
      ACTION("review", "Expedition details", "lab");
    } else {
      ACTION("back", "Back", "lab");
      ACTION("load", "Load probe", "lab");
    }
  } else if (d->phase == 1) {
    ACTION("start", "Start", "probe");
  } else if (d->phase == 2) {
    ACTION("check", "Check", "probe");
    if (d->event == 1) {
      ACTION("inspect", "Inspect", "probe");
      ACTION("leave", "Leave", "probe");
    }
    ACTION("advance", "Advance simulated time", "engineering");
  } else if (d->phase == 3) {
    ACTION("haul", "Review results", "probe");
    ACTION("receive", "Bring to lab", "lab");
    if (d->event == 1) {
      ACTION("inspect", "Inspect note", "lab");
    }
  } else {
    if (d->lab_page == 2) {
      if (d->finding)
        ACTION("finding", "View finding", "lab");
      else
        ACTION("study_review", "Review study", "lab");
    } else if (d->lab_page == 3 || d->lab_page == 4) {
      ACTION("back", "Back", "lab");
      if (!d->finding && d->reagent >= 1)
        ACTION("run", "Start study", "lab");
      if (d->finding)
        ACTION("finding", "View finding", "lab");
    } else {
      ACTION("back", "Back to sample", "lab");
    }
    if (d->event == 1) {
      ACTION("inspect", "Inspect note", "lab");
    }
  }
#undef ACTION
  return n;
}
const char *demo_apply(Demo *d, const char *name) {
  DemoAction actions[12];
  size_t n = demo_actions(d, actions, 12), i;
  for (i = 0; i < n; ++i)
    if (strcmp(actions[i].name, name) == 0)
      break;
  if (i == n)
    return "Action unavailable in this state";
  if (!strcmp(name, "review")) {
    d->selected = 1;
    d->lab_page = 1;
  }
  else if (!strcmp(name, "back"))
    d->lab_page = d->phase == 0 ? 0 : 2;
  else if (!strcmp(name, "load"))
    d->phase = 1;
  else if (!strcmp(name, "start"))
    d->phase = 2;
  else if (!strcmp(name, "advance")) {
    ++d->elapsed;
    ++d->reagent;
    if (d->elapsed == 1)
      d->event = 1;
    if (d->elapsed == 2)
      d->phase = 3;
  } else if (!strcmp(name, "inspect")) {
    d->event = 2;
    d->probe_page = 1;
  } else if (!strcmp(name, "leave")) {
    d->event = 3;
    d->probe_page = 0;
  } else if (!strcmp(name, "check"))
    d->probe_page = 0;
  else if (!strcmp(name, "haul"))
    d->probe_page = 2;
  else if (!strcmp(name, "receive")) {
    d->phase = 4;
    d->lab_page = 2;
  } else if (!strcmp(name, "study_review"))
    d->lab_page = 4;
  else if (!strcmp(name, "run")) {
    --d->reagent;
    d->finding = 1;
    d->lab_page = 5;
  } else if (!strcmp(name, "finding"))
    d->lab_page = 5;
  return NULL;
}
