/* A line of words that names a key by its cap: "Press {key:library} for its page" (plan 3.17, B2). Splits at the one token into the words before it and after it (each trimmed of its
   edge space) and the key's name (home, research, vivarium, library, call, confirm). Returns 1 when the string has a token, else 0 and nothing is written. */
#ifndef V_KEYTOKEN_H
#define V_KEYTOKEN_H
#include <string.h>
#include <stdio.h>
static inline int v_keytok(const char *s, char *pre, int psz, char *key, int ksz, char *post, int qsz) {
  const char *t = strstr(s, "{key:"); if (!t) return 0;
  const char *e = strchr(t, '}'); if (!e) return 0;
  int pn = (int)(t - s), kn = (int)(e - (t + 5));
  while (pn > 0 && s[pn - 1] == ' ') pn--;
  if (pn >= psz) pn = psz - 1; if (kn >= ksz) kn = ksz - 1;
  memcpy(pre, s, (size_t)pn); pre[pn] = 0; memcpy(key, t + 5, (size_t)kn); key[kn] = 0;
  const char *q = e + 1; while (*q == ' ') q++; snprintf(post, (size_t)qsz, "%s", q);
  return 1;
}
#endif
