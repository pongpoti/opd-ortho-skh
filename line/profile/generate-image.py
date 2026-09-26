#!/usr/bin/env python3
"""Compose the OPD Ortho SKH LINE Official Account profile picture.

LINE OA profile photo spec (LINE for Business media guide):
  - Size: 640 × 640 px (recommended)
  - Format: JPG / JPEG / PNG
  - Max file size: 3 MB
  - Display: cropped to a circle in chat — keep mark + type in the center safe zone

Outputs:
  - profile.png / profile.jpg  — square upload assets
  - profile-circle-preview.png — circular crop preview (not for upload)
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

DIR = Path(__file__).resolve().parent
ROOT = DIR.parents[1]
FONT_CANDIDATES = [
    ROOT / "src/modules/duty-schedule/print-poster/fonts/BaiJamjuree-Bold.ttf",
    ROOT / "public/fonts/Sarabun-Bold.ttf",
]

OUT_PNG = DIR / "profile.png"
OUT_JPG = DIR / "profile.jpg"
OUT_PREVIEW = DIR / "profile-circle-preview.png"

W = H = 640
BRAND = (22, 114, 105)  # #167269
ACCENT = (75, 184, 174)  # #4BB8AE
SAFE_DIAMETER = int(W * 0.82)  # keep content inside ~82% for circular crop


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def gradient_bg() -> Image.Image:
    """Soft mint center → cool sky edge (radial)."""
    im = Image.new("RGB", (W, H))
    px = im.load()
    cx = cy = (W - 1) / 2
    for y in range(H):
        dy = (y - cy) / cy
        dy2 = dy * dy
        for x in range(W):
            dx = (x - cx) / cx
            t = min(1.0, (dx * dx + dy2) ** 0.5)
            # ease
            t = t * t * (3 - 2 * t)
            r = int(238 + (176 - 238) * t)
            g = int(251 + (214 - 251) * t)
            b = int(250 + (228 - 250) * t)
            px[x, y] = (r, g, b)
    return im


def heart_overlay() -> Image.Image:
    """Same heart motif as the rich menu (outline + solid inner)."""
    # Heart sits in upper half of the safe circle.
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <linearGradient id="heartFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#167269"/>
    </linearGradient>
  </defs>
  <g transform="translate(320, 210) scale(2.55)">
    <path d="M0 42
      C0 42 -48 8 -48 -18
      C-48 -38 -32 -50 -16 -50
      C-4 -50 0 -40 0 -40
      C0 -40 4 -50 16 -50
      C32 -50 48 -38 48 -18
      C48 8 0 42 0 42 Z"
      fill="none" stroke="url(#heartFill)" stroke-width="9"
      stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M0 28
      C0 28 -32 4 -32 -14
      C-32 -28 -22 -36 -12 -36
      C-4 -36 0 -28 0 -28
      C0 -28 4 -36 12 -36
      C22 -36 32 -28 32 -14
      C32 4 0 28 0 28 Z"
      fill="url(#heartFill)"/>
  </g>
</svg>
"""
    return Image.open(
        BytesIO(cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=W, output_height=H))
    ).convert("RGBA")


def center_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    cy: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (W - tw) // 2 - bbox[0]
    y = cy - th // 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=fill)


def circle_preview(rgb: Image.Image) -> Image.Image:
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, W - 1, H - 1), fill=255)
    circ = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    circ.paste(rgb, mask=mask)

    checker = Image.new("RGB", (W, H), (245, 245, 245))
    cd = ImageDraw.Draw(checker)
    for y in range(0, H, 24):
        for x in range(0, W, 24):
            if ((x // 24) + (y // 24)) % 2 == 0:
                cd.rectangle((x, y, x + 23, y + 23), fill=(230, 230, 230))
    return Image.alpha_composite(checker.convert("RGBA"), circ).convert("RGB")


def main() -> None:
    base = gradient_bg().convert("RGBA")

    # Subtle guide ring at safe-zone edge (soft, not a hard badge border)
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pad = (W - SAFE_DIAMETER) // 2
    ImageDraw.Draw(ring).ellipse(
        (pad, pad, pad + SAFE_DIAMETER - 1, pad + SAFE_DIAMETER - 1),
        outline=(31, 143, 134, 48),
        width=3,
    )
    base = Image.alpha_composite(base, ring)
    base = Image.alpha_composite(base, heart_overlay())

    draw = ImageDraw.Draw(base)
    center_text(draw, "OPD", 360, load_font(92), BRAND)
    center_text(draw, "ORTHO SKH", 430, load_font(42), BRAND)
    draw.rounded_rectangle((270, 468, 370, 478), radius=5, fill=ACCENT)

    rgb = base.convert("RGB")
    rgb.save(OUT_PNG, format="PNG", optimize=True)
    rgb.save(OUT_JPG, format="JPEG", quality=92, optimize=True, progressive=True)
    circle_preview(rgb).save(OUT_PREVIEW, format="PNG", optimize=True)

    for path in (OUT_PNG, OUT_JPG, OUT_PREVIEW):
        kb = path.stat().st_size / 1024
        print(f"Wrote {path.relative_to(ROOT)} ({W}x{H}, {kb:.1f} KB)")
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"} and path != OUT_PREVIEW:
            if path.stat().st_size > 3 * 1024 * 1024:
                raise SystemExit(f"{path.name} exceeds LINE 3 MB limit")


if __name__ == "__main__":
    main()
