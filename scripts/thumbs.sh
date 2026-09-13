#!/bin/sh
# Square 640 px gallery thumbs. Paths come from _data/bilder.yml.
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

python3 - <<'PY' | while IFS= read -r rel; do
  dest="assets/images/thumbs/${rel}"
  mkdir -p "$(dirname "$dest")"
  magick "assets/images/${rel}" -auto-orient -resize '640x640^' -gravity center -extent 640x640 -quality 72 -strip "$dest"
  echo "$dest"
done
import re
from pathlib import Path
text = Path("_data/bilder.yml").read_text()
for src in re.findall(r"src:\s*(/assets/images/(\S+))", text):
    print(src[1])
PY
