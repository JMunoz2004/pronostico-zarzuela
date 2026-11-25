"""Genera index.html (una sola página autocontenida) a partir de src/."""
from pathlib import Path
s = Path("src")
t = (s / "template.html").read_text(encoding="utf-8")
t = t.replace("/*DATA*/", (s / "data.js").read_text(encoding="utf-8"))
t = t.replace("/*BTDATA*/", (s / "backtest-data.js").read_text(encoding="utf-8"))
t = t.replace("/*MODEL*/", (s / "model.js").read_text(encoding="utf-8"))
Path("index.html").write_text(t, encoding="utf-8")
print("index.html", len(t), "bytes")
