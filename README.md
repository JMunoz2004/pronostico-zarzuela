# Pronóstico La Zarzuela · domingo 29/11/2026

Página web (un solo `index.html`, sin servidor) que pronostica las seis carreras del cierre de temporada en el Hipódromo de La Zarzuela y se ajusta en directo el día de la carrera.

## Qué hace

- **Probabilidad de victoria y de podio** de cada caballo a partir de ocho factores: forma, distancia, clase, terreno, jinete, preparador, peso y cajón. Los pesos se ajustan con deslizadores.
- **Forma y distancia con historial fechado:** para cada caballo se usan sus últimas 5 carreras de los últimos 3 meses (desde el 31/08/2026) en cualquier hipódromo (La Zarzuela, San Sebastián, Francia…). Cada carrera pesa más cuanto más reciente es (vida media ≈ 4 semanas), el puesto se corrige por el nº de participantes y, con pocas carreras, el factor se acerca al neutro. Sin carreras en la ventana: penalización leve; con forma de programa sin fecha: cuenta a medias. Datos en `src/sept-runs.js` (`SEPT_RUNS`, `EXTRA_RUNS`).
- **Tiempo por carrera**: eliges el cielo (sol, nubes, llovizna, lluvia, lluvia fuerte) y la temperatura. La lluvia ablanda la pista para esa carrera y las siguientes, y eso cambia el efecto del peso, del cajón y de la preferencia de cada caballo por el barro.
- **Bajas de última hora**: pulsas el caballo y se recalcula todo sin él.
- **Gemelas y tríos** (con y sin orden), con la fórmula de Harville con descuento.
- **Apuesta de valor / arriesgada**: escribes las cuotas de la casa y la página mezcla mercado y modelo, calcula el valor esperado, propone ¼ de Kelly sobre tu banca y señala la mejor opción con cuota ≥ 5. Si no hay valor, lo dice.
- **Validación** con las 12 carreras del 15 y del 22 de noviembre.

Todo lo que introduces se guarda en tu navegador (localStorage).

## Estructura

```
src/data.js            programa del 29/11, historiales y resultados de noviembre
src/backtest-data.js   programas del 15 y 22/11 para validar
src/model.js           modelo, combinaciones, valor y validación
src/template.html      interfaz
build.py               une todo en index.html
index.html             la página lista para abrir o publicar
```

`python3 build.py` regenera `index.html` después de tocar cualquier archivo de `src/`.

## Publicar con GitHub Pages

Settings → Pages → Deploy from a branch → `main` / raíz. La web queda en `https://<usuario>.github.io/pronostico-zarzuela/`.

## Fuentes

Participantes definitivos y órdenes de llegada de hipodromodelazarzuela.es (jornadas del 1, 8, 15, 22 y 29/11/2026), programa Quíntuple Plus nº 70 (loteriasyapuestas.es) e historiales en turf-fr.com, turfoo.fr y skysports.com. Datos recogidos el 25/11/2026.

## Aviso

Es un modelo estadístico con una muestra pequeña. En la validación acierta el ganador en 2 de 12 carreras (al azar serían ~1,3) y no garantiza ningún beneficio. Juega con responsabilidad.
