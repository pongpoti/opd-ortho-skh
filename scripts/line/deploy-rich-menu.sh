#!/usr/bin/env bash
# Deploy the OPD Ortho SKH rich menu via LINE Messaging API.
#
# Required env:
#   LINE_CHANNEL_ACCESS_TOKEN  — Messaging API long-lived channel access token
#   LINE_LIFF_ID               — LIFF app ID (builds https://liff.line.me/{id})
#
# Optional env:
#   SET_DEFAULT=true|false     — set as default rich menu (default: true)
#   DELETE_OLD=true|false      — delete other rich menus after success (default: true)
#   CHAT_BAR_TEXT              — override chat bar label (max 14 chars)
#   SELECTED=true|false        — open rich menu by default (default: true)
#
# Usage (from repo root):
#   LINE_CHANNEL_ACCESS_TOKEN=… LINE_LIFF_ID=… ./scripts/line/deploy-rich-menu.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MENU_DIR="$ROOT/line/rich-menu"
IMAGE="$MENU_DIR/richmenu.jpg"
CONFIG_TEMPLATE="$MENU_DIR/config.json"
API="https://api.line.me/v2/bot"
API_DATA="https://api-data.line.me/v2/bot"

SET_DEFAULT="${SET_DEFAULT:-true}"
DELETE_OLD="${DELETE_OLD:-true}"
SELECTED="${SELECTED:-true}"

die() { echo "error: $*" >&2; exit 1; }

# curl -f hides the response body on HTTP errors; capture it for debugging.
line_curl() {
  local tmp status
  tmp="$(mktemp)"
  status="$(curl -sS -o "$tmp" -w "%{http_code}" "$@")" || {
    cat "$tmp" >&2 || true
    rm -f "$tmp"
    die "curl transport failure"
  }
  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "error: LINE API HTTP $status" >&2
    cat "$tmp" >&2 || true
    echo >&2
    rm -f "$tmp"
    exit 1
  fi
  cat "$tmp"
  rm -f "$tmp"
}

[[ -n "${LINE_CHANNEL_ACCESS_TOKEN:-}" ]] || die "LINE_CHANNEL_ACCESS_TOKEN is required"
[[ -n "${LINE_LIFF_ID:-}" ]] || die "LINE_LIFF_ID is required"
[[ -f "$IMAGE" ]] || die "missing rich menu image: $IMAGE"
[[ -f "$CONFIG_TEMPLATE" ]] || die "missing config template: $CONFIG_TEMPLATE"

# Accept either bare LIFF ID or a full https://liff.line.me/{id} URL.
LIFF_ID="${LINE_LIFF_ID#https://liff.line.me/}"
LIFF_ID="${LIFF_ID%%/*}"
[[ -n "$LIFF_ID" ]] || die "could not parse LINE_LIFF_ID"

LIFF_URL="https://liff.line.me/${LIFF_ID}"

auth=(-H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}")

echo "==> Verifying Messaging API token…"
bot_info="$(line_curl "${auth[@]}" "$API/info")"
echo "    bot: $(echo "$bot_info" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("displayName","?"), "/", d.get("basicId","?"))')"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
CONFIG="$WORKDIR/richmenu.json"

python3 - "$CONFIG_TEMPLATE" "$CONFIG" "$LIFF_URL" "$SELECTED" "${CHAT_BAR_TEXT:-}" <<'PY'
import json, sys

# LINE counts rich-menu chatBarText / name in grapheme clusters.
# chatBarText max is 14; action labels max is 20.
MAX_CHAT_BAR = 14
MAX_LABEL = 20

src, dst, liff_url, selected, chat_bar = sys.argv[1:6]
with open(src, encoding="utf-8") as f:
    raw = f.read()
raw = raw.replace("{{LIFF_URL}}", liff_url)
obj = json.loads(raw)
obj["selected"] = selected.lower() in ("1", "true", "yes")
if chat_bar:
    obj["chatBarText"] = chat_bar

chat = obj.get("chatBarText", "")
if len(chat) > MAX_CHAT_BAR:
    raise SystemExit(
        f"chatBarText is {len(chat)} grapheme clusters (max {MAX_CHAT_BAR}): {chat!r}"
    )
for area in obj.get("areas", []):
    label = area.get("action", {}).get("label", "")
    if len(label) > MAX_LABEL:
        raise SystemExit(
            f"action label is {len(label)} grapheme clusters (max {MAX_LABEL}): {label!r}"
        )

with open(dst, "w", encoding="utf-8") as f:
    json.dump(obj, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"LIFF URL: {liff_url}")
print(f"chatBarText ({len(chat)}): {chat}")
print(f"areas: {len(obj.get('areas', []))}")
PY

echo "==> Validating rich menu object…"
line_curl "${auth[@]}" -H "Content-Type: application/json" \
  -d @"$CONFIG" "$API/richmenu/validate" >/dev/null
echo "    ok"

echo "==> Creating rich menu…"
create_resp="$(line_curl "${auth[@]}" -H "Content-Type: application/json" \
  -d @"$CONFIG" "$API/richmenu")"
RICH_MENU_ID="$(echo "$create_resp" | python3 -c 'import sys,json; print(json.load(sys.stdin)["richMenuId"])')"
echo "    richMenuId=$RICH_MENU_ID"

echo "==> Uploading image ($(du -h "$IMAGE" | cut -f1))…"
line_curl "${auth[@]}" -H "Content-Type: image/jpeg" \
  --data-binary @"$IMAGE" \
  "$API_DATA/richmenu/${RICH_MENU_ID}/content" >/dev/null
echo "    uploaded"

if [[ "$SET_DEFAULT" == "true" ]]; then
  echo "==> Setting as default rich menu…"
  # Empty-body POST must send Content-Length: 0; otherwise Akamai/LINE returns HTTP 411.
  line_curl -X POST -H "Content-Length: 0" "${auth[@]}" \
    "$API/user/all/richmenu/${RICH_MENU_ID}" >/dev/null
  echo "    default set"
else
  echo "==> Skipping set-default (SET_DEFAULT=$SET_DEFAULT)"
fi

if [[ "$DELETE_OLD" == "true" ]]; then
  echo "==> Cleaning up older rich menus…"
  line_curl "${auth[@]}" "$API/richmenu/list" \
    | RICH_MENU_ID="$RICH_MENU_ID" LINE_CHANNEL_ACCESS_TOKEN="$LINE_CHANNEL_ACCESS_TOKEN" \
      python3 "$ROOT/scripts/line/delete-old-rich-menus.py"
else
  echo "==> Skipping delete-old (DELETE_OLD=$DELETE_OLD)"
fi

echo
echo "Done. Rich menu is live:"
echo "  richMenuId=$RICH_MENU_ID"
echo "  LIFF=$LIFF_URL"
