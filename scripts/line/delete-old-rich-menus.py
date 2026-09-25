#!/usr/bin/env python3
"""Delete every rich menu except RICH_MENU_ID. Reads list JSON from stdin."""

from __future__ import annotations

import json
import os
import sys
import urllib.request

keep = os.environ["RICH_MENU_ID"]
token = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
data = json.load(sys.stdin)
deleted = 0

for menu in data.get("richmenus", []):
    rid = menu["richMenuId"]
    if rid == keep:
        continue
    req = urllib.request.Request(
        f"https://api.line.me/v2/bot/richmenu/{rid}",
        method="DELETE",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as resp:
        resp.read()
    deleted += 1
    print(f"    deleted {rid} ({menu.get('name', '')})")

print(f"    removed {deleted} old menu(s)")
