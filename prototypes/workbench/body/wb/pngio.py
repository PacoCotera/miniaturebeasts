"""Chunk 11: 8-bit PNG read and write with numpy and zlib only (no Blender, no imaging library). Reads gray, RGB and RGBA, not interlaced; writes RGBA, RGB or gray with the Sub filter, no text chunks (the same pixels are the same bytes)."""
import struct
import zlib

import numpy as np


def read(path):
    """-> uint8 array (h, w, 4): RGBA, whatever the file's colour type (gray and RGB get alpha 255)."""
    with open(path, "rb") as fh:
        d = fh.read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path}: not a PNG")
    pos, idat, hdr, plte = 8, [], None, None
    while pos < len(d):
        n, t = struct.unpack(">I4s", d[pos:pos + 8])
        body = d[pos + 8:pos + 8 + n]
        if t == b"IHDR":
            hdr = struct.unpack(">IIBBBBB", body)
        elif t == b"IDAT":
            idat.append(body)
        elif t == b"PLTE":
            plte = np.frombuffer(body, np.uint8).reshape(-1, 3)
        pos += 12 + n
    w, h, depth, ctype, _, _, inter = hdr
    if depth != 8 or inter != 0 or ctype not in (0, 2, 3, 4, 6):
        raise ValueError(f"{path}: only 8-bit, not interlaced PNGs are read")
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    raw = np.frombuffer(zlib.decompress(b"".join(idat)), np.uint8).reshape(h, 1 + w * ch)
    out = np.zeros((h, w * ch), np.int32)
    prev = np.zeros(w * ch, np.int32)
    for y in range(h):
        f, line = raw[y, 0], raw[y, 1:].astype(np.int32)
        if f == 0:
            cur = line
        elif f == 1:
            cur = line.copy()
            for i in range(ch, w * ch):
                cur[i] = (cur[i] + cur[i - ch]) & 255
        elif f == 2:
            cur = (line + prev) & 255
        elif f == 3:
            cur = line.copy()
            for i in range(w * ch):
                left = cur[i - ch] if i >= ch else 0
                cur[i] = (cur[i] + ((left + prev[i]) >> 1)) & 255
        else:
            cur = line.copy()
            for i in range(w * ch):
                a = cur[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                cur[i] = (cur[i] + pr) & 255
        out[y] = cur
        prev = cur
    a = out.reshape(h, w, ch).astype(np.uint8)
    if ctype == 6:
        return a
    if ctype == 2:
        return np.concatenate([a, np.full((h, w, 1), 255, np.uint8)], 2)
    if ctype == 0:
        return np.concatenate([a, a, a, np.full((h, w, 1), 255, np.uint8)], 2)
    if ctype == 4:
        return np.concatenate([a[..., :1], a[..., :1], a[..., :1], a[..., 1:]], 2)
    return np.concatenate([plte[a[..., 0]], np.full((h, w, 1), 255, np.uint8)], 2)


def write(path, arr):
    a = np.asarray(arr, np.uint8)
    h, w = a.shape[:2]
    a3 = a.reshape(h, w, -1)
    ch = a3.shape[2]
    ct = {1: 0, 3: 2, 4: 6}[ch]
    sub = a3.copy()
    sub[:, 1:] = (a3[:, 1:].astype(np.int16) - a3[:, :-1].astype(np.int16)).astype(np.uint8)
    rows = np.concatenate([np.ones((h, 1), np.uint8), sub.reshape(h, w * ch)], 1)

    def chunk(t, body):
        c = struct.pack(">I", len(body)) + t + body
        return c + struct.pack(">I", zlib.crc32(t + body) & 0xFFFFFFFF)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ct, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows.tobytes(), 6)) + chunk(b"IEND", b""))
