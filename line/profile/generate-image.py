#!/usr/bin/env python3
"""Compose the OPD Ortho SKH LINE Official Account profile picture.

LINE OA profile photo spec:
  - 640 × 640 px, JPG/PNG, ≤ 3 MB
  - Displayed as a circle — keep mark + type in the center safe zone

Design goals: distinctive orthopedic brand, stylish, easy to spot in a
chat list at ~40 px. Solid teal badge + bold bone mark (not a heart).
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
# Brand teals from the app / rich menu
TEAL_DEEP = (19, 92, 85)       # #135c55
TEAL = (22, 114, 105)          # #167269
TEAL_MID = (31, 143, 134)      # #1f8f86
MINT = (168, 230, 224)         # #a8e6e0
SKY = (196, 217, 243)          # #c4d9f3
WHITE = (255, 255, 255)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def soft_square_bg() -> Image.Image:
    """Mint→sky radial square so corners match the brand when not cropped."""
    im = Image.new("RGB", (W, H))
    px = im.load()
    cx = cy = (W - 1) / 2
    for y in range(H):
        dy = (y - cy) / cy
        dy2 = dy * dy
        for x in range(W):
            dx = (x - cx) / cx
            t = min(1.0, (dx * dx + dy2) ** 0.5)
            t = t * t * (3 - 2 * t)
            # center mint → edge soft sky
            r = int(232 + (186 - 232) * t)
            g = int(246 + (214 - 246) * t)
            b = int(244 + (228 - 244) * t)
            px[x, y] = (r, g, b)
    return im


def badge_and_bone_svg() -> str:
    """Solid teal disc + stylized long bone (orthopedic mark) + OPD wordmark."""
    # Safe circle roughly 82% of canvas
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <radialGradient id="disc" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#2aa89c"/>
      <stop offset="55%" stop-color="#1f8f86"/>
      <stop offset="100%" stop-color="#135c55"/>
    </radialGradient>
    <linearGradient id="bone" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e6f7f5"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0a3d38" flood-opacity="0.28"/>
    </filter>
  </defs>

  <!-- Solid brand disc (reads clearly when LINE crops to a circle) -->
  <circle cx="320" cy="320" r="268" fill="url(#disc)" filter="url(#soft)"/>
  <circle cx="320" cy="320" r="268" fill="none" stroke="#a8e6e0" stroke-opacity="0.35" stroke-width="6"/>

  <!-- Orthopedic long-bone mark (horizontal, slightly tilted for style) -->
  <g transform="translate(320, 248) rotate(-18) scale(1.08)" filter="url(#soft)">
    <!-- Shaft -->
    <rect x="-118" y="-22" width="236" height="44" rx="22" fill="url(#bone)"/>
    <!-- Left epiphysis (joint knobs) -->
    <circle cx="-118" cy="-18" r="28" fill="url(#bone)"/>
    <circle cx="-118" cy="18" r="28" fill="url(#bone)"/>
    <!-- Right epiphysis -->
    <circle cx="118" cy="-18" r="28" fill="url(#bone)"/>
    <circle cx="118" cy="18" r="28" fill="url(#bone)"/>
    <!-- Subtle joint notch for depth -->
    <ellipse cx="-118" cy="0" rx="10" ry="16" fill="#1f8f86" fill-opacity="0.18"/>
    <ellipse cx="118" cy="0" rx="10" ry="16" fill="#1f8f86" fill-opacity="0.18"/>
  </g>
</svg>
"""


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
    base = soft_square_bg().convert("RGBA")
    mark = Image.open(
        BytesIO(
            cairosvg.svg2png(
                bytestring=badge_and_bone_svg().encode("utf-8"),
                output_width=W,
                output_height=H,
            )
        )
    ).convert("RGBA")
    composed = Image.alpha_composite(base, mark)
    draw = ImageDraw.Draw(composed)

    # Wordmark inside the teal disc, below the bone — high contrast white
    center_text(draw, "OPD", 388, load_font(72), WHITE)
    center_text(draw, "ORTHO", 440, load_font(30), MINT)
    center_text(draw, "SKH", 478, load_font(26), MINT)
    # Accent dash under SKH (Samut Sakhon Hospital)
    draw.rounded_rectangle((292, 502, 348, 510), radius=4, fill=MINT)

    rgb = composed.convert("RGB")
    rgb.save(OUT_PNG, format="PNG", optimize=True)
    rgb.save(OUT_JPG, format="JPEG", quality=92, optimize=True, progressive=True)
    circle_preview(rgb).save(OUT_PREVIEW, format="PNG", optimize=True)

    for path in (OUT_PNG, OUT_JPG, OUT_PREVIEW):
        kb = path.stat().st_size / 1024
        print(f"Wrote {path.relative_to(ROOT)} ({W}x{H}, {kb:.1f} KB)")
        if path != OUT_PREVIEW and path.stat().st_size > 3 * 1024 * 1024:
            raise SystemExit(f"{path.name} exceeds LINE 3 MB limit")


if __name__ == "__main__":
    main()
