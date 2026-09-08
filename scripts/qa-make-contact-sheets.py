#!/usr/bin/env python3
"""Create small contact sheets for visual QA of rendered document pages."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: qa-make-contact-sheets.py INPUT_DIR OUTPUT_DIR")
    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    pages = sorted(source.glob("page-*.png"), key=lambda path: int(path.stem.split("-")[-1]))
    thumbnail = (595, 842)
    for start in range(0, len(pages), 4):
        batch = pages[start:start + 4]
        sheet = Image.new("RGB", (thumbnail[0] * 2 + 60, thumbnail[1] * 2 + 90), "#cdd2da")
        draw = ImageDraw.Draw(sheet)
        for index, path in enumerate(batch):
            image = Image.open(path).convert("RGB")
            image.thumbnail(thumbnail)
            x = 20 + (index % 2) * (thumbnail[0] + 20)
            y = 35 + (index // 2) * (thumbnail[1] + 20)
            sheet.paste(image, (x, y))
            draw.text((x, y - 22), path.stem, fill="#111827")
        sheet.save(output / f"pages-{start + 1:02d}-{start + len(batch):02d}.png")


if __name__ == "__main__":
    main()
