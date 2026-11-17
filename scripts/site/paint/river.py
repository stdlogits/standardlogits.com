"""River — the social card's painting: the logit curve as a river at dusk, seen from above.

The ground is the mark's tile at card size and the river is its figure
(Ledger's DESIGN.md, "The marks and the cards"): the curve logit(p), p from 1%
to 99%, as the mark draws it, running on off the card at both ends, pale with
the last of the sky. What Qwen3-8B-Base expected after "Standard" floats down
it as lanterns in rank order: the river's length, over the mark's span, is the
whole vocabulary on a log scale, rank 1 where it comes in and the last token
where it leaves, and each lantern is as bright as its token was likely (on a
log scale too). The lanterns are the tokens src/lib/standard.json keeps: the
likeliest, and the ones passed on the way down to ·Log, which is marked.

    python river.py <src/lib/standard.json> [scale] [out.png]

It also writes <out>.json: where each lantern floats, for the type that
scripts/site/card.html sets beside two of them (scripts/site/render.mjs runs
both). Needs numpy, scipy and Pillow, and Ledger's paint (node_modules, or
LEDGER_PAINT).

Written by Claude, 2026-11-16.
"""
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get("LEDGER_PAINT") or os.path.join(HERE, "../../../node_modules/@stdlogits/ledger/src/paint"))
from brush import F, Canvas, arc, mix, offset, rect, resample, spline, _normals, FILBERT, FLAT, LINER, SOFT  # noqa: E402
from dusk import W, H, PAPER, LIGHT, RAMP, GLOW, ramp, vignette  # noqa: E402

D = json.load(open(sys.argv[1], encoding="utf-8"))
SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
OUT = sys.argv[3] if len(sys.argv) > 3 else "river.png"
t0 = time.time()

X0, X1, YC, HH = 84.0, 1128.0, 352.0, 236.0       # p across; the logit up, ln 99 over HH
LN99 = np.log(99.0)


def curve(p):
    p = np.asarray(p, float)
    return np.stack([X0 + (X1 - X0) * p, YC - HH * np.log(p / (1 - p)) / LN99], -1)


# the mark's span, in which the lanterns ride; and the river entire, off the card at both ends
MARK = resample(curve(np.linspace(0.01, 0.99, 600)), 2.0)
lo = curve(np.geomspace(0.0004, 0.01, 60))
hi = curve(1 - np.geomspace(0.01, 0.0004, 60))
RIVER = resample(np.vstack([lo[:-1], curve(np.linspace(0.01, 0.99, 600)), hi[1:]]), 3.0)
CUM = np.concatenate([[0], np.cumsum(np.hypot(*(MARK[1:] - MARK[:-1]).T))])


def at_rank(rank):
    """Where a token of this rank floats: the vocabulary along the mark's span, on a log scale."""
    s = np.log(rank) / np.log(D["vocab"]) * CUM[-1]
    return np.array([np.interp(s, CUM, MARK[:, 0]), np.interp(s, CUM, MARK[:, 1])])


NORM = _normals(RIVER)
_i = np.arange(len(RIVER))
HALF = 8.5 + 2.6 * np.sin(_i * 0.021 + 1.0) + 1.6 * np.sin(_i * 0.057 + 0.4)       # the river's half-width as it goes


def nearest(x, y):
    d = np.hypot(RIVER[:, 0] - x, RIVER[:, 1] - y)
    i = int(np.argmin(d))
    j = min(max(i, 1), len(RIVER) - 2)
    t = RIVER[j + 1] - RIVER[j - 1]
    t = t / np.hypot(*t)
    side = np.sign(t[0] * (y - RIVER[i, 1]) - t[1] * (x - RIVER[i, 0]))
    return float(d[i]), t, float(side), i


def depth(x):
    return float(np.clip((x - X0) / (X1 - X0), 0, 1))


FIELD = np.random.default_rng(99).uniform(-1, 1, (2, 64, 8))


def land(x, y):
    """Fields in strips off the river, each its own shade; lighter by the water."""
    d, _, side, i = nearest(x, y)
    tone = FIELD[0 if side < 0 else 1, (i // 30) % 64, int(d // 92) % 8]
    a = 0.25 + 0.07 * tone + 0.16 * np.exp(-d / 70.0) + 0.04 * (1 - y / H)
    return mix(PAPER, ramp(RAMP, depth(x)), float(np.clip(a, 0, 1)))


cv = Canvas(W, H, SCALE, ground=tuple(land(600, 100)), seed=1437)
rng = cv.rng


def paint_land():
    # an underpainting, then furrows that follow the river, as fields follow their water
    whole = rect(W / 2, H / 2, W + 80, H + 60)
    cv.fill(whole, land, FILBERT, width=40, angle=-14, length=(120, 300), overlap=0.45, streak=0.02, jitter=0.012, frisket=False, dry=0)
    seeds = [(x + rng.uniform(-5, 5), y + rng.uniform(-4, 4)) for y in np.arange(-10, H + 20, 10.5) for x in np.arange(-30, W + 30, 52)]
    rng.shuffle(seeds)
    for x, y in seeds:
        d, t, _, _ = nearest(x, y)
        if d < 10:
            continue
        pts = [np.array([x, y])]
        ln = rng.uniform(56, 120)
        for _ in range(4):                         # walk along the bank
            _, t2, _, _ = nearest(*pts[-1])
            pts.append(pts[-1] + t2 * ln / 4)
        cv.stroke(spline(pts, 6), 12.5 * rng.uniform(0.85, 1.15), land(*pts[2]), FLAT, streak=0.05, chroma=0.012,
                  jitter=0.014, dry=0.35, grain=0.9, taper=(0.1, 0.2), tip=0.7)
    # hedges between the fields, running off from the water
    for side in (-1, 1):
        i = int(rng.uniform(0, 30))
        while i < len(RIVER) - 2:
            p0 = RIVER[i] + side * NORM[i] * (HALF[i] + 6)
            ln = rng.uniform(90, 330)
            bend = rng.normal(0, 0.12)
            pts = [p0 + side * NORM[i] * ln * f + np.array([NORM[i][1], -NORM[i][0]]) * bend * ln * f * f for f in np.linspace(0, 1, 6)]
            c = mix(PAPER, ramp(RAMP, depth(p0[0])), 0.13)
            cv.stroke(spline(pts, 6), 2.2, c, FILBERT, taper=(0.05, 0.5), tip=0.2, dry=0.4, grain=0.8, opacity=0.8)
            i += int(rng.uniform(34, 70))


def trees():
    """Willows along the banks: short soft touches that run with the water, thicker in groves."""
    for i in range(1, len(RIVER) - 1, 2):
        grove = 0.5 + 0.5 * np.sin(i * 0.031 + 2.0) * np.sin(i * 0.011)
        t = RIVER[i + 1] - RIVER[i - 1]
        t = t / np.hypot(*t)
        for side in (-1, 1):
            if rng.random() > 0.12 + 0.55 * grove:
                continue
            p = RIVER[i] + side * NORM[i] * (HALF[i] + 4.0 + abs(rng.normal(0, 3.2)))
            ln, w = rng.uniform(4, 12), rng.uniform(3.0, 6.5)
            d = depth(p[0])
            cv.stroke([p + (1.2, 1.6) - t * ln / 2, p + (1.2, 1.6) + t * ln / 2], w, mix(PAPER, ramp(RAMP, d), 0.09), FILBERT, opacity=0.45,
                      soft=0.6, thick=0, taper=(0.3, 0.3), tip=0.4, dry=0)
            cv.stroke([p - t * ln / 2, p + t * ln / 2], w, mix(PAPER, ramp(RAMP, d), rng.uniform(0.17, 0.25)), FILBERT, soft=0.4,
                      taper=(0.3, 0.3), tip=0.4, dry=0.2, grain=0.8, streak=0.05)
            q = p + (-w * 0.22, -w * 0.25)
            cv.stroke([q - t * ln * 0.3, q + t * ln * 0.3], w * 0.42, mix(PAPER, ramp(RAMP, d), 0.36), FILBERT, soft=0.6, opacity=0.7,
                      taper=(0.3, 0.3), tip=0.3, dry=0.3)


def paint_river():
    def water(x, y):
        t = depth(x)
        return mix(ramp(RAMP, t), ramp(GLOW, t), 0.70) * 0.92

    with cv.layer(ramp(GLOW, 0.5), "screen", 0.13, blur=16):
        cv.stroke(RIVER, 50, LIGHT, SOFT, opacity=1, taper=(0, 0), tip=1)
    bed = np.vstack([RIVER + NORM * HALF[:, None], (RIVER - NORM * HALF[:, None])[::-1]])
    cv.lit_line(RIVER, 27, lambda x, y: mix(PAPER, ramp(RAMP, depth(x)), 0.12), FILBERT, chunk=80, taper=(0, 0), tip=1, dry=0,
                opacity=0.55)                                                            # the banks' shade
    with cv.frisket(bed):
        cv.lit_line(RIVER, 30, water, FILBERT, chunk=64, taper=(0, 0), tip=1, dry=0, streak=0.045, chroma=0.012, jitter=0.02)
        for off, w, a in ((-4.5, 2.6, 0.42), (3.0, 2.0, 0.34), (-0.5, 1.4, 0.3), (6.0, 1.6, 0.3)):       # the current, and the sky in it
            cv.lit_line(offset(RIVER, off), w, lambda x, y: mix(water(x, y), LIGHT, 0.55), LINER, chunk=52, opacity=a,
                        taper=(0.25, 0.25), tip=0.2)


def lanterns():
    toks = D["top"] + D["passed"]
    pmax, pmin = toks[0]["p"], D["name"]["pieces"][0]["p"]
    out = []
    for c in toks:
        b = (np.log(c["p"]) - np.log(pmin)) / (np.log(pmax) - np.log(pmin))
        p = at_rank(c["rank"])
        tint = ramp(GLOW, depth(p[0]))
        cv.glow(p, 10 + 26 * b ** 1.5, mix(tint, LIGHT, 0.3), 0.28 + 0.50 * b)
        cv.glow(p, 3.5 + 7 * b, LIGHT, 0.85)
        cv.dab(p, 1.6 + 2.6 * b, LIGHT, soft=0.35, thick=0.5)
        out.append(dict(token=c["token"], p=c["p"], rank=c["rank"], xy=[float(p[0]), float(p[1])]))
    # ·Log: a small light, marked as the name marks it
    log = D["name"]["pieces"][0]
    p = at_rank(log["rank"])
    tint = ramp(GLOW, depth(p[0]))
    with cv.layer(mix(tint, LIGHT, 0.3), "screen", 0.32, blur=1.2):
        cv.fill(arc(p[0], p[1], 31, 0, 360, n=48), LIGHT, FLAT, width=8, length=(30, 60), overlap=0.4)
    cv.glow(p, 12, tint, 0.55)
    cv.glow(p, 4.5, LIGHT, 0.9)
    cv.dab(p, 2.3, LIGHT, soft=0.35, thick=0.5)
    out.append(dict(token=log["token"], p=log["p"], rank=log["rank"], xy=[float(p[0]), float(p[1])], name=True))
    return out


paint_land()
paint_river()
trees()
vignette(cv, 0.32)
marks = lanterns()
cv.save_card(OUT, relief=0.5, tooth=0.025)
json.dump({"lanterns": marks}, open(OUT + ".json", "w"))
print(f"{OUT}: {cv.count} strokes, {time.time() - t0:.0f}s")
