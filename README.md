# Pronóstico La Zarzuela

App de Streamlit (y página autocontenida `index.html`) que pronostica las carreras de cada domingo en el Hipódromo de La Zarzuela y se ajusta en directo el día de la carrera.

**Cada semana:** sigue [ACTUALIZAR.md](ACTUALIZAR.md). Son 3 pasos y un `git push`.

## Qué hace

- **Probabilidad de ganar y de quedar entre los tres primeros** de cada caballo, a partir de nueve factores: forma, distancia, clase, terreno, rivales, jinete, preparador, peso y cajón. Los pesos se entrenan jornada a jornada con las anteriores (walk-forward) y se pueden cambiar con deslizadores.
- **Forma y distancia con historial fechado:** para cada caballo se usan sus últimas 5 carreras de los últimos 3 meses, en cualquier hipódromo (La Zarzuela, San Sebastián, Francia…).
  - Cada carrera pesa más cuanto más reciente es (vida media ≈ 4 semanas).
  - El puesto se corrige por el nº de participantes.
  - Con pocas carreras, el factor se acerca al neutro.
- **Clase:** nivel de categoría de cada caballo con todas sus carreras conocidas (Listed, A, B, C, D, corregido por el puesto), comparado con el resto del lote: quien corre en categorías mejores sale por encima.
- **Rivales directos y cruzados:** con todas las carreras conocidas se ajusta un modelo de Bradley-Terry («quién llega por delante de quién»), ponderando lo reciente, la distancia y los kilos. La ficha de cada caballo lista sus enfrentamientos directos con los rivales de ese día.
- **Carreras anteriores por distancia:** eliges un rango (por defecto la distancia de la carrera ±200 m) y salen todas las carreras conocidas de los caballos en ese rango (fecha, hipódromo, terreno, puesto, kilos y jinete) y todas las montas de los jinetes de ese día (caballo, puesto, kilos, preparador), con su resumen de victorias y podios. Se puede ver para la carrera seleccionada o para todo el día.
- **Estado de la pista** de cada jornada en `datos/terreno.csv` (se usa en el factor terreno y, con 3 o más jornadas conocidas, se entrena su peso).
- **Tiempo por carrera:** cielo y temperatura. La lluvia ablanda la pista para esa carrera y las siguientes.
- **Bajas de última hora:** pulsas el caballo y se recalcula todo sin él.
- **Gemelas y tríos** por simulación (20.000 carreras simuladas por carrera, teniendo en cuenta la regularidad de cada caballo).
- **Apuesta de valor / arriesgada:** con las cuotas de la casa, mezcla mercado y modelo, calcula el valor esperado y propone ¼ de Kelly.
- **Lo que va de día:** las llegadas de la mañana se suman a la estadística de jinetes y preparadores para las carreras de la tarde.

Lo que introduces (bajas, tiempo, cuotas, llegadas) se guarda en tu navegador.

## Estructura

```
datos/
  carta.json            carta del próximo domingo (carreras, caballos, jinetes, forma, historial manual)
  jornadas/AAAA-MM-DD.txt  una jornada ya corrida por archivo: programa + llegada (entrenamiento)
  otras-carreras.csv    carreras de los participantes en otros hipódromos o fechas
  terreno.csv           estado de la pista de cada jornada
cerrar_jornada.py       pasa la carta + las llegadas a datos/jornadas/ al acabar el domingo
train.js                lee datos/, entrena los pesos y escribe src/generated.js
build.py                une src/template.html + src/generated.js + src/model.js en index.html
app.py                  app de Streamlit que muestra index.html
src/model.js            modelo, simulación de gemelas/tríos, valor y entrenamiento
src/template.html       interfaz
analysis/intradia.js    prueba del «efecto del día»
analysis/rivales.js     señal de cada factor por separado
.github/workflows/actualizar.yml   regenera index.html en GitHub en cada push
```

Para generar la página en local: `node train.js && python3 build.py`. Para ver la app: `pip install -r requirements.txt && streamlit run app.py`.

## Publicar en Streamlit Community Cloud

1. Entra en [share.streamlit.io](https://share.streamlit.io) con tu cuenta de GitHub.
2. **Create app** → elige este repositorio, rama `main`, archivo `app.py` → **Deploy**.
3. Cada push a `main` actualiza la app sola. Si el repositorio es privado, la app también lo es por defecto: invita a quien quieras desde **Share**.

## Aviso

Es un modelo estadístico con una muestra pequeña. No garantiza ningún beneficio: juega con responsabilidad.
