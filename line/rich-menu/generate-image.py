#!/usr/bin/env python3
"""Generate the OPD Ortho SKH LINE rich-menu image (2500x1686 JPEG).

Full-bleed branded CTA matching the app glass/teal theme and AnimatedLogo.
JPEG stays under LINE's 1 MB limit (soft gradients blow past that as PNG).
Thai text is drawn with Pillow + Sarabun (Cairo SVG fonts are unreliable for Thai).
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "richmenu.jpg"
FONT_BOLD = ROOT / "public" / "fonts" / "Sarabun-Bold.ttf"
FONT_REG = ROOT / "public" / "fonts" / "Sarabun-Regular.ttf"

W, H = 2500, 1686
BRAND = (22, 114, 105)  # brand.600 / logo fill
MUTED = (74, 107, 114)


def build_atmosphere_svg() -> str:
    """Background + AnimatedLogo heart + CTA pill shape (labels drawn in Pillow)."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <style>
      .heart-dark {{
        fill: none;
        stroke: #1f8f86;
        stroke-width: 5.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }}
      .heart-light {{
        fill: none;
        stroke: #4bb8ae;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }}
    </style>
    <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eafbfa"/>
      <stop offset="48%" stop-color="#eef5fb"/>
      <stop offset="100%" stop-color="#f2f9fc"/>
    </linearGradient>
    <radialGradient id="blobTeal" cx="18%" cy="12%" r="48%">
      <stop offset="0%" stop-color="#a9e8e2" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#a9e8e2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobBlue" cx="86%" cy="16%" r="52%">
      <stop offset="0%" stop-color="#bcd9f5" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#bcd9f5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobMint" cx="50%" cy="92%" r="50%">
      <stop offset="0%" stop-color="#cdeee6" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#cdeee6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ctaFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#167269"/>
    </linearGradient>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#wash)"/>
  <rect width="{W}" height="{H}" fill="url(#blobTeal)"/>
  <rect width="{W}" height="{H}" fill="url(#blobBlue)"/>
  <rect width="{W}" height="{H}" fill="url(#blobMint)"/>
  <rect x="0" y="0" width="{W}" height="260" fill="#ffffff" opacity="0.20"/>

  <!-- AnimatedLogo heart strokes (same paths as src/components/animated-logo.tsx) -->
  <g transform="translate(1095, 210) scale(2.85)">
    <path class="heart-dark"
      d="M 50 20 C 15 -15 -15 35 15 70 C 35 90 50 110 50 110 C 50 110 80 80 90 100 C 100 120 50 135 15 110"/>
    <path class="heart-dark"
      d="M 50 20 C 85 -15 110 25 85 55 C 65 80 40 70 45 100"/>
    <path class="heart-light"
      d="M 48 22 C 17 -11 -10 36 17 68 C 36 88 48 106 48 106"/>
    <path class="heart-light"
      d="M 48 22 C 81 -11 103 26 80 54 C 61 78 38 69 43 98"/>
  </g>

  <rect x="860" y="1185" width="780" height="140" rx="70" fill="url(#ctaFill)"/>
</svg>
"""


def centered_text(
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


def main() -> None:
    png_bytes = cairosvg.svg2png(
        bytestring=build_atmosphere_svg().encode("utf-8"),
        output_width=W,
        output_height=H,
    )
    im = Image.open(BytesIO(png_bytes)).convert("RGB")
    draw = ImageDraw.Draw(im)

    title = ImageFont.truetype(str(FONT_BOLD), 124)
    hospital = ImageFont.truetype(str(FONT_BOLD), 66)
    support = ImageFont.truetype(str(FONT_REG), 44)
    cta = ImageFont.truetype(str(FONT_BOLD), 56)
    footer = ImageFont.truetype(str(FONT_REG), 34)

    # Brand-first hierarchy (matches home screen AnimatedLogo copy)
    centered_text(draw, "OPD Orthopedic", 780, title, BRAND)
    centered_text(draw, "Samutsakhon Hospital", 895, hospital, BRAND)

    # Soft rule under hospital name
    rule_y = 960
    draw.rounded_rectangle((1120, rule_y, 1380, rule_y + 6), radius=3, fill=(75, 184, 174, ))

    centered_text(draw, "เครื่องมืองาน OPD ออร์โธปิดิกส์", 1040, support, MUTED)
    centered_text(draw, "เปิดแอป", 1255, cta, (255, 255, 255))
    centered_text(draw, "OPD Ortho · SKH", 1520, footer, MUTED)

    im.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({im.size[0]}x{im.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
