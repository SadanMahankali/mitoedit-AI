"""Strip near-black background from logo assets and save as transparent PNGs/GIFs.

For each png/gif in the input list:
  - any pixel whose brightness < THRESHOLD becomes fully transparent
  - pixels above the threshold have alpha scaled so the cut isn't a hard edge

Handles animated GIFs frame-by-frame.
"""
from PIL import Image, ImageSequence
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[2] / "frontend" / "public"

# Pixels darker than this (sum of RGB / 3) become transparent
THRESHOLD = 50
# Smooth ramp from THRESHOLD..(THRESHOLD+RAMP) for soft edges
RAMP = 50


def _process_pixels(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            brightness = (r + g + b) // 3
            if brightness <= THRESHOLD:
                px[x, y] = (r, g, b, 0)
            elif brightness <= THRESHOLD + RAMP:
                # smooth alpha ramp
                t = (brightness - THRESHOLD) / RAMP
                px[x, y] = (r, g, b, int(a * t))
            # else: keep as is
    return img


def process_png(path: Path):
    out = path.with_name(path.stem + "_clean.png")
    img = Image.open(path)
    cleaned = _process_pixels(img)
    cleaned.save(out, "PNG")
    print(f"  → {out.name}")


def process_gif(path: Path):
    out = path.with_name(path.stem + "_clean.gif")
    im = Image.open(path)
    frames = []
    durations = []
    for frame in ImageSequence.Iterator(im):
        cleaned = _process_pixels(frame.copy())
        # GIFs only support 1-bit transparency, but Pillow handles it
        frames.append(cleaned)
        durations.append(frame.info.get("duration", 100))
    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        transparency=0,
    )
    print(f"  → {out.name} ({len(frames)} frames)")


def main():
    if not PUBLIC.exists():
        raise SystemExit(f"public folder not found: {PUBLIC}")
    targets = {
        "logo.png": process_png,
        "logo-icon.png": process_png,
        "logo-full.png": process_png,
        "wordmark.png": process_png,
        "logo.gif": process_gif,
    }
    for name, fn in targets.items():
        p = PUBLIC / name
        if not p.exists():
            print(f"skip (missing): {name}")
            continue
        print(f"processing {name}…")
        fn(p)
    print("done.")


if __name__ == "__main__":
    main()
