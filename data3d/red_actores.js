/* ============ RED DE ACTORES OFICIAL (KENNEDY · 9 ESTRATEGIAS) ============
   100 nodos y 112 relaciones por estrategia (E1 a E9).
   Soporta red individual por TAG (INF, AUT, CTRL, RET, DEP, CONS, BIO, MAT, AMB)
   y opción de ver toda la red con los 100 actores. */

let DB = null;
let panelEl = null;
let launchBtn = null;
let activeStrategyId = 'E1';
let activeTab = 'grafo';
let activeGraphTag = 'todos'; // 'todos' o un tag específico: INF, AUT, CTRL, etc.
let graphMode = 'individual'; // 'individual' (solo nodos del tag) o 'completa' (100 nodos)
let selectedNodeId = null;
let filterClase = 'todas';
let filterTag = 'todos';
let searchQuery = '';

export const TAG_INFO = {
  INF: { n: 'Información', c: '#38bdf8', icon: 'ℹ️', desc: 'Hay mensaje, registro y destinatario' },
  AUT: { n: 'Autorización', c: '#f59e0b', icon: '🔑', desc: 'Existe capacidad de aprobar o negar' },
  CTRL: { n: 'Control', c: '#fb7185', icon: '🛡️', desc: 'Hay criterio de evaluación o revisión' },
  RET: { n: 'Retroalimentación', c: '#a3e635', icon: '🔄', desc: 'Un resultado vuelve al proceso de mejora' },
  DEP: { n: 'Dependencia', c: '#c084fc', icon: '⛓️', desc: 'Un proceso necesita el resultado del anterior' },
  CONS: { n: 'Consulta', c: '#facc15', icon: '🤝', desc: 'Se verifica participación antes de asignar tarea' },
  BIO: { n: 'Biológico', c: '#10b981', icon: '🌿', desc: 'Relación ecológica con presencia local' },
  MAT: { n: 'Material', c: '#fb923c', icon: '📦', desc: 'Flujo con cantidad, origen y destino' },
  AMB: { n: 'Ambiental', c: '#60a5fa', icon: '🌤️', desc: 'Condición o medición que afecta la actividad' }
};

export async function iniciarRedActoresUI({ T3, lw, OX = 2095.67, OZ = -109.06, Y0 = 2.0 }) {
  // Cargar base de datos oficial
  try {
    const res = await fetch('data3d/redes_kennedy.json?v=' + Date.now());
    DB = await res.json();
  } catch (e) {
    console.error('Error cargando redes_kennedy.json:', e);
  }

  // Estilos CSS
  const style = document.createElement('style');
  style.id = 'ra-official-styles';
  style.textContent = `
/* Botón flotante permanente para abrir la red */
#ra-floating-trigger{position:fixed;z-index:90;right:16px;top:16px;display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(8,16,26,.96));border:1.5px solid #38bdf8;box-shadow:0 8px 24px rgba(0,0,0,.6),0 0 14px rgba(56,189,248,.35);color:#e2f3ff;font:750 12px system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;transition:all .2s;backdrop-filter:blur(10px)}
#ra-floating-trigger:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 12px 28px rgba(0,0,0,.7),0 0 20px rgba(56,189,248,.6);border-color:#7dd3fc}
#ra-floating-trigger i{display:inline-block;font-style:normal;font-size:15px}
#ra-georef-link{position:fixed;z-index:90;right:190px;top:16px;display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(15,23,42,.92),rgba(8,16,26,.96));border:1.5px solid #e0a21f;box-shadow:0 8px 24px rgba(0,0,0,.6);color:#fff3d6;font:750 12px system-ui,-apple-system,"Segoe UI",sans-serif;text-decoration:none;backdrop-filter:blur(10px)}
#ra-georef-link:hover{transform:translateY(-2px)}

/* Modal principal de la red */
#ra-modal{position:fixed;z-index:95;right:16px;top:60px;width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 75px);background:rgba(8,16,26,.95);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1.5px solid var(--ra-c,rgba(125,211,252,.4));border-radius:18px;box-shadow:0 24px 55px rgba(0,0,0,.75);color:#e2f3ff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;overflow:hidden;transition:transform .25s ease,opacity .25s ease;transform:translateY(0);opacity:1}
#ra-modal.oculto{display:none;opacity:0;transform:translateY(16px);pointer-events:none}
#ra-header{padding:12px 14px 10px;background:rgba(15,23,42,.75);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:flex-start;gap:10px}
#ra-badge{flex:none;font-weight:900;font-size:12px;padding:3px 9px;border-radius:8px;background:var(--ra-c,#38bdf8);color:#04121c;letter-spacing:.05em}
#ra-tit{flex:1;min-width:0}
#ra-tit h4{margin:0;font-size:15px;font-weight:750;color:#f8fafc;display:flex;align-items:center;gap:6px}
#ra-tit p{margin:2px 0 0;font-size:11px;color:#94a3b8;line-height:1.35}
#ra-close{flex:none;width:30px;height:30px;border-radius:8px;border:none;background:rgba(255,255,255,.08);color:#cbd5e1;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s}
#ra-close:hover{background:rgba(239,68,68,.3);color:#fecaca}

/* Selector horizontal de las 9 estrategias */
#ra-est-nav{display:flex;gap:4px;padding:7px 12px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto;scrollbar-width:none}
#ra-est-nav::-webkit-scrollbar{display:none}
#ra-est-nav button{flex:none;padding:5px 9px;border-radius:7px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#94a3b8;font-size:10px;font-weight:700;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px}
#ra-est-nav button.on{background:var(--ra-c,#38bdf8);color:#04121c;border-color:transparent;font-weight:800}

/* Pestañas */
#ra-tabs{display:flex;gap:4px;padding:8px 12px;background:rgba(0,0,0,.2);border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto}
#ra-tabs button{flex:1;white-space:nowrap;padding:6px 8px;border-radius:8px;border:none;background:rgba(255,255,255,.05);color:#cbd5e1;font-size:10.5px;font-weight:700;cursor:pointer;transition:all .15s}
#ra-tabs button.on{background:var(--ra-c,#38bdf8);color:#04121c}

#ra-body{padding:12px 14px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;max-height:calc(100vh - 275px)}
#ra-body::-webkit-scrollbar{width:5px}
#ra-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:4px}

.ra-metricas{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.ra-met-box{padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);text-align:center}
.ra-met-box b{display:block;font-size:14px;color:var(--ra-c,#38bdf8);font-weight:800}
.ra-met-box span{display:block;font-size:9px;color:#94a3b8}

/* Barra de selección por TAG */
.ra-tag-bar{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.ra-tag-btn{padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#cbd5e1;font-size:10px;font-weight:650;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .15s}
.ra-tag-btn.on{background:var(--btn-c,#38bdf8);color:#04121c;border-color:transparent;font-weight:800}

/* Selector de Modo: Red individual vs Red completa */
.ra-mode-bar{display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,.3);padding:6px 10px;border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,.06)}
.ra-mode-label{font-size:11px;color:#94a3b8;font-weight:600}
.ra-mode-toggle{display:flex;gap:4px}
.ra-mode-toggle button{padding:3px 9px;border-radius:5px;border:none;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:10px;font-weight:700;cursor:pointer}
.ra-mode-toggle button.on{background:var(--ra-c,#38bdf8);color:#04121c}

/* Banner de TAG activo */
.ra-tag-banner{padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.04);border-left:3.5px solid var(--tag-c,#38bdf8);margin-bottom:8px;font-size:11px}
.ra-tag-banner b{color:var(--tag-c,#38bdf8)}
.ra-tag-banner span{color:#94a3b8;display:block;font-size:10px;margin-top:2px}

/* Grafo SVG */
.ra-svg-wrap{position:relative;width:100%;height:320px;background:radial-gradient(ellipse at center,rgba(15,23,42,.95) 0%,rgba(4,8,15,.99) 100%);border-radius:12px;border:1px solid rgba(255,255,255,.08);overflow:hidden}
.ra-svg-wrap svg{width:100%;height:100%;display:block}
.ra-link{stroke-linecap:round;transition:stroke .2s,stroke-width .2s,opacity .2s}
.ra-link.anim{stroke-dasharray:4 4;animation:raDash 1.2s linear infinite}
@keyframes raDash{to{stroke-dashoffset:-16}}
.ra-node{cursor:pointer;transition:transform .15s}
.ra-node:hover circle{stroke:#fff;stroke-width:2.5px}
.ra-node.sel circle{stroke:#fff;stroke-width:3px;filter:drop-shadow(0 0 10px var(--ra-c))}

.ra-card-info{margin-top:10px;padding:10px 12px;border-radius:11px;background:rgba(15,23,42,.85);border:1px solid rgba(255,255,255,.1);font-size:11.5px}
.ra-card-info b{color:var(--ra-c,#38bdf8);font-size:12.5px;display:block;margin-bottom:2px}

/* Listas y Filtros */
.ra-search-bar{width:100%;box-sizing:border-box;padding:7px 11px;margin-bottom:9px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#fff;font-size:11.5px;outline:none}
.ra-search-bar:focus{border-color:var(--ra-c,#38bdf8)}
.ra-pill-filters{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.ra-pill-filters button{padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:#cbd5e1;font-size:10px;cursor:pointer}
.ra-pill-filters button.on{background:rgba(255,255,255,.18);color:#fff;font-weight:700;border-color:var(--ra-c)}

.ra-lista{display:flex;flex-direction:column;gap:7px}
.ra-item{display:flex;gap:9px;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06);font-size:11.5px;cursor:pointer;transition:background .15s}
.ra-item:hover{background:rgba(255,255,255,.08)}
.ra-item.sel{border-color:var(--ra-c,#38bdf8);background:rgba(56,189,248,.1)}
.ra-id-badge{flex:none;font-size:10px;font-weight:700;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.1);color:#e2f3ff;height:fit-content;margin-top:2px}
.ra-item-info b{font-size:12px;color:#f1f5f9;display:block}
.ra-item-info small{color:#94a3b8;display:block;margin-top:1px}
.ra-item-info p{margin:4px 0 0;color:#cbd5e1;line-height:1.35}

.ra-rel-card{padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.03);border-left:3.5px solid var(--tag-c,#38bdf8);margin-bottom:7px;font-size:11.5px}
.ra-rel-card .rel-head{display:flex;align-items:center;gap:6px;font-weight:700;color:#f8fafc;margin-bottom:3px}
.ra-rel-card .tag-lbl{padding:1px 5px;border-radius:4px;font-size:9px;background:var(--tag-c,#38bdf8);color:#04121c;font-weight:800}
.ra-rel-card p{margin:3px 0 1px;color:#cbd5e1}
.ra-rel-card small{color:#94a3b8;display:block;margin-top:2px;font-size:10px}

@media(max-width:760px){
  #ra-georef-link{top:auto;right:12px;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 100px);font-size:11px;padding:7px 11px}
  #ra-floating-trigger{top:auto;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 58px);right:12px;font-size:11px;padding:7px 11px}
  #ra-modal{right:8px;left:8px;width:auto;top:auto;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px);max-height:72vh}
  .ra-svg-wrap{height:250px}
}
`;
  document.head.appendChild(style);

  // Botón flotante permanente
  launchBtn = document.createElement('button');
  launchBtn.id = 'ra-floating-trigger';
  launchBtn.innerHTML = `<i>🕸️</i><span>RED DE ACTORES</span>`;
  launchBtn.onclick = () => mostrarRedActores(activeStrategyId);
  document.body.appendChild(launchBtn);

  // Modal contenedor
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
    if (!DB || !DB.estrategias || !DB.estrategias[activeStrategyId]) return;
    const data = DB.estrategias[activeStrategyId];
    panelEl.style.setProperty('--ra-c', data.c);

    panelEl.innerHTML = `
      <div id="ra-header">
        <span id="ra-badge">${data.id}</span>
        <div id="ra-tit">
          <h4>${data.icon} ${data.n}</h4>
          <p>${data.sub}</p>
        </div>
        <button id="ra-close" aria-label="Cerrar">✕</button>
      </div>

      <!-- Barra de navegación de las 9 estrategias oficiales -->
      <div id="ra-est-nav">
        ${Object.keys(DB.estrategias).map(k => {
          const e = DB.estrategias[k];
          return `<button data-id="${k}" class="${k === activeStrategyId ? 'on' : ''}">${e.id} ${e.icon}</button>`;
        }).join('')}
      </div>

      <!-- Métricas oficiales -->
      <div style="padding:10px 14px 0">
        <div class="ra-metricas">
          <div class="ra-met-box"><b>${data.conteo.total_nodos}</b><span>Nodos</span></div>
          <div class="ra-met-box"><b>${data.conteo.total_relaciones}</b><span>Relaciones</span></div>
          <div class="ra-met-box"><b>${data.conteo.roles_previos}</b><span>Previos</span></div>
          <div class="ra-met-box"><b>${data.conteo.roles_propuestos}</b><span>Propuestos</span></div>
        </div>
      </div>

      <div id="ra-tabs">
        <button data-t="grafo" class="${activeTab === 'grafo' ? 'on' : ''}">🕸️ Grafo de Red</button>
        <button data-t="nodos" class="${activeTab === 'nodos' ? 'on' : ''}">📋 Nodos (100)</button>
        <button data-t="relaciones" class="${activeTab === 'relaciones' ? 'on' : ''}">🔗 Relaciones (112)</button>
        <button data-t="tags" class="${activeTab === 'tags' ? 'on' : ''}">🏷️ Glosario TAGs</button>
      </div>

      <div id="ra-body"></div>
    `;

    panelEl.querySelector('#ra-close').onclick = () => ocultarRedActores();

    panelEl.querySelectorAll('#ra-est-nav button').forEach(b => {
      b.onclick = () => {
        activeStrategyId = b.dataset.id;
        selectedNodeId = null;
        renderizarModal();
        enfocarEstrategia(activeStrategyId);
      };
    });

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
    if (!body || !DB || !DB.estrategias[activeStrategyId]) return;
    const data = DB.estrategias[activeStrategyId];

    if (activeTab === 'grafo') {
      // Contar relaciones por TAG
      const tagCounts = {};
      data.relaciones.forEach(r => { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });

      const currentTagInfo = activeGraphTag !== 'todos' ? TAG_INFO[activeGraphTag] : null;

      body.innerHTML = `
        <!-- Barra de selección de TAG para red individual -->
        <div style="font-size:10.5px;color:#94a3b8;margin-bottom:5px;font-weight:700">FILTRAR RED INDIVIDUAL POR TAG:</div>
        <div class="ra-tag-bar">
          <button class="ra-tag-btn ${activeGraphTag === 'todos' ? 'on' : ''}" data-tag="todos" style="--btn-c:var(--ra-c,#38bdf8)">
            🌐 Toda la Red (112)
          </button>
          ${Object.keys(TAG_INFO).map(t => {
            const inf = TAG_INFO[t];
            const cnt = tagCounts[t] || 0;
            return `<button class="ra-tag-btn ${activeGraphTag === t ? 'on' : ''}" data-tag="${t}" style="--btn-c:${inf.c}">
              ${inf.icon} ${t} (${cnt})
            </button>`;
          }).join('')}
        </div>

        ${currentTagInfo ? `
          <!-- Modo de visualización si hay TAG seleccionado -->
          <div class="ra-mode-bar">
            <span class="ra-mode-label">Modo de visualización:</span>
            <div class="ra-mode-toggle">
              <button class="${graphMode === 'individual' ? 'on' : ''}" data-mode="individual">🎯 Red Individual</button>
              <button class="${graphMode === 'completa' ? 'on' : ''}" data-mode="completa">🌐 Red Completa</button>
            </div>
          </div>
          <div class="ra-tag-banner" style="--tag-c:${currentTagInfo.c}">
            <b>${currentTagInfo.icon} Red de ${currentTagInfo.n} (${activeGraphTag}) · ${tagCounts[activeGraphTag] || 0} vínculos</b>
            <span>${currentTagInfo.desc}. Los nodos involucrados se muestran conectados directamente.</span>
          </div>
        ` : ''}

        <div class="ra-svg-wrap">
          <svg viewBox="0 0 440 300" id="ra-official-svg"></svg>
        </div>

        <div class="ra-card-info" id="ra-node-info">
          <b>Toca un nodo en el diagrama</b>
          <small>Se resaltarán sus relaciones entrantes y salientes en la red.</small>
        </div>
      `;

      body.querySelectorAll('.ra-tag-bar button').forEach(b => {
        b.onclick = () => {
          activeGraphTag = b.dataset.tag;
          selectedNodeId = null;
          renderizarTab();
        };
      });

      body.querySelectorAll('.ra-mode-toggle button').forEach(b => {
        b.onclick = () => {
          graphMode = b.dataset.mode;
          renderizarTab();
        };
      });

      dibujarGrafoSVG(data);
    } else if (activeTab === 'nodos') {
      body.innerHTML = `
        <input type="text" class="ra-search-bar" id="ra-node-search" placeholder="Buscar por nombre, ID o proceso..." value="${searchQuery}" />
        <div class="ra-pill-filters" id="ra-node-filters">
          <button data-c="todas" class="${filterClase === 'todas' ? 'on' : ''}">Todos (100)</button>
          <button data-c="previo" class="${filterClase === 'previo' ? 'on' : ''}">Roles previos (15)</button>
          <button data-c="propuesto" class="${filterClase === 'propuesto' ? 'on' : ''}">Roles propuestos (65)</button>
          <button data-c="entorno" class="${filterClase === 'entorno' ? 'on' : ''}">No humanos / Entorno (20)</button>
        </div>
        <div class="ra-lista" id="ra-nodes-list"></div>
      `;

      const input = body.querySelector('#ra-node-search');
      input.oninput = (e) => {
        searchQuery = e.target.value.toLowerCase();
        filtrarYRenderizarNodos(data);
      };

      body.querySelectorAll('#ra-node-filters button').forEach(btn => {
        btn.onclick = () => {
          filterClase = btn.dataset.c;
          body.querySelectorAll('#ra-node-filters button').forEach(x => x.classList.toggle('on', x === btn));
          filtrarYRenderizarNodos(data);
        };
      });

      filtrarYRenderizarNodos(data);
    } else if (activeTab === 'relaciones') {
      const tagsUnicos = [...new Set(data.relaciones.map(r => r.tag))];
      body.innerHTML = `
        <div class="ra-pill-filters" id="ra-tag-filters">
          <button data-tag="todos" class="${filterTag === 'todos' ? 'on' : ''}">Todos (112)</button>
          ${tagsUnicos.map(t => `<button data-tag="${t}" class="${filterTag === t ? 'on' : ''}" style="color:${(TAG_INFO[t] || {}).c || '#fff'}">${t} (${data.relaciones.filter(r => r.tag === t).length})</button>`).join('')}
        </div>
        <div class="ra-lista" id="ra-rels-list"></div>
      `;

      body.querySelectorAll('#ra-tag-filters button').forEach(btn => {
        btn.onclick = () => {
          filterTag = btn.dataset.tag;
          body.querySelectorAll('#ra-tag-filters button').forEach(x => x.classList.toggle('on', x === btn));
          renderizarRelaciones(data);
        };
      });

      renderizarRelaciones(data);
    } else if (activeTab === 'tags') {
      body.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">Significado y criterios metodológicos de los TAGs de relación:</div>
        <div class="ra-lista">
          ${Object.entries(DB.tags).map(([tag, val]) => {
            const inf = TAG_INFO[tag] || { c: '#38bdf8', icon: '🏷️' };
            return `
              <div class="ra-item" style="border-left:3.5px solid ${inf.c}">
                <span class="ra-id-badge" style="background:${inf.c};color:#04121c">${inf.icon} ${tag}</span>
                <div class="ra-item-info">
                  <b>${val.significado}</b>
                  <p><b>Cuándo se dibuja:</b> ${val.criterio}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  function filtrarYRenderizarNodos(data) {
    const list = document.getElementById('ra-nodes-list');
    if (!list) return;

    let filtrados = data.nodos;
    if (filterClase === 'previo') filtrados = filtrados.filter(n => (n.clase || '').includes('previo'));
    else if (filterClase === 'propuesto') filtrados = filtrados.filter(n => (n.clase || '').includes('propuesto'));
    else if (filterClase === 'entorno') filtrados = filtrados.filter(n => !(n.clase || '').includes('previo') && !(n.clase || '').includes('propuesto'));

    if (searchQuery) {
      filtrados = filtrados.filter(n =>
        n.id.toLowerCase().includes(searchQuery) ||
        n.nombre.toLowerCase().includes(searchQuery) ||
        (n.proceso || '').toLowerCase().includes(searchQuery) ||
        (n.funcion || '').toLowerCase().includes(searchQuery)
      );
    }

    list.innerHTML = filtrados.map(n => `
      <div class="ra-item ${n.id === selectedNodeId ? 'sel' : ''}" data-id="${n.id}">
        <span class="ra-id-badge">${n.id}</span>
        <div class="ra-item-info">
          <b>${n.nombre}</b>
          <small>${n.clase} · Proceso: ${n.proceso}</small>
          <p>${n.funcion}</p>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.ra-item').forEach(el => {
      el.onclick = () => {
        selectedNodeId = el.dataset.id;
        list.querySelectorAll('.ra-item').forEach(x => x.classList.toggle('sel', x === el));
        activeTab = 'grafo';
        panelEl.querySelectorAll('#ra-tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'grafo'));
        renderizarTab();
      };
    });
  }

  function renderizarRelaciones(data) {
    const list = document.getElementById('ra-rels-list');
    if (!list) return;

    let filtradas = data.relaciones;
    if (filterTag !== 'todos') filtradas = filtradas.filter(r => r.tag === filterTag);

    list.innerHTML = filtradas.map(r => {
      const c = (TAG_INFO[r.tag] || {}).c || '#38bdf8';
      return `
        <div class="ra-rel-card" style="--tag-c:${c}">
          <div class="rel-head">
            <span class="tag-lbl">${r.tag}</span>
            <span>${r.de} ➔ ${r.a}</span>
          </div>
          <p><b>Acción:</b> ${r.relacion}</p>
          <small><b>Condición:</b> ${r.condicion}</small>
          <small><b>Si falla:</b> ${r.falla}</small>
        </div>
      `;
    }).join('');
  }

  function dibujarGrafoSVG(data) {
    const svg = document.getElementById('ra-official-svg');
    if (!svg) return;
    svg.innerHTML = '';

    const W = 440, H = 300, cx = W / 2, cy = H / 2;

    // Crear marcadores de flecha para cada TAG
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    let markersHtml = '';
    Object.entries(TAG_INFO).forEach(([tag, inf]) => {
      markersHtml += `
        <marker id="arrow-${tag}" viewBox="0 0 10 10" refX="14" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${inf.c}" opacity="0.9" />
        </marker>
      `;
    });
    defs.innerHTML = markersHtml;
    svg.appendChild(defs);

    const gLinks = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(gLinks);

    const gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(gNodes);

    const coords = {};

    // ================= CASO 1: RED INDIVIDUAL POR TAG =================
    if (activeGraphTag !== 'todos' && graphMode === 'individual') {
      const relsTag = data.relaciones.filter(r => r.tag === activeGraphTag);
      const nodeIdsSet = new Set();
      relsTag.forEach(r => { nodeIdsSet.add(r.de); nodeIdsSet.add(r.a); });

      const nodosParticipantes = data.nodos.filter(n => nodeIdsSet.has(n.id));
      const totalN = nodosParticipantes.length || 1;
      const tagCol = (TAG_INFO[activeGraphTag] || {}).c || '#38bdf8';

      // Distribución circular óptima y amplia para que se lean bien los nombres
      const R = Math.min(cx, cy) * 0.76;
      nodosParticipantes.forEach((n, i) => {
        const a = (i / totalN) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R;
        coords[n.id] = { x, y, n, col: (n.clase || '').includes('previo') ? '#38bdf8' : (n.clase || '').includes('propuesto') ? '#a3e635' : '#fb923c', r: 12 };
      });

      // Dibujar enlaces individuales con flechas animadas
      relsTag.forEach(rel => {
        const p1 = coords[rel.de], p2 = coords[rel.a];
        if (!p1 || !p2) return;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const mx = (p1.x + p2.x) / 2 + (cx - (p1.x + p2.x) / 2) * 0.35;
        const my = (p1.y + p2.y) / 2 + (cy - (p1.y + p2.y) / 2) * 0.35;
        path.setAttribute('d', `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', tagCol);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('opacity', '0.75');
        path.setAttribute('marker-end', `url(#arrow-${rel.tag})`);
        path.dataset.de = rel.de;
        path.dataset.a = rel.a;
        path.classList.add('ra-link', 'anim');
        gLinks.appendChild(path);
      });

      // Dibujar nodos individuales con etiquetas visibles
      nodosParticipantes.forEach(n => {
        const pt = coords[n.id];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('ra-node');
        g.dataset.id = n.id;
        if (n.id === selectedNodeId) g.classList.add('sel');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x.toFixed(1));
        circle.setAttribute('cy', pt.y.toFixed(1));
        circle.setAttribute('r', pt.r);
        circle.setAttribute('fill', pt.col);
        circle.setAttribute('stroke', 'rgba(15,23,42,0.95)');
        circle.setAttribute('stroke-width', '2');

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', pt.x.toFixed(1));
        label.setAttribute('y', (pt.y + 3.5).toFixed(1));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#04121c');
        label.setAttribute('font-size', '8px');
        label.setAttribute('font-weight', '900');
        label.textContent = n.id.replace('ENV-', 'E').replace('E1-', '').replace('E2-', '').replace('E3-', '').replace('E4-', '').replace('E5-', '').replace('E6-', '').replace('E7-', '').replace('E8-', '').replace('E9-', '');

        const textDesc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const off = pt.y > cy ? 18 : -14;
        textDesc.setAttribute('x', pt.x.toFixed(1));
        textDesc.setAttribute('y', (pt.y + off).toFixed(1));
        textDesc.setAttribute('text-anchor', 'middle');
        textDesc.setAttribute('fill', '#e2f3ff');
        textDesc.setAttribute('font-size', '8.5px');
        textDesc.setAttribute('font-weight', '700');
        textDesc.textContent = n.nombre.split(' ')[0] + (n.nombre.split(' ')[1] ? ' ' + n.nombre.split(' ')[1].slice(0, 4) : '');

        g.appendChild(circle);
        g.appendChild(label);
        g.appendChild(textDesc);

        g.onclick = () => seleccionarNodo(n, data);
        gNodes.appendChild(g);
      });

    } else {
      // ================= CASO 2: RED COMPLETA (100 NODOS) =================
      const previos = data.nodos.filter(n => (n.clase || '').includes('previo'));
      const propuestos = data.nodos.filter(n => (n.clase || '').includes('propuesto'));
      const entorno = data.nodos.filter(n => !(n.clase || '').includes('previo') && !(n.clase || '').includes('propuesto'));

      // Anillo 1 (Centro): Roles previos
      previos.forEach((n, i) => {
        const a = (i / previos.length) * Math.PI * 2 - Math.PI / 2;
        coords[n.id] = { x: cx + Math.cos(a) * 46, y: cy + Math.sin(a) * 46, n, col: '#38bdf8', r: 8 };
      });

      // Anillo 2 (Medio): Roles propuestos
      propuestos.forEach((n, i) => {
        const a = (i / propuestos.length) * Math.PI * 2 - Math.PI / 2;
        coords[n.id] = { x: cx + Math.cos(a) * 98, y: cy + Math.sin(a) * 98, n, col: '#a3e635', r: 5 };
      });

      // Anillo 3 (Exterior): No humanos y entorno
      entorno.forEach((n, i) => {
        const a = (i / entorno.length) * Math.PI * 2 - Math.PI / 2;
        coords[n.id] = { x: cx + Math.cos(a) * 132, y: cy + Math.sin(a) * 132, n, col: '#fb923c', r: 6.5 };
      });

      // Dibujar enlaces (filtrando o resaltando el TAG si hay uno seleccionado)
      data.relaciones.forEach(rel => {
        const p1 = coords[rel.de], p2 = coords[rel.a];
        if (!p1 || !p2) return;

        const coincideTag = activeGraphTag === 'todos' || rel.tag === activeGraphTag;
        const col = (TAG_INFO[rel.tag] || {}).c || '#38bdf8';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const mx = (p1.x + p2.x) / 2 + (cx - (p1.x + p2.x) / 2) * 0.2;
        const my = (p1.y + p2.y) / 2 + (cy - (p1.y + p2.y) / 2) * 0.2;
        path.setAttribute('d', `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', col);
        path.setAttribute('stroke-width', coincideTag ? (activeGraphTag === 'todos' ? '1.2' : '2.4') : '0.6');
        path.setAttribute('opacity', coincideTag ? (activeGraphTag === 'todos' ? '0.45' : '0.9') : '0.08');
        path.setAttribute('marker-end', `url(#arrow-${rel.tag})`);
        path.dataset.de = rel.de;
        path.dataset.a = rel.a;
        path.dataset.tag = rel.tag;
        if (coincideTag) path.classList.add('ra-link', 'anim');
        gLinks.appendChild(path);
      });

      // Dibujar los 100 nodos
      Object.values(coords).forEach(pt => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('ra-node');
        g.dataset.id = pt.n.id;
        if (pt.n.id === selectedNodeId) g.classList.add('sel');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x.toFixed(1));
        circle.setAttribute('cy', pt.y.toFixed(1));
        circle.setAttribute('r', pt.r);
        circle.setAttribute('fill', pt.col);
        circle.setAttribute('stroke', 'rgba(15,23,42,0.9)');
        circle.setAttribute('stroke-width', '1.5');

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${pt.n.id}: ${pt.n.nombre}`;
        g.appendChild(title);
        g.appendChild(circle);

        g.onclick = () => seleccionarNodo(pt.n, data);
        gNodes.appendChild(g);
      });
    }

    if (selectedNodeId) {
      const selNode = data.nodos.find(n => n.id === selectedNodeId);
      if (selNode) seleccionarNodo(selNode, data);
    }
  }

  function seleccionarNodo(nodo, data) {
    selectedNodeId = nodo.id;
    const info = document.getElementById('ra-node-info');
    if (!info) return;

    // Resaltar en SVG
    const svg = document.getElementById('ra-official-svg');
    if (svg) {
      svg.querySelectorAll('.ra-node').forEach(n => n.classList.toggle('sel', n.dataset.id === nodo.id));
      svg.querySelectorAll('.ra-link').forEach(l => {
        const conecta = l.dataset.de === nodo.id || l.dataset.a === nodo.id;
        l.setAttribute('opacity', conecta ? '1' : '0.08');
        l.setAttribute('stroke-width', conecta ? '2.8' : '0.8');
      });
    }

    const sale = data.relaciones.filter(r => r.de === nodo.id);
    const entra = data.relaciones.filter(r => r.a === nodo.id);

    info.innerHTML = `
      <b><span class="tag-pill" style="background:${(TAG_INFO.INF || {}).c};color:#04121c">${nodo.id}</span> ${nodo.nombre}</b>
      <div style="font-size:10.5px;color:#94a3b8;margin:2px 0 4px">${nodo.clase} · Proceso: ${nodo.proceso}</div>
      <p style="margin:4px 0 6px;color:#e2f3ff">${nodo.funcion}</p>
      ${sale.length ? `<div style="font-size:10.5px;color:#7dd3fc;margin-top:4px"><b>➔ Conecta hacia (${sale.length}):</b> ${sale.map(s => `${s.a} (${s.tag})`).join(', ')}</div>` : ''}
      ${entra.length ? `<div style="font-size:10.5px;color:#a3e635;margin-top:2px"><b>➔ Recibe de (${entra.length}):</b> ${entra.map(e => `${e.de} (${e.tag})`).join(', ')}</div>` : ''}
    `;
  }

  function enfocarEstrategia(id) {
    const CENTROS = {
      E1: [2095.67, -109.06, 620, 520],
      E2: [7299 * 0.5, 4000 * 0.5, 380, 310],
      E3: [7693 * 0.5, 4292 * 0.5, 360, 290],
      E4: [7299 * 0.5, 5815 * 0.5, 420, 340],
      E5: [7183 * 0.5, 3758 * 0.5, 460, 380],
      E6: [7350 * 0.5, 4100 * 0.5, 400, 320],
      E7: [7500 * 0.5, 4400 * 0.5, 390, 310],
      E8: [7250 * 0.5, 3950 * 0.5, 380, 300],
      E9: [7150 * 0.5, 4200 * 0.5, 410, 330]
    };

    const c = CENTROS[id] || CENTROS.E1;
    if (id === 'E1') {
      volarA(c[0], c[1], c[2], c[3]);
    } else {
      const w = lw ? lw(c[0], c[1]) : [c[0], c[1]];
      volarA(w[0], w[1], c[2], c[3]);
    }
  }

  function mostrarRedActores(id) {
    if (id) activeStrategyId = id;
    selectedNodeId = null;
    renderizarModal();
    enfocarEstrategia(activeStrategyId);
  }

  function ocultarRedActores() {
    if (panelEl) panelEl.classList.add('oculto');
  }

  // Al iniciar, exponer en window
  window.MOSTRAR_RED_ACTORES = mostrarRedActores;
  window.OCULTAR_RED_ACTORES = ocultarRedActores;

  return {
    mostrarRedActores,
    ocultarRedActores
  };
}
