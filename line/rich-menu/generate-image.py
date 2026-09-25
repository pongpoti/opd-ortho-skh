#!/usr/bin/env python3
"""Generate the OPD Ortho SKH LINE rich-menu image (2500x843 JPEG).

Compact (half-height) banner sized for mobile: large bone mark, bold brand,
wide high-contrast CTA. JPEG stays under LINE’s 1 MB limit.
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

# Compact rich menu — better for a single mobile CTA than full 1686 height.
W, H = 2500, 843
BRAND = (22, 114, 105)
ACCENT = (75, 184, 174)
MUTED = (55, 90, 96)


def build_atmosphere_svg() -> str:
    """Background + bone + wide CTA pill (labels drawn in Pillow)."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eafbfa"/>
      <stop offset="50%" stop-color="#eef5fb"/>
      <stop offset="100%" stop-color="#f2f9fc"/>
    </linearGradient>
    <radialGradient id="blobTeal" cx="15%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#a9e8e2" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#a9e8e2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobBlue" cx="88%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#bcd9f5" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#bcd9f5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobMint" cx="50%" cy="100%" r="45%">
      <stop offset="0%" stop-color="#cdeee6" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#cdeee6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="boneFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#167269"/>
    </linearGradient>
    <linearGradient id="ctaFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#135c55"/>
    </linearGradient>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#wash)"/>
  <rect width="{W}" height="{H}" fill="url(#blobTeal)"/>
  <rect width="{W}" height="{H}" fill="url(#blobBlue)"/>
  <rect width="{W}" height="{H}" fill="url(#blobMint)"/>

  <!-- Large bone mark -->
  <g transform="translate(1250, 175) scale(1.15)">
    <rect x="-210" y="-28" width="420" height="56" rx="22" fill="url(#boneFill)"/>
    <circle cx="-230" cy="-42" r="48" fill="url(#boneFill)"/>
    <circle cx="-230" cy="42" r="48" fill="url(#boneFill)"/>
    <rect x="-278" y="-42" width="70" height="84" rx="20" fill="url(#boneFill)"/>
    <circle cx="230" cy="-42" r="48" fill="url(#boneFill)"/>
    <circle cx="230" cy="42" r="48" fill="url(#boneFill)"/>
    <rect x="208" y="-42" width="70" height="84" rx="20" fill="url(#boneFill)"/>
    <rect x="-160" y="-14" width="320" height="14" rx="7" fill="#4bb8ae" opacity="0.35"/>
  </g>

  <!-- Wide CTA — ~72% of canvas width for thumb targets on mobile -->
  <rect x="350" y="580" width="1800" height="180" rx="90" fill="url(#ctaFill)"/>
</svg>
"""


def centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    cy: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    *,
    stroke_width: int = 0,
    stroke_fill: tuple[int, int, int] | None = None,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (W - tw) // 2 - bbox[0]
    y = cy - th // 2 - bbox[1]
    kwargs: dict = {"font": font, "fill": fill}
    if stroke_width and stroke_fill is not None:
        kwargs["stroke_width"] = stroke_width
        kwargs["stroke_fill"] = stroke_fill
    draw.text((x, y), text, **kwargs)


def main() -> None:
    png_bytes = cairosvg.svg2png(
        bytestring=build_atmosphere_svg().encode("utf-8"),
        output_width=W,
        output_height=H,
    )
    im = Image.open(BytesIO(png_bytes)).convert("RGB")
    draw = ImageDraw.Draw(im)

    title = ImageFont.truetype(str(FONT_BOLD), 96)
    hospital = ImageFont.truetype(str(FONT_BOLD), 52)
    cta = ImageFont.truetype(str(FONT_BOLD), 72)

    # Dense vertical stack that stays readable when LINE scales the menu down.
    centered_text(draw, "OPD Orthopedic", 355, title, BRAND)
    centered_text(draw, "Samutsakhon Hospital", 445, hospital, BRAND)
    draw.rounded_rectangle((1180, 490, 1320, 498), radius=4, fill=ACCENT)

    # White label with dark teal stroke so it survives mobile downscaling/JPEG.
    centered_text(
        draw,
        "เปิดแอป",
        670,
        cta,
        (255, 255, 255),
        stroke_width=3,
        stroke_fill=(19, 92, 85),
    )

    im.save(OUT, format="JPEG", quality=92, optimize=True, progressive=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({im.size[0]}x{im.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
