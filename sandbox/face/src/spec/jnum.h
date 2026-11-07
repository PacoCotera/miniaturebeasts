/* A JSON integer, exactly: -?(0|[1-9][0-9]*) over the whole token and nothing else (so 1.5, 1e3, 01, +1 and "1" are refused). Shared by the bridge, the spec loader and the composed pictures. */
#ifndef JNUM_H
#define JNUM_H
#include <stdlib.h>
static inline int json_int(const char *s, int len, int *out) {
  int i = 0; if (len > 0 && s[0] == '-') i = 1;
  if (i >= len) return 0;
  if (s[i] == '0') { if (len - i != 1) return 0; }
  else { if (s[i] < '1' || s[i] > '9') return 0; for (int k = i; k < len; k++) if (s[k] < '0' || s[k] > '9') return 0; }
  if (len - i > 9) return 0;   /* an int the face's fields hold */
  *out = atoi(s); return 1;     /* atoi stops at the token's end: the next byte is a delimiter */
}

/* What jsmn's strict mode lets through and JSON does not: a literal that is not true, false, null or a number (tru, 1.2.3, +1), a comma before a closing bracket or another comma, and a comma
   at the start of a container. Run over a whole message after jsmn has parsed it. 1 when the text is clean. */
static inline int json_clean(const char *s, int len) {
  char last = 0; int in_str = 0;
  for (int i = 0; i < len; i++) {
    char c = s[i];
    if (in_str) { if (c == '\\') i++; else if (c == '"') in_str = 0; continue; }
    if (c == ' ' || c == '\n' || c == '\t' || c == '\r') continue;
    if (c == '"') { in_str = 1; last = c; continue; }
    if (c == ',') { if (last == ',' || last == '[' || last == '{' || last == ':' || last == 0) return 0; last = c; continue; }
    if (c == '}' || c == ']') { if (last == ',') return 0; last = c; continue; }
    if (c == '{' || c == '[' || c == ':') { last = c; continue; }
    int j = i; while (j < len && s[j] != ',' && s[j] != '}' && s[j] != ']' && s[j] != ':' && s[j] != ' ' && s[j] != '\n' && s[j] != '\t' && s[j] != '\r' && s[j] != '"') j++;
    int n = j - i, ok = 0;
    if ((n == 4 && !strncmp(s + i, "true", 4)) || (n == 5 && !strncmp(s + i, "false", 5)) || (n == 4 && !strncmp(s + i, "null", 4))) ok = 1;
    else {   /* -?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)? */
      int k = i; if (k < j && s[k] == '-') k++;
      if (k < j && s[k] == '0') k++; else if (k < j && s[k] >= '1' && s[k] <= '9') while (k < j && s[k] >= '0' && s[k] <= '9') k++; else k = -1;
      if (k >= 0 && k < j && s[k] == '.') { int d = ++k; while (k < j && s[k] >= '0' && s[k] <= '9') k++; if (k == d) k = -1; }
      if (k >= 0 && k < j && (s[k] == 'e' || s[k] == 'E')) { k++; if (k < j && (s[k] == '+' || s[k] == '-')) k++; int d = k; while (k < j && s[k] >= '0' && s[k] <= '9') k++; if (k == d) k = -1; }
      ok = k == j;
    }
    if (!ok) return 0;
    last = 'v'; i = j - 1;
  }
  return !in_str;
}
#include <string.h>
#endif
