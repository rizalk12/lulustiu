#!/usr/bin/env python3
"""Rakit satu file HTML mandiri (dist/lulustiu-standalone.html) dari sumber modular,
supaya app bisa dibuka/dikirim sebagai SATU file (mis. lewat chat) tanpa server.
Sumber modular tetap kanonis untuk deploy Firebase Hosting."""
import pathlib

base = pathlib.Path(__file__).parent
html = (base / "index.html").read_text(encoding="utf-8")

def inline(html, src, fname):
    code = (base / fname).read_text(encoding="utf-8")
    tag = f'<script src="{src}"></script>'
    assert tag in html, f"tag {src} tidak ditemukan di index.html"
    return html.replace(tag, f"<script>\n/* ===== {fname} (inlined) ===== */\n{code}\n</script>")

# firebase-config.js sengaja TIDAK di-inline: standalone berjalan mode offline (bank soal).
html = html.replace('<script src="firebase-config.js"></script>',
                    "<!-- firebase-config.js tidak disertakan di build standalone: mode offline -->")
html = inline(html, "questions.js", "questions.js")
html = inline(html, "firebase-ai.js", "firebase-ai.js")
html = inline(html, "app.js", "app.js")

out = base / "dist" / "lulustiu-standalone.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print("OK →", out, f"({out.stat().st_size/1024:.1f} KB)")
