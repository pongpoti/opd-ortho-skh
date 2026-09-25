#!/usr/bin/env python3
"""Generate the OPD Ortho SKH LINE rich-menu image (2500x1686 JPEG).

Full-bleed branded CTA: teal glass atmosphere, bone mark, brand wordmark,
single “เปิดแอป” button. JPEG stays under LINE’s 1 MB limit.
Thai text is drawn with Pillow + Sarabun.
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
BRAND = (22, 114, 105)  # brand.600
ACCENT = (75, 184, 174)  # brand.400
MUTED = (74, 107, 114)


def build_atmosphere_svg() -> str:
    """Background + bone mark + CTA pill (labels drawn in Pillow)."""
    # Classic long-bone silhouette (orthopedic), centered at ~1250,380
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
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
    <linearGradient id="boneFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#167269"/>
    </linearGradient>
    <linearGradient id="ctaFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#167269"/>
    </linearGradient>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#wash)"/>
  <rect width="{W}" height="{H}" fill="url(#blobTeal)"/>
  <rect width="{W}" height="{H}" fill="url(#blobBlue)"/>
  <rect width="{W}" height="{H}" fill="url(#blobMint)"/>
  <rect x="0" y="0" width="{W}" height="240" fill="#ffffff" opacity="0.20"/>

  <!-- Orthopedic long bone (horizontal), brand teal -->
  <g transform="translate(1250, 320)">
    <!-- shaft -->
    <rect x="-210" y="-28" width="420" height="56" rx="22" fill="url(#boneFill)"/>
    <!-- left epiphysis (two lobes) -->
    <circle cx="-230" cy="-42" r="48" fill="url(#boneFill)"/>
    <circle cx="-230" cy="42" r="48" fill="url(#boneFill)"/>
    <rect x="-278" y="-42" width="70" height="84" rx="20" fill="url(#boneFill)"/>
    <!-- right epiphysis -->
    <circle cx="230" cy="-42" r="48" fill="url(#boneFill)"/>
    <circle cx="230" cy="42" r="48" fill="url(#boneFill)"/>
    <rect x="208" y="-42" width="70" height="84" rx="20" fill="url(#boneFill)"/>
    <!-- soft highlight along shaft -->
    <rect x="-160" y="-14" width="320" height="14" rx="7" fill="#4bb8ae" opacity="0.35"/>
  </g>

  <!-- CTA pill -->
  <rect x="860" y="980" width="780" height="140" rx="70" fill="url(#ctaFill)"/>
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
    cta = ImageFont.truetype(str(FONT_BOLD), 56)
    footer = ImageFont.truetype(str(FONT_REG), 34)

    # Compact centered stack: bone → title → hospital → rule → CTA → footer
    centered_text(draw, "OPD Orthopedic", 560, title, BRAND)
    centered_text(draw, "Samutsakhon Hospital", 670, hospital, BRAND)
    draw.rounded_rectangle((1160, 735, 1340, 741), radius=3, fill=ACCENT)
    centered_text(draw, "เปิดแอป", 1050, cta, (255, 255, 255))
    centered_text(draw, "OPD Ortho · SKH", 1320, footer, MUTED)

    im.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({im.size[0]}x{im.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
