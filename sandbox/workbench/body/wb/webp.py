"""R1: a lossless WebP writer (VP8L) with numpy only, in the style of pngio: no imaging library, no Blender. The studio shows previews as WebP next to the PNG in the cache; the PNG stays the record.
Pipeline: subtract-green transform, then a predictor transform (one of the 14 predictors per 16x16 block, the one with the smallest residual), then prefix codes (Huffman, at most 15 bits) over literals and runs of
identical pixels (a backward reference at distance 1). No colour cache, one prefix group. Same pixels give the same bytes."""
import heapq
import os
import struct

import numpy as np

from wb import pngio

BLOCK_BITS = 4
CL_ORDER = (17, 18, 0, 1, 2, 3, 4, 5, 16, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)
MAX_COPY = 4096


# ---- prefix codes -----------------------------------------------------------------------------------------------------------------------------------

def code_lengths(counts, limit):
    """Huffman code lengths for a histogram (zero counts get length 0), none longer than `limit` bits. At least two symbols must be used."""
    counts = np.asarray(counts, dtype=np.int64)
    used = np.nonzero(counts)[0]
    assert len(used) >= 2
    c = counts.copy()
    while True:
        heap = [(int(c[s]), int(s), (int(s),)) for s in used]
        heapq.heapify(heap)
        lens = np.zeros(len(counts), np.int64)
        while len(heap) > 1:
            a = heapq.heappop(heap)
            b = heapq.heappop(heap)
            for s in a[2] + b[2]:
                lens[s] += 1
            heapq.heappush(heap, (a[0] + b[0], min(a[1], b[1]), a[2] + b[2]))
        if lens.max() <= limit:
            return lens
        c[used] = np.maximum(c[used] >> 1, 1)         # flatten the histogram until the code fits


def canonical(lens):
    """Canonical codes for lengths, bit-reversed for the LSB-first stream: -> array of codes (0 where the length is 0)."""
    codes = np.zeros(len(lens), np.int64)
    code = 0
    for ln in range(1, int(lens.max()) + 1):
        for s in np.nonzero(lens == ln)[0]:
            codes[s] = int(format(code, f"0{ln}b")[::-1], 2)
            code += 1
        code <<= 1
    return codes


class Bits:
    """Collects (value, nbits) fields in order and packs them LSB-first."""
    def __init__(self):
        self.v, self.n = [], []

    def put(self, value, nbits):
        self.v.append(np.array([value], np.int64))
        self.n.append(np.array([nbits], np.int64))

    def put_arrays(self, values, nbits):
        self.v.append(np.asarray(values, np.int64))
        self.n.append(np.asarray(nbits, np.int64))

    def bytes(self):
        v = np.concatenate(self.v)
        n = np.concatenate(self.n)
        end = np.cumsum(n)
        start = end - n
        total = int(end[-1]) if len(end) else 0
        out = np.zeros((total + 7) // 8 + 4, np.float64)
        byte, sh = start >> 3, start & 7
        shifted = v << sh                              # at most 15 + 7 bits, but extra bits reach 11 and fields are split below if wider
        for j in range(4):
            part = (shifted >> (8 * j)) & 0xFF
            out += np.bincount(byte + j, weights=part, minlength=len(out))[:len(out)]
        return out.astype(np.uint8).tobytes()[:(total + 7) // 8]


def write_lengths(bits, lens):
    """Normal-form header, with the 17/18 extra bits interleaved after their symbols."""
    seq, i = [], 0
    while i < len(lens):
        if lens[i] == 0:
            j = i
            while j < len(lens) and lens[j] == 0:
                j += 1
            run = j - i
            while run >= 3:
                take = min(run, 138)
                seq.append((18, take - 11, 7) if take >= 11 else (17, take - 3, 3))
                run -= take
            seq += [(0, 0, 0)] * run
            i = j
        else:
            seq.append((int(lens[i]), 0, 0))
            i += 1
    cl_counts = np.zeros(19, np.int64)
    for s, _, _ in seq:
        cl_counts[s] += 1
    if np.count_nonzero(cl_counts) < 2:
        cl_counts[0 if cl_counts[0] == 0 else 1] += 1
    cl_lens = code_lengths(cl_counts, 7)
    cl_codes = canonical(cl_lens)
    last = max(i for i, s in enumerate(CL_ORDER) if cl_lens[s])
    n_cl = max(4, last + 1)
    bits.put(0, 1)
    bits.put(n_cl - 4, 4)
    for s in CL_ORDER[:n_cl]:
        bits.put(int(cl_lens[s]), 3)
    bits.put(0, 1)
    for s, extra, nx in seq:
        bits.put(int(cl_codes[s]), int(cl_lens[s]))
        if nx:
            bits.put(extra, nx)


def put_code(bits, counts):
    """Write one prefix code for a histogram; -> (codes, lens) to encode with (lens 0 for the one-symbol form)."""
    counts = np.asarray(counts, np.int64)
    used = np.nonzero(counts)[0]
    if len(used) <= 1:
        s = int(used[0]) if len(used) else 0
        lens = np.zeros(len(counts), np.int64)
        if s < 256:
            bits.put(1, 1)
            bits.put(0, 1)
            bits.put(1 if s > 1 else 0, 1)
            bits.put(s, 8 if s > 1 else 1)
            return np.zeros(len(counts), np.int64), lens
        counts = counts.copy()                          # a lone symbol >= 256: code it in the normal form with a dummy partner
        counts[0] = 1
        used = np.nonzero(counts)[0]
    lens = code_lengths(counts, 15)
    if len(used) == 2 and used.max() < 256:
        bits.put(1, 1)
        bits.put(1, 1)
        bits.put(1 if used[0] > 1 else 0, 1)
        bits.put(int(used[0]), 8 if used[0] > 1 else 1)
        bits.put(int(used[1]), 8)
    else:
        write_lengths(bits, lens)
    return canonical(lens), lens


# ---- LZ77 over runs, then the pixel stream -------------------------------------------------------------------------------------------------------

def prefix_code(v):
    """VP8L prefix coding of v (>= 1): -> (symbol, extra bits count, extra value), vectorised."""
    d = np.asarray(v, np.int64) - 1
    hb = np.zeros_like(d)
    big = d >= 4
    hb[big] = np.floor(np.log2(d[big])).astype(np.int64)
    second = np.where(big, (d >> np.maximum(hb - 1, 0)) & 1, 0)
    nx = np.where(big, hb - 1, 0)
    sym = np.where(big, 2 * hb + second, d)
    extra = np.where(big, d & ((1 << nx) - 1), 0)
    return sym, nx, extra


def write_image(bits, argb, main):
    """An entropy-coded image of uint32 ARGB pixels (flat). No colour cache; the main image also says it has one prefix group."""
    n = len(argb)
    bits.put(0, 1)
    if main:
        bits.put(0, 1)
    # runs of equal pixels -> one literal and, when long enough, copies at distance 1
    starts = np.concatenate(([0], np.nonzero(argb[1:] != argb[:-1])[0] + 1))
    lengths = np.diff(np.concatenate((starts, [n])))
    rest = lengths - 1
    cov = rest >= 3
    covered = np.zeros(n + 1, np.int64)
    np.add.at(covered, starts[cov] + 1, 1)
    np.add.at(covered, starts[cov] + lengths[cov], -1)
    literal_pos = np.nonzero(np.cumsum(covered[:n]) == 0)[0]
    cs, cr = starts[cov], rest[cov]
    nchunk = (cr + MAX_COPY - 1) // MAX_COPY
    run_of = np.repeat(np.arange(len(cs)), nchunk)
    first = np.cumsum(nchunk) - nchunk
    k = np.arange(nchunk.sum()) - first[run_of]
    copy_len = np.minimum(MAX_COPY, cr[run_of] - k * MAX_COPY)
    copy_pos = cs[run_of] + 1 + k * MAX_COPY
    pos = np.concatenate((literal_pos, copy_pos))
    order = np.argsort(pos, kind="stable")
    is_copy = np.concatenate((np.zeros(len(literal_pos), bool), np.ones(len(copy_pos), bool)))[order]
    lit_px = argb[literal_pos]
    lsym, lnx, lex = prefix_code(copy_len) if len(copy_len) else (np.zeros(0, np.int64),) * 3
    g, r, b, a = ((lit_px >> s) & 0xFF for s in (8, 16, 0, 24))
    green_counts = np.bincount(g, minlength=280) + np.bincount(256 + lsym, minlength=280)
    gc, gl = put_code(bits, green_counts)
    rc, rl = put_code(bits, np.bincount(r, minlength=256))
    bc, bl = put_code(bits, np.bincount(b, minlength=256))
    ac, al = put_code(bits, np.bincount(a, minlength=256))
    dc, dl = put_code(bits, np.bincount(np.ones(1 if len(copy_len) else 0, np.int64), minlength=40))     # distance symbol 1 = code 2 = the pixel to the left
    # emissions: a literal is 4 fields, a copy is 4 fields (length, its extra bits, distance symbol 0, no extra bits)
    m = len(order)
    vals = np.zeros((m, 4), np.int64)
    nb = np.zeros((m, 4), np.int64)
    li = np.nonzero(~is_copy)[0]
    ci = np.nonzero(is_copy)[0]
    vals[li, 0], nb[li, 0] = gc[g], gl[g]
    vals[li, 1], nb[li, 1] = rc[r], rl[r]
    vals[li, 2], nb[li, 2] = bc[b], bl[b]
    vals[li, 3], nb[li, 3] = ac[a], al[a]
    # lit_px is in literal_pos order, which is already ascending; so is li
    if len(ci):
        gs = 256 + lsym
        # copy_len is in (run, chunk) order, ascending by copy_pos within the concatenation; reorder to stream order
        stream_copy = np.argsort(copy_pos, kind="stable")
        gs, lnx, lex = gs[stream_copy], lnx[stream_copy], lex[stream_copy]
        vals[ci, 0], nb[ci, 0] = gc[gs], gl[gs]
        vals[ci, 1], nb[ci, 1] = lex, lnx
        vals[ci, 2], nb[ci, 2] = dc[1], dl[1]
    bits.put_arrays(vals.reshape(-1), nb.reshape(-1))


# ---- transforms ---------------------------------------------------------------------------------------------------------------------------------

def _avg(x, y):
    return (x + y) >> 1


def predictions(img):
    """All 14 predictions of every pixel from its neighbours in the original, as (14, h, w, 4) int16; borders are fixed up by the caller."""
    h, w, _ = img.shape
    p = img.astype(np.int16)
    L = np.zeros_like(p)
    L[:, 1:] = p[:, :-1]
    T = np.zeros_like(p)
    T[1:] = p[:-1]
    TL = np.zeros_like(p)
    TL[1:, 1:] = p[:-1, :-1]
    TR = np.zeros_like(p)
    TR[1:, :-1] = p[:-1, 1:]
    TR[1:, -1] = p[1:, 0]                               # the rightmost pixel takes the leftmost of its own row (the next in memory)
    out = np.zeros((14,) + p.shape, np.int16)
    out[0] = np.array([0, 0, 0, 255], np.int16)         # opaque black (r, g, b, a)
    out[1], out[2], out[3], out[4] = L, T, TR, TL
    out[5] = _avg(_avg(L, TR), T)
    out[6] = _avg(L, TL)
    out[7] = _avg(L, T)
    out[8] = _avg(TL, T)
    out[9] = _avg(T, TR)
    out[10] = _avg(_avg(L, TL), _avg(T, TR))
    pl = L.astype(np.int32) + T - TL
    pL = np.abs(pl - L).sum(-1, keepdims=True)           # Manhattan distance of the gradient estimate to L and to T, per the spec's Select
    pT = np.abs(pl - T).sum(-1, keepdims=True)
    out[11] = np.where(pL < pT, L, T)
    out[12] = np.clip(pl, 0, 255)
    ave = _avg(L, T).astype(np.int32)
    d = ave - TL
    out[13] = np.clip(ave + np.where(d < 0, -((-d) // 2), d // 2), 0, 255)       # C division: toward zero
    return out


def predictor_residuals(img):
    """img (h, w, 4) uint8 RGBA, already green-subtracted. -> (residual uint8 (h, w, 4), modes (bh, bw))."""
    h, w, _ = img.shape
    pred = predictions(img)
    bs = 1 << BLOCK_BITS
    bh, bw = (h + bs - 1) // bs, (w + bs - 1) // bs
    pad = np.zeros((14, bh * bs, bw * bs), np.int64)
    for m in range(14):
        res = (img.astype(np.int16) - pred[m]).astype(np.uint8).astype(np.int8)
        cost = np.abs(res.astype(np.int64)).sum(-1)
        pad[m, :h, :w] = cost
    # the first row and column use fixed predictors whatever the block says, so count them under the mode that serves them
    cost = pad.reshape(14, bh, bs, bw, bs).sum((2, 4))
    modes = np.argmin(cost, axis=0)
    full = np.repeat(np.repeat(modes, bs, 0), bs, 1)[:h, :w]
    chosen = np.take_along_axis(pred, full[None, :, :, None].repeat(4, -1), axis=0)[0]
    chosen[0, 1:] = img[0, :-1]                          # first row: L
    chosen[1:, 0] = img[:-1, 0]                          # first column: T
    chosen[0, 0] = (0, 0, 0, 255)
    res = (img.astype(np.int16) - chosen).astype(np.uint8)
    return res, modes


def encode(rgba):
    """uint8 (h, w, 4) -> bytes of a lossless WebP file."""
    h, w, _ = rgba.shape
    img = rgba.copy()
    img[..., 0] = (rgba[..., 0].astype(np.int16) - rgba[..., 1]).astype(np.uint8)   # subtract green from red and blue
    img[..., 2] = (rgba[..., 2].astype(np.int16) - rgba[..., 1]).astype(np.uint8)
    res, modes = predictor_residuals(img)
    bits = Bits()
    bits.put(0x2F, 8)
    bits.put(w - 1, 14)
    bits.put(h - 1, 14)
    bits.put(1 if (rgba[..., 3] != 255).any() else 0, 1)
    bits.put(0, 3)
    bits.put(1, 1)                                      # a transform follows: subtract green (type 2)
    bits.put(2, 2)
    bits.put(1, 1)                                      # the predictor transform (type 0)
    bits.put(0, 2)
    bits.put(BLOCK_BITS - 2, 3)
    mode_px = (0xFF000000 | (modes.astype(np.uint32) << 8)).reshape(-1).astype(np.uint32)
    write_image(bits, mode_px, False)
    bits.put(0, 1)                                      # no more transforms
    argb = (res[..., 3].astype(np.uint32) << 24) | (res[..., 0].astype(np.uint32) << 16) | (res[..., 1].astype(np.uint32) << 8) | res[..., 2].astype(np.uint32)
    write_image(bits, argb.reshape(-1), True)
    body = bits.bytes()
    chunk = b"VP8L" + struct.pack("<I", len(body)) + body + (b"\0" if len(body) % 2 else b"")
    return b"RIFF" + struct.pack("<I", 4 + len(chunk)) + b"WEBP" + chunk


def png_to_webp(png_path, webp_path):
    """Write the lossless WebP twin of a PNG; -> its size in bytes."""
    data = encode(pngio.read(png_path))
    tmp = f"{webp_path}.{os.getpid()}.tmp"
    with open(tmp, "wb") as fh:
        fh.write(data)
    os.replace(tmp, webp_path)
    return len(data)
