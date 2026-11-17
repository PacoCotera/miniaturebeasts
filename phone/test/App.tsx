import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  PixelRatio,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FilterMode,
  MipmapMode,
  Skia,
  SkiaPictureView,
  useImage,
} from '@shopify/react-native-skia';
import type { SkImage, SkPicture } from '@shopify/react-native-skia';
import { FILLS, PROPS } from './src/art';
import { CHUNK, MAP_H, MAP_W, fillAt, propAt } from './src/map';
import { frameStats, FrameStats } from './src/stats';
import { SoundStats, SoundTest } from './src/sound';

const RUN_MS = 60000;
const TILES_PER_SEC = 3; // walking speed
const DRIFT_Y_PER_SEC = 0.2; // tiles per second, slow vertical drift

function useAll(mods: any[]): (SkImage | null)[] {
  // fixed-length list, so the hook order never changes
  const out: (SkImage | null)[] = [];
  for (const m of mods) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    out.push(useImage(m));
  }
  return out;
}

type Result = { frame: FrameStats; sound: SoundStats; pass: boolean; why: string[]; info: any };

export default function App() {
  const fills = useAll(FILLS);
  const props = useAll(PROPS);
  const ready = fills.every(Boolean) && props.every(Boolean);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<'load' | 'run' | 'done'>('load');
  const [result, setResult] = useState<Result | null>(null);
  const viewRef = useRef<SkiaPictureView>(null);
  const offset = useRef({ x: 0, y: 0 });
  const phaseRef = useRef<'load' | 'run' | 'done'>('load');
  const chunks = useRef<SkPicture[] | null>(null);
  const sound = useRef<SoundTest | null>(null);
  const started = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  const ratio = PixelRatio.get();
  const S = Math.max(2, Math.round(ratio)); // whole device pixels per art pixel
  const tilePx = 16 * S;

  const pan = useMemo(() => {
    let sx = 0, sy = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'done',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'done',
      onPanResponderGrant: () => {
        sx = offset.current.x;
        sy = offset.current.y;
      },
      onPanResponderMove: (_e, g) => {
        offset.current.x = sx - g.dx * ratio;
        offset.current.y = sy - g.dy * ratio;
        draw();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio]);

  const bake = () => {
    const rec = Skia.PictureRecorder();
    const paint = Skia.Paint();
    const nx = MAP_W / CHUNK, ny = MAP_H / CHUNK;
    const list: SkPicture[] = new Array(nx * ny);
    const cpx = CHUNK * tilePx;
    for (let cy = 0; cy < ny; cy++) {
      for (let cx = 0; cx < nx; cx++) {
        const c = rec.beginRecording(Skia.XYWHRect(0, 0, cpx, cpx));
        for (let ty = 0; ty < CHUNK; ty++) {
          for (let tx = 0; tx < CHUNK; tx++) {
            const gx = cx * CHUNK + tx, gy = cy * CHUNK + ty;
            const img = fills[fillAt(gx, gy)]!;
            c.drawImageRectOptions(
              img,
              Skia.XYWHRect(0, 0, 16, 16),
              Skia.XYWHRect(tx * tilePx, ty * tilePx, tilePx, tilePx),
              FilterMode.Nearest,
              MipmapMode.None,
              paint,
            );
          }
        }
        for (let ty = 0; ty < CHUNK; ty++) {
          for (let tx = 0; tx < CHUNK; tx++) {
            const gx = cx * CHUNK + tx, gy = cy * CHUNK + ty;
            const p = propAt(gx, gy);
            if (!p) continue;
            const img = props[p.kind]!;
            const w = img.width(), h = img.height();
            const dx = (p.x - cx * CHUNK * 16 - w / 2) * S;
            const dy = (p.y - cy * CHUNK * 16 - h) * S;
            c.drawImageRectOptions(
              img,
              Skia.XYWHRect(0, 0, w, h),
              Skia.XYWHRect(Math.round(dx), Math.round(dy), w * S, h * S),
              FilterMode.Nearest,
              MipmapMode.None,
              paint,
            );
          }
        }
        list[cy * nx + cx] = rec.finishRecordingAsPicture();
      }
    }
    chunks.current = list;
  };

  // returns ms spent building and handing over the picture
  const draw = (): number => {
    const t0 = performance.now();
    const list = chunks.current;
    const view = viewRef.current;
    const size = sizeRef.current;
    if (!list || !view || size.w === 0) return 0;
    const wpx = size.w * ratio, hpx = size.h * ratio;
    const ox = Math.round(offset.current.x), oy = Math.round(offset.current.y);
    const cpx = CHUNK * tilePx;
    const nx = MAP_W / CHUNK, ny = MAP_H / CHUNK;
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, size.w, size.h));
    c.scale(1 / ratio, 1 / ratio);
    const cx0 = Math.max(0, Math.floor(ox / cpx) - 1), cx1 = Math.min(nx - 1, Math.floor((ox + wpx) / cpx) + 1);
    const cy0 = Math.max(0, Math.floor(oy / cpx) - 1), cy1 = Math.min(ny - 1, Math.floor((oy + hpx) / cpx) + 1);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        c.save();
        c.translate(cx * cpx - ox, cy * cpx - oy);
        c.drawPicture(list[cy * nx + cx]);
        c.restore();
      }
    }
    const pic = rec.finishRecordingAsPicture();
    global.SkiaViewApi.setJsiProperty(view.nativeId, 'picture', pic);
    view.redraw();
    return performance.now() - t0;
  };

  useEffect(() => {
    if (!ready || started.current || size.w === 0) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      const t0 = performance.now();
      bake();
      console.log('PHONETEST bake ms ' + Math.round(performance.now() - t0));
      const snd = new SoundTest();
      sound.current = snd;
      await snd.load();
      draw();
      await new Promise<void>(r => setTimeout(() => r(), 1500)); // settle before the clock starts
      if (cancelled) return;
      await snd.start();
      phaseRef.current = 'run';
      setPhase('run');
      const dts: number[] = [];
      const js: number[] = [];
      let tStart = -1;
      let last = -1;
      const tick = (ts: number) => {
        if (tStart < 0) tStart = ts;
        const el = ts - tStart;
        if (last >= 0) dts.push(ts - last);
        last = ts;
        offset.current.x = Math.round((el / 1000) * TILES_PER_SEC * tilePx);
        offset.current.y = Math.round((el / 1000) * DRIFT_Y_PER_SEC * tilePx);
        js.push(draw());
        if (el < RUN_MS) {
          requestAnimationFrame(tick);
        } else {
          finish(dts, js);
        }
      };
      requestAnimationFrame(tick);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, size.w]);

  const finish = (dts: number[], js: number[]) => {
    const sstats = sound.current!.stop();
    const fstats = frameStats(dts, js);
    const why: string[] = [];
    if (fstats.p95 > 16.7) why.push('95th percentile over 16.7 ms');
    if (fstats.max > 50) why.push('a frame over 50 ms');
    if (sstats.engineErrors > 0 || sstats.audioStalls > 0 || sstats.lateClicks > 0) why.push('sound underrun or late click');
    const info = {
      os: Platform.OS + ' ' + Platform.Version,
      model: (Platform as any).constants?.Model ?? '',
      ratio,
      scale: S,
      screen: Math.round(size.w * ratio) + 'x' + Math.round(size.h * ratio),
      hermes: !!(global as any).HermesInternal,
    };
    const r: Result = { frame: fstats, sound: sstats, pass: why.length === 0, why, info };
    console.log('PHONETEST_RESULT ' + JSON.stringify(r));
    phaseRef.current = 'done';
    setResult(r);
    setPhase('done');
  };

  const f = (n: number) => n.toFixed(1);
  return (
    <View style={styles.root} {...pan.panHandlers}>
      <StatusBar hidden />
      <View
        style={StyleSheet.absoluteFill}
        onLayout={e => {
          sizeRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
          setSize(sizeRef.current);
        }}>
        {size.w > 0 && <SkiaPictureView ref={viewRef} style={StyleSheet.absoluteFill} />}
      </View>
      {phase === 'load' && (
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.small}>loading</Text>
        </View>
      )}
      {result && (
        <View style={styles.card} pointerEvents="none">
          <Text style={[styles.head, { color: result.pass ? '#7CFC7C' : '#FF7C7C' }]}>
            {result.pass ? 'PASS' : 'FAIL'}
          </Text>
          <Text style={styles.line}>frames {result.frame.frames}  median {f(result.frame.median)} ms</Text>
          <Text style={styles.line}>95th {f(result.frame.p95)}  99th {f(result.frame.p99)}  max {f(result.frame.max)} ms</Text>
          <Text style={styles.line}>over 16.7: {result.frame.over16}   over 33: {result.frame.over33}   over 50: {result.frame.over50}</Text>
          <Text style={styles.line}>our own work/frame: median {f(result.frame.jsMedian)}  95th {f(result.frame.jsP95)} ms</Text>
          <Text style={styles.line}>sound: engine errors {result.sound.engineErrors}  stalls {result.sound.audioStalls}  late clicks {result.sound.lateClicks}/{result.sound.clicks}</Text>
          <Text style={styles.line}>click timer jitter median {f(result.sound.timerJitterMedian)} max {f(result.sound.timerJitterMax)} ms; clock drift max {f(result.sound.clockDriftMax)} ms</Text>
          <Text style={styles.line}>goal: 95th ≤ 16.7, no frame over 50, no underrun</Text>
          {result.why.map(w => (
            <Text key={w} style={styles.why}>x {w}</Text>
          ))}
          <Text style={styles.line}>{result.info.model} {result.info.os} ratio {result.info.ratio} scale {result.info.scale}x {result.info.screen} {result.info.hermes ? 'hermes' : 'no hermes'}</Text>
          <Text style={styles.line}>drag the map to look around</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  small: { color: '#fff', fontSize: 14 },
  card: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 24,
    backgroundColor: 'rgba(0,0,0,0.82)',
    padding: 12,
    borderRadius: 8,
  },
  head: { fontSize: 28, fontWeight: 'bold', marginBottom: 6 },
  line: { color: '#fff', fontSize: 12.5, lineHeight: 18 },
  why: { color: '#FF9C9C', fontSize: 13, lineHeight: 18 },
});
