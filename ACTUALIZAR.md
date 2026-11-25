# Actualizar para el domingo siguiente

## 1. Guardar los resultados del domingo pasado

Con la carta que había en `datos/carta.json` y la llegada oficial (los 5 primeros de cada carrera):

```bash
python3 cerrar_jornada.py 1=2-4-1-5-3 2=5-1-9-10-3 3=5-9-6-8-1 4=11-6-9-1-7 5=7-8-4-1-2 6=2-1-6-9-4 --bajas 3:4 6:3,7 --terreno 1
```

- `--bajas` solo si hubo retirados (carrera:nº,nº).
- `--terreno` es el estado de la pista ese día: 0 bueno, 1 bueno a blando, 2 blando, 3 pesado. **Ponlo siempre**: el hipódromo no lo publica después y es clave para el factor terreno. Se guarda en `datos/terreno.csv`, donde también puedes completar a mano las jornadas pasadas si las recuerdas.

Crea `datos/jornadas/AAAA-MM-DD.txt` y avisa si un número no cuadra.

## 2. Poner la carta nueva en `datos/carta.json`

Cabecera:

| campo | ejemplo | para qué |
|---|---|---|
| `fecha` | `"2026-12-06"` | fecha de la jornada; marca la ventana de 3 meses |
| `jornada` | `14` | nº de jornada (para las etiquetas) |
| `prevision` | `"Previsión al 03/12: lluvia, 6–11 °C"` | opcional, sale arriba |
| `visitantes` | `{"PASQUIER":0.75}` | valor previo (0–1) para jinetes sin montas en los datos |

Cada carrera: `n`, `name`, `sub`, `dist`, `cat`, `hora`, `premio` y `horses`.

Categorías (`cat`, también en las jornadas y en `otras-carreras.csv`), por importe del primer premio:

| código | categoría | 1er premio |
|---|---|---|
| `LI` | Listed internacional | 50.000 € o más |
| `LL` | Listed local | 35.000–49.999 € |
| `A` | A | 24.000–34.999 € |
| `B` | B | 15.000–23.999 € |
| `C` | C | 8.000–14.999 € |
| `D` | D | 3.500–7.999 € |
| `FR` | carrera en Francia | — |

Cada caballo, una línea:

```json
{"no":1,"name":"Chergui (FR)","age":6,"kg":59,"j":"LE QUILLEUC","jn":"S. Le Quilleuc","t":"M.ALONSO R.","c":"Imperial Stud","draw":2,"form":["06","03","01","08","03"]}
```

- `j` y `t` son los códigos de jinete y preparador **tal como salen en las jornadas** (`GELABERT`, `CH.DELCHER`…). Si no coinciden, la estadística no los encuentra.
- `form`: la forma del programa, la más reciente primero.
- Opcional: `eq` (equipo), `note` (texto), `lastOld` (`"20/06"` si no corre desde hace más de 3 meses) y `runs` (carreras sueltas con `d`, `dist`, `cat`, `pos`, `of`, `kg`, `g`, `txt`).

## 3. Carreras en otros hipódromos → `datos/otras-carreras.csv`

Una fila por actuación que no esté ya en `datos/jornadas/` (San Sebastián, Dos Hermanas, Francia…):

```
2026-11-30;San Sebastián;;1600;C;8;NOMBRE DEL CABALLO;3;1;58;
```

Columnas: `date;course;r;dist;cat;of;name;pos;g;kg;txt` (`of` = participantes, `g` = terreno 0 bueno … 3 muy blando). Las de La Zarzuela ya salen solas de las jornadas.

## 4. Subir

```bash
git add -A
git commit -m "Jornada del 29/11 y carta del 06/12"
git push
```

GitHub regenera `index.html` (acción **Actualizar pronóstico**, ~1 min) y Streamlit actualiza la app sola.

Si quieres verlo antes en tu ordenador: `node train.js && python3 build.py && streamlit run app.py`.
