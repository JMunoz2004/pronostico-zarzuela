# Pronóstico La Zarzuela

App de Streamlit (y página autocontenida `index.html`) que pronostica las carreras de cada domingo en el Hipódromo de La Zarzuela y se ajusta en directo el día de la carrera.

**Cada semana:** sigue [ACTUALIZAR.md](ACTUALIZAR.md). Son 3 pasos y un `git push`.

## Qué hace

- **Probabilidad de ganar y de quedar entre los tres primeros** de cada caballo, a partir de nueve factores: forma, distancia, clase, terreno, rivales, jinete, preparador, peso y cajón. Los pesos se entrenan jornada a jornada con las anteriores (walk-forward) y se pueden cambiar con deslizadores.
- **Forma y distancia con historial fechado:** para cada caballo se usan sus últimas 5 carreras de los últimos 12 meses, en cualquier hipódromo (La Zarzuela, San Sebastián, Francia…).
  - Cada carrera pesa más cuanto más reciente es (vida media ≈ 2 meses).
  - El puesto se corrige por el nº de participantes.
  - Con pocas carreras, el factor se acerca al neutro.
- **Categorías:** tabla por caballo con cuántas veces ha corrido en cada categoría (Listed, A–D, extranjero) en el último año y sus puestos, p. ej. «Cat. C: 3 (2º, 3º, 6º)».
- **Pedigrí:** padre, madre y abuelo materno de cada caballo (fichas de A Galopar), con sus ganancias y la suma por carrera.
- **Edad:** curva de rendimiento por edad (pico ~4½ años, declive más rápido en distancias largas; Gramm y Marksteiner, 2010) frente a la edad media del lote; no cuenta en carreras de una sola edad. La ficha de cada caballo muestra sus carreras, victorias y podios a cada edad.
- **Clase:** nivel de categoría de cada caballo con todas sus carreras conocidas (Listed, A, B, C, D, corregido por el puesto), comparado con el resto del lote: quien corre en categorías mejores sale por encima.
- **Rivales directos y cruzados:** con todas las carreras conocidas se ajusta un modelo de Bradley-Terry («quién llega por delante de quién»), ponderando lo reciente, la distancia y los kilos. La ficha de cada caballo lista sus enfrentamientos directos con los rivales de ese día.
- **Carreras anteriores por distancia y terreno:** eliges un rango de distancias (por defecto la de la carrera ±200 m, o cualquiera) y un terreno (bueno, bueno a blando, blando, pesado, blando o más…) y salen todas las carreras conocidas de los caballos en ese rango (fecha, hipódromo, terreno, puesto, kilos y jinete) y todas las montas de los jinetes de ese día (caballo, puesto, kilos, preparador), con su resumen de victorias y podios. Se puede ver para la carrera seleccionada o para todo el día.
- **Estado de la pista** de cada jornada en `datos/terreno.csv` (se usa en el factor terreno y, con 3 o más jornadas conocidas, se entrena su peso).
- **Tiempo por carrera:** cielo y temperatura. La lluvia ablanda la pista para esa carrera y las siguientes.
- **Bajas de última hora:** pulsas el caballo y se recalcula todo sin él.
- **Gemelas y tríos** por simulación (20.000 carreras simuladas por carrera, teniendo en cuenta la regularidad de cada caballo).
- **Apuesta de valor / arriesgada:** con las cuotas de la casa, mezcla mercado y modelo, calcula el valor esperado y propone ¼ de Kelly.
- **Simulación gráfica** (botón «▶ Simulación» arriba): la carrera seleccionada en una pista esquemática con los caballos moviéndose, las vueltas, lo que queda y la clasificación en cada momento. Cada simulación es una llegada posible: cada caballo gana con la probabilidad del modelo.
- **Combinada de 3 y 4 carreras seguidas (sucesos dependientes):** árbol exacto de ganadores; para cada ganador posible de una carrera se recalcula la siguiente con ese resultado ya corrido (victoria del día para su jinete y preparador, sesgo de cajón y estadística de temporada). Da las combinaciones más probables, su cuota justa, la diferencia con suponerlas independientes y la mejor jugada para un máximo de combinaciones.
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

## Usarla sin cobertura (móvil)

La página también se publica en **https://jmunoz2004.github.io/pronostico-zarzuela/** (GitHub Pages: Settings → Pages → Deploy from a branch → `main` / raíz). Ábrela una vez con conexión y añádela a la pantalla de inicio (Android/Chrome: menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio»; iPhone/Safari: compartir → «Añadir a pantalla de inicio»). Desde entonces abre sin conexión: todo el cálculo se hace en el móvil y lo que escribes (bajas, tiempo, cuotas, llegadas) se guarda en él. Arriba indica si estás usando la copia guardada y de cuándo son los datos. Streamlit, en cambio, necesita conexión.

## Publicar en Streamlit Community Cloud

1. Entra en [share.streamlit.io](https://share.streamlit.io) con tu cuenta de GitHub.
2. **Create app** → elige este repositorio, rama `main`, archivo `app.py` → **Deploy**.
3. Cada push a `main` actualiza la app sola. Si el repositorio es privado, la app también lo es por defecto: invita a quien quieras desde **Share**.

## Aviso

Es un modelo estadístico con una muestra pequeña. No garantiza ningún beneficio: juega con responsabilidad.
