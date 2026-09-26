#!/usr/bin/env python3
"""Compose the OPD Ortho SKH LINE rich-menu image (2500×1686 JPEG).

Uses an AI-generated atmosphere (`source.jpg`) as the full-bleed background,
then overlays a crisp heart mark (outline + solid inner), Sarabun typography, and CTA for mobile
readability. Output must stay under LINE’s 1 MB limit.
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

DIR = Path(__file__).resolve().parent
ROOT = DIR.parents[1]
SOURCE = DIR / "source.jpg"
OUT = DIR / "richmenu.jpg"
FONT_BOLD = ROOT / "public" / "fonts" / "Sarabun-Bold.ttf"

W, H = 2500, 1686
BRAND = (22, 114, 105)
ACCENT = (75, 184, 174)


def cover_crop(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = im.convert("RGB")
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def overlays_svg() -> str:
    """Heart mark (outline + solid inner) and CTA pill (labels via Pillow)."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <linearGradient id="heartFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#167269"/>
    </linearGradient>
    <linearGradient id="ctaFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#135c55"/>
    </linearGradient>
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#0d4a44" flood-opacity="0.28"/>
    </filter>
  </defs>

  <!-- Heart outline with solid inner heart -->
  <g transform="translate(1250, 300) scale(2.35)" filter="url(#softShadow)">
    <path d="M0 42
      C0 42 -48 8 -48 -18
      C-48 -38 -32 -50 -16 -50
      C-4 -50 0 -40 0 -40
      C0 -40 4 -50 16 -50
      C32 -50 48 -38 48 -18
      C48 8 0 42 0 42 Z"
      fill="none" stroke="url(#heartFill)" stroke-width="10"
      stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Solid inner heart -->
    <path d="M0 28
      C0 28 -32 4 -32 -14
      C-32 -28 -22 -36 -12 -36
      C-4 -36 0 -28 0 -28
      C0 -28 4 -36 12 -36
      C22 -36 32 -28 32 -14
      C32 4 0 28 0 28 Z"
      fill="url(#heartFill)"/>
  </g>

  <rect x="380" y="1100" width="1740" height="250" rx="125"
    fill="url(#ctaFill)" filter="url(#softShadow)"/>
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


def build_atmosphere() -> Image.Image:
    if not SOURCE.exists():
        raise SystemExit(f"Missing AI atmosphere: {SOURCE}")
    base = cover_crop(Image.open(SOURCE), W, H)
    bright = ImageEnhance.Brightness(base).enhance(1.05)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((360, 160, 2140, 1520), fill=200)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=110))
    return Image.composite(bright, base, mask)


def main() -> None:
    base = build_atmosphere()
    overlay = Image.open(
        BytesIO(
            cairosvg.svg2png(
                bytestring=overlays_svg().encode("utf-8"),
                output_width=W,
                output_height=H,
            )
        )
    ).convert("RGBA")
    im = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(im)

    title = ImageFont.truetype(str(FONT_BOLD), 176)
    hospital = ImageFont.truetype(str(FONT_BOLD), 92)
    cta = ImageFont.truetype(str(FONT_BOLD), 104)

    centered_text(draw, "OPD Orthopedic", 680, title, BRAND)
    centered_text(draw, "Samutsakhon Hospital", 850, hospital, BRAND)
    draw.rounded_rectangle((1110, 960, 1390, 974), radius=7, fill=ACCENT)
    centered_text(
        draw,
        "เปิดแอป",
        1225,
        cta,
        (255, 255, 255),
        stroke_width=4,
        stroke_fill=(19, 92, 85),
    )

    im.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({im.size[0]}x{im.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
