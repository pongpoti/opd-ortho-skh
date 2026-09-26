# LINE Official Account profile picture (OPD Ortho SKH)

Profile photo for the **OPD ORTHO SKH** Official Account, sized to LINE’s
recommended media specification.

## LINE spec

| Item | Requirement |
| --- | --- |
| Recommended size | **640 × 640 px** |
| Formats | JPG, JPEG, PNG |
| Max file size | **3 MB** |
| Display | Cropped to a **circle** in chat / friend lists |

Keep the mark and type inside the center safe zone (~80% diameter) so nothing
important is clipped by the circular crop.

Source: [LINE OA media specification](https://lineforbusiness.com/th/helpcenter/line-oa/manual/mediaspecification)

## Files

| File | Purpose |
| --- | --- |
| `profile.png` | Square upload asset (lossless) |
| `profile.jpg` | Square upload asset (smaller JPEG) |
| `profile-circle-preview.png` | Circular crop preview only — **do not upload** |
| `generate-image.py` | Regenerates the assets |

## Design

**Orthopedic brand badge** — solid teal disc (easy to spot in a chat list),
bold white **long-bone** mark (reads as ortho, not generic hospital), **OPD /
ORTHO** wordmark in high-contrast type. Soft mint/sky square surround so
uncropped corners still match the app brand.

Why this shape: LINE crops to a circle; a filled teal disc + thick bone
silhouette stays recognizable down to ~40 px.

## Regenerate

```bash
pip install pillow cairosvg
python3 line/profile/generate-image.py
```

## Upload

1. Open [LINE Official Account Manager](https://manager.line.biz/) → your OA
2. **Settings** → **Profile** → profile photo
3. Upload `profile.png` or `profile.jpg` (either is under 3 MB)
4. Adjust crop if prompted — keep the heart + OPD centered
5. Save (profile photo can be changed once per hour)
