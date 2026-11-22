# tells-bot-min-1: TELLS reads a pair by its weaker trait; run3 h2 (markings + eyes hidden), same 200 seeds and frames

Score: n*min(pf) + 2*all + 0.15*n*min(ec/2) + 0.01*tell + vigourOfF(k) (trace.md section 3). No weight tuned. 'before' = results-b-rounds-harness-3-h2-*.json.

| frame | bot | reached | hatches med (p80) | gens med | hours med |
| --- | --- | --- | --- | --- | --- |
| L | before BYLOOK | 196/200 | 41 (53) | 7 | 13.2 |
| L | before TELLS | 184/200 | 37 (53) | 6 | 12.8 |
| L | now BYLOOK | 196/200 | 41 (53) | 7 | 13.2 |
| L | now TELLS | 200/200 | 33 (43) | 5 | 12.2 |
| T | before BYLOOK | 199/200 | 41 (54) | 6 | 13.1 |
| T | before TELLS | 188/200 | 35 (49) | 6 | 12.4 |
| T | now BYLOOK | 199/200 | 41 (54) | 6 | 13.1 |
| T | now TELLS | 199/200 | 31 (41) | 5 | 11.8 |

## L1 and L2

- L: L1 hatches MISS (TELLS 33 v BYLOOK 41, 19.5% fewer); gens MISS (5 v 7); L2 PASS at 66.4% (was 55.3%, line 70%), over 6749 decisions
- T: L1 hatches MISS (TELLS 31 v BYLOOK 41, 24.4% fewer); gens MISS (5 v 6); L2 PASS at 67.8% (was 57.0%, line 70%), over 6771 decisions
