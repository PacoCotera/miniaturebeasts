#include "spec.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define JSMN_STATIC
#include "../vendor/jsmn.h"

#define MAX_SPEC 24
typedef struct { char name[32]; char *js; size_t len; jsmntok_t *tok; int n; } spec_t;
static spec_t g_s[MAX_SPEC];
static int g_ns;
static char g_err[96];
const char *spec_error(void) { return g_err; }
int spec_count(void) { return g_ns; }
static spec_t *find(const char *screen) { for (int i = 0; i < g_ns; i++) if (strcmp(g_s[i].name, screen) == 0) return &g_s[i]; return NULL; }
int spec_has(const char *screen) { return find(screen) != NULL; }
int spec_load(const char *screen, const char *json, size_t len) {
  g_err[0] = 0;
  if (!screen || !*screen || strlen(screen) >= sizeof g_s[0].name) { snprintf(g_err, sizeof g_err, "spec: a screen name of 1 to 31 bytes is required"); return -1; }
  jsmn_parser p; jsmn_init(&p);
  int n = jsmn_parse(&p, json, len, NULL, 0);
  if (n < 1) { snprintf(g_err, sizeof g_err, "spec %s: not valid JSON (%d)", screen, n); return -1; }
  jsmntok_t *tok = (jsmntok_t *)malloc(sizeof *tok * (size_t)n); char *js = (char *)malloc(len + 1);
  if (!tok || !js) { free(tok); free(js); snprintf(g_err, sizeof g_err, "spec %s: out of memory", screen); return -1; }
  memcpy(js, json, len); js[len] = 0; jsmn_init(&p);
  if (jsmn_parse(&p, js, len, tok, (unsigned)n) != n || tok[0].type != JSMN_OBJECT) { free(tok); free(js); snprintf(g_err, sizeof g_err, "spec %s: the top level must be one JSON object", screen); return -1; }
  spec_t *s = find(screen);
  if (!s) { if (g_ns >= MAX_SPEC) { free(tok); free(js); snprintf(g_err, sizeof g_err, "spec %s: the table holds %d specs", screen, MAX_SPEC); return -1; } s = &g_s[g_ns++]; strcpy(s->name, screen); }
  else { free(s->js); free(s->tok); }
  s->js = js; s->len = len; s->tok = tok; s->n = n;
  return 0;
}
static int skip(const spec_t *s, int i) { int k = s->tok[i].size; i++; for (; k > 0; k--) i = skip(s, i); return i; }   /* the token after the one at i and its children */
/* the token a dotted path names, or -1 */
static int at(const spec_t *s, const char *path) {
  int i = 0; const char *p = path;
  while (*p) {
    const char *e = strchr(p, '.'); size_t l = e ? (size_t)(e - p) : strlen(p);
    if (s->tok[i].type == JSMN_OBJECT) {
      int k = i + 1, found = -1;
      for (int m = s->tok[i].size; m > 0; m--) { if ((size_t)(s->tok[k].end - s->tok[k].start) == l && strncmp(s->js + s->tok[k].start, p, l) == 0) { found = k + 1; break; } k = skip(s, k + 1); }
      if (found < 0) return -1; i = found;
    } else if (s->tok[i].type == JSMN_ARRAY) {
      char num[12]; if (l == 0 || l >= sizeof num) return -1; memcpy(num, p, l); num[l] = 0;
      char *end; long idx = strtol(num, &end, 10); if (*end || idx < 0 || idx >= s->tok[i].size) return -1;
      int k = i + 1; for (long m = 0; m < idx; m++) k = skip(s, k); i = k;
    } else return -1;
    p += l; if (*p == '.') p++;
  }
  return i;
}
int spec_int(const char *screen, const char *path, int dflt) {
  const spec_t *s = find(screen); if (!s) return dflt;
  int i = at(s, path); if (i < 0 || s->tok[i].type != JSMN_PRIMITIVE) return dflt;
  const char c = s->js[s->tok[i].start]; if (!((c >= '0' && c <= '9') || c == '-')) return dflt;
  return atoi(s->js + s->tok[i].start);
}
/* a JSON string's bytes decoded to UTF-8 (\" \\ \/ \b \f \n \r \t and \uXXXX, surrogate pairs joined); returns the length written, never beyond cap - 1 */
static int unescape(const char *src, int len, char *buf, int cap) {
  int o = 0;
  for (int i = 0; i < len && o < cap - 1; i++) {
    char c = src[i];
    if (c != '\\' || i + 1 >= len) { buf[o++] = c; continue; }
    c = src[++i];
    if (c == 'u' && i + 4 < len + 0) {
      unsigned cp = (unsigned)strtoul((char[]){ src[i + 1], src[i + 2], src[i + 3], src[i + 4], 0 }, NULL, 16); i += 4;
      if (cp >= 0xd800 && cp < 0xdc00 && i + 6 < len && src[i + 1] == '\\' && src[i + 2] == 'u') { unsigned lo = (unsigned)strtoul((char[]){ src[i + 3], src[i + 4], src[i + 5], src[i + 6], 0 }, NULL, 16); cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00); i += 6; }
      char u[4]; int n = cp < 0x80 ? (u[0] = (char)cp, 1) : cp < 0x800 ? (u[0] = (char)(0xc0 | cp >> 6), u[1] = (char)(0x80 | (cp & 63)), 2) : cp < 0x10000 ? (u[0] = (char)(0xe0 | cp >> 12), u[1] = (char)(0x80 | ((cp >> 6) & 63)), u[2] = (char)(0x80 | (cp & 63)), 3) : (u[0] = (char)(0xf0 | cp >> 18), u[1] = (char)(0x80 | ((cp >> 12) & 63)), u[2] = (char)(0x80 | ((cp >> 6) & 63)), u[3] = (char)(0x80 | (cp & 63)), 4);
      if (o + n >= cap) break; memcpy(buf + o, u, (size_t)n); o += n;
    } else buf[o++] = c == 'n' ? '\n' : c == 't' ? '\t' : c == 'r' ? '\r' : c == 'b' ? '\b' : c == 'f' ? '\f' : c;
  }
  buf[o] = 0; return o;
}
int spec_str(const char *screen, const char *path, char *buf, int cap) {
  if (cap > 0) { buf[0] = 0; }
  const spec_t *s = find(screen); if (!s || cap < 1) return 0;
  int i = at(s, path); if (i < 0 || s->tok[i].type != JSMN_STRING) return 0;
  return unescape(s->js + s->tok[i].start, s->tok[i].end - s->tok[i].start, buf, cap);
}
int spec_len(const char *screen, const char *path) {
  const spec_t *s = find(screen); if (!s) return -1;
  int i = at(s, path); if (i < 0) return -1;
  return s->tok[i].type == JSMN_ARRAY || s->tok[i].type == JSMN_OBJECT ? s->tok[i].size : -1;
}
