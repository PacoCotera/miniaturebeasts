#!/usr/bin/env python3
"""The oracle for light-grade.mjs mixGrade: two signed paintings mixed in linear light, then the step's gain.

  out = round( srgb( (lin(a) * (1 - w) + lin(b) * w) * gain ) ), alpha from a, per pixel
(the same arithmetic as the art director's light-grade.py, with a second picture). Reads the steps as
JSON on argv[1] [{ "step", "w", "gain": [r, g, b] }, ...] and prints the SHA-256 of the result for the
fixed test pair (A, B: 64 x 16 pixels, channel values by formula, alpha 255). numpy's round is to nearest, ties to even.

Usage: light-mix-oracle.py STEPS.json
"""
import sys, json, hashlib, numpy as np

N = 64 * 16
i = np.arange(N)
A = np.stack([(i * 37 + c * 91) % 256 for c in range(3)], axis=1).astype(float)
B = np.stack([(i * 53 + c * 17 + 100) % 256 for c in range(3)], axis=1).astype(float)

def lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)

def srgb(l):
    l = np.clip(l, 0, 1)
    return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255.0

def mix(w, gain):
    rgb = np.round(srgb((lin(A) * (1 - w) + lin(B) * w) * np.array(gain))).astype(np.uint8)
    out = np.concatenate([rgb, np.full((N, 1), 255, np.uint8)], axis=1)
    return hashlib.sha256(out.tobytes()).hexdigest()

if __name__ == "__main__":
    steps = json.load(open(sys.argv[1]))
    print(json.dumps({"args": steps, "hash": {s["step"]: mix(s["w"], s["gain"]) for s in steps}}, indent=1))
