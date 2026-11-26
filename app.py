"""App de Streamlit: muestra el pronóstico interactivo (index.html) a pantalla completa.

La página se genera con `node train.js && python3 build.py` a partir de la carpeta datos/.
En GitHub, la acción .github/workflows/actualizar.yml la regenera sola en cada push que cambie datos/ o src/.
"""
import json
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).parent
st.set_page_config(page_title="Pronóstico La Zarzuela", page_icon="🏇", layout="wide", initial_sidebar_state="collapsed")
st.markdown(
    "<style>.block-container{padding:0 0 1rem;max-width:100%}header[data-testid='stHeader']{height:0;visibility:hidden}"
    "iframe{border:0}</style>",
    unsafe_allow_html=True,
)

html_path = ROOT / "index.html"
if not html_path.exists():
    st.error("Falta index.html. Ejecuta `node train.js && python3 build.py` y haz commit del resultado.")
    st.stop()

carta = json.loads((ROOT / "datos" / "carta.json").read_text(encoding="utf-8"))
jornadas = sorted(p.stem for p in (ROOT / "datos" / "jornadas").glob("*.txt"))

with st.sidebar:
    st.header("Datos cargados")
    st.write(f"**Carta:** {carta.get('hipodromo', 'La Zarzuela')}, {carta['fecha']} · {len(carta['carreras'])} carreras")
    st.write(f"**Jornadas de entrenamiento:** {len(jornadas)} ({jornadas[0]} → {jornadas[-1]})" if jornadas else "Sin jornadas")
    st.markdown("**Sin cobertura en el hipódromo:** abre [la versión instalable](https://jmunoz2004.github.io/pronostico-zarzuela/) "
                "y añádela a la pantalla de inicio; funciona sin conexión.")
    st.download_button("Descargar la página (index.html)", html_path.read_bytes(), "pronostico-zarzuela.html", "text/html")
    st.caption("Tus bajas, tiempo, cuotas y llegadas se guardan en este navegador.")

if hasattr(st, "iframe"):
    st.iframe(html_path, height="content")  # se ajusta solo al alto de la página
else:  # versiones antiguas de Streamlit
    import streamlit.components.v1 as components
    components.html(html_path.read_text(encoding="utf-8"), height=4200, scrolling=True)
