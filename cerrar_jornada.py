"""Pasa la carta del domingo (datos/carta.json) con sus llegadas a datos/jornadas/AAAA-MM-DD.txt,
para que esa jornada cuente en el entrenamiento y en la estadística de jinetes y preparadores.

Uso (los 5 primeros de cada carrera; las bajas, si las hubo, con --bajas):
    python3 cerrar_jornada.py 1=2-4-1-5-3 2=5-1-9-10-3 3=5-9-6-8-1 4=11-6-9-1-7 5=7-8-4-1-2 6=2-1-6-9-4 --bajas 3:4 6:3,7 --terreno 1

--terreno: estado de la pista ese día (0 bueno, 1 bueno a blando, 2 blando, 3 pesado). Se guarda en datos/terreno.csv.

Después:
    1. Cambia datos/carta.json por la carta del domingo siguiente (o déjala: el entrenamiento ignora jornadas
       con fecha igual o posterior a la de la carta).
    2. git add -A && git commit -m "Jornada del ..." && git push   (GitHub reconstruye la página solo).
"""
import argparse
import json
import re
import sys
from pathlib import Path

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("llegadas", nargs="+", help="carrera=llegada, por ejemplo 3=5-9-6-8-1")
ap.add_argument("--bajas", nargs="*", default=[], help="carrera:nº,nº de los retirados, por ejemplo 3:4,7")
ap.add_argument("--terreno", type=int, choices=[0, 1, 2, 3], help="estado de la pista: 0 bueno, 1 bueno a blando, 2 blando, 3 pesado")
ap.add_argument("--carta", default="datos/carta.json")
ap.add_argument("--forzar", action="store_true", help="sobrescribe el archivo de la jornada si ya existe")
a = ap.parse_args()

carta = json.loads(Path(a.carta).read_text(encoding="utf-8"))
fecha = carta["fecha"]
dm = fecha[8:10] + "/" + fecha[5:7]
races = {r["n"]: r for r in carta["carreras"]}

lleg = {}
for x in a.llegadas:
    m = re.fullmatch(r"(\d+)=([\d\-, ]+)", x.strip())
    if not m:
        sys.exit(f"No entiendo «{x}»: usa carrera=llegada, por ejemplo 3=5-9-6-8-1")
    lleg[int(m.group(1))] = [int(n) for n in re.split(r"[^\d]+", m.group(2)) if n]
bajas = {}
for x in a.bajas:
    m = re.fullmatch(r"(\d+):([\d, ]+)", x.strip())
    if not m:
        sys.exit(f"No entiendo «{x}»: usa carrera:nº,nº, por ejemplo 3:4,7")
    bajas[int(m.group(1))] = {int(n) for n in m.group(2).split(",") if n.strip()}

faltan = sorted(set(races) - set(lleg))
if faltan:
    print("Aviso: sin llegada para las carreras", faltan, "— no se guardan.")

lines = [
    f"# Jornada del {dm}/{fecha[:4]} en {carta.get('hipodromo', 'La Zarzuela')}: programa (antes de correr) y llegada (los 5 primeros).",
    "# Carrera:  @dd/mm|nº carrera|distancia|categoría|am (si es de amateurs, si no vacío)|llegada separada por comas",
    "# Caballo:  nº|NOMBRE|kg|cajón|JINETE|PREPARADOR|forma previa del programa (más reciente primero)",
]
for n in sorted(lleg):
    if n not in races:
        sys.exit(f"La carrera {n} no está en la carta")
    r = races[n]
    sc = bajas.get(n, set())
    horses = [h for h in r["horses"] if h["no"] not in sc]
    nos = {h["no"] for h in horses}
    bad = [x for x in lleg[n] if x not in nos]
    if bad or len(set(lleg[n])) != len(lleg[n]):
        sys.exit(f"Carrera {n}: la llegada {lleg[n]} tiene números repetidos o que no corrieron ({bad})")
    am = "am" if all(h["j"] == "AMATEUR" for h in horses) else ""
    lines.append(f"@{dm}|{n}|{r['dist']}|{r['cat']}|{am}|{','.join(map(str, lleg[n][:5]))}")
    for h in horses:
        name = re.sub(r"\s*\(.*?\)", "", h["name"]).upper().strip()
        kg = str(h["kg"]).rstrip("0").rstrip(".") if "." in str(h["kg"]) else str(h["kg"])
        lines.append(f"{h['no']}|{name}|{kg}|{h['draw']}|{h['j']}|{h['t']}|{','.join(h.get('form', []))}")

out = Path("datos/jornadas") / f"{fecha}.txt"
if out.exists() and not a.forzar:
    sys.exit(f"{out} ya existe (usa --forzar para sobrescribirlo)")
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Guardado {out} con {len(lleg)} carreras.")

tp = Path("datos/terreno.csv")
if a.terreno is not None:
    rows = tp.read_text(encoding="utf-8").splitlines() if tp.exists() else ["fecha;hipodromo;terreno;fuente"]
    hip = carta.get("hipodromo", "La Zarzuela")
    rows = [r for r in rows if not r.startswith(fecha + ";")] + [f"{fecha};{hip};{a.terreno};cerrar_jornada.py"]
    tp.write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"Estado de la pista del {dm}: {['bueno', 'bueno a blando', 'blando', 'pesado'][a.terreno]} (datos/terreno.csv)")
else:
    print("Aviso: no has indicado --terreno. Apúntalo en datos/terreno.csv si lo sabes: es importante para el factor terreno.")
