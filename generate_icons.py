"""
Generate Verifai extension icons at 4 sizes.
Design: deep navy circle background, white magnifying glass, blue checkmark in lens.
"""

from PIL import Image, ImageDraw
import math
import os

SIZES = [16, 32, 48, 128]
OUT_DIR = os.path.join(os.path.dirname(__file__), "extension", "icons")

# Brand colours
NAVY        = (30, 58, 95, 255)       # #1E3A5F
TRANSPARENT = (0, 0, 0, 0)
WHITE       = (255, 255, 255, 255)
BLUE        = (59, 130, 246, 255)     # #3B82F6
BLUE_DARK   = (37, 99, 235, 255)      # slightly darker for depth


def draw_icon(size: int) -> Image.Image:
    # 2× super-sample then downscale for smooth edges
    S = size * 4
    img = Image.new("RGBA", (S, S), TRANSPARENT)
    d   = ImageDraw.Draw(img)

    cx, cy = S // 2, S // 2

    # ── Background circle ────────────────────────────────────────────────────
    pad = S * 0.02
    d.ellipse([pad, pad, S - pad, S - pad], fill=NAVY)

    # ── Magnifying glass ─────────────────────────────────────────────────────
    # Lens circle (outer white ring + inner transparent)
    lens_r    = S * 0.28          # outer radius of the lens ring
    lens_cx   = cx - S * 0.04    # shift lens slightly up-left
    lens_cy   = cy - S * 0.04
    ring_w    = S * 0.06          # ring stroke width

    # Draw solid white lens disc
    d.ellipse(
        [lens_cx - lens_r, lens_cy - lens_r,
         lens_cx + lens_r, lens_cy + lens_r],
        fill=WHITE,
    )
    # Cut out inner disc (slightly smaller) to make it a ring, filled navy
    inner_r = lens_r - ring_w
    d.ellipse(
        [lens_cx - inner_r, lens_cy - inner_r,
         lens_cx + inner_r, lens_cy + inner_r],
        fill=NAVY,
    )

    # ── Handle ───────────────────────────────────────────────────────────────
    handle_w   = ring_w * 1.1
    angle      = math.radians(45)          # 45° down-right
    # Start point: bottom-right edge of lens ring
    start_x = lens_cx + (lens_r - ring_w / 2) * math.cos(angle)
    start_y = lens_cy + (lens_r - ring_w / 2) * math.sin(angle)
    # End point
    handle_len = S * 0.24
    end_x = start_x + handle_len * math.cos(angle)
    end_y = start_y + handle_len * math.sin(angle)

    d.line(
        [(start_x, start_y), (end_x, end_y)],
        fill=WHITE,
        width=int(handle_w),
    )
    # Round cap at the end
    cap_r = handle_w / 2
    d.ellipse(
        [end_x - cap_r, end_y - cap_r, end_x + cap_r, end_y + cap_r],
        fill=WHITE,
    )

    # ── Checkmark inside the lens ────────────────────────────────────────────
    # Only draw at sizes where it's readable (skip at 16px equivalent)
    if size >= 32:
        ck_w = S * 0.055           # checkmark stroke width
        ck_scale = inner_r * 0.55  # scale relative to inner lens

        # Checkmark points (relative to lens centre):
        #   left-bottom corner → mid-bottom → right-top
        p1 = (lens_cx - ck_scale * 0.55, lens_cy + ck_scale * 0.0)
        p2 = (lens_cx - ck_scale * 0.05, lens_cy + ck_scale * 0.55)
        p3 = (lens_cx + ck_scale * 0.65, lens_cy - ck_scale * 0.45)

        # Draw with slightly darker blue for the shadow, then bright blue on top
        for offset, colour in [((S * 0.008, S * 0.008), BLUE_DARK), ((0, 0), BLUE)]:
            ox, oy = offset
            d.line(
                [(p1[0] + ox, p1[1] + oy),
                 (p2[0] + ox, p2[1] + oy),
                 (p3[0] + ox, p3[1] + oy)],
                fill=colour,
                width=int(ck_w),
                joint="curve",
            )

    # ── Downscale ────────────────────────────────────────────────────────────
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        icon = draw_icon(size)
        path = os.path.join(OUT_DIR, f"icon{size}.png")
        icon.save(path, "PNG")
        print(f"  ✓ icon{size}.png  ({size}×{size})")
    print(f"\nAll icons saved to: {OUT_DIR}")


if __name__ == "__main__":
    main()
