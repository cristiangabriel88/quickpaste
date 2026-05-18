"""Re-render the in-use logo PNGs so the artwork sits closer to the canvas edges.

Source artwork (logo128x128.png, logo-no-text.png, logo-with-text.png) has wide
transparent margins; this script crops to the alpha bounding box and rescales the
content to fill MARGIN_PCT short of each edge while preserving aspect ratio.
"""
from pathlib import Path

from PIL import Image

ICON_DIR = Path(__file__).resolve().parent.parent / "icons"
MARGIN_PCT = 0.0  # icon touches canvas on its dominant axis
SQUARE_SIZES = [16, 32, 48, 128]


def fit_into_square(src: Image.Image, canvas_size: int) -> Image.Image:
    bbox = src.getbbox()
    if bbox is None:
        return src.copy()
    cropped = src.crop(bbox)

    max_extent = int(round(canvas_size * (1 - 2 * MARGIN_PCT)))
    cw, ch = cropped.size
    scale = min(max_extent / cw, max_extent / ch)
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))
    scaled = cropped.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - new_w) // 2
    y = (canvas_size - new_h) // 2
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def fit_into_canvas(src: Image.Image, out_w: int, out_h: int) -> Image.Image:
    bbox = src.getbbox()
    if bbox is None:
        return src.copy()
    cropped = src.crop(bbox)

    max_w = int(round(out_w * (1 - 2 * MARGIN_PCT)))
    max_h = int(round(out_h * (1 - 2 * MARGIN_PCT)))
    cw, ch = cropped.size
    scale = min(max_w / cw, max_h / ch)
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))
    scaled = cropped.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    x = (out_w - new_w) // 2
    y = (out_h - new_h) // 2
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def main() -> None:
    hi_res = Image.open(ICON_DIR / "logo128x128.png").convert("RGBA")
    with_text = Image.open(ICON_DIR / "logo-with-text.png").convert("RGBA")

    for size in SQUARE_SIZES:
        out = fit_into_square(hi_res, size)
        out_path = ICON_DIR / f"logo{size}x{size}.png"
        out.save(out_path)
        print(f"wrote {out_path} ({size}x{size})")

    no_text = fit_into_square(hi_res, 128)
    no_text_path = ICON_DIR / "logo-no-text.png"
    no_text.save(no_text_path)
    print(f"wrote {no_text_path} (128x128)")

    wt_w, wt_h = with_text.size
    wt_out = fit_into_canvas(with_text, wt_w, wt_h)
    wt_path = ICON_DIR / "logo-with-text.png"
    wt_out.save(wt_path)
    print(f"wrote {wt_path} ({wt_w}x{wt_h})")


if __name__ == "__main__":
    main()
