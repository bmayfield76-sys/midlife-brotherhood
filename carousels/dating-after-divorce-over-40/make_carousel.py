"""
Midlife Brotherhood carousel renderer.

Builds a full Instagram listicle carousel as an ordered set of pixel-precise
PNG slides: a cover slide with the hook title, one numbered slide per list
item (big red number, bold headline, supporting text), and a closing CTA
slide. Renders directly with Pillow -- no AI image generation -- so text is
always verbatim, the numbering is always right, and every slide in the batch
shares the exact same template.

This mirrors the mb-quote-cards approach on purpose. AI design generators
(Canva's generate-design, etc.) paraphrase text and eyeball sizing, which
breaks a numbered list where the count and order have to be exact. Keep the
rendering here; if Billy wants these in Canva, upload the finished PNGs.

Usage (single carousel from a JSON spec):
    python make_carousel.py spec.json /path/to/out_dir

Or import build_carousel() and call it directly. See build_carousel() for the
spec shape.
"""

import sys
import os
import re
import json
from PIL import Image, ImageDraw, ImageFont

# ---- Brand constants (Midlife Brotherhood) ----
W, H = 1080, 1350          # Instagram portrait 4:5
BG = (26, 26, 26)          # #1A1A1A
RED = (204, 0, 0)          # #CC0000
WHITE = (255, 255, 255)
MUTED = (188, 188, 188)    # supporting/body text -- soft grey for hierarchy

SIDE_MARGIN = 100          # left/right safe margin
TEXT_WIDTH = W - 2 * SIDE_MARGIN   # 880

_HERE = os.path.dirname(os.path.abspath(__file__))
FONT_BOLD_CANDIDATES = [
    os.path.join(_HERE, "fonts", "Poppins-Bold.ttf"),
    "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONT_REG_CANDIDATES = [
    os.path.join(_HERE, "fonts", "Poppins-Regular.ttf"),
    "/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _resolve(cands, label):
    for p in cands:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(
        f"No usable {label} font found. Install Poppins or DejaVu, or add a "
        f"candidate path. Tried: {cands}"
    )


BOLD = _resolve(FONT_BOLD_CANDIDATES, "bold")
REG = _resolve(FONT_REG_CANDIDATES, "regular")


# ---------- optional photo background ----------
def new_canvas(image_path=None, darken=0.62):
    """Flat brand background by default. If image_path is given (e.g. a fal.ai
    render), cover-crop it to the canvas and pull it down toward BG so white
    headlines and grey body copy stay readable on top of it."""
    img = Image.new("RGB", (W, H), BG)
    if not image_path:
        return img
    photo = Image.open(image_path).convert("RGB")
    scale = max(W / photo.width, H / photo.height)
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
    left = (photo.width - W) // 2
    top = (photo.height - H) // 2
    photo = photo.crop((left, top, left + W, top + H))
    overlay = Image.new("RGB", (W, H), BG)
    return Image.blend(photo, overlay, darken)


# ---------- icon ----------
def prep_icon(icon_path, target_size=110, alpha_floor=28):
    """Keys out the icon's dark background so it composites without a box."""
    icon = Image.open(icon_path).convert("RGB")
    icon = icon.resize((target_size, target_size), Image.LANCZOS)
    icon_rgba = icon.convert("RGBA")
    px = icon_rgba.load()
    for y in range(icon_rgba.height):
        for x in range(icon_rgba.width):
            r, g, b, a = px[x, y]
            m = max(r, g, b)
            if m <= alpha_floor:
                px[x, y] = (r, g, b, 0)
            else:
                new_a = int(255 * min(1.0, (m - alpha_floor) / (255 - alpha_floor)))
                px[x, y] = (r, g, b, new_a)
    return icon_rgba


def paste_icon(img, icon_path, size=104, margin=55):
    icon = prep_icon(icon_path, target_size=size)
    img.paste(icon, (W - icon.width - margin, H - icon.height - margin), icon)


# ---------- text helpers ----------
def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        test = (current + " " + word).strip()
        if draw.textlength(test, font=font) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def fit_block(draw, text, font_path, max_width, max_height,
              start_size, min_size, leading=1.3):
    size = start_size
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        lines = wrap_text(draw, text, font, max_width)
        bbox = font.getbbox("Ag")
        line_h = (bbox[3] - bbox[1]) * leading
        if line_h * len(lines) <= max_height:
            return font, lines, line_h
        size -= 2
    font = ImageFont.truetype(font_path, min_size)
    lines = wrap_text(draw, text, font, max_width)
    bbox = font.getbbox("Ag")
    line_h = (bbox[3] - bbox[1]) * leading
    return font, lines, line_h


def draw_centered(draw, lines, font, line_h, top_y, fill):
    y = top_y
    for line in lines:
        w = draw.textlength(line, font=font)
        draw.text(((W - w) / 2, y), line, font=font, fill=fill)
        y += line_h
    return y


def draw_eyebrow(draw, text, y, fill=MUTED, size=30, tracking=8):
    font = ImageFont.truetype(BOLD, size)
    text = text.upper()
    total = sum(draw.textlength(ch, font=font) + tracking for ch in text) - tracking
    x = (W - total) / 2
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


# ---------- slide renderers ----------
def render_cover(title, out_path, icon_path, eyebrow="MIDLIFE BROTHERHOOD",
                 swipe_cue="SWIPE", image=None):
    img = new_canvas(image)
    draw = ImageDraw.Draw(img)

    draw_eyebrow(draw, eyebrow, 150)

    m = re.match(r"^\s*(\d+)\s+(.*)$", title)
    if m:
        number, rest = m.group(1), m.group(2)
    else:
        number, rest = None, title
    rest = rest.upper()

    parts = []
    if number:
        num_font = ImageFont.truetype(BOLD, 300)
        nb = num_font.getbbox(number)
        parts.append(("num", num_font, [number], (nb[3] - nb[1]) * 1.0))

    title_font, title_lines, title_lh = fit_block(
        draw, rest, BOLD, TEXT_WIDTH, 560, start_size=104, min_size=52, leading=1.16
    )
    parts.append(("title", title_font, title_lines, title_lh))

    gap = 62   # generous space so the big number never crowds the title
    total_h = sum(p[3] * len(p[2]) for p in parts) + gap * (len(parts) - 1)
    y = (H * 0.44) - total_h / 2

    for kind, font, lines, line_h in parts:
        if kind == "num":
            nb = font.getbbox(number)          # (l, top-bearing, r, bottom)
            ink_h = nb[3] - nb[1]
            w = draw.textlength(number, font=font)
            # draw so the ink top sits exactly at y, then advance past ink bottom
            draw.text(((W - w) / 2, y - nb[1]), number, font=font, fill=RED)
            y += ink_h + gap
        else:
            y = draw_centered(draw, lines, font, line_h, y, WHITE)

    rule_w = 150
    draw.rectangle([(W - rule_w) / 2, y + 20, (W + rule_w) / 2, y + 26], fill=RED)

    if swipe_cue:
        sc_font = ImageFont.truetype(BOLD, 34)
        label = f"{swipe_cue.upper()}  ->"
        sw = draw.textlength(label, font=sc_font)
        draw.text(((W - sw) / 2, H - 210), label, font=sc_font, fill=RED)

    paste_icon(img, icon_path)
    img.save(out_path, "PNG")
    return out_path


def render_item(number, total, headline, body, out_path, icon_path, image=None):
    img = new_canvas(image)
    draw = ImageDraw.Draw(img)

    num_str = f"{number:02d}"
    num_font = ImageFont.truetype(BOLD, 150)
    nb = num_font.getbbox(num_str)
    num_h = (nb[3] - nb[1])

    head_font, head_lines, head_lh = fit_block(
        draw, headline, BOLD, TEXT_WIDTH, 400, start_size=84, min_size=46, leading=1.18
    )
    head_h = head_lh * len(head_lines)

    body_h = 0
    if body:
        body_font, body_lines, body_lh = fit_block(
            draw, body, REG, TEXT_WIDTH - 40, 360, start_size=44, min_size=30, leading=1.4
        )
        body_h = body_lh * len(body_lines)

    gap_num = 30
    gap_rule = 34
    rule_thick = 6
    gap_body = 40

    total_h = num_h + gap_num + head_h
    if body:
        total_h += gap_rule + rule_thick + gap_body + body_h
    else:
        total_h += gap_rule + rule_thick

    y = (H * 0.46) - total_h / 2

    nw = draw.textlength(num_str, font=num_font)
    draw.text(((W - nw) / 2, y - nb[1] * 0.6), num_str, font=num_font, fill=RED)
    y += num_h + gap_num

    y = draw_centered(draw, head_lines, head_font, head_lh, y, WHITE)
    y += gap_rule

    rule_w = 120
    draw.rectangle([(W - rule_w) / 2, y, (W + rule_w) / 2, y + rule_thick], fill=RED)
    y += rule_thick

    if body:
        y += gap_body
        draw_centered(draw, body_lines, body_font, body_lh, y, MUTED)

    prog_font = ImageFont.truetype(BOLD, 32)
    draw.text((SIDE_MARGIN, H - 150), f"{number} / {total}", font=prog_font, fill=MUTED)

    paste_icon(img, icon_path)
    img.save(out_path, "PNG")
    return out_path


def render_cta(headline, body_lines, out_path, icon_path,
               eyebrow="MIDLIFE BROTHERHOOD", image=None):
    img = new_canvas(image)
    draw = ImageDraw.Draw(img)

    icon = prep_icon(icon_path, target_size=260)
    img.paste(icon, ((W - icon.width) // 2, 250), icon)

    draw_eyebrow(draw, eyebrow, 250 + 260 + 40)

    head_font, head_lines, head_lh = fit_block(
        draw, headline.upper(), BOLD, TEXT_WIDTH, 320, start_size=92, min_size=52, leading=1.16
    )
    y = 820
    y = draw_centered(draw, head_lines, head_font, head_lh, y, WHITE)

    rule_w = 150
    draw.rectangle([(W - rule_w) / 2, y + 24, (W + rule_w) / 2, y + 30], fill=RED)
    y += 60

    if body_lines:
        body_font = ImageFont.truetype(REG, 42)
        bb = body_font.getbbox("Ag")
        body_lh = (bb[3] - bb[1]) * 1.5
        for line in body_lines:
            wrapped = wrap_text(draw, line, body_font, TEXT_WIDTH)
            y = draw_centered(draw, wrapped, body_font, body_lh, y, MUTED)
    img.save(out_path, "PNG")
    return out_path


def render_contents(title, items, out_path, icon_path, eyebrow="THE LIST"):
    """
    Optional preview slide, placed right after the cover. Lists every item
    headline with its red number, left-aligned like a table of contents. This
    front-loads the payoff -- people swipe to reach a point they already saw,
    which lifts completion. Dan-Go-style, on the MB dark template.
    """
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw_eyebrow(draw, eyebrow, 150)

    n = len(items)
    # size the rows to fit the vertical space between the eyebrow and the footer
    top = 300
    bottom = H - 240
    avail = bottom - top
    row_h = min(avail / n, 150)
    num_size = int(row_h * 0.62)
    head_size = int(row_h * 0.52)
    num_font = ImageFont.truetype(BOLD, num_size)
    head_font = ImageFont.truetype(BOLD, head_size)

    num_col_x = SIDE_MARGIN
    # widest two-digit number sets the headline indent so rows align
    max_num_w = draw.textlength(f"{n:02d}", font=num_font)
    head_x = num_col_x + max_num_w + 34
    head_max_w = W - head_x - SIDE_MARGIN

    y = top
    for i, item in enumerate(items, start=1):
        # vertically center number and headline within the row
        num_str = f"{i:02d}"
        nb = num_font.getbbox(num_str)
        hb = head_font.getbbox("Ag")
        num_ink = nb[3] - nb[1]
        head_ink = hb[3] - hb[1]
        row_center = y + row_h / 2
        draw.text((num_col_x, row_center - num_ink / 2 - nb[1]), num_str,
                  font=num_font, fill=RED)
        # single-line headline, shrink locally if a long one would overflow
        hl = item["headline"]
        hf = head_font
        while draw.textlength(hl, font=hf) > head_max_w and hf.size > 26:
            hf = ImageFont.truetype(BOLD, hf.size - 2)
        hbb = hf.getbbox("Ag")
        draw.text((head_x, row_center - (hbb[3] - hbb[1]) / 2 - hbb[1]), hl,
                  font=hf, fill=WHITE)
        y += row_h

    # swipe cue + icon
    sc_font = ImageFont.truetype(BOLD, 34)
    label = "SWIPE  ->"
    sw = draw.textlength(label, font=sc_font)
    draw.text(((W - sw) / 2, H - 200), label, font=sc_font, fill=RED)
    paste_icon(img, icon_path)
    img.save(out_path, "PNG")
    return out_path


# ---------- orchestrator ----------
def build_carousel(spec, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    icon_path = os.path.join(_HERE, "assets", "mb_icon_gritty_master_900.png")
    eyebrow = spec.get("eyebrow", "MIDLIFE BROTHERHOOD")
    items = spec["items"]
    total = len(items)
    paths = []

    cover = os.path.join(out_dir, "slide_01_cover.png")
    render_cover(spec["title"], cover, icon_path, eyebrow=eyebrow,
                 image=spec.get("cover_image"))
    paths.append(cover)

    # optional "what's inside" preview slide (lifts swipe-through)
    offset = 0
    if spec.get("contents"):
        c = os.path.join(out_dir, "slide_02_contents.png")
        render_contents(spec["title"], items, c, icon_path,
                        eyebrow=spec.get("contents_label", "THE LIST"))
        paths.append(c)
        offset = 1

    for i, item in enumerate(items, start=1):
        p = os.path.join(out_dir, f"slide_{i+1+offset:02d}.png")
        render_item(i, total, item["headline"], item.get("body", ""), p, icon_path,
                    image=item.get("image"))
        paths.append(p)

    if spec.get("cta"):
        cta = spec["cta"]
        p = os.path.join(out_dir, f"slide_{total+2+offset:02d}_cta.png")
        render_cta(cta.get("headline", "You In?"), cta.get("body", []), p, icon_path,
                   eyebrow=eyebrow, image=cta.get("image"))
        paths.append(p)

    return paths


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python make_carousel.py spec.json /path/to/out_dir")
        sys.exit(1)
    with open(sys.argv[1]) as f:
        spec = json.load(f)
    out = build_carousel(spec, sys.argv[2])
    for p in out:
        print("Saved:", p)
