/* ============ BAVARIA COMÚN: sub-red de componentes ("cómo se hace") y asambleas con vocería rotativa ============
   Lo usa modelo_causal.html. Los actores son los de data3d/red_georef_actores.json (mismos ids que la red 3D). */

/* ---------- SUB-RED: cada componente, sus pasos y quién los hace ---------- */
export const COMPONENTES = [
  { id: 'gob', n: 'Asambleas y gobernanza', c: '#e58aa8', icon: '🗳️', dato: '6 asambleas · vocería rotativa', ind: 'lid',
    que: 'Federación de asambleas de sector que deciden sobre el predio. Nadie manda solo: la vocería rota.',
    pasos: [
      ['Padrón de la asamblea', 'Cada persona vecina se inscribe en la asamblea de su sector o en una mesa de trabajo. Meta: 5 % de los adultos.', ['H-COM', 'C04', 'C09']],
      ['Bolsa de vocería', 'Quien quiera ser vocera o vocero entra a la bolsa del ciclo. Nadie repite hasta que pasen todos.', ['H-COM', 'F08']],
      ['Sorteo público con paridad', 'Cada periodo se sortea entre quienes no han sido vocería en el ciclo, alternando género.', ['H-COM', 'I09']],
      ['Empalme', 'La vocería saliente queda un periodo como suplente y acompaña a la nueva.', ['H-COM', 'F08']],
      ['Consejo federal', 'Las voceras y voceros llevan lo que decidió su asamblea (mandato), no deciden por su cuenta. El Colectivo Bavaria tiene asiento fijo como guardián del bosque.', ['H-COM', 'C06', 'H-INS']],
      ['Veeduría y rendición de cuentas', 'Cada periodo se rinde cuentas en asamblea; la Personería acompaña y la asamblea puede revocar con 2/3.', ['I09', 'C05', 'H-INS']],
    ] },
  { id: 'ban', n: 'Bancales en suelo', c: '#8fc46a', icon: '🌱', dato: '27.043 m² · bancales de 1,2 × 8 m', ind: 'A',
    que: 'Huertas comunitarias en el suelo libre del predio, con pasillos de 0,8 m.',
    pasos: [
      ['Diagnóstico y limpieza del suelo', 'Muestreo del suelo de la antigua fábrica; donde haya contaminación se cultiva en cama elevada.', ['I01', 'F05']],
      ['Trazado de bancales', 'Bancales de 1,2 × 8 m con pasillos de 0,8 m, accesibles desde las entradas del predio.', ['P06', 'C06']],
      ['Asignación por asamblea', 'Cada asamblea de sector recibe bancales y los reparte por turnos entre sus familias.', ['H-COM', 'P06']],
      ['Siembra por calendario', 'Siembra escalonada según el calendario de cultivos del distrito, con abono del compostaje.', ['P07', 'F07', 'P06']],
      ['Cosecha y registro', 'Se pesa y registra la cosecha de cada bancal para saber cuánto alimento produce el barrio.', ['P06', 'F08']],
    ] },
  { id: 'tec', n: 'Techos productivos', c: '#a8d672', icon: '🏠', dato: '26.098 m² de techos elegibles a 600 m', ind: 'A',
    que: 'Huertas en techos planos de 150 a 900 m² y menos de 15 m de altura, cerca del predio.',
    pasos: [
      ['Inventario de techos', 'Se identifican techos planos elegibles dentro de 600 m del predio.', ['F05']],
      ['Revisión estructural y permiso', 'Se revisa la carga del techo y se tramita el permiso con la Alcaldía Local.', ['H-INS']],
      ['Acuerdo con propietarios', 'La JAC del barrio media el acuerdo de uso con los dueños del edificio.', ['C03', 'C01', 'H-COM']],
      ['Instalación ligera y riego', 'Camas ligeras, sustrato con compost y riego por goteo con agua lluvia.', ['F07', 'P09']],
      ['Turnos de mantenimiento', 'Las vecinas y vecinos del edificio cuidan por turnos y llevan la cosecha al mercado.', ['C04', 'P09']],
    ] },
  { id: 'cmp', n: 'Compostaje', c: '#e3a64a', icon: '♻️', dato: '0,8 kg/hab/día · 51 % orgánico · meta 60 %', ind: 'C',
    que: 'Los residuos orgánicos del barrio y de Corabastos se vuelven abono en el predio y dejan de ir a Doña Juana.',
    pasos: [
      ['Separación en la fuente', 'Los hogares separan los orgánicos; la JAC y las cuidadoras acompañan casa por casa.', ['C04', 'C03', 'H-COM']],
      ['Recolección por recicladores de oficio', 'Los recicladores de Kennedy recogen los orgánicos con ruta y pago por tonelada.', ['P04', 'I02']],
      ['Aporte de Corabastos', 'Corabastos entrega cada día su fracción orgánica (5 t/día en la propuesta).', ['H-PRO', 'I02']],
      ['Pilas de compost', 'Pilas volteadas durante unos 60 días; rinden cerca del 40 % de la masa como abono.', ['P05', 'F07']],
      ['Abono a bancales, techos y bosque', 'El compost vuelve a los bancales, a los techos y a la siembra de nativas; el excedente va a parques.', ['P05', 'P06', 'I06']],
    ] },
  { id: 'mer', n: 'Mercado y distribución', c: '#c2652a', icon: '🧺', dato: 'cosecha → mercado → puertas', ind: 'cos',
    que: 'La cosecha llega al barrio por un mercado propio, las tiendas y la cocina comunitaria.',
    pasos: [
      ['Acopio de cosecha', 'Cada semana se reúne lo cosechado en bancales y techos.', ['P06', 'P01']],
      ['Precio justo en asamblea', 'La asamblea fija precios que cubren el trabajo y que el barrio pueda pagar.', ['H-COM', 'I07']],
      ['Mercado campesino semanal', 'Venta directa en el predio, junto con productores de la región.', ['P08', 'I07']],
      ['Tiendas de barrio', 'Las tiendas venden la cosecha cerca de las casas.', ['P09', 'P03']],
      ['Residuos de vuelta al compost', 'Lo que no se vende vuelve a las pilas de compost.', ['P04', 'P05']],
    ] },
  { id: 'coc', n: 'Cocina comunitaria', c: '#d98b6a', icon: '🍲', dato: 'meta 200 g de hortalizas/persona/día', ind: 'aut',
    que: 'Una cocina del predio que transforma la cosecha en comida para quien más la necesita.',
    pasos: [
      ['Censo de familias', 'Las cuidadoras identifican a las familias con inseguridad alimentaria.', ['C04', 'I08']],
      ['Menú con la cosecha', 'El menú se arma con lo que hay en bancales y techos esa semana.', ['C04', 'P06']],
      ['Turnos de cocina', 'Turnos rotativos de vecinas y vecinos; nadie carga solo con la cocina.', ['C04', 'C08']],
      ['Control de salud', 'La Subred revisa manipulación de alimentos y nutrición.', ['I08']],
    ] },
  { id: 'bos', n: 'Bosque Bavaria', c: '#4f8a3c', icon: '🌳', dato: '3.250 árboles · 22 ha de bosque', ind: 'T',
    que: 'El arbolado de la antigua fábrica se conserva y se conecta con los humedales.',
    pasos: [
      ['Inventario arbóreo', 'Censo de los árboles del predio (especie, estado, riesgo).', ['I06', 'F05']],
      ['Custodia del bosque', 'El Colectivo Salvemos el Bosque Bavaria actúa como guardián con asiento fijo en el consejo.', ['C06', 'H-ENT']],
      ['Siembra de nativas', 'Siembra de especies nativas con compost del predio.', ['I06', 'C06', 'P05']],
      ['Monitoreo de aves', 'Conteos de aves y fauna para medir si el bosque funciona como hábitat.', ['F09', 'F06']],
      ['Conector con humedales', 'Corredor verde hacia el Humedal de Techo y El Burro y la ronda del Fucha.', ['I01', 'I04', 'E01', 'E04']],
    ] },
  { id: 'for', n: 'Formación', c: '#35598c', icon: '📚', dato: 'escuela de huerta, PRAE y liderazgo', ind: 'lid',
    que: 'Que más gente sepa cultivar, compostar y llevar vocería, para que nada dependa de una sola persona.',
    pasos: [
      ['Escuela de huerta y compost', 'Talleres prácticos en el predio para cada cohorte nueva.', ['F07', 'P05']],
      ['Proyectos escolares (PRAE)', 'Los colegios cercanos usan el predio como aula.', ['F01', 'F02', 'F04']],
      ['Escuela de vocería', 'Antes de entrar a la bolsa de vocería se toma un taller de mandato y rendición de cuentas.', ['F08', 'H-FOR']],
      ['Investigación y datos', 'El semillero mide cosecha, compost, aves y participación y lo devuelve a la asamblea.', ['F05', 'H-FOR']],
    ] },
  { id: 'emp', n: 'Trabajo digno', c: '#b98a57', icon: '🛠️', dato: 'prioridad para coteros, recicladores y vendedores', ind: 'C',
    que: 'Los puestos de trabajo del distrito se ofrecen primero a quienes hoy trabajan informalmente en Corabastos.',
    pasos: [
      ['Registro de trabajadores informales', 'Coteros, recicladores y vendedores de Corabastos se inscriben.', ['P04', 'H-PRO']],
      ['Contratación prioritaria', 'Los puestos de compostaje, mercado y mantenimiento se asignan primero a ese registro.', ['P05', 'P08', 'I07']],
      ['Formación técnica', 'El SENA certifica en agricultura urbana y compostaje.', ['F07']],
    ] },
];
// cómo se alimentan los componentes entre sí
export const FLUJOS_COMP = [
  ['cmp', 'ban', 'abono'], ['cmp', 'tec', 'abono'], ['cmp', 'bos', 'abono nativas'], ['ban', 'mer', 'cosecha'], ['tec', 'mer', 'cosecha'],
  ['mer', 'coc', 'alimento'], ['mer', 'cmp', 'residuos'], ['coc', 'cmp', 'residuos'], ['bos', 'cmp', 'hojarasca'],
  ['for', 'ban', 'capacita'], ['for', 'gob', 'forma vocería'], ['emp', 'cmp', 'trabajo'], ['emp', 'mer', 'trabajo'],
  ['gob', 'ban', 'asigna'], ['gob', 'mer', 'fija precios'], ['gob', 'bos', 'custodia'],
];

/* ---------- ASAMBLEAS: vocería rotativa ---------- */
export const ASAMBLEAS = [
  { id: 'MAR', n: 'Asamblea Marsella', t: 'territorial', peso: .22 },
  { id: 'ALO', n: 'Asamblea Aloha', t: 'territorial', peso: .18 },
  { id: 'SJB', n: 'Asamblea San José de Bavaria', t: 'territorial', peso: .2 },
  { id: 'HUE', n: 'Mesa de huerta y techos', t: 'trabajo', peso: .16 },
  { id: 'CMP', n: 'Mesa de compost y reciclaje', t: 'trabajo', peso: .13 },
  { id: 'BOS', n: 'Mesa del bosque', t: 'trabajo', peso: .11 },
];
export const REGLAS = [
  ['Periodos cortos', 'La vocería dura un periodo fijo (6 meses en la propuesta). Al terminar, cambia sí o sí.'],
  ['Nadie repite en el ciclo', 'Quien ya fue vocería no vuelve a entrar al sorteo hasta que haya pasado toda la bolsa.'],
  ['Sorteo público con paridad', 'Se sortea en asamblea abierta entre quienes están en la bolsa, alternando mujer y hombre (y personas no binarias en la bolsa común).'],
  ['Empalme', 'La vocería saliente queda un periodo como suplente y acompaña a la entrante.'],
  ['Mandato, no mando', 'La vocería lleva al consejo lo que decidió su asamblea y vuelve con lo que se acordó. No decide sola.'],
  ['Revocatoria', 'La asamblea puede cambiar la vocería antes de tiempo con 2/3 de los votos.'],
  ['Asiento del bosque', 'El Colectivo Salvemos el Bosque Bavaria tiene asiento fijo en el consejo como guardián del bosque; su delegada o delegado también rota dentro del colectivo.'],
];
const GEN = ['M', 'H', 'NB'];
// sim. determinista: personas en la bolsa de cada asamblea, a partir de la participación simulada
export function rotacion({ metodo = 'sorteo', meses = 6, partic, dias = 3650, bolsaFrac = .25 }) {
  const per = Math.max(1, Math.round(dias / (meses * 30.42))), out = [];
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const as of ASAMBLEAS) {
    const personas = []; let n = 0; const fila = []; let usados = new Set(), ultGen = null, ciclo = 1;
    const agregar = k => { while (personas.length < k) personas.push({ id: as.id + '-' + String(++n).padStart(2, '0'), g: rnd() < .08 ? 'NB' : (personas.length % 2 ? 'H' : 'M'), veces: 0 }); };
    for (let p = 0; p < per; p++) {
      const dia = Math.min(dias, Math.round(p * meses * 30.42));
      const bolsa = Math.max(2, Math.round(partic(dia) * as.peso * bolsaFrac)); agregar(bolsa);
      let elegido;
      if (metodo === 'unico') elegido = personas[0];
      else {
        let cand = personas.slice(0, bolsa).filter(x => !usados.has(x.id));
        if (!cand.length) { usados = new Set(); ciclo++; cand = personas.slice(0, bolsa); }
        const par = cand.filter(x => ultGen == null || x.g !== ultGen || x.g === 'NB');
        const pool = par.length ? par : cand;
        elegido = metodo === 'turno' ? pool[0] : pool[Math.floor(rnd() * pool.length)];
      }
      usados.add(elegido.id); elegido.veces++; ultGen = elegido.g;
      fila.push({ p, dia, id: elegido.id, g: elegido.g, nuevo: elegido.veces === 1, suplente: fila.length ? fila[fila.length - 1].id : null, bolsa, ciclo });
    }
    out.push({ as, fila });
  }
  return { per, meses, filas: out };
}
// métricas de la rotación hasta el periodo k
export function metricas(R, k) {
  const vistos = new Map(); let muj = 0, tot = 0;
  for (const { fila } of R.filas) for (const c of fila.slice(0, k + 1)) { vistos.set(c.id, (vistos.get(c.id) || 0) + 1); tot++; if (c.g === 'M') muj++; }
  const max = Math.max(0, ...vistos.values());
  return { distintos: vistos.size, mujeres: tot ? muj / tot : 0, maxVeces: max, periodos: k + 1 };
}
