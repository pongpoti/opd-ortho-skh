# LINE rich menu (OPD Ortho SKH)

Single full-area rich menu that opens the main LIFF app URL:

`https://liff.line.me/{LIFF_ID}`

## Files

- `richmenu.jpg` — 2500×1686 full-size image uploaded to LINE (JPEG under 1 MB)
- `source.jpg` — AI-generated teal-glass medical atmosphere
- `config.json` — Messaging API rich menu object (one URI area, full size)
- `generate-image.py` — composites `source.jpg` + heart mark + Sarabun type

## Design

Full-bleed mint/teal atmosphere with soft wave lines and medical crosses,
a heart mark (outline + solid inner), **OPD Orthopedic / Samutsakhon Hospital**,
and a wide **เปิดแอป** CTA. Typography is drawn with Sarabun so Thai stays
sharp on iPhone-sized chat menus.

## Regenerate the image

```bash
pip install pillow cairosvg
python3 line/rich-menu/generate-image.py
```

To refresh the atmosphere, replace `source.jpg` with a new AI render
(≈16:9 teal-glass medical scene, empty center), then regenerate.

## Deploy

### GitHub Actions (manual)

1. Add repository secrets:
   - `LINE_CHANNEL_ACCESS_TOKEN` — Messaging API long-lived token
   - `LINE_LIFF_ID` — the same LIFF ID as `NEXT_PUBLIC_LIFF_ID` (or the full `https://liff.line.me/{id}` URL)
2. Actions → **Deploy LINE Rich Menu** → **Run workflow**

### Local

```bash
export LINE_CHANNEL_ACCESS_TOKEN=…
export LINE_LIFF_ID=…
./scripts/line/deploy-rich-menu.sh
```

The script validates the menu object, creates it, uploads `richmenu.jpg`, sets it as the default, and optionally deletes older rich menus.

Note: LINE limits `chatBarText` to **14 grapheme clusters**. Keep overrides short (the default is `เปิดแอป`).
