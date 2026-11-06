/* ============ RED DE ACTORES POR ESTRATEGIA (modo Kennedy) ============
   E1 Bavaria Común · E2 Huertas en lotes baldíos · E3 Huertas en cubiertas en altura
   E4 Distrito biotecnológico · E5 Huertas en viviendas
   Proporciona visualización interactiva de la red de actores (humanos, no humanos y flujos ecosistémicos)
   al activar o pulsar cada estrategia. */

export const RED_DATA = {
  E1: {
    id: 'E1',
    n: 'Bavaria Común',
    sub: 'Recuperación comunitaria y nodo agroecológico de la antigua fábrica (71 ha)',
    c: '#38bdf8',
    centro: [2095.67, -109.06], // coord mundo 3D (scx, scz)
    zoom: { dist: 620, alto: 520 },
    proposito: 'Transformar el predio abandonado de 71 ha en un nodo de acopio, formación, producción agroecológica y conservación gobernado por la asamblea barrial, sin intermediarios mayoristas pesados.',
    humanos: [
      { id: 'vecinos', n: 'Vecinos y Asamblea Barrial', c: '#34d399', rol: 'Gobernanza participativa, comisiones de trabajo rotativas y rendición de cuentas.' },
      { id: 'productores', n: 'Productores Locales y Periurbanos', c: '#f59e0b', rol: 'Abastecimiento directo en patio interno sin intermediarios de tractomulas.' },
      { id: 'puesteros', n: 'Puesteros del Mercado de Proximidad', c: '#fb923c', rol: 'Puestos pequeños, cupos rotativos y venta solidaria por barrios.' },
      { id: 'recicladores', n: 'Recuperadores y Recicladores', c: '#a3e635', rol: 'Gestión circular de orgánicos para compostaje y sustrato micológico.' },
      { id: 'comedores', n: 'Comedores Comunitarios y Colegios', c: '#60a5fa', rol: 'Recepción de alimentos sanos, desayunos escolares y talleres pedagógicos.' },
      { id: 'cuidadoras', n: 'Red de Cuidadoras', c: '#f472b6', rol: 'Cuidado mutuo de infancias y personas mayores durante asambleas y mingas.' },
      { id: 'tecnico', n: 'Equipo Técnico y Agroecólogos', c: '#c084fc', rol: 'Acompañamiento en bioconstrucción, energía limpia y laboratorio de hongos.' }
    ],
    bioticos: [
      { id: 'bosque', n: 'Borde Arbolado y Dosel', c: '#166534', rol: 'Bosque protegido (eucaliptos y nativas); conexión biológica con humedales.' },
      { id: 'aves_e1', n: 'Aves del Humedal y Bosque', c: '#D1A996', rol: 'Tingua bogotana, garzas y copetones que anidan y transitan hacia El Burro.' },
      { id: 'hongos_e1', n: 'Hongos Orellana (Micelio)', c: '#e9d5ff', rol: 'Biotransformación de residuos celulósicos en proteína vegetal limpia.' },
      { id: 'lombrices_e1', n: 'Lombriz Roja y Suelo', c: '#be123c', rol: 'Descomposición acelerada de restos orgánicos en humus fértil.' },
      { id: 'polinizadores_e1', n: 'Abejas y Polinizadores', c: '#fde047', rol: 'Polinización cruzada entre el huerto interno y la reserva forestal.' }
    ],
    flujos: [
      { de: 'productores', a: 'puesteros', t: 'Venta directa de alimentos sin peaje ni flete especulativo' },
      { de: 'puesteros', a: 'comedores', t: 'Canastas de hortalizas para comedores infantiles y comunitarios' },
      { de: 'puesteros', a: 'recicladores', t: 'Merma orgánica seleccionada para aprovechamiento' },
      { de: 'recicladores', a: 'hongos_e1', t: 'Sustrato esterilizado para bolsas de cultivo de orellana' },
      { de: 'recicladores', a: 'lombrices_e1', t: 'Materia orgánica compostable para camas de lombriz' },
      { de: 'lombrices_e1', a: 'bosque', t: 'Humus para enriquecer suelo degradado y huerto' },
      { de: 'bosque', a: 'polinizadores_e1', t: 'Refugio, néctar y hábitat protegido sin pesticidas' },
      { de: 'polinizadores_e1', a: 'aves_e1', t: 'Equilibrio biótico e interacción trófica en el corredor' },
      { de: 'vecinos', a: 'cuidadoras', t: 'Espacios comunitarios seguros y red de apoyo mutuo' }
    ]
  },
  E2: {
    id: 'E2',
    n: 'Huertas en lotes baldíos',
    sub: 'Transformación de predios abandonados en oasis agroecológicos y soberanía alimentaria',
    c: '#a3e635',
    centro: [7299, 4000],
    zoom: { dist: 380, alto: 310 },
    proposito: 'Recuperar predios ociosos y baldíos mediante custodia colectiva, instalando camas de cultivo agroecológico, colmenas urbanas y compostaje comunitario.',
    humanos: [
      { id: 'huerteros', n: 'Huerteros y Huerteras Comunitarias', c: '#84cc16', rol: 'Siembra, biofertilización, manejo integrado de cultivos y cosecha colectiva.' },
      { id: 'recuperadores_e2', n: 'Recuperadores Ambientales', c: '#fb7185', rol: 'Aporte de materia orgánica recuperada de plazas de mercado y fruterías.' },
      { id: 'jovenes_e2', n: 'Colectivos Juveniles y Ambientales', c: '#38bdf8', rol: 'Mingas de deshierbe, monitoreo biocultural, riego y diseño de permacultura.' },
      { id: 'vecinos_e2', n: 'Vecinos de la Cuadra', c: '#34d399', rol: 'Separación en origen, compra solidaria a precio justo y trueque vecinal.' },
      { id: 'lideres_jac', n: 'Junta de Acción Comunal (JAC)', c: '#fb923c', rol: 'Gestión comunitaria de custodia del suelo y defensa contra basureros ilegales.' }
    ],
    bioticos: [
      { id: 'abejas_e2', n: 'Abejas nativas y melíferas', c: '#fde047', rol: 'Polinización intensiva de flores de calabacín, tomate, frijol y aromáticas.' },
      { id: 'copeton_e2', n: 'Copetón y Aves insectívoras', c: '#a16207', rol: 'Control natural de plagas (orugas, pulgones) y dinamización del suelo.' },
      { id: 'colibri_e2', n: 'Colibrí chillón', c: '#22d3ee', rol: 'Polinización de flores tubulares y barreras vivas de salvias y fucsias.' },
      { id: 'lombriz_e2', n: 'Lombriz roja y microbiota edáfica', c: '#be123c', rol: 'Transformación de residuos en humus rico en nitrógeno y fósforo.' },
      { id: 'flora_e2', n: 'Policultivo y Flora medicinal', c: '#4ade80', rol: 'Bancales diversificados con caléndula, acelga, maíz, borraja y cubios.' }
    ],
    flujos: [
      { de: 'recuperadores_e2', a: 'lombriz_e2', t: 'Aporte de restos de podas y vegetales de plazas' },
      { de: 'lombriz_e2', a: 'flora_e2', t: 'Humus y biopreparados para regenerar suelos compactados' },
      { de: 'flora_e2', a: 'abejas_e2', t: 'Floración continua con néctar y polen libre de tóxicos' },
      { de: 'abejas_e2', a: 'flora_e2', t: 'Polinización cruzada que multiplica el cuajado de frutos' },
      { de: 'copeton_e2', a: 'flora_e2', t: 'Control biológico de insectos plaga sin usar pesticidas' },
      { de: 'huerteros', a: 'vecinos_e2', t: 'Canastas de verduras frescas cosechadas en el mismo barrio' },
      { de: 'vecinos_e2', a: 'recuperadores_e2', t: 'Entrega de residuos de cocina clasificados en baldes' },
      { de: 'jovenes_e2', a: 'huerteros', t: 'Fuerza de trabajo en mingas y registro de datos climáticos' }
    ]
  },
  E3: {
    id: 'E3',
    n: 'Huertas en cubiertas en altura',
    sub: 'Agricultura en techos y terrazas de conjuntos residenciales multifamiliares',
    c: '#f59e0b',
    centro: [7693, 4292],
    zoom: { dist: 350, alto: 290 },
    proposito: 'Aprovechar las losas y cubiertas de edificios en altura para huertos elevados, captación de aguas pluviales y amortiguación térmica de la isla de calor urbana.',
    humanos: [
      { id: 'residentes_e3', n: 'Residentes de Propiedad Horizontal', c: '#f59e0b', rol: 'Cuidado diario de bancales livianos y huertos verticales por turnos.' },
      { id: 'comite_e3', n: 'Comité de Convivencia y Admin', c: '#60a5fa', rol: 'Reglamento de uso común de terrazas, acuerdos de convivencia y seguridad.' },
      { id: 'abuelos_e3', n: 'Adultos Mayores', c: '#34d399', rol: 'Terapia hortícola matutina, monitoreo de germinación y saberes tradicionales.' },
      { id: 'ninos_e3', n: 'Infancias y Colegios', c: '#f472b6', rol: 'Talleres pedagógicos de ciencia viva y conocimiento del ciclo del agua.' },
      { id: 'cocineras_e3', n: 'Familias y Cocinas del Edificio', c: '#fb923c', rol: 'Consumo de hierbas aromáticas frescas, infusiones y ensaladas de azotea.' }
    ],
    bioticos: [
      { id: 'polinizadores_e3', n: 'Polinizadores de Altura', c: '#fde047', rol: 'Abejas urbanas, abejorros y sírfidos en corredores de vuelo aéreo.' },
      { id: 'aves_techo', n: 'Aves de estrato alto (Mirla, Torcaza)', c: '#334155', rol: 'Puntos de escala y descanso en desplazamientos entre humedales y cerros.' },
      { id: 'plantas_azotea', n: 'Hortalizas de raíz corta y aromáticas', c: '#84cc16', rol: 'Romero, menta, lechugas, albahaca, tomillo y rábano en sustrato ligero.' },
      { id: 'agua_lluvia_e3', n: 'Cosecha de Agua Pluvial', c: '#38bdf8', rol: 'Tanques de captación de lluvia para riego por goteo sin usar agua potable.' },
      { id: 'sustrato_ligero', n: 'Sustrato aireado (Cascarilla y Coco)', c: '#a16207', rol: 'Mezcla sin tierra pesada para no comprometer la carga viva del edificio.' }
    ],
    flujos: [
      { de: 'agua_lluvia_e3', a: 'plantas_azotea', t: 'Riego eficiente por gravedad y sensores de humedad' },
      { de: 'sustrato_ligero', a: 'plantas_azotea', t: 'Nutrición balanceada con lombricompost líquido' },
      { de: 'plantas_azotea', a: 'polinizadores_e3', t: 'Islas de néctar en la cota superior del paisaje edificado' },
      { de: 'polinizadores_e3', a: 'aves_techo', t: 'Conectividad ecológica entre terrazas verdes vecinas' },
      { de: 'plantas_azotea', a: 'cocineras_e3', t: 'Aromáticas y hortalizas cosechadas a pasos del apartamento' },
      { de: 'abuelos_e3', a: 'ninos_e3', t: 'Transmisión intergeneracional del amor por la tierra' },
      { de: 'residentes_e3', a: 'comite_e3', t: 'Paz comunitaria y corresponsabilidad en el mantenimiento' }
    ]
  },
  E4: {
    id: 'E4',
    n: 'Distrito biotecnológico popular',
    sub: 'Biotransformación de residuos de Corabastos en micoproteína y bioinsumos',
    c: '#a78bfa',
    centro: [7299, 5815],
    zoom: { dist: 420, alto: 340 },
    proposito: 'Articular la gigantesca generación de residuos orgánicos de Corabastos con laboratorios populares de micelio, produciendo hongos comestibles (orellanas) y biofertilizantes.',
    humanos: [
      { id: 'madres_bio', n: 'Madres Comunitarias y Emprendedoras', c: '#f472b6', rol: 'Inoculación, incubación y cosecha controlada de setas orellanas.' },
      { id: 'jovenes_bio', n: 'Jóvenes Biotecnólogos Populares', c: '#c084fc', rol: 'Esterilización, aislamiento de cepas nativas y control de parámetros.' },
      { id: 'recu_cora', n: 'Recuperadores de Corabastos', c: '#fb7185', rol: 'Recolección y acarreo de rastrojos, cascarillas y bagazos limpios.' },
      { id: 'agroecologos_e4', n: 'Científicos Comunitarios', c: '#38bdf8', rol: 'Acompañamiento en bioseguridad, cepas fúngicas y bioinsumos líquidos.' },
      { id: 'cocinas_e4', n: 'Cocinas Populares y Tiendas', c: '#facc15', rol: 'Comercialización barrial de orellana como reemplazo asequible de carne.' }
    ],
    bioticos: [
      { id: 'orellana_sp', n: 'Hongo Orellana (Pleurotus ostreatus)', c: '#e9d5ff', rol: 'Hongo saprófito voraz que digiere celulosa y produce proteína rica.' },
      { id: 'micelio_vivo', n: 'Micelio colonizador', c: '#a78bfa', rol: 'Red hifal que compacta el sustrato vegetal convirtiéndolo en biomaterial.' },
      { id: 'biomasa_cora', n: 'Biomasa residual de Corabastos', c: '#fb923c', rol: 'Restos de maíz, viruta, paja y cáscaras vegetales ricas en carbono.' },
      { id: 'microbiota_ferm', n: 'Microorganismos benéficos', c: '#34d399', rol: 'Levaduras y bacterias fermentativas que producen biol y abonos foliares.' },
      { id: 'sustrato_post', n: 'Sustrato agotado poscosecha', c: '#84cc16', rol: 'Enmienda de suelo ultra fértil entregada a las huertas E2, E3 y E5.' }
    ],
    flujos: [
      { de: 'recu_cora', a: 'biomasa_cora', t: 'Rescate diario de toneladas de fibra vegetal antes del botadero' },
      { de: 'biomasa_cora', a: 'micelio_vivo', t: 'Pasteurización al vapor e inoculación con micelio vigoroso' },
      { de: 'madres_bio', a: 'orellana_sp', t: 'Cámaras de fructificación húmedas y cosecha de racimos' },
      { de: 'orellana_sp', a: 'cocinas_e4', t: 'Distribución a restaurantes, piqueteaderos y amas de casa' },
      { de: 'orellana_sp', a: 'sustrato_post', t: 'El hongo digiere la fibra y deja un sustrato rico en humus' },
      { de: 'sustrato_post', a: 'agroecologos_e4', t: 'Distribución gratuita de compost micológico a huertas del barrio' },
      { de: 'jovenes_bio', a: 'madres_bio', t: 'Transferencia tecnológica de cultivo limpio sin químicos' }
    ]
  },
  E5: {
    id: 'E5',
    n: 'Huertas en viviendas',
    sub: 'Microhuertos familiares en patios, antejardines, balcones y solares',
    c: '#f472b6',
    centro: [7183, 3758],
    zoom: { dist: 480, alto: 380 },
    proposito: 'Consolidar la red capilar de agricultura doméstica en miles de viviendas de Kennedy, activando composteras caseras, intercambio de semillas y autonomía familiar.',
    humanos: [
      { id: 'familias_e5', n: 'Familias y Hogares Huerteros', c: '#f472b6', rol: 'Manejo de macetas, canastillas, composteras de cocina y solares.' },
      { id: 'abuelas_semillas', n: 'Abuelas y Guardianas de Semillas', c: '#fb923c', rol: 'Custodia de semillas criollas de tomate chonto, cilantro cimarrón y ají.' },
      { id: 'red_trueque_e5', n: 'Red Barrial de Intercambio', c: '#38bdf8', rol: 'Intercambio dominical de plántulas, hijuelos, abono y recetas tradicionales.' },
      { id: 'ninos_hogar', n: 'Niñas y Niños en Casa', c: '#60a5fa', rol: 'Riego, cuidado de lombrices y aprendizaje directo de soberanía alimentaria.' },
      { id: 'vecinos_cuadra', n: 'Comité de Cuadra y Callejón', c: '#a3e635', rol: 'Aprovechamiento de antejardines como corredores verdes caminables.' }
    ],
    bioticos: [
      { id: 'colibri_patio', n: 'Colibríes urbanos de traspatio', c: '#22d3ee', rol: 'Visitan flores de limonaria, uchuvas, abutilones y fucsias de patio.' },
      { id: 'mariposas_jardin', n: 'Mariposas y Polinizadores menores', c: '#fde047', rol: 'Polinización de flores hortícolas y plantas ornamentales benéficas.' },
      { id: 'lombrices_caseras', n: 'Lombricomposteras de balde', c: '#be123c', rol: 'Degradación in situ de restos de frutas y café sin generar olores.' },
      { id: 'plantas_patio', n: 'Policultivo doméstico y aromáticas', c: '#34d399', rol: 'Cebolla en rama, toronjil, yerbabuena, tomate cherry, acelga y caléndula.' },
      { id: 'suelo_vivo_e5', n: 'Suelo vivo en maceta y solar', c: '#a16207', rol: 'Tierra negra enriquecida continuamente con lixiviados de cocina.' }
    ],
    flujos: [
      { de: 'familias_e5', a: 'lombrices_caseras', t: 'Separación inmediata de cáscaras, borra de café y hojas secas' },
      { de: 'lombrices_caseras', a: 'suelo_vivo_e5', t: 'Lixiviados y humus puro para nutrir tiestos y jardines' },
      { de: 'suelo_vivo_e5', a: 'plantas_patio', t: 'Producción sana sin fungicidas tóxicos en el hogar' },
      { de: 'plantas_patio', a: 'colibri_patio', t: 'Refugios de biodiversidad intercalados en la malla de casas' },
      { de: 'abuelas_semillas', a: 'red_trueque_e5', t: 'Circulación libre de semillas adaptadas a la altitud de Kennedy' },
      { de: 'plantas_patio', a: 'familias_e5', t: 'Infusiones medicinales frescas y verduras cosechadas al almuerzo' },
      { de: 'ninos_hogar', a: 'plantas_patio', t: 'Cuidado amoroso diario y comprensión de los ciclos biológicos' }
    ]
  }
};

let panelEl = null;
let activeStrategyId = null;
let activeTab = 'red';
let selectedNodeId = null;

export function iniciarRedActoresUI({ T3, lw, OX = 2095.67, OZ = -109.06, Y0 = 2.0 }) {
  // Inyectar estilos modernos y responsivos para la Red de Actores
  const style = document.createElement('style');
  style.id = 'ra-styles';
  style.textContent = `
#ra-modal{position:fixed;z-index:25;right:18px;top:54px;width:min(470px,calc(100vw - 28px));max-height:calc(100vh - 80px);background:rgba(8,16,26,.92);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1.5px solid var(--ra-c,rgba(125,211,252,.4));border-radius:18px;box-shadow:0 20px 45px rgba(0,0,0,.6);color:#e2f3ff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;overflow:hidden;transition:transform .25s ease,opacity .25s ease;transform:translateY(0);opacity:1}
#ra-modal.oculto{display:none;opacity:0;transform:translateY(15px);pointer-events:none}
#ra-header{padding:12px 14px 10px;background:rgba(15,23,42,.6);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:flex-start;gap:10px}
#ra-badge{flex:none;font-weight:900;font-size:11px;padding:3px 9px;border-radius:7px;background:var(--ra-c,#38bdf8);color:#04121c;letter-spacing:.05em}
#ra-tit{flex:1;min-width:0}
#ra-tit h4{margin:0;font-size:14.5px;font-weight:750;color:#f8fafc;display:flex;align-items:center;gap:6px}
#ra-tit p{margin:2px 0 0;font-size:11px;color:#94a3b8;line-height:1.35}
#ra-close{flex:none;width:28px;height:28px;border-radius:8px;border:none;background:rgba(255,255,255,.08);color:#cbd5e1;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
#ra-close:hover{background:rgba(239,68,68,.3);color:#fecaca}
#ra-tabs{display:flex;gap:4px;padding:8px 12px;background:rgba(0,0,0,.25);border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto}
#ra-tabs button{flex:1;white-space:nowrap;padding:6px 9px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:#cbd5e1;font-size:10.5px;font-weight:700;cursor:pointer;transition:all .15s}
#ra-tabs button.on{background:var(--ra-c,#38bdf8);color:#04121c}
#ra-body{padding:12px 14px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;max-height:calc(100vh - 220px)}
#ra-body::-webkit-scrollbar{width:5px}
#ra-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:4px}
.ra-svg-wrap{position:relative;width:100%;height:270px;background:radial-gradient(ellipse at center,rgba(15,23,42,.85) 0%,rgba(6,11,19,.98) 100%);border-radius:12px;border:1px solid rgba(255,255,255,.07);overflow:hidden}
.ra-svg-wrap svg{width:100%;height:100%;display:block}
.ra-link{stroke-linecap:round;transition:stroke .2s,stroke-width .2s}
.ra-link.anim{stroke-dasharray:5 4;animation:raDash 1.2s linear infinite}
@keyframes raDash{to{stroke-dashoffset:-18}}
.ra-node{cursor:pointer;transition:transform .15s}
.ra-node:hover circle{stroke:#fff;stroke-width:2.5px}
.ra-node.sel circle{stroke:#fff;stroke-width:3px;filter:drop-shadow(0 0 8px var(--ra-c))}
.ra-card-info{margin-top:10px;padding:9px 11px;border-radius:10px;background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.08);font-size:11.5px}
.ra-card-info b{color:var(--ra-c,#38bdf8);font-size:12px;display:block;margin-bottom:2px}
.ra-card-info small{color:#94a3b8;display:block}
.ra-lista{display:flex;flex-direction:column;gap:7px}
.ra-item{display:flex;gap:10px;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.05);font-size:11.5px}
.ra-dot{width:11px;height:11px;border-radius:50%;flex:none;margin-top:3px}
.ra-item-info b{font-size:12px;color:#f1f5f9;display:block}
.ra-item-info p{margin:2px 0 0;color:#cbd5e1;line-height:1.35}
.ra-flujo-item{padding:7px 9px;border-radius:8px;background:rgba(255,255,255,.03);border-left:3px solid var(--ra-c);margin-bottom:6px;font-size:11.5px}
.ra-flujo-item .fl-tit{font-weight:700;color:#f8fafc;display:flex;align-items:center;gap:6px;margin-bottom:2px}
.ra-flujo-item .fl-desc{color:#94a3b8;font-size:11px}
.ra-leyenda{display:flex;gap:12px;justify-content:center;margin-top:7px;font-size:10px;color:#94a3b8}
.ra-leyenda span{display:flex;align-items:center;gap:4px}
.ra-leyenda i{display:inline-block;width:8px;height:8px;border-radius:50%}
@media(max-width:760px){
  #ra-modal{right:8px;left:8px;width:auto;top:auto;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px);max-height:64vh}
  .ra-svg-wrap{height:220px}
}
`;
  document.head.appendChild(style);

  // Crear modal contenedor
  panelEl = document.createElement('div');
  panelEl.id = 'ra-modal';
  panelEl.className = 'oculto';
  document.body.appendChild(panelEl);

  function volarA(cx, cz, dist, alto) {
    if (!T3 || !T3.camera || !T3.orbit) return;
    const t = new THREE.Vector3(cx, Y0, cz);
    const p1 = new THREE.Vector3(cx - dist * 0.45, alto, cz + dist * 0.7);
    T3.anim = { t: 0, dur: 1.4, p0: T3.camera.position.clone(), p1, c0: T3.orbit.target.clone(), c1: t };
  }

  function renderizarModal() {
    if (!activeStrategyId || !RED_DATA[activeStrategyId]) return;
    const data = RED_DATA[activeStrategyId];
    panelEl.style.setProperty('--ra-c', data.c);

    panelEl.innerHTML = `
      <div id="ra-header">
        <span id="ra-badge">${data.id}</span>
        <div id="ra-tit">
          <h4>${data.n}</h4>
          <p>${data.sub}</p>
        </div>
        <button id="ra-close" aria-label="Cerrar">✕</button>
      </div>
      <div id="ra-tabs">
        <button data-t="red" class="${activeTab === 'red' ? 'on' : ''}">🕸️ Red de Actores</button>
        <button data-t="humanos" class="${activeTab === 'humanos' ? 'on' : ''}">👥 Humanos (${data.humanos.length})</button>
        <button data-t="bioticos" class="${activeTab === 'bioticos' ? 'on' : ''}">🌿 Bióticos (${data.bioticos.length})</button>
        <button data-t="flujos" class="${activeTab === 'flujos' ? 'on' : ''}">🔄 Flujos (${data.flujos.length})</button>
      </div>
      <div id="ra-body"></div>
    `;

    panelEl.querySelector('#ra-close').onclick = () => ocultarRedActores();
    panelEl.querySelectorAll('#ra-tabs button').forEach(b => {
      b.onclick = () => {
        activeTab = b.dataset.t;
        panelEl.querySelectorAll('#ra-tabs button').forEach(x => x.classList.toggle('on', x === b));
        renderizarTab();
      };
    });

    renderizarTab();
    panelEl.classList.remove('oculto');
  }

  function renderizarTab() {
    const body = panelEl.querySelector('#ra-body');
    if (!body || !activeStrategyId) return;
    const data = RED_DATA[activeStrategyId];

    if (activeTab === 'red') {
      body.innerHTML = `
        <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;line-height:1.4">
          <b>Dinámica de la red:</b> ${data.proposito}
        </div>
        <div class="ra-svg-wrap">
          <svg viewBox="0 0 400 250" id="ra-graph-svg"></svg>
        </div>
        <div class="ra-leyenda">
          <span><i style="background:#38bdf8"></i> Humanos</span>
          <span><i style="background:#4ade80"></i> Bióticos / Fauna</span>
          <span><i style="background:#f59e0b"></i> Enlaces y Flujos</span>
        </div>
        <div class="ra-card-info" id="ra-node-info">
          <b>Toca un nodo en el diagrama</b>
          <small>Podrás ver cómo interactúa ese actor con los demás en la estrategia.</small>
        </div>
      `;
      dibujarGrafoSVG(data);
    } else if (activeTab === 'humanos') {
      body.innerHTML = `
        <div class="ra-lista">
          ${data.humanos.map(h => `
            <div class="ra-item">
              <span class="ra-dot" style="background:${h.c}"></span>
              <div class="ra-item-info">
                <b>${h.n}</b>
                <p>${h.rol}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeTab === 'bioticos') {
      body.innerHTML = `
        <div class="ra-lista">
          ${data.bioticos.map(b => `
            <div class="ra-item">
              <span class="ra-dot" style="background:${b.c}"></span>
              <div class="ra-item-info">
                <b>${b.n}</b>
                <p>${b.rol}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeTab === 'flujos') {
      body.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">Circuitos e intercambios ecológicos y sociales:</div>
        <div>
          ${data.flujos.map(f => {
            const deN = [...data.humanos, ...data.bioticos].find(x => x.id === f.de)?.n || f.de;
            const aN = [...data.humanos, ...data.bioticos].find(x => x.id === f.a)?.n || f.a;
            return `
              <div class="ra-flujo-item">
                <div class="fl-tit">${deN} ➔ ${aN}</div>
                <div class="fl-desc">${f.t}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  function dibujarGrafoSVG(data) {
    const svg = document.getElementById('ra-graph-svg');
    if (!svg) return;
    svg.innerHTML = '';

    // Defs para puntas de flecha
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="ra-arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(245,158,11,0.85)" />
      </marker>
      <marker id="ra-arrow-sel" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
      </marker>
    `;
    svg.appendChild(defs);

    // Calcular posiciones circulares equilibradas:
    // Humanos a la izquierda/arriba, Bióticos a la derecha/abajo
    const W = 400, H = 250, cx = W / 2, cy = H / 2;
    const todos = [...data.humanos.map(h => ({ ...h, tipo: 'h' })), ...data.bioticos.map(b => ({ ...b, tipo: 'b' }))];
    const total = todos.length;
    const R = Math.min(cx, cy) * 0.72;

    const coords = {};
    todos.forEach((nodo, i) => {
      // Ángulo distribuido
      const ang = (i / total) * Math.PI * 2 - Math.PI / 2;
      coords[nodo.id] = {
        x: cx + Math.cos(ang) * (R * (nodo.tipo === 'h' ? 0.95 : 0.85)),
        y: cy + Math.sin(ang) * (R * (nodo.tipo === 'h' ? 0.95 : 0.85)),
        nodo
      };
    });

    // Grupo de aristas
    const gLinks = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(gLinks);

    // Grupo de nodos
    const gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(gNodes);

    data.flujos.forEach(f => {
      const p1 = coords[f.de], p2 = coords[f.a];
      if (!p1 || !p2) return;
      // Curva cuadrática hacia el centro
      const mx = (p1.x + p2.x) / 2 + (cx - (p1.x + p2.x) / 2) * 0.35;
      const my = (p1.y + p2.y) / 2 + (cy - (p1.y + p2.y) / 2) * 0.35;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(245,158,11,0.45)');
      path.setAttribute('stroke-width', '1.6');
      path.setAttribute('marker-end', 'url(#ra-arrow)');
      path.classList.add('ra-link', 'anim');
      path.dataset.de = f.de;
      path.dataset.a = f.a;
      gLinks.appendChild(path);
    });

    todos.forEach(nodo => {
      const pos = coords[nodo.id];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('ra-node');
      g.dataset.id = nodo.id;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x.toFixed(1));
      circle.setAttribute('cy', pos.y.toFixed(1));
      circle.setAttribute('r', nodo.tipo === 'h' ? '12' : '10');
      circle.setAttribute('fill', nodo.c);
      circle.setAttribute('stroke', 'rgba(15,23,42,0.9)');
      circle.setAttribute('stroke-width', '2');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', pos.x.toFixed(1));
      label.setAttribute('y', (pos.y + 3).toFixed(1));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#04121c');
      label.setAttribute('font-size', '9px');
      label.setAttribute('font-weight', '800');
      label.textContent = nodo.n.slice(0, 2).toUpperCase();

      const nameSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const offsetBelow = pos.y > cy ? 16 : -13;
      nameSub.setAttribute('x', pos.x.toFixed(1));
      nameSub.setAttribute('y', (pos.y + offsetBelow).toFixed(1));
      nameSub.setAttribute('text-anchor', 'middle');
      nameSub.setAttribute('fill', '#cbd5e1');
      nameSub.setAttribute('font-size', '8px');
      nameSub.setAttribute('font-weight', '600');
      nameSub.textContent = nodo.n.split(' ')[0];

      g.appendChild(circle);
      g.appendChild(label);
      g.appendChild(nameSub);

      g.onclick = () => {
        seleccionarNodo(nodo, data);
      };

      gNodes.appendChild(g);
    });
  }

  function seleccionarNodo(nodo, data) {
    selectedNodeId = nodo.id;
    const info = document.getElementById('ra-node-info');
    if (!info) return;

    // Resaltar enlaces en el SVG
    const svg = document.getElementById('ra-graph-svg');
    if (svg) {
      svg.querySelectorAll('.ra-node').forEach(n => {
        n.classList.toggle('sel', n.dataset.id === nodo.id);
      });
      svg.querySelectorAll('.ra-link').forEach(l => {
        const conecta = l.dataset.de === nodo.id || l.dataset.a === nodo.id;
        l.setAttribute('stroke', conecta ? '#38bdf8' : 'rgba(255,255,255,0.08)');
        l.setAttribute('stroke-width', conecta ? '2.8' : '1');
        l.setAttribute('marker-end', conecta ? 'url(#ra-arrow-sel)' : 'url(#ra-arrow)');
      });
    }

    // Buscar flujos directos
    const sale = data.flujos.filter(f => f.de === nodo.id);
    const entra = data.flujos.filter(f => f.a === nodo.id);

    info.innerHTML = `
      <b style="color:${nodo.c}">${nodo.n} (${nodo.tipo === 'h' ? 'Actor Humano' : 'Actor Biótico'})</b>
      <p style="margin:3px 0 5px;color:#e2f3ff">${nodo.rol}</p>
      ${sale.length ? `<div style="font-size:10.5px;color:#7dd3fc;margin-top:4px"><b>➔ Aporta a la red:</b> ${sale.map(s => s.t).join(' · ')}</div>` : ''}
      ${entra.length ? `<div style="font-size:10.5px;color:#a3e635;margin-top:3px"><b>➔ Recibe de la red:</b> ${entra.map(e => e.t).join(' · ')}</div>` : ''}
    `;
  }

  function mostrarRedActores(id) {
    if (!RED_DATA[id]) return;
    activeStrategyId = id;
    renderizarModal();

    // Volar la cámara hacia la estrategia
    const data = RED_DATA[id];
    if (data.centro) {
      if (id === 'E1') {
        volarA(data.centro[0], data.centro[1], data.zoom.dist, data.zoom.alto);
      } else {
        const w = lw(data.centro[0] * 0.5, data.centro[1] * 0.5);
        volarA(w[0], w[1], data.zoom.dist, data.zoom.alto);
      }
    }
  }

  function ocultarRedActores() {
    if (panelEl) panelEl.classList.add('oculto');
  }

  return {
    mostrarRedActores,
    ocultarRedActores,
    RED_DATA
  };
}
