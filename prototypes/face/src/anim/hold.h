/* The hold (a held ✓ that fills a ring and does something only when it is full): the state of one hold on the face's clock. The page sends ✓ down and ✓ up as two `key` messages
   (phase down, phase up); while the frame carries props.frame.hold the face keeps ✓ down for itself: it fills the ring over spec hold.ms, says the intent `confirm:held` once when the ring is
   full, and empties the ring over hold.emptyMs when ✓ is let go before it is full, saying nothing; a full ring stays full until the frame stops sending the hold. With props.motion false the ring steps in quarters (the fill) and empties at once. Fill is in thousandths (0 to 1000). */
#ifndef HOLD_H
#define HOLD_H
#include <stdint.h>
void hold_reset(void);
void hold_arm(int on);                 /* the frame carries a hold: on; a frame that does not: off, which drops any hold in progress (nothing is said) */
int hold_armed(void);
int hold_down(void);                   /* ✓ went down: begins a hold now (the face's clock) when armed and none runs; 1 when ✓ was taken, 0 when not (the caller treats ✓ as an ordinary key) */
int hold_up(void);                     /* ✓ went up: empties the ring (a full ring stays full); 1 when a hold was running or full, else 0 */
void hold_cancel(void);                /* another key went down mid-hold: the same as letting go */
int hold_tick(uint32_t now);           /* the clock moved: completes the hold (and says `confirm:held`, once) and ends an emptying; 1 while the ring changes with the clock (the screen is drawn again) */
int hold_fill(void);                   /* thousandths of the ring filled now */
int hold_active(void);                 /* a hold is running, full, or emptying */
int hold_sin(int k);                   /* sin of k thousandths of a turn, times 2^20, integers only (k any integer) */
int hold_cos(int k);
#endif
