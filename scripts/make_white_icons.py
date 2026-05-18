"""Generate white-background variants of the QuickPaste logo for dark-mode toolbar visibility."""
from PIL import Image, ImageDraw
from pathlib import Path

ICON_DIR = Path(__file__).resolve().parent.parent / "icons"
SIZES = [16, 32, 48, 128]
CORNER_RADIUS_PCT = 0.18  # 18% rounded corners, looks polished without being a circle
LOGO_INSET_PCT = 0.04     # thin white frame; logo fills most of the rounded square


def make_white_variant(size: int) -> Image.Image:
    src = Image.open(ICON_DIR / f"logo{size}x{size}.png").convert("RGBA")

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = max(1, int(size * CORNER_RADIUS_PCT))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)

    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    canvas.paste(white, (0, 0), mask)

    inset = max(1, int(round(size * LOGO_INSET_PCT)))
    inner = size - inset * 2
    # use the largest source as a high-quality starting point for downscaling
    hi_res = Image.open(ICON_DIR / "logo128x128.png").convert("RGBA")
    scaled = hi_res.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(scaled, (inset, inset))
    return canvas


if __name__ == "__main__":
    for s in SIZES:
        out = make_white_variant(s)
        out_path = ICON_DIR / f"logo{s}x{s}-white.png"
        out.save(out_path)
        print(f"wrote {out_path}")
