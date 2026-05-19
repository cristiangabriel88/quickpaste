"""Regenerate all QuickPaste icon variants from the new-design transparent source.

Source: icons/New Design/ChatGPT Image May 19, 2026, 08_43_09 AM.png
        (1024x1024 RGBA, leaf+lines artwork on a transparent background)

Outputs (in icons/):
  logo{16,32,48,128}x{16,32,48,128}.png         - transparent background
  logo{16,32,48,128}x{16,32,48,128}-white.png   - white rounded-square background
  logo-no-text.png                              - 128x128 transparent (used by popup/options HTML)
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / "icons"
SOURCE = ICON_DIR / "New Design" / "ChatGPT Image May 19, 2026, 08_43_09 AM.png"

SIZES = [16, 32, 48, 128]
CORNER_RADIUS_PCT = 0.18  # rounded-square frame on white variants
LOGO_INSET_PCT = 0.04     # thin white frame around the icon on white variants
MARGIN_PCT = 0.0          # transparent variants: icon touches the canvas edge on its dominant axis


def cropped_master() -> Image.Image:
    src = Image.open(SOURCE).convert("RGBA")
    bbox = src.getbbox()
    if bbox is None:
        raise SystemExit(f"source has no opaque pixels: {SOURCE}")
    return src.crop(bbox)


def fit_into_square(cropped: Image.Image, canvas_size: int) -> Image.Image:
    max_extent = int(round(canvas_size * (1 - 2 * MARGIN_PCT)))
    cw, ch = cropped.size
    scale = min(max_extent / cw, max_extent / ch)
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))
    scaled = cropped.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(scaled, ((canvas_size - new_w) // 2, (canvas_size - new_h) // 2))
    return canvas


def make_white_variant(transparent: Image.Image) -> Image.Image:
    size = transparent.size[0]
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = max(1, int(size * CORNER_RADIUS_PCT))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)

    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    canvas.paste(white, (0, 0), mask)

    inset = max(1, int(round(size * LOGO_INSET_PCT)))
    inner = size - inset * 2
    scaled = transparent.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(scaled, (inset, inset))
    return canvas


def main() -> None:
    cropped = cropped_master()

    for size in SIZES:
        transparent = fit_into_square(cropped, size)
        t_path = ICON_DIR / f"logo{size}x{size}.png"
        transparent.save(t_path)
        print(f"wrote {t_path}")

        white = make_white_variant(transparent)
        w_path = ICON_DIR / f"logo{size}x{size}-white.png"
        white.save(w_path)
        print(f"wrote {w_path}")

    no_text = fit_into_square(cropped, 128)
    no_text_path = ICON_DIR / "logo-no-text.png"
    no_text.save(no_text_path)
    print(f"wrote {no_text_path}")


if __name__ == "__main__":
    main()
