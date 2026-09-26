#!/usr/bin/env python3
"""Generate the OPD Ortho SKH LINE rich-menu image (2500x1686 JPEG).

Full-height menu for mobile readability: large bone mark, bold type,
wide CTA, soft decorative accents. JPEG under LINE’s 1 MB limit.
Thai text drawn with Pillow + Sarabun.
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

# Full-size rich menu (2× compact height) — room for large iPhone type.
W, H = 2500, 1686
BRAND = (22, 114, 105)
ACCENT = (75, 184, 174)
MUTED = (55, 90, 96)


def build_atmosphere_svg() -> str:
    """Background, decorations, bone, and CTA pill (labels via Pillow)."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eafbfa"/>
      <stop offset="48%" stop-color="#eef5fb"/>
      <stop offset="100%" stop-color="#f2f9fc"/>
    </linearGradient>
    <radialGradient id="blobTeal" cx="16%" cy="12%" r="48%">
      <stop offset="0%" stop-color="#a9e8e2" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#a9e8e2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobBlue" cx="86%" cy="18%" r="52%">
      <stop offset="0%" stop-color="#bcd9f5" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#bcd9f5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobMint" cx="50%" cy="95%" r="50%">
      <stop offset="0%" stop-color="#cdeee6" stop-opacity="0.85"/>
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

  <!-- Soft glass orbs -->
  <circle cx="220" cy="280" r="170" fill="#ffffff" opacity="0.38"/>
  <circle cx="2280" cy="340" r="200" fill="#ffffff" opacity="0.32"/>
  <circle cx="200" cy="1420" r="210" fill="#4bb8ae" opacity="0.12"/>
  <circle cx="2300" cy="1500" r="230" fill="#3574b5" opacity="0.09"/>

  <!-- Concentric dashed rings -->
  <circle cx="1250" cy="843" r="560" fill="none" stroke="#1f8f86" stroke-width="3" opacity="0.11"/>
  <circle cx="1250" cy="843" r="700" fill="none" stroke="#4bb8ae" stroke-width="2.5" opacity="0.14"
    stroke-dasharray="18 22"/>
  <circle cx="1250" cy="843" r="860" fill="none" stroke="#3574b5" stroke-width="2" opacity="0.10"
    stroke-dasharray="8 28"/>

  <!-- Corner measure ticks -->
  <g stroke="#167269" stroke-width="7" stroke-linecap="round" opacity="0.20">
    <path d="M150 150 H280 M150 150 V280"/>
    <path d="M2350 150 H2220 M2350 150 V280"/>
    <path d="M150 1536 H280 M150 1536 V1406"/>
    <path d="M2350 1536 H2220 M2350 1536 V1406"/>
  </g>

  <!-- Faded side bones -->
  <g transform="translate(300, 920) rotate(-30) scale(0.58)" opacity="0.13">
    <rect x="-210" y="-28" width="420" height="56" rx="22" fill="#167269"/>
    <circle cx="-230" cy="-42" r="48" fill="#167269"/>
    <circle cx="-230" cy="42" r="48" fill="#167269"/>
    <rect x="-278" y="-42" width="70" height="84" rx="20" fill="#167269"/>
    <circle cx="230" cy="-42" r="48" fill="#167269"/>
    <circle cx="230" cy="42" r="48" fill="#167269"/>
    <rect x="208" y="-42" width="70" height="84" rx="20" fill="#167269"/>
  </g>
  <g transform="translate(2200, 920) rotate(30) scale(0.58)" opacity="0.13">
    <rect x="-210" y="-28" width="420" height="56" rx="22" fill="#167269"/>
    <circle cx="-230" cy="-42" r="48" fill="#167269"/>
    <circle cx="-230" cy="42" r="48" fill="#167269"/>
    <rect x="-278" y="-42" width="70" height="84" rx="20" fill="#167269"/>
    <circle cx="230" cy="-42" r="48" fill="#167269"/>
    <circle cx="230" cy="42" r="48" fill="#167269"/>
    <rect x="208" y="-42" width="70" height="84" rx="20" fill="#167269"/>
  </g>

  <!-- Hero bone -->
  <g transform="translate(1250, 330) scale(1.65)">
    <rect x="-210" y="-28" width="420" height="56" rx="22" fill="url(#boneFill)"/>
    <circle cx="-230" cy="-42" r="48" fill="url(#boneFill)"/>
    <circle cx="-230" cy="42" r="48" fill="url(#boneFill)"/>
    <rect x="-278" y="-42" width="70" height="84" rx="20" fill="url(#boneFill)"/>
    <circle cx="230" cy="-42" r="48" fill="url(#boneFill)"/>
    <circle cx="230" cy="42" r="48" fill="url(#boneFill)"/>
    <rect x="208" y="-42" width="70" height="84" rx="20" fill="url(#boneFill)"/>
    <rect x="-160" y="-14" width="320" height="14" rx="7" fill="#4bb8ae" opacity="0.35"/>
  </g>

  <!-- Soft focus plate -->
  <rect x="260" y="560" width="1980" height="780" rx="80"
    fill="#ffffff" fill-opacity="0.30" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3"/>

  <!-- Wide CTA -->
  <rect x="400" y="1140" width="1700" height="230" rx="115" fill="url(#ctaFill)"/>
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

    title = ImageFont.truetype(str(FONT_BOLD), 172)
    hospital = ImageFont.truetype(str(FONT_BOLD), 90)
    cta = ImageFont.truetype(str(FONT_BOLD), 96)
    footer = ImageFont.truetype(str(FONT_REG), 46)

    centered_text(draw, "OPD Orthopedic", 730, title, BRAND)
    centered_text(draw, "Samutsakhon Hospital", 890, hospital, BRAND)
    draw.rounded_rectangle((1110, 990, 1390, 1002), radius=6, fill=ACCENT)

    centered_text(
        draw,
        "เปิดแอป",
        1255,
        cta,
        (255, 255, 255),
        stroke_width=5,
        stroke_fill=(19, 92, 85),
    )
    centered_text(draw, "OPD Ortho · SKH", 1520, footer, MUTED)

    im.save(OUT, format="JPEG", quality=92, optimize=True, progressive=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({im.size[0]}x{im.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
