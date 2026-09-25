# LINE rich menu (OPD Ortho SKH)

Branded 2×2 rich menu that opens the LIFF app module routes.

| Tile | Opens |
| --- | --- |
| หน้าแรก | `https://liff.line.me/{LIFF_ID}` |
| ตารางเวร | `https://liff.line.me/{LIFF_ID}/duty-schedule` |
| เวรห้องเฝือก | `https://liff.line.me/{LIFF_ID}/cast-room` |
| สถิติ | `https://liff.line.me/{LIFF_ID}/statistics` |

## Files

- `richmenu.png` — 2500×1686 image (LINE full-size rich menu)
- `config.json` — Messaging API rich menu object (URI placeholders)
- `generate-image.py` — regenerates `richmenu.png` from the app theme

## Regenerate the image

```bash
pip install pillow
python3 line/rich-menu/generate-image.py
```

## Deploy

### GitHub Actions (manual)

1. Add repository secrets:
   - `LINE_CHANNEL_ACCESS_TOKEN` — Messaging API long-lived token (LINE Developers Console → Messaging API channel → Channel access token)
   - `LINE_LIFF_ID` — the same LIFF ID as `NEXT_PUBLIC_LIFF_ID` (or the full `https://liff.line.me/{id}` URL)
2. Actions → **Deploy LINE Rich Menu** → **Run workflow**

### Local

```bash
export LINE_CHANNEL_ACCESS_TOKEN=…
export LINE_LIFF_ID=…
./scripts/line/deploy-rich-menu.sh
```

The script validates the menu object, creates it, uploads `richmenu.png`, sets it as the default, and optionally deletes older rich menus.
