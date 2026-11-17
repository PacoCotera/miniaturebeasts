import { AudioContext } from 'react-native-audio-api';
import { AMBIENT, CLICK } from './art';

export type SoundStats = {
  engineErrors: number; // contextError events from the audio library (underrun / device error)
  audioStalls: number; // audio clock stood still for over 100 ms while the app was running
  lateClicks: number; // a click we tried to schedule whose time was already past
  clicks: number;
  timerJitterMedian: number; // ms, JS scheduler timer lateness
  timerJitterMax: number;
  clockDriftMax: number; // ms, max |audio clock elapsed - wall clock elapsed| over the run
  outputLatencyMs: number;
};

export class SoundTest {
  private ctx: AudioContext | null = null;
  private clickBuf: any = null;
  private ambBuf: any = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private engineErrors = 0;
  private stalls = 0;
  private late = 0;
  private clicks = 0;
  private lates: number[] = [];
  private nextClick = 0;
  private audioT0 = 0;
  private wallT0 = 0;
  private lastAudio = 0;
  private lastAudioWall = 0;
  private driftMax = 0;
  private lastFire = 0;
  private running = false;
  private src: any = null;

  async load() {
    const ctx = new AudioContext();
    ctx.onerror = () => {
      this.engineErrors++;
      console.log('PHONETEST audio contextError');
    };
    this.ctx = ctx;
    this.ambBuf = await ctx.decodeAudioData(AMBIENT);
    this.clickBuf = await ctx.decodeAudioData(CLICK);
  }

  async start() {
    const ctx = this.ctx!;
    await ctx.resume();
    const amb = ctx.createGain();
    amb.gain.value = 0.5;
    amb.connect(ctx.destination);
    const clk = ctx.createGain();
    clk.gain.value = 0.9;
    clk.connect(ctx.destination);
    (this as any).clickGain = clk;
    const s = ctx.createBufferSource();
    s.buffer = this.ambBuf;
    s.loop = true;
    s.connect(amb);
    s.start();
    this.src = s;
    this.audioT0 = ctx.currentTime;
    this.wallT0 = performance.now();
    this.lastAudio = this.audioT0;
    this.lastAudioWall = this.wallT0;
    this.nextClick = this.audioT0 + 0.5;
    this.lastFire = this.wallT0;
    this.running = true;
    // look-ahead scheduler: every 100 ms schedule the clicks due in the next 400 ms on the audio clock
    this.timer = setInterval(() => this.tick(), 100);
  }

  private tick() {
    if (!this.running) return;
    const ctx = this.ctx!;
    const now = performance.now();
    this.lates.push(Math.abs(now - this.lastFire - 100));
    this.lastFire = now;
    const at = ctx.currentTime;
    if (at - this.lastAudio < 0.001 && now - this.lastAudioWall > 100) {
      this.stalls++;
    }
    if (at !== this.lastAudio) {
      this.lastAudio = at;
      this.lastAudioWall = now;
    }
    const drift = Math.abs((at - this.audioT0) * 1000 - (now - this.wallT0));
    if (drift > this.driftMax) this.driftMax = drift;
    while (this.nextClick < at + 0.4) {
      if (this.nextClick < at) this.late++;
      const b = ctx.createBufferSource();
      b.buffer = this.clickBuf;
      b.connect((this as any).clickGain);
      b.start(Math.max(this.nextClick, at));
      this.clicks++;
      this.nextClick += 0.5;
    }
  }

  stop(): SoundStats {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    try {
      this.src?.stop();
    } catch {}
    const s = this.lates.slice().sort((a, b) => a - b);
    const ctx: any = this.ctx;
    return {
      engineErrors: this.engineErrors,
      audioStalls: this.stalls,
      lateClicks: this.late,
      clicks: this.clicks,
      timerJitterMedian: s.length ? s[Math.floor(s.length / 2)] : 0,
      timerJitterMax: s.length ? s[s.length - 1] : 0,
      clockDriftMax: this.driftMax,
      outputLatencyMs: (ctx?.outputLatency ?? 0) * 1000,
    };
  }
}
