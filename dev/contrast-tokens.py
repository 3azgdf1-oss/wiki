#!/usr/bin/env python3
"""Check the NightSky colour tokens for WCAG contrast.

Reads NightSky/resources/design.css (the palette) and tokens.css (the Codex token mapping), resolves
var() references, and checks every text token against the surfaces it is drawn on.
Exits with status 1 if a required pair is below its minimum ratio, so it can run in CI.

    python3 dev/contrast-tokens.py            # table of all pairs
    python3 dev/contrast-tokens.py --failures # only the failing ones
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "NightSky" / "resources"

def load_vars():
    """Collect every custom property declared in a :root block of design.css and tokens.css."""
    props = {}
    for name in ("design.css", "tokens.css"):
        css = (ROOT / name).read_text()
        for block in re.finditer(r":root\s*\{(.*?)\n\}", css, re.S):
            for m in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;]+);", block.group(1)):
                props[m.group(1)] = m.group(2).strip()
    return props

PROPS = load_vars()

def resolve(value, depth=0):
    """Resolve var(--x) chains to a concrete colour string."""
    if depth > 12:
        raise ValueError(f"var() loop near {value}")
    m = re.fullmatch(r"var\((--[a-z0-9-]+)(?:,[^)]*)?\)", value.strip())
    if m:
        return resolve(PROPS[m.group(1)], depth + 1)
    return value.strip()

def parse(color):
    color = color.strip()
    if color.startswith("#"):
        h = color[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
    m = re.fullmatch(r"rgba?\(([^)]+)\)", color)
    if m:
        p = [float(x) for x in re.split(r"[\s,/]+", m.group(1).strip()) if x]
        return (p[0], p[1], p[2], p[3] if len(p) > 3 else 1.0)
    raise ValueError(f"cannot parse colour {color!r}")

def over(top, bottom):
    a = top[3]
    return tuple(top[i] * a + bottom[i] * (1 - a) for i in range(3)) + (1.0,)

def luminance(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])

def ratio(a, b):
    l1, l2 = luminance(a), luminance(b)
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

def color_of(token, base=None):
    c = parse(resolve(f"var({token})"))
    return over(c, base) if base and c[3] < 1 else c

PAGE = "--background-color-base"
SURF = ["--background-color-base", "--background-color-neutral", "--background-color-neutral-subtle",
        "--background-color-interactive", "--background-color-interactive-subtle",
        "--background-color-interactive--hover", "--background-color-interactive-subtle--hover"]

# (foreground token, [surface tokens it is drawn on], minimum ratio)
PAIRS = [
    ("--color-base", SURF + ["--background-color-progressive-subtle", "--background-color-warning-subtle",
                              "--background-color-success-subtle", "--background-color-error-subtle",
                              "--background-color-notice-subtle", "--background-color-disabled-subtle"], 4.5),
    ("--color-emphasized", SURF, 4.5),
    ("--color-neutral", SURF, 4.5),
    ("--color-subtle", SURF, 4.5),
    ("--color-placeholder", ["--background-color-base", "--background-color-neutral", "--background-color-interactive-subtle"], 4.5),
    ("--color-disabled", ["--background-color-base", "--background-color-neutral", "--background-color-disabled-subtle", "--background-color-disabled"], 4.0),
    ("--color-disabled-emphasized", ["--background-color-disabled-subtle", "--background-color-disabled"], 4.5),
    ("--color-progressive", SURF + ["--background-color-progressive-subtle"], 4.5),
    ("--color-progressive--hover", SURF + ["--background-color-progressive-subtle"], 4.5),
    ("--color-progressive--active", SURF, 4.5),
    ("--color-visited", ["--background-color-base", "--background-color-neutral", "--background-color-neutral-subtle"], 4.5),
    ("--color-destructive", ["--background-color-base", "--background-color-neutral", "--background-color-destructive-subtle"], 4.5),
    ("--color-destructive--visited", ["--background-color-base", "--background-color-neutral"], 4.5),
    ("--color-error", ["--background-color-base", "--background-color-error-subtle"], 4.5),
    ("--color-warning", ["--background-color-base", "--background-color-warning-subtle"], 4.5),
    ("--color-success", ["--background-color-base", "--background-color-success-subtle"], 4.5),
    ("--color-notice", ["--background-color-base", "--background-color-notice-subtle"], 4.5),
    ("--color-content-added", ["--background-color-base", "--background-color-neutral"], 4.5),
    ("--color-content-removed", ["--background-color-base", "--background-color-neutral"], 4.5),
    ("--color-inverted", ["--background-color-inverted"], 4.5),
    ("--color-link", SURF, 4.5),
    ("--color-link-red", SURF, 4.5),
    # white text on filled surfaces (--color-inverted-fixed is #fff in every mode)
    ("--color-inverted-fixed", ["--background-color-progressive", "--background-color-progressive--hover",
                                 "--background-color-destructive", "--background-color-destructive--hover",
                                 "--background-color-error", "--background-color-error--hover"], 4.5),
    # UI component outlines need 3:1 against the page (WCAG 1.4.11)
    ("--border-color-interactive", ["--background-color-base", "--background-color-neutral"], 3.0),
    ("--border-color-progressive", ["--background-color-base"], 3.0),
]

def main():
    failures_only = "--failures" in sys.argv
    fixed = {"--color-inverted-fixed": "#ffffff"}
    bad = 0
    for fg, surfaces, need in PAIRS:
        fgc = parse(fixed[fg]) if fg in fixed else color_of(fg)
        for s in surfaces:
            bg = color_of(s, color_of(PAGE))
            r = ratio(over(fgc, bg) if fgc[3] < 1 else fgc, bg)
            ok = r >= need
            bad += not ok
            if ok and failures_only:
                continue
            print(f"{'ok  ' if ok else 'FAIL'} {r:5.2f}:1 (need {need})  {fg}  on  {s}")
    print(f"\n{bad} failing pair(s)")
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main())
