export function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

export type FrameStats = {
  frames: number;
  median: number;
  p95: number;
  p99: number;
  max: number;
  over16: number;
  over33: number;
  over50: number;
  jsMedian: number;
  jsP95: number;
};

// dts: ms between consecutive vsync-aligned frame callbacks; js: ms of our own per-frame work
export function frameStats(dts: number[], js: number[]): FrameStats {
  const s = dts.slice().sort((a, b) => a - b);
  const j = js.slice().sort((a, b) => a - b);
  return {
    frames: dts.length,
    median: pct(s, 50),
    p95: pct(s, 95),
    p99: pct(s, 99),
    max: s.length ? s[s.length - 1] : 0,
    over16: s.filter(v => v > 16.7).length,
    over33: s.filter(v => v > 33.3).length,
    over50: s.filter(v => v > 50).length,
    jsMedian: pct(j, 50),
    jsP95: pct(j, 95),
  };
}
