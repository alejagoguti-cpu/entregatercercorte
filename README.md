# REN3D realista · Maqueta de Kennedy

## Simulador tipo God's Eye

La maqueta abre como simulador de vigilancia y tráfico (`data3d/simulador.js`), con la interfaz y los sensores inspirados en [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) (MIT, © 2026 Bilawal Sidhu):

- **HUD táctico:** REC y hora UTC, coordenadas del punto mirado, sector, GSD, altitud, rumbo y ángulo fuera del nadir.
- **Sensores (teclas 1-4):** Normal, CRT, NVG (visión nocturna) y FLIR (blanco caliente o ironbow). En FLIR el calor de motores y peatones es simulado a partir de su posición.
- **Detección:** recuadros con ID y velocidad sobre los carros de la simulación y los peatones cercanos.
- **Seguimiento:** clic sobre un carro o en la lista de contactos; la cámara lo acompaña con estela, velocidad, rumbo, posición y recorrido. `Esc` lo suelta.
- **Tráfico:** hora simulada, pausa, velocidad x1/x2/x5/x10, línea de tiempo, vehículos activos, velocidad media, porcentaje detenido y gráfica de velocidad media.
- **Vistas:** cenital (desde arriba) y oblicua (35°).
- **Celular:** el botón PANEL abre los controles como hoja inferior.
- **Vista fotorrealista (por defecto):** el mundo es la malla 3D de Google completa (edificios, árboles y suelo reales, con su profundidad), como Google Earth. Encima solo van los carros, peatones y aves de la simulación; el suelo de la malla se calibra midiendo su altura bajo los carros y se vuelve a medir al ir a otra zona. El botón **Maqueta** (o `?maqueta=1`) vuelve a la maqueta propia.

### Propuesta: descentralizar Corabastos (`data3d/propuesta.js`)

Paneles PROPUESTA, CÁMARA y RESULTADOS dentro del simulador (guía del Corte III, §4):

- **Variables que se mueven en vivo:** mercados de barrio (0-20), huertas comunitarias (0-30), área por huerta, % de compra directa a productores, distancia que la gente camina al mercado, precio del mercado frente a Corabastos, clima (normal, lluvia, sequía) y cerrar Corabastos.
- **Escenarios:** Actual, Propuesta y Choque (Corabastos cerrada con sequía).
- **Agentes sobre las vías reales:** camiones de Corabastos, furgones de productores, bicicargas de las huertas y compradores a pie. Los compradores comparan precio, transporte y confianza; si el mercado no les cumple, la confianza baja. Corabastos baja su precio cuando pierde volumen.
- **Resultados:** dependencia de Corabastos frente al escenario actual, kg de huertas y de compra directa, camiones por día, tiendas a pie de un mercado, distancia de abasto, demanda sin cubrir, precio y confianza.
- **Cámara tipo *Everything*:** salta de un agente a otro (carro, camión, furgón, bicicarga, comprador, peatón; tecla Tab) y cambia de escala (Agente, Barrio, Kennedy).
- Datos: `data3d/propuesta.json`, generado con `python tools/propuesta_datos.py` a partir de los nodos del modelo de agentes de Unreal y de los parques. Las cifras sin fuente están marcadas [SUP] en el código.

## Kennedy 360 (giro fotorrealista, como las maquetas de Umbra)

Web: https://anasoficasca-code.github.io/REN3D-realista/giro.html (el giro renderizado). La página `kennedy3d.html` es el **recorrido 3D libre por toda Kennedy** (CesiumJS + malla fotorrealista de Google): se arrastra para moverse con el ángulo fijo, clic derecho o dos dedos para girar, rueda o pellizco para acercar, WASD/QE en teclado, minimapa con el límite de la localidad y lugares de OpenStreetMap (`data3d/kennedy.json`, generado con `python tools/kennedy_limite.py`).

- 72 fotogramas renderizados en **Unreal Engine 5.8** con **Cesium for Unreal 2.30** y la malla fotorrealista de Google (Cesium ion, asset 2275207): la ciudad, los techos y los cerros son reales. Sol de Bogotá a las 10:48 a. m., bruma y gradación de color.
- La cámara gira alrededor del humedal El Burro (650 m de radio, 260 m de altura, lente de 20 mm), con el look de las maquetas de Umbra: sol de media mañana, saturación 1,22, sombras abiertas, imagen cálida y luminosa, bruma azulada solo a lo lejos.
- El visor (`giro.html`) carga primero vistas livianas (`giro/s_NNN.webp`) para girar de inmediato y luego la vista en alta (`giro/f_NNN.webp`) del ángulo donde se detiene. Los marcadores se proyectan con la misma cámara del render.
- Encima de la malla de Google van los edificios de REN3D (41 mil huellas con altura en 1,5 km alrededor del humedal, fachadas PBR de ladrillo fotográfico Poly Haven "Brick 4" con ventanas, marcos y placas) y 33.900 árboles tipo maqueta como instancias. Se generan con `python tools/unreal/exportar_edificios.py` (OBJ, árboles y texturas en `Kennedy360/Importar`), se importan con `importar_ren3d.py` y se ubican con `colocar_ren3d.py` (después de `armar_escena.py`, `ajustes_mundo.py`, `fijar_geo.py` y `ajustes_giro.py`).
- Para regenerar: el proyecto de Unreal (`tools/unreal/`: `Kennedy360.uproject`, `DefaultEngine.ini` y los scripts de Python) se arma con `UnrealEditor-Cmd ... -run=pythonscript -script=armar_escena.py` (el token de Cesium ion va en `Config/cesium_ion_token.txt`, que no se sube), se renderiza con Movie Render Queue y los fotogramas se convierten con `python tools/giro_build.py`.
- Las manchas blancas como nubes vienen de la propia malla de Google (fotos aéreas con nubes).

Maqueta 3D de Kennedy (Bogotá) sobre la **malla fotorrealista de Google** (Google Photorealistic 3D Tiles), cargada dentro de la misma escena Three.js que el modelo propio.

Web: https://anasoficasca-code.github.io/REN3D-realista/

## Qué es cada cosa

- **Fondo:** la malla de Google (foto real, fotogrametría aérea) se dibuja primero y luego se borra la profundidad. Es solo un fondo fotográfico: tiene errores de altura de varios metros y no puede tapar nada del modelo.
- **Encima, el modelo propio, siempre visible:** vías, aceras, parques, agua animada, edificios (`data3d/buildings.json`, 243 mil huellas con altura, paleta residencial y techos), árboles 3D reales con niveles de detalle (`data3d/real3d.js`), carros con las trayectorias reales de `kennedy_vehiculos.json`, peatones y aves de los humedales.
- **Máscara de huellas:** donde hay un edificio del modelo se recorta en el shader lo que Google levanta (`construirMascara`), para que no asome su versión "derretida".
- **Arranque rápido:** todos los datos se descargan a la vez y la pantalla de carga se cierra en cuanto están los edificios cercanos y las capas; la foto de Google entra sola cuando ya trae detalle.

## Datos livianos

| Dato | Antes | Ahora |
| --- | --- | --- |
| Tráfico | `kennedy_vehiculos.json` · 57 MB (18,4 MB comprimido), se leía de un golpe | `data3d/traf/c00…c14.bin` · 3,4 MB comprimido, en trozos de 100 s: primero el de la hora de inicio |
| Edificios | `buildings.json` · 37 MB (11,1 MB comprimido) | `data3d/edif/*.bin` · 4,0 MB comprimido, en 51 celdas de 1 km: primero las cercanas a la cámara |
| Edificios (celular) | `buildings_humedal.json` · 0,88 MB comprimido | `data3d/edif/humedal.bin` · 0,35 MB |
| Texturas del suelo | 7,5 MB | 2,5 MB (misma resolución, mejor compresión) |
| Mapa satelital oculto (maplibre) | se descargaba y construía 3.500 árboles sin verse | eliminado |

Los binarios se regeneran con `python tools/traf_build.py` y `python tools/edif_build.py` (leen los JSON originales, que siguen en `data3d/`).
- **Alineación:** el modelo de Rhino se georreferenció contra las calles de OpenStreetMap (solo traslación, sin giro ni inversión, error de pocos metros; ver `GEO` en `index.html`). La malla de Google se coloca en ese mismo sistema y se calibra al suelo midiendo su altura real alrededor de la cámara.
- **Botones:** Maqueta 3D, Noche y JUGAR (modo pájaro y VR).

## Límites conocidos

- Los edificios del modelo tienen color por edificio y techos, pero no fachadas fotográficas.
- Modo de diagnóstico: `?debug=1` muestra el estado de la malla; `?solo=malla` omite árboles, carros y aves (para probar en equipos lentos).
- La malla de Google es fotogrametría aérea: a nivel de calle las fachadas se ven borrosas y más aún en zonas de poca resolución. No se usan fotos de Street View: su licencia no permite descargarlas ni convertirlas en texturas.
- Los carros, árboles y peatones se asientan a una altura de suelo constante; donde el terreno fotográfico se desvía unos metros pueden quedar ligeramente hundidos o flotando.
- La malla de Google no se puede editar.

## Google Map Tiles API

- Llave `GKEY` en `index.html`, con **Map Tiles API** habilitada.
- La atribución de Google se muestra abajo a la izquierda y no debe ocultarse.
- Recomendado: en Google Cloud, restringir la llave por referente HTTP a `anasoficasca-code.github.io/*` y a esa sola API.
- Las teselas no se descargan ni se guardan en el repo: se piden en vivo.

## Técnica

- Three.js 0.160 y [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) 0.3.45 (plugins `GoogleCloudAuthPlugin` y `GLTFExtensionsPlugin`, decodificación Draco).
- Las teselas se muestran sin iluminar (la foto ya trae su luz) y con tono sin comprimir; en modo noche se oscurecen.
- Calidad: PC con error de pantalla 8 px; celular 22 px.

## Publicar

GitHub → repo `REN3D-realista` → Settings → Pages → Deploy from branch → `main` / `(root)`.
