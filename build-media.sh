#!/bin/bash
# Usage: ./build-media.sh <folder with the email attachments> [hero photo filename]
# Copies photos/videos into media/, converts iPhone formats to web formats,
# and writes media.json for the gallery.
set -euo pipefail
SRC="${1:?give the folder with the photos and videos}"
HERO="${2:-}"
cd "$(dirname "$0")"
mkdir -p media

shopt -s nullglob nocaseglob
for f in "$SRC"/*; do
  base=$(basename "$f"); stem="${base%.*}"; ext="${base##*.}"; ext=$(echo "$ext" | tr A-Z a-z)
  case "$ext" in
    heic|heif|png|jpg|jpeg|webp)
      # Resize to 2000px max and save as JPEG (keeps the repo small, fixes HEIC)
      sips -s format jpeg -s formatOptions 82 -Z 2000 "$f" --out "media/$stem.jpg" >/dev/null ;;
    mov|mp4|m4v|3gp)
      if command -v ffmpeg >/dev/null; then
        ffmpeg -loglevel error -y -i "$f" -vf "scale='min(1280,iw)':-2" -c:v libx264 -crf 26 \
          -preset slow -c:a aac -b:a 128k -movflags +faststart "media/$stem.mp4"
      else
        cp "$f" "media/$stem.$ext"
      fi ;;
    *) echo "skipping $base" ;;
  esac
done

# GitHub rejects files over 100 MB
for f in media/*; do
  [ "$(stat -f%z "$f")" -gt 95000000 ] && echo "WARNING: $f is over 95 MB — GitHub will reject it"
done

python3 - "$HERO" <<'PY'
import json, os, sys
hero = sys.argv[1]
files = sorted(os.listdir("media"))
items = [{"type": "video" if f.lower().endswith((".mp4",".mov",".m4v",".3gp")) else "image",
          "src": f"media/{f}"} for f in files if not f.startswith(".")]
heroes = [i["src"] for i in items if i["type"] == "image"]
hero_src = f"media/{os.path.splitext(hero)[0]}.jpg" if hero else (heroes[0] if heroes else None)
json.dump({"hero": hero_src, "items": items}, open("media.json", "w"), indent=1)
print(f"{len(items)} items, hero = {hero_src}")
PY
