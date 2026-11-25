"""Genera index.html (una sola página autocontenida) a partir de src/template.html, src/generated.js y src/model.js.
Antes hay que ejecutar: node train.js   (lee la carpeta datos/ y escribe src/generated.js)"""
from pathlib import Path
s = Path("src")
t = (s / "template.html").read_text(encoding="utf-8")
for tag, f in [("/*GEN*/", "generated.js"), ("/*MODEL*/", "model.js")]:
    t = t.replace(tag, (s / f).read_text(encoding="utf-8"))
Path("index.html").write_text(t, encoding="utf-8")
print("index.html", len(t), "bytes")
