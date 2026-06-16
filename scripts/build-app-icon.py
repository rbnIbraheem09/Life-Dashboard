#!/usr/bin/env python3
"""
Build Life-Dashboard's app icon set from the hand-authored prototype.

Source of truth: prototype/icon/icon.svg — "The Life Grid", a 5x5 activity
heatmap on a macOS squircle with a glowing bottom-right "today" peak cell.

This script produces two derived masters, then leaves rasterisation to
`tauri icon` (see the run steps at the bottom):

  • src-tauri/icons/icon.svg — the DOCK master. Identical art, but scaled into
    the macOS Big Sur safe area: an 824px squircle centred in the 1024 canvas
    (100px transparent margins) so the dock icon matches the size of native
    Mac apps instead of rendering full-bleed (oversized).

  • public/favicon.svg — the BROWSER favicon. The prototype verbatim
    (full-bleed): browser tabs don't apply a squircle mask, so every pixel of
    the tiny favicon should be art.

Run:
    python3 scripts/build-app-icon.py
    rsvg-convert -w 1024 -h 1024 src-tauri/icons/icon.svg -o /tmp/icon-1024.png
    npx tauri icon /tmp/icon-1024.png
    rm -rf src-tauri/icons/ios src-tauri/icons/android   # desktop-only app
"""

from __future__ import annotations
from pathlib import Path

# macOS Big Sur grid: 824px art square centred in a 1024 canvas.
CANVAS = 1024
SAFE = 824
SCALE = SAFE / CANVAS          # 0.8046875
OFFSET = (CANVAS - SAFE) / 2   # 100


def margined_master(proto: str) -> str:
    """Wrap the prototype body in the Big Sur safe-area transform.

    The <defs> stay at the top level so gradients/filters resolve; everything
    that draws (the clipped group + the outer stroke) is scaled and centred.
    The squircle clipPath is userSpaceOnUse, so it scales with the group and
    keeps hugging the art exactly.
    """
    head, _, rest = proto.partition("</defs>")
    body, _, _ = rest.rpartition("</svg>")
    return (
        f"{head}</defs>\n"
        f'  <g transform="translate({OFFSET:g},{OFFSET:g}) scale({SCALE})">'
        f"{body}"
        f"  </g>\n</svg>\n"
    )


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    proto = (root / "prototype" / "icon" / "icon.svg").read_text(encoding="utf-8")

    dock = root / "src-tauri" / "icons" / "icon.svg"
    favicon = root / "public" / "favicon.svg"
    dock.write_text(margined_master(proto), encoding="utf-8")
    favicon.write_text(proto, encoding="utf-8")
    print(f"wrote {dock.relative_to(root)} (824/1024 safe-area master)")
    print(f"wrote {favicon.relative_to(root)} (full-bleed favicon)")


if __name__ == "__main__":
    main()
