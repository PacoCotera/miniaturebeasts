#include "hold.h"
#include "anim.h"
#include "../spec/spec.h"
#include "../screens/screens.h"
#include <stdio.h>
#include <string.h>

static const int SIN[251] = { 0,6588,13176,19764,26351,32937,39521,46104,52685,59264,65841,72415,78986,85554,92119,98680,105237,111790,118338,124882,131421,137955,144484,151006,157523,164033,170537,177035,183525,190008,196484,202951,209411,215863,222306,228740,235165,241581,247987,254384,260770,267146,273512,279867,286211,292543,298864,305174,311471,317756,324028,330287,336534,342767,348987,355192,361384,367562,373725,379873,386007,392125,398227,404314,410385,416440,422478,428500,434504,440492,446462,452414,458349,464266,470164,476044,481904,487746,493569,499372,505155,510919,516662,522385,528087,533769,539429,545068,550686,556281,561855,567407,572936,578443,583926,589387,594825,600239,605629,610995,616338,621655,626949,632217,637461,642680,647873,653040,658182,663298,668387,673451,678487,683497,688480,693436,698364,703265,708138,712983,717800,722588,727348,732080,736782,741455,746099,750714,755299,759854,764379,768874,773339,777773,782176,786548,790890,795200,799479,803726,807942,812125,816277,820396,824483,828538,832559,836548,840504,844427,848316,852172,855994,859782,863537,867257,870943,874595,878212,881794,885342,888855,892332,895775,899182,902553,905889,909190,912454,915682,918874,922030,925149,928232,931279,934288,937261,940196,943095,945956,948780,951566,954315,957026,959700,962335,964933,967492,970014,972497,974941,977347,979715,982044,984334,986585,988797,990970,993105,995199,997255,999271,1001248,1003185,1005083,1006941,1008759,1010538,1012276,1013975,1015633,1017251,1018830,1020368,1021865,1023323,1024740,1026116,1027452,1028748,1030003,1031217,1032391,1033523,1034615,1035666,1036676,1037646,1038574,1039461,1040308,1041113,1041877,1042600,1043282,1043922,1044522,1045080,1045597,1046073,1046507,1046900,1047252,1047562,1047831,1048059,1048245,1048390,1048493,1048555,1048576 };   /* sin(2 pi k / 1000) * 2^20 for k 0..250, rounded: a table, so the pixels cannot differ between builds */
int hold_sin(int k) {
  k %= 1000; if (k < 0) k += 1000;
  int q = k / 250, r = k % 250;
  return q == 0 ? SIN[r] : q == 1 ? SIN[250 - r] : q == 2 ? -SIN[r] : -SIN[250 - r];
}
int hold_cos(int k) { return hold_sin(k + 250); }

enum { H_IDLE, H_HOLDING, H_FULL, H_EMPTYING };
static int g_state, g_armed, g_from; static uint32_t g_t0;
static int hold_ms(void) { int v = spec_int("frame", "hold.ms", 3000); return v > 0 ? v : 3000; }
static int empty_ms(void) { int v = spec_int("frame", "hold.emptyMs", 300); return v > 0 ? v : 300; }
static int motion(void) { return spec_bool("props", "motion", 1); }
void hold_reset(void) { g_state = H_IDLE; g_armed = 0; g_from = 0; g_t0 = 0; }
int hold_armed(void) { return g_armed; }
int hold_active(void) { return g_state != H_IDLE; }
void hold_arm(int on) { g_armed = on != 0; if (!g_armed) g_state = H_IDLE; }
int hold_down(void) {
  if (!g_armed) return 0;
  if (g_state == H_HOLDING || g_state == H_FULL) return 1;   /* a repeat of a key already down */
  g_state = H_HOLDING; g_t0 = anim_now(); g_from = 0; screens_redraw(); return 1;
}
int hold_fill(void) {
  uint32_t now = anim_now(); int el = (int)(now - g_t0);
  if (g_state == H_HOLDING) {
    int ms = hold_ms(); if (el < 0) el = 0; if (el >= ms) return 1000;
    return motion() ? el * 1000 / ms : (el * 4 / ms) * 250;
  }
  if (g_state == H_FULL) return 1000;
  if (g_state == H_EMPTYING) { int em = empty_ms(); if (!motion() || el >= em) return 0; if (el < 0) el = 0; return g_from * (em - el) / em; }
  return 0;
}
int hold_up(void) {
  if (g_state == H_IDLE || g_state == H_EMPTYING) return 0;
  g_from = hold_fill(); g_t0 = anim_now(); g_state = motion() && g_from > 0 ? H_EMPTYING : H_IDLE; screens_redraw(); return 1;
}
void hold_cancel(void) { hold_up(); }
int hold_tick(uint32_t now) {
  if (g_state == H_HOLDING && (int)(now - g_t0) >= hold_ms()) { g_state = H_FULL; screens_say("intent", "hold", "confirm:held"); return 1; }
  if (g_state == H_EMPTYING && (int)(now - g_t0) >= empty_ms()) { g_state = H_IDLE; return 1; }
  return g_state == H_HOLDING || g_state == H_EMPTYING;
}
