#!/usr/bin/env python3
"""Generate the OPD Ortho SKH LINE rich-menu image (2500x1686 PNG)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "richmenu.png"
FONT_BOLD = ROOT / "public" / "fonts" / "Sarabun-Bold.ttf"
FONT_REG = ROOT / "public" / "fonts" / "Sarabun-Regular.ttf"

W, H = 2500, 1686
GAP = 22
PAD = 44

BRAND_600 = (22, 114, 105)
FG = (17, 61, 57)
MUTED = (78, 108, 118)
DOCK = {
    "home": (31, 143, 134),
    "calendar": (193, 122, 46),
    "cross": (220, 38, 38),
    "chart": (53, 116, 181),
}


def soft_blob(size: tuple[int, int], color: tuple[int, int, int], alpha: int) -> Image.Image:
    blob = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(blob)
    d.ellipse((0, 0, size[0] - 1, size[1] - 1), fill=(*color, alpha))
    return blob.filter(ImageFilter.GaussianBlur(radius=min(size) // 5))


def make_background() -> Image.Image:
    # Soft teal/blue wash matching BackgroundGradient
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
    img.alpha_composite(soft_blob((1400, 1400), (169, 232, 226), 170), dest=(-200, -350))
    img.alpha_composite(soft_blob((1500, 1500), (188, 217, 245), 150), dest=(1400, -400))
    img.alpha_composite(soft_blob((1600, 1400), (205, 238, 230), 140), dest=(450, 900))
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


def draw_home_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int], s: int = 40) -> None:
    roof = [(cx, cy - s), (cx - s, cy - 2), (cx + s, cy - 2)]
    draw.line(roof + [roof[0]], fill=color, width=9, joint="curve")
    body = [cx - int(s * 0.7), cy - 2, cx + int(s * 0.7), cy + s + 4]
    draw.rectangle(body, outline=color, width=9)
    door = [cx - 14, cy + 12, cx + 14, cy + s + 4]
    draw.rectangle(door, outline=color, width=7)


def draw_calendar_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int], s: int = 40) -> None:
    box = [cx - s, cy - int(s * 0.65), cx + s, cy + s]
    rounded_rect(draw, tuple(box), 14, outline=color, width=9)
    draw.line([(cx - s + 12, cy - 4), (cx + s - 12, cy - 4)], fill=color, width=8)
    for dx in (-20, 0, 20):
        draw.ellipse((cx + dx - 6, cy + 16, cx + dx + 6, cy + 28), fill=color)
    for dx in (-24, 24):
        draw.line([(cx + dx, cy - int(s * 0.95)), (cx + dx, cy - int(s * 0.4))], fill=color, width=9)


def draw_cross_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int], s: int = 40) -> None:
    arm_w = int(s * 0.4)
    arm_h = int(s * 1.05)
    draw.rounded_rectangle([cx - arm_w, cy - arm_h, cx + arm_w, cy + arm_h], radius=10, fill=color)
    draw.rounded_rectangle([cx - arm_h, cy - arm_w, cx + arm_h, cy + arm_w], radius=10, fill=color)


def draw_chart_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int], s: int = 40) -> None:
    base_y = cy + s
    for dx, h in ((-30, 30), (0, 54), (30, 42)):
        draw.rounded_rectangle([cx + dx - 11, base_y - h, cx + dx + 11, base_y], radius=7, fill=color)


def cell_boxes() -> list[tuple[int, int, int, int]]:
    cw = (W - PAD * 2 - GAP) // 2
    ch = (H - PAD * 2 - GAP) // 2
    boxes = []
    for row in range(2):
        for col in range(2):
            x0 = PAD + col * (cw + GAP)
            y0 = PAD + row * (ch + GAP)
            boxes.append((x0, y0, x0 + cw, y0 + ch))
    return boxes


def main() -> None:
    bold = ImageFont.truetype(str(FONT_BOLD), 78)
    reg = ImageFont.truetype(str(FONT_REG), 38)
    brand = ImageFont.truetype(str(FONT_BOLD), 36)

    base = make_background()
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    tiles = [
        {
            "title": "หน้าแรก",
            "subtitle": "เปิดแอป OPD Ortho",
            "accent": DOCK["home"],
            "icon": draw_home_icon,
            "brand": True,
        },
        {
            "title": "ตารางเวร",
            "subtitle": "เวรแพทย์และพยาบาล",
            "accent": DOCK["calendar"],
            "icon": draw_calendar_icon,
            "brand": False,
        },
        {
            "title": "เวรห้องเฝือก",
            "subtitle": "บันทึกผู้ป่วยใส่เฝือก",
            "accent": DOCK["cross"],
            "icon": draw_cross_icon,
            "brand": False,
        },
        {
            "title": "สถิติ",
            "subtitle": "รายงานของแผนก",
            "accent": DOCK["chart"],
            "icon": draw_chart_icon,
            "brand": False,
        },
    ]

    for box, tile in zip(cell_boxes(), tiles):
        x0, y0, x1, y1 = box
        rounded_rect(draw, box, 52, fill=(255, 255, 255, 175))
        rounded_rect(draw, box, 52, outline=(255, 255, 255, 220), width=4)
        rounded_rect(draw, (x0 + 5, y0 + 5, x1 - 5, y1 - 5), 46, outline=(*tile["accent"], 78), width=4)

        cx = (x0 + x1) // 2
        icon_y = y0 + 220
        r = 86
        draw.ellipse((cx - r, icon_y - r, cx + r, icon_y + r), fill=(*tile["accent"], 40))
        tile["icon"](draw, cx, icon_y, tile["accent"], 40)

        tw = draw.textlength(tile["title"], font=bold)
        draw.text((cx - tw / 2, y0 + 360), tile["title"], font=bold, fill=FG)

        sw = draw.textlength(tile["subtitle"], font=reg)
        draw.text((cx - sw / 2, y0 + 460), tile["subtitle"], font=reg, fill=MUTED)

        if tile["brand"]:
            tag = "OPD Orthopedic · SKH"
            bw = draw.textlength(tag, font=brand)
            draw.text((cx - bw / 2, y1 - 120), tag, font=brand, fill=BRAND_600)

    out = Image.alpha_composite(base, layer).convert("RGB")
    out.save(OUT, format="PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({out.size[0]}x{out.size[1]}, {size_kb:.1f} KB)")
    if size_kb > 1024:
        raise SystemExit("Rich menu image must be under 1 MB")


if __name__ == "__main__":
    main()
