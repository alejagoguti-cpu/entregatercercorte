# Modelo de agentes Kennedy360 · protocolo ODD

Código: `tools/unreal/simular_agentes.py` (cálculo) y `tools/unreal/agentes_ren3d.py` (secuencias de Unreal).
Resultados de la última corrida: `Importar/agentes/RESULTADOS.md` y `resultados.json`.

Etiquetas de evidencia (arquitectura del curso, §0.1): **[PUB]** viene de una fuente publicada · **[SYN]** síntesis de diseño propia · **[SUP]** supuesto declarado sin dato, para discutir · **[GRUPO]** cifra de los documentos del grupo.

## 1. Propósito y patrones

**Problema que ordena el modelo (corrección 3.1).** La concentración de los alimentos en un solo nodo, Corabastos, genera dependencia en Kennedy. No es la concentración del mercado ni de la propiedad: es por dónde pasa físicamente la comida que se consume en el barrio.

**Cómo se mide la dependencia.** Fracción del volumen (kg/día) consumido por tiendas, comedores y colegios que pasó por Corabastos. Se reporta también por grupo de alimentos, que muestra la variedad que sigue dependiendo.

**Para qué sirve (corrección 3.9).** Lo usan la mesa de la federación y los actores del territorio para ver cómo respondería el sistema a la propuesta: cuánto deja de pasar por la central, qué se sigue trayendo de fuera, qué pasa si falla la energía del distrito y qué hace la central cuando pierde volumen. La animación en Unreal está pensada para que alguien que no conoce el proyecto lo entienda.

**Qué se replica.** El mecanismo, no el distrito: producción local de lo que el barrio puede producir, compra conjunta de lo que no, un punto de acopio con reglas de reparto rotativo y una red biótica con custodios. Sirve en barrios con (a) dependencia de una central mayorista, (b) suelo disponible junto a un cuerpo de agua o una central, (c) tiendas de barrio y comedores organizables.

**Patrones (POM, Grimm et al. 2005 [PUB]).** Fauna: bandadas cohesionadas que se parten ante la rapaz y se rearman; enjambre de insectos compacto sobre el agua; las abejas concentran visitas en los parches con néctar. Alimentos: la dependencia baja y se estabiliza (no llega a cero); la central baja su precio cuando pierde volumen; un apagón sube la dependencia de forma pasajera.

## 2. Entidades, variables y escalas

| Entidad | Tipo (corrección 3.6) | Variables | Quién la agencia |
|---|---|---|---|
| Golondrina albiazul, torcaza, aguililla caminera | especie (no humano) | posición 3D, dirección, vivo | custodios del humedal |
| Quironómidos | especie (cohorte) | posición, velocidad, vivo | — |
| Focha, pato zambullidor, garza blanca, garcilla | especie (no humano) | posición en el agua u orilla | custodios del humedal |
| Abejas | especie (no humano) | posición, carga, memoria atractiva y repulsiva | hortelanos |
| Flores (parches) | recurso | néctar, rasgos (tamaño, color, aroma), cultivo o nativa | hortelanos y custodios |
| Humedales El Burro y La Vaca | lugar | contorno | custodios (aula y sendero) y mesa de la ronda |
| Custodios | persona | posición en el sendero | — |
| Tiendas, comedores, colegios | organización | demanda por grupo, confianza en el acopio, sector | — |
| Corabastos | organización | precio, volumen | — |
| Punto de acopio, distrito, compostaje, huertas | infraestructura / lugar | oferta diaria, energía | federación (vocerías rotativas) |

Escalas: fauna en tiempo continuo con paso de 1/8 s, 10 min por escenario (60 s de calentamiento); alimentos con paso de un día, 120 días. Espacio: metros en las coordenadas de la georreferencia de Unreal (origen en el humedal El Burro), malla vial de `net.json`, contornos de `water_bodies.json` y `osm_suelo.json`.

## 3. Procesos y orden

Cada paso tiene tres fases (contrato §5.2): **lectura** de una instantánea y decisión de cada agente, **resolución** serial de las interacciones en un orden estable dado por el azar con dirección lógica (§10.2, §13.1), y **publicación** de los cambios por el motor. Nadie escribe en el estado de otro.

Fauna, por paso: bandadas (Couzin) → caza de insectos (cono de detección) → rapaz → elección de flor de las abejas → interacciones atómicas (caza, captura, néctar) → movimiento y recarga de néctar → métricas e invariantes.

Alimentos, por día: oferta local y de compra conjunta → pedidos de cada comprador (confianza + ventaja de precio) → reparto del acopio por sectores con prioridad rotativa → compras restantes en Corabastos u otros canales → aprendizaje de la confianza → respuesta de precio de la central.

## 4. Conceptos de diseño

- **Emergencia:** la forma de las bandadas, la curva de adopción del acopio y el nivel de dependencia salen de reglas locales, no se imponen.
- **Adaptación:** el tendero sube su confianza si el acopio le cumple más de la mitad de lo pedido y la baja si no.
- **Percepción:** zonas de Couzin con ángulo ciego; cono de detección de Lin & Abaid; rango de percepción floral de 90 m [SUP].
- **Interacción:** caza, captura y consumo de néctar son transacciones atómicas; las garzas se alejan de los custodios (distancia de huida de 15 m [SUP]).
- **Retroalimentación (corrección 3.2):** bucle de captura (más confianza → más pedidos al acopio → menos volumen en Corabastos) y bucle de respuesta de la central (menos volumen → precio más bajo → menos ventaja del acopio).
- **Gobernanza (corrección 3.5):** el acopio reparte por sectores de 500 m con turno rotativo diario y nadie recibe más de lo que pidió, para que el distrito no concentre ni favorezca.
- **Acople entre submodelos:** las polinizaciones de las abejas dan el factor de cosecha de las huertas, que entra a la oferta local.
- **Estocasticidad:** azar por dirección lógica (semilla, flujo, paso, agente); la misma semilla da la misma salida.
- **Observación:** métricas POM (polarización, giro de grupo, cohesión, visitas, dependencia) y cuentas cerradas.

## 5. Inicialización y entradas

Semilla 20261102. Poblaciones de fauna [SUP]: 60 golondrinas, 40 torcazas, 1 aguililla, 500 quironómidos, 16 fochas, 10 patos, 12 garzas, 80 abejas, 4 custodios. Red de alimentos: 144 tiendas y 6 comedores sobre calles locales, 10 colegios de OpenStreetMap, 10 huertas (6 en la ronda de El Burro de 1.500 m², 4 en el área cedida de 4.000 m²) [SUP]. Corabastos cede el 20,8 % de su área del lado del humedal La Vaca [GRUPO]; en el modelo el corte es recto y en la propuesta sigue las calles internas.

## 6. Submodelos

| Submodelo | Fuente | Parámetros |
|---|---|---|
| Bandada 3D (repulsión, orientación, atracción, ángulo ciego, giro limitado) | Couzin et al. 2002 [PUB] | zonas en metros [SUP]: golondrina 0,6 / 5 / 16 m, 9 m/s, 220°/s; torcaza 0,8 / 7 / 24 m, 12 m/s, 160°/s |
| Caza en cono y presas de Vicsek con ruido | Lin & Abaid 2013 [PUB] | cono de 7 m y 35° [SUP] |
| Rapaz: planeo, ataque cada 25 s, captura a 1,5 m con probabilidad 0,25 | [SYN] / [SUP] | — |
| Elección floral ((1 + DNV)/(1 + DPV))² / √(1 + d) con memoria | Qu et al. 2013 [PUB] | recarga de néctar cada 10 min, 3 s por flor [SUP] |
| Producción de huertas | [SUP] | 3 kg/m²/año; 35 % de la cosecha depende de polinizadores; +15 % con compost |
| Distrito de hongos | [SUP] | 700 kg/día; con apagón, 60 % (biogás + solar) |
| Compra conjunta | [SUP] | 3.500 kg/día de frutas, granos y tubérculos de asociaciones de productores |
| Demanda | [SUP] / [GRUPO] | tienda 120 kg/día; comedor 500 raciones [GRUPO]; colegio 800 raciones; 15 % de la carne pasa a hongos (valor del grupo, corrección 3.7) |
| Respuesta de la central | [SYN] / [SUP] | elasticidad 0,35 |

## 7. Invariantes y validación

Se comprueban en cada corrida: cuenta de insectos (vivos + comidos = emergidos), cuenta de néctar (producido = consumido + en flores), cuenta de alimentos (consumido = Corabastos + otros canales + acopio). Falta: calibrar con datos de campo (conteos de aves del humedal, compras reales de tenderos) y hacer análisis de sensibilidad de los [SUP]. Hasta entonces los resultados son **exploratorios** (§1, perfil «exploratory preview»): muestran el mecanismo y el orden de magnitud, no una predicción.

## 8. Límites declarados

- La compra conjunta es la palanca que más baja la dependencia; la producción local de hortalizas es pequeña frente a la demanda. Es un hallazgo del modelo y depende de los [SUP].
- Carne y lácteos siguen llegando por Corabastos: la autonomía es relativa.
- Los camiones externos que se ven en Unreal son solo la parte de Kennedy que el modelo cubre; Corabastos abastece a toda la ciudad.
- En la animación de alimentos el tiempo está comprimido: 60 s de video = la mañana de distribución; cada ficha es un viaje del día por la malla vial.
