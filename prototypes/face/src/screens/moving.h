/* The moving sets (Station M1 §2.2): one spec `moving` = { "<SXX>": set, ... } from ui/specs/station/moving/<SXX>.json, merged by the host. A set names, per stage, the cells of each atlas part (walk, close, nap,
   shadow) in their order and the animator's holds of each clip, in ms. The loader (moving.c) checks it whole when it arrives and refuses it with a `wire_error`; the screens read it from the tables here. The face never
   makes an atlas id: the props name them. */
#ifndef MOVING_H
#define MOVING_H
#define MV_SETS 16
#define MV_CELLS 20
#define MV_LOOP 8
enum { MV_JUV = 0, MV_ADULT = 1, MV_ELDER = 2 };
typedef struct { int n, cell[MV_LOOP], ms[MV_LOOP]; } mv_loop_t;   /* a loop of cells (indexes of the part's base cells) and their holds */
typedef struct {
  int present;
  int ww, wh, nbase, nwalk, mirror[MV_CELLS]; char wcell[MV_CELLS][12];   /* the walk atlas: nbase painted cells, then the mirrors (mirror[k]: the atlas index of base cell k's mirror, or -1) */
  int cw, ch, nclose; char ccell[MV_CELLS][12];                            /* the close atlas */
  int nw, nh, nnap; char ncell[4][12];                                     /* the nap atlas */
  int sww, swh, scw, sch;                                                  /* the shadows' cells, walk and close */
  mv_loop_t breathe, asleep;                                               /* in walk-cell indexes; the close part maps them by name */
  int curl_crouch, curl_lower[4], curl_nlower, curl_dither, curl_after;
  int wake_dither, wake_crouch, wake_rise;
  int stir_dither, stir_lo, stir_hi;
  int ack_crouch;
  int hopper, hop_crouch, hop_air, hop_land, hop_stand, hop_lift[8], hop_nlift, hop_travel, hop_min, hop_max, sh75[8];
  int walker, cycle_n, cycle_cell[MV_LOOP], cycle_ms[MV_LOOP], stride, pass_rise, beat_mean;   /* a legged walk: the cycle in walk-cell indexes */
  int chop_crouch, chop_air, chop_land, chop_lift[8], chop_nlift, chop_travel;
  int cstep_cell, cstep_crouch, cstep_ms;                                  /* up close a step, not a hop (closeStep): its close cell and holds */
  int close_dither_ms, blink_ms, blink_lo, blink_hi;
} mv_stage_t;
typedef struct { char id[8]; int native_right; mv_stage_t st[3]; } mv_set_t;
/* The `moving` spec arrived: check it whole and build the tables. 0, or -1 with the reason in err (the spec is then refused). */
int moving_load(char *err, int cap);
/* A picture whose id begins `moving:` arrived: its width must be 1 + n·w for the set's cells. 0, or -1 with the reason. A set not loaded is not checked. */
int moving_vet_atlas(const char *id, int w, int h, char *err, int cap);
const mv_set_t *moving_set(const char *sid);
const mv_stage_t *moving_stage(const char *sid, int stage);   /* NULL when the set has no such stage */
int moving_walk_cell(const mv_stage_t *s, const char *name);    /* the base index of a walk cell by name, or -1 */
int moving_close_cell(const mv_stage_t *s, const char *name);   /* the index of a close cell by name, or -1 */
int moving_shown(const mv_stage_t *s, int base, int facing_right, int native_right);   /* the atlas index shown for base cell k in a facing: its mirror when the facing is not the native one and the cell has a mirror */
/* up close and the hatch (the close part, 80 ms ticks): one hop `dt` ms into it, crouch, air (the lift from `lift`, n ticks), crouch; the cell's name, its lift (px) and whether the shadow is shadow-75. Returns 0 once the hop is over. */
int moving_close_hop(const mv_stage_t *s, int dt, const int *lift, int nlift, int scale_num, int scale_den, const char **cell, int *up, int *sh75);
#endif
