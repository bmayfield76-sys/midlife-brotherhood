#!/usr/bin/env python3
"""Build one self-contained carousel.html: fonts, images in assets/, CSS and every src/*.js (in name order)."""
import base64, json, mimetypes, pathlib, sys

root = pathlib.Path(__file__).resolve().parent
src = root / "src"
FONTS = [("MBP8", "poppins-latin-800-normal.woff2"), ("MBP7", "poppins-latin-700-normal.woff2"), ("MBP5", "poppins-latin-500-normal.woff2"), ("EBMono", "MonoBold.woff2")]
ff = "\n".join(
    f"@font-face{{font-family:'{fam}';src:url(data:font/woff2;base64,{base64.b64encode((root / 'fonts' / fn).read_bytes()).decode()}) format('woff2');font-display:block;}}"
    for fam, fn in FONTS)
assets = {}
adir = root / "assets"
if adir.is_dir():
    for p in sorted(adir.iterdir()):
        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"):
            mt = mimetypes.guess_type(p.name)[0] or "image/png"
            assets[p.stem] = f"data:{mt};base64," + base64.b64encode(p.read_bytes()).decode()
js = "\n".join(p.read_text(encoding="utf-8") for p in sorted(src.glob("*.js")))
html = (src / "template.html").read_text(encoding="utf-8")
html = html.replace("/*FONTS*/", ff).replace("/*CSS*/", (src / "style.css").read_text(encoding="utf-8"))
html = html.replace("/*ASSETS*/", json.dumps(assets)).replace("/*JS*/", js)
out = root / "carousel.html"
out.write_text(html, encoding="utf-8")
mb = len(html.encode()) / 1e6
print(f"wrote {out} ({mb:.2f} MB, {len(assets)} image assets)")
if mb > 15:
    print("WARNING: over 15 MB. Shrink the images in assets/ (1600 px wide is plenty, use .webp or .jpg).", file=sys.stderr)
