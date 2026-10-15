#!/bin/bash
# Usage: ./build-media.sh <folder with the photos/videos> [hero photo filename]
# Copies photos/videos into media/, converts to web formats, makes video
# posters, and writes media.json for the gallery.
set -euo pipefail
SRC="${1:?give the folder with the photos and videos}"
HERO="${2:-}"
cd "$(dirname "$0")"
mkdir -p media

shopt -s nullglob nocaseglob
for f in "$SRC"/*; do
  base=$(basename "$f"); stem="${base%.*}"; ext=$(echo "${base##*.}" | tr A-Z a-z)
  case "$ext" in
    heic|heif|png|jpg|jpeg|webp)
      # 2000px max JPEG keeps the repo small and turns iPhone HEIC into something browsers show
      sips -s format jpeg -s formatOptions 82 -Z 2000 "$f" --out "media/$stem.jpg" >/dev/null ;;
    mov|mp4|m4v|3gp)
      ffmpeg -loglevel error -y -i "$f" -vf "scale='min(1280,iw)':-2" -c:v libx264 -crf 25 \
        -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "media/$stem.mp4"
      ffmpeg -loglevel error -y -ss 1 -i "media/$stem.mp4" -frames:v 1 -q:v 3 "media/$stem.poster.jpg" ;;
    *) echo "skipping $base" ;;
  esac
done

# GitHub rejects files over 100 MB
for f in media/*; do
  [ "$(stat -f%z "$f")" -gt 95000000 ] && echo "WARNING: $f is over 95 MB — GitHub will reject it"
done

python3 - "$HERO" <<'PY'
import json, os, subprocess, sys
hero = sys.argv[1]
def dims(p):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", p], capture_output=True, text=True).stdout
    v = [int(l.split()[-1]) for l in out.splitlines() if "pixel" in l]
    return v if len(v) == 2 else (1, 1)
items = []
for f in sorted(os.listdir("media")):
    p = f"media/{f}"
    if f.startswith(".") or f.endswith(".poster.jpg"):
        continue
    if f.lower().endswith(".mp4"):
        poster = p[:-4] + ".poster.jpg"
        items.append({"type": "video", "src": p, "poster": poster if os.path.exists(poster) else None})
    else:
        w, h = dims(p)
        items.append({"type": "image", "src": p, "wide": w > h * 1.15})
photos = [i["src"] for i in items if i["type"] == "image"]
hero_src = f"media/{os.path.splitext(hero)[0]}.jpg" if hero else (photos[0] if photos else None)
json.dump({"hero": hero_src, "items": items}, open("media.json", "w"), indent=1)
print(f"{len(items)} items, hero = {hero_src}")
PY
