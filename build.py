"""Genera index.html (una sola página autocontenida) a partir de src/. Antes: node train.js"""
from pathlib import Path
s = Path("src")
t = (s / "template.html").read_text(encoding="utf-8")
for tag, f in [("/*DATA*/","data.js"),("/*TRAIN*/","train-built.js"),("/*WEIGHTS*/","weights.js"),("/*MODEL*/","model.js")]:
    txt = (s / f).read_text(encoding="utf-8")
    if f == "data.js": txt += "\n" + (s / "sept-runs.js").read_text(encoding="utf-8")
    t = t.replace(tag, txt)
Path("index.html").write_text(t, encoding="utf-8")
print("index.html", len(t), "bytes")
