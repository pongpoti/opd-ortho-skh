#!/usr/bin/env python3
"""Generate the OPD Ortho SKH LINE rich-menu image (2500x1686 PNG).

Single full-bleed CTA that opens the main LIFF URL.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "richmenu.png"
FONT_BOLD = ROOT / "public" / "fonts" / "Sarabun-Bold.ttf"
FONT_REG = ROOT / "public" / "fonts" / "Sarabun-Regular.ttf"

W, H = 2500, 1686
PAD = 72

BRAND_600 = (22, 114, 105)
BRAND_500 = (31, 143, 134)
BRAND_400 = (75, 184, 174)
FG = (17, 61, 57)
MUTED = (78, 108, 118)


def soft_blob(size: tuple[int, int], color: tuple[int, int, int], alpha: int) -> Image.Image:
    blob = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(blob)
    d.ellipse((0, 0, size[0] - 1, size[1] - 1), fill=(*color, alpha))
    return blob.filter(ImageFilter.GaussianBlur(radius=min(size) // 5))


def make_background() -> Image.Image:
    top = Image.new("RGB", (1, H))
    tp = top.load()
    for y in range(H):
        t = y / (H - 1)
        tp[0, y] = (
            int(234 + (242 - 234) * t),
            int(251 + (249 - 251) * t),
            int(250 + (252 - 250) * t),
        )
    img = top.resize((W, H), Image.Resampling.BILINEAR).convert("RGBA")
    img.alpha_composite(soft_blob((1600, 1600), (169, 232, 226), 180), dest=(-250, -400))
    img.alpha_composite(soft_blob((1700, 1700), (188, 217, 245), 155), dest=(1300, -450))
    img.alpha_composite(soft_blob((1800, 1500), (205, 238, 230), 145), dest=(350, 850))
    return img


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, ...] | None = None,
    outline: tuple[int, ...] | None = None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_heart(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: tuple[int, int, int]) -> None:
    # Classic filled heart (two circles + triangle), crisp at rich-menu scale.
    r = size // 2
    draw.ellipse((cx - size, cy - r - 8, cx, cy + r - 8), fill=color)
    draw.ellipse((cx, cy - r - 8, cx + size, cy + r - 8), fill=color)
    draw.polygon(
        [
            (cx - size + 4, cy + 6),
            (cx + size - 4, cy + 6),
            (cx, cy + size + 18),
        ],
        fill=color,
    )


def main() -> None:
    title_font = ImageFont.truetype(str(FONT_BOLD), 110)
    brand_font = ImageFont.truetype(str(FONT_BOLD), 64)
    sub_font = ImageFont.truetype(str(FONT_REG), 48)
    cta_font = ImageFont.truetype(str(FONT_BOLD), 56)

    base = make_background()
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    panel = (PAD, PAD, W - PAD, H - PAD)
    rounded_rect(draw, panel, 72, fill=(255, 255, 255, 178))
    rounded_rect(draw, panel, 72, outline=(255, 255, 255, 230), width=5)
    rounded_rect(draw, (PAD + 8, PAD + 8, W - PAD - 8, H - PAD - 8), 64, outline=(*BRAND_500, 70), width=5)

    cx = W // 2
    icon_y = 400
    r = 140
    draw.ellipse((cx - r, icon_y - r, cx + r, icon_y + r), fill=(*BRAND_500, 38))
    draw_heart(draw, cx, icon_y - 6, 78, BRAND_600)
    draw_heart(draw, cx, icon_y - 6, 58, BRAND_400)

    line1 = "OPD Orthopedic"
    line2 = "Samutsakhon Hospital"
    w1 = draw.textlength(line1, font=title_font)
    w2 = draw.textlength(line2, font=brand_font)
    draw.text((cx - w1 / 2, 620), line1, font=title_font, fill=BRAND_600)
    draw.text((cx - w2 / 2, 760), line2, font=brand_font, fill=BRAND_600)

    sub = "เลือกเครื่องมือสำหรับงาน OPD ออร์โธปิดิกส์"
    sw = draw.textlength(sub, font=sub_font)
    draw.text((cx - sw / 2, 900), sub, font=sub_font, fill=MUTED)

    # CTA pill
    cta = "แตะเพื่อเปิดแอป"
    cw = draw.textlength(cta, font=cta_font)
    pill_w = int(cw + 140)
    pill_h = 120
    px0 = cx - pill_w // 2
    py0 = 1120
    rounded_rect(draw, (px0, py0, px0 + pill_w, py0 + pill_h), 60, fill=(*BRAND_600, 235))
    draw.text((cx - cw / 2, py0 + 28), cta, font=cta_font, fill=(255, 255, 255, 255))

    tag = "OPD Ortho · SKH"
    tw = draw.textlength(tag, font=sub_font)
    draw.text((cx - tw / 2, H - PAD - 100), tag, font=sub_font, fill=MUTED)

    out = Image.alpha_composite(base, layer).convert("RGB")
    out.save(OUT, format="PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({out.size[0]}x{out.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
