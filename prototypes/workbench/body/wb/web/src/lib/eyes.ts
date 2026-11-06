// The clay's eyes: the proxy draws them as flat dark discs. Play gives each a small white catch light, so a mibi in clay under the yarn looks at you instead of staring (the clay itself, and the studio's clay views, are unchanged).
// The dark discs are found in the picture: connected dark pixels, roundish, of an eye's size.
export type Blob = { x0: number; y0: number; x1: number; y1: number; n: number }

export function darkBlobs(d: Uint8ClampedArray, w: number, h: number, dark = 70): Blob[] {
  const seen = new Uint8Array(w * h)
  const out: Blob[] = []
  const is = (i: number) => d[i * 4 + 3] > 200 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < dark * 3
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !is(s)) continue
    const st = [s]
    seen[s] = 1
    const b: Blob = { x0: w, y0: h, x1: 0, y1: 0, n: 0 }
    while (st.length) {
      const i = st.pop() as number
      const x = i % w, y = (i / w) | 0
      b.n++; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y)
      for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && !seen[j] && is(j) && Math.abs((j % w) - x) <= 1) { seen[j] = 1; st.push(j) }
    }
    out.push(b)
  }
  return out
}

// An eye is a filled, roundish blob: not a thin stroke (the mouth), not a speck, not the dark of a crease under the legs.
export const eyesOf = (bs: Blob[], w: number): Blob[] => bs.filter((b) => {
  const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1
  return bh >= w * 0.03 && bh <= w * 0.2 && bw >= w * 0.02 && bw / bh < 1.3 && bh / bw < 2.8 && b.n > bw * bh * 0.55
})

// The proxy draws the clay on a pale flat ground: the ground is taken out (the colour of the corner, with a soft edge), so the clay stands on the cushion like the plush does.
export function keyOut(d: Uint8ClampedArray, w: number, h: number): void {
  const r0 = d[0], g0 = d[1], b0 = d[2]
  for (let i = 0; i < w * h; i++) {
    const k = i * 4
    const dist = Math.abs(d[k] - r0) + Math.abs(d[k + 1] - g0) + Math.abs(d[k + 2] - b0)
    if (dist < 14) d[k + 3] = 0
    else if (dist < 40) d[k + 3] = Math.round(d[k + 3] * ((dist - 14) / 26))
  }
}

// `cells`: a strip of that many frames side by side (a clip): each frame is read for its own eyes.
export function withEyes(src: string, cells = 1): Promise<string> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth; c.height = img.naturalHeight
        const g = c.getContext('2d')
        if (!g) return res(src)
        g.drawImage(img, 0, 0)
        const cw = Math.floor(c.width / cells)
        for (let k = 0; k < cells; k++) {
          const px = g.getImageData(k * cw, 0, cw, c.height)
          if (px.data[3] > 250) { keyOut(px.data, cw, c.height); g.putImageData(px, k * cw, 0) }
          for (const e of eyesOf(darkBlobs(px.data, cw, c.height), cw)) {
            const bw = e.x1 - e.x0 + 1, bh = e.y1 - e.y0 + 1, r = Math.max(1.5, Math.min(bw, bh) * 0.2), ox = k * cw
            g.fillStyle = '#fff'
            g.beginPath(); g.arc(ox + e.x0 + bw * 0.62, e.y0 + bh * 0.3, r, 0, Math.PI * 2); g.fill()
            g.globalAlpha = 0.8
            g.beginPath(); g.arc(ox + e.x0 + bw * 0.34, e.y0 + bh * 0.68, r * 0.45, 0, Math.PI * 2); g.fill()
            g.globalAlpha = 1
          }
        }
        res(c.toDataURL('image/png'))
      } catch { res(src) }
    }
    img.onerror = () => res(src)
    img.src = src
  })
}
