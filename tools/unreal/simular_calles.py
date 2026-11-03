"""Agentes de calle para Kennedy360: carros, buses, peatones, perros y torcazas en toda la zona modelada (1,6 km alrededor
del humedal El Burro). Mismo estilo que simular_agentes.py (arquitectura ABM del curso): identidades estables, azar con
dirección lógica, lectura de una instantánea y publicación por el motor, interacciones con orden estable y cuentas cerradas.

- Carros (avenidas y vías intermedias, cada uno en su carril): modelo de seguimiento IDM (Treiber, Hennecke y Helbing 2000):
  frenan detrás del carro de adelante, paran en rojo en los semáforos de las intersecciones con avenida, ceden el paso en los
  cruces sin semáforo (pasa primero el que está más cerca) y frenan ante peatones sobre la calzada.
- Buses del SITP zonal: los mismos IDM, con paraderos cada ~320 m; se detienen 12 s, suben los que esperan y bajan pasajeros.
- Peatones: caminan por el andén (a la derecha de su sentido, con una posición lateral propia) hacia tiendas, paraderos,
  colegios, parques o su casa. Antes de cruzar una calzada esperan un hueco en el tráfico; si esperan mucho aceptan huecos más cortos.
- Perros callejeros (Canis familiaris, lista de mamíferos del grupo): deambulan por los andenes, descansan y a veces siguen a
  una persona unos segundos.
- Torcazas (Zenaida auriculata) en bandadas en los parques: comen en el suelo y levantan el vuelo si una persona o un perro se
  acerca a menos de 7 m (distancia de huida [SUP]); dan vueltas sobre el parque y se vuelven a posar.
60 s de calentamiento (colas en los semáforos, peatones repartidos) y 60 s exportados a 24 cuadros por segundo.
Salida (Importar/calles): calles.json (claves de cada agente y fases de los semáforos), mallas .obj, resultados_calles.json.
Uso: python tools/unreal/simular_calles.py [carpeta_salida]"""
import hashlib, heapq, json, math, os, struct, sys
import numpy as np

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360\Importar\calles'
os.makedirs(OUT, exist_ok=True)
SEMILLA = 20261103; SUELO = 15.8; RADIO = 1550.0   # los agentes se quedan dentro del suelo propio (disco de 1,6 km)
MXg = 111320 * math.cos(math.radians(4.63)); MYg = 110540.0
DX = -5193.24 - (-74.149778 + 74.17) * MXg; DY = -2090.06 - (4.640683 - 4.63) * MYg
def en(x, y): return x + DX, y + DY
def ll(lon, lat): return en((lon + 74.17) * MXg + 5193.24, (lat - 4.63) * MYg + 2090.06)
def azar(*clave):
    h = hashlib.blake2b(repr((SEMILLA,) + clave).encode(), digest_size=8).digest(); return struct.unpack('<Q', h)[0] / 2 ** 64
def dentro_zona(p, m=0.0): return p[0] * p[0] + p[1] * p[1] < (RADIO + m) ** 2
ANCHO = {'major': 18.0, 'mid': 9.0, 'local': 6.0}; ANDEN = {'major': 3.0, 'mid': 2.5, 'local': 1.5}   # como exportar_suelo.py
ACERA = {c: ANCHO[c] / 2 + ANDEN[c] / 2 for c in ANCHO}                                          # eje del andén desde el eje de la vía
DT = 0.25; FPS = 24; CAL = int(60 / DT); EXP = int(60 / DT); TOTAL = CAL + EXP; CUADROS = int(EXP * DT * FPS)
def cuadro(paso): return int(round((paso - CAL) * DT * FPS))

# ---------------------------------------------------------------- malla vial
N = json.load(open(os.path.join(RAIZ, 'data3d', 'net.json'), encoding='utf-8'))
nodos, adj = {}, {}
def nodo(p):
    k = (round(p[0]), round(p[1]))
    if k not in nodos: nodos[k] = len(nodos); adj[nodos[k]] = {}
    return nodos[k]
SEGS = []  # segmentos de vía para saber si un punto está sobre la calzada
for cls, e in N['edges']:
    q = [en(*a) for a in e]
    if not any(dentro_zona(p, 300) for p in q): continue
    for i in range(len(q) - 1):
        a, b = nodo(q[i]), nodo(q[i + 1])
        if a == b: continue
        adj[a][b] = cls; adj[b][a] = cls; SEGS.append((q[i], q[i + 1], cls))
XY = np.zeros((len(nodos), 2))
for k, i in nodos.items(): XY[i] = k
TOL = 12.0; rej = {}
for i, (x, y) in enumerate(XY): rej.setdefault((int(x // TOL), int(y // TOL)), []).append(i)
for i in [i for i in adj if len(adj[i]) == 1]:  # extremos sueltos al vértice más cercano (como en simular_agentes.py)
    x, y = XY[i]; mejor, md = None, TOL
    for gx in (-1, 0, 1):
        for gy in (-1, 0, 1):
            for j in rej.get((int(x // TOL) + gx, int(y // TOL) + gy), []):
                d = math.dist(XY[i], XY[j])
                if j != i and j not in adj[i] and d < md: mejor, md = j, d
    if mejor is not None:
        cl = 'local' if 'local' in adj[i].values() or 'local' in adj[mejor].values() else max(list(adj[i].values()) + list(adj[mejor].values()), key=lambda c: ANCHO[c])
        adj[i][mejor] = cl; adj[mejor][i] = cl
def es_auto(c): return c in ('major', 'mid')
grado_auto = {i: sum(1 for c in adj[i].values() if es_auto(c)) for i in adj}
def dijkstra(fuente, filtro, peso):
    dist = {fuente: 0.0}; prev = {}; h = [(0.0, fuente)]
    while h:
        d, i = heapq.heappop(h)
        if d > dist[i]: continue
        for j, c in adj[i].items():
            if not filtro(c): continue
            nd = d + peso(i, j, c)
            if nd < dist.get(j, 1e18): dist[j] = nd; prev[j] = i; heapq.heappush(h, (nd, j))
    return dist, prev
def camino(prev, a, b):
    if b != a and b not in prev: return None
    c = [b]
    while c[-1] != a: c.append(prev[c[-1]])
    return c[::-1]
VEL_AUTO = {'major': 13.9, 'mid': 8.3}
def peso_auto(i, j, c): return math.dist(XY[i], XY[j]) / VEL_AUTO[c]
def peso_pie(i, j, c): return math.dist(XY[i], XY[j])

class Ruta:
    """Polilínea desplazada a la derecha del sentido de marcha (carril o andén), parametrizada por longitud."""
    def __init__(self, ids, desp_fn, jitter=0.0):
        self.ids = ids; P = XY[ids]; n = len(P)
        clases = [adj[ids[k]][ids[k + 1]] for k in range(n - 1)]; self.clases = clases
        d = np.diff(P, axis=0); L = np.maximum(np.hypot(d[:, 0], d[:, 1]), 1e-6); t = d / L[:, None]; nr = np.stack([t[:, 1], -t[:, 0]], 1)
        off = np.array([desp_fn(c) for c in clases]) + jitter
        Q = np.zeros_like(P)
        for k in range(n):
            if k == 0: Q[k] = P[k] + nr[0] * off[0]
            elif k == n - 1: Q[k] = P[k] + nr[-1] * off[-1]
            else:
                m = nr[k - 1] + nr[k]; mn = np.linalg.norm(m)
                if mn < 0.3: Q[k] = P[k] + nr[k] * off[k]
                else:
                    m = m / mn; c = max(0.5, float(np.dot(m, nr[k]))); Q[k] = P[k] + m * (off[k - 1] + off[k]) / 2 / c
        dq = np.diff(Q, axis=0); lq = np.hypot(dq[:, 0], dq[:, 1]); self.Q = Q; self.S = np.concatenate([[0], np.cumsum(lq)]); self.L = float(self.S[-1])
        self.rumbo = np.degrees(np.arctan2(dq[:, 1], dq[:, 0]))
    def pos(self, s):
        s = min(max(s, 0.0), self.L); k = int(np.clip(np.searchsorted(self.S, s, side='right') - 1, 0, len(self.S) - 2))
        f = (s - self.S[k]) / max(self.S[k + 1] - self.S[k], 1e-9); p = self.Q[k] + (self.Q[k + 1] - self.Q[k]) * f
        return float(p[0]), float(p[1]), float(self.rumbo[k]), k

# ---------------------------------------------------------------- semáforos: intersecciones de avenida con otra vía de carros
cand = [i for i in adj if grado_auto[i] >= 3 and 'major' in adj[i].values() and dentro_zona(XY[i], 100)]
SEM = []; nodo_sem = {}
for i in sorted(cand, key=lambda i: azar('sem', i)):  # agrupar nodos a menos de 22 m en un solo controlador
    for k, s in enumerate(SEM):
        if math.dist(XY[i], s['xy']) < 22: nodo_sem[i] = k; break
    else:
        j = next(j for j, c in adj[i].items() if c == 'major'); eje = math.atan2(*(XY[j] - XY[i])[::-1])
        SEM.append({'xy': XY[i].copy(), 'eje': eje, 'desfase': azar('desfase', i) * 50}); nodo_sem[i] = len(SEM) - 1
CICLO, VERDE, AMBAR = 50.0, 22.0, 3.0  # [SUP] ciclo de 50 s: 22 s de verde y 3 de amarillo por grupo
def fase(k, t, grupo):
    """'verde', 'ambar' o 'rojo' para el grupo 0 (paralelo al eje de la avenida) o 1 (transversal)."""
    u = (t + SEM[k]['desfase']) % CICLO; ini = 0 if grupo == 0 else VERDE + AMBAR
    if ini <= u < ini + VERDE: return 'verde'
    if ini + VERDE <= u < ini + VERDE + AMBAR: return 'ambar'
    return 'rojo'
def grupo_de(k, rumbo_deg):
    return 0 if abs(math.cos(math.radians(rumbo_deg) - SEM[k]['eje'])) >= 0.7071 else 1
print('red: %d nodos; %d semáforos' % (len(nodos), len(SEM)))

# ---------------------------------------------------------------- destinos de los peatones
nodos_zona = [i for i in adj if dentro_zona(XY[i], -60)]
nodos_auto = [i for i in nodos_zona if grado_auto[i] >= 1]
locales = [i for i in nodos_zona if 'local' in adj[i].values()]
TIENDAS = sorted(locales, key=lambda i: azar('tienda', i))[:220]
OSM = json.load(open(os.path.join(RAIZ, 'data3d', 'osm_suelo.json'), encoding='utf-8'))
NXY = XY.copy()
def cercano(p, conj):
    arr = np.array(conj); d = np.hypot(NXY[arr, 0] - p[0], NXY[arr, 1] - p[1]); return int(arr[np.argmin(d)])
COLEGIOS = []
for s in OSM:
    if s['tipo'] == 'school':
        q = [ll(*p) for p in s['pts']]; c = (sum(p[0] for p in q) / len(q), sum(p[1] for p in q) / len(q))
        if dentro_zona(c, -80): COLEGIOS.append(cercano(c, nodos_zona))
PQ = json.load(open(os.path.join(RAIZ, 'data3d', 'parques.json'), encoding='utf-8'))
def area(p): return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
def dentro(x, y, pts):
    c = False
    for i in range(len(pts)):
        a, b = pts[i], pts[i - 1]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1] + 1e-12) + a[0]: c = not c
    return c
PARQUES = []
for p in PQ:
    q = [en(*a) for a in p['pts']]
    if len(q) < 4: continue
    c = (sum(x for x, _ in q) / len(q), sum(y for _, y in q) / len(q))
    if dentro_zona(c, -100) and dentro(*c, q) and area(q) > 2500: PARQUES.append((area(q), c, q))
PARQUES = [(c, q) for _, c, q in sorted(PARQUES, reverse=True)[:12]]
def borde_parque(c, q):
    """Punto dentro del parque a ~12 m del andén más cercano: ahí comen las torcazas y pasa la gente."""
    arr = np.array([i for i in adj if math.dist(XY[i], c) < 400] or list(adj)); d = np.hypot(XY[arr, 0] - c[0], XY[arr, 1] - c[1])
    for i in arr[np.argsort(d)][:40]:
        p = XY[i]; v = np.subtract(c, p); L = np.linalg.norm(v)
        if L < 1: continue
        for dist_ in (9, 11, 14, 18):
            m = p + v / L * dist_
            if dentro(m[0], m[1], q): return (float(m[0]), float(m[1]))
    return c
FLOCKS = [borde_parque(c, q) for c, q in PARQUES]
print('destinos: %d tiendas, %d colegios, %d parques' % (len(TIENDAS), len(COLEGIOS), len(PARQUES)))

# ---------------------------------------------------------------- calzada: dónde un peatón está cruzando
grid_seg = {}
for k, (a, b, c) in enumerate(SEGS):
    for t in np.linspace(0, 1, max(2, int(math.dist(a, b) / 10) + 2)):
        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); grid_seg.setdefault((int(p[0] // 20), int(p[1] // 20)), set()).add(k)
def en_calzada(x, y):
    """Clase de la calzada bajo el punto o None (avenida: dos calzadas de 7 m a ±5,5 m del eje)."""
    gx, gy = int(x // 20), int(y // 20); mejor = None
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for k in grid_seg.get((gx + dx, gy + dy), ()):
                a, b, c = SEGS[k]; vx, vy = b[0] - a[0], b[1] - a[1]; L2 = vx * vx + vy * vy or 1e-9
                t = max(0, min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / L2)); d = math.hypot(x - a[0] - vx * t, y - a[1] - vy * t)
                if (c == 'major' and 2.0 <= d <= 9.0) or (c != 'major' and d < ANCHO[c] / 2): return c
    return None

# ---------------------------------------------------------------- buses del SITP zonal y paraderos
mayores = [i for i in nodos_zona if 'major' in adj[i].values() and dentro_zona(XY[i], -150)]
BUSES_RUTAS = []; PARADEROS = []
cache_bus = {}
for k in range(600):
    if len(BUSES_RUTAS) >= 8: break
    a = mayores[int(azar('bus_a', k) * len(mayores))]; b = mayores[int(azar('bus_b', k) * len(mayores))]
    if math.dist(XY[a], XY[b]) < 1000: continue
    if a not in cache_bus: cache_bus[a] = dijkstra(a, es_auto, peso_auto)[1]  # avenidas e intermedias
    c = camino(cache_bus[a], a, b)
    if not c or len(c) < 10 or not all(dentro_zona(XY[i], 30) for i in c): continue
    r = Ruta(c, lambda cl: 7.25 if cl == 'major' else 2.25)  # carril derecho
    if r.L < 1000 or any(abs(r.L - br['ruta'].L) < 50 and math.dist(r.Q[0], br['ruta'].Q[0]) < 100 for br in BUSES_RUTAS): continue
    paradas = []
    for s in np.arange(150, r.L - 80, 320):
        x, y, rb, _ = r.pos(s); nx, ny = math.sin(math.radians(rb)), -math.cos(math.radians(rb))
        PARADEROS.append({'x': x + nx * 3.25, 'y': y + ny * 3.25, 'rumbo': rb, 'ruta': len(BUSES_RUTAS), 's': float(s)}); paradas.append(len(PARADEROS) - 1)
    BUSES_RUTAS.append({'ruta': r, 'paradas': paradas})
print('buses: %d rutas, %d paraderos' % (len(BUSES_RUTAS), len(PARADEROS)))

# ---------------------------------------------------------------- agentes
class Agente:
    __slots__ = ('id', 'tipo', 'ruta', 's', 'v', 'v0', 'largo', 'activo', 'inicio', 'fin', 'muestras', 'color', 'extra')
    def __init__(self, id_, tipo, ruta, s, v0, largo, color, paso):
        self.id, self.tipo, self.ruta, self.s, self.v, self.v0, self.largo = id_, tipo, ruta, s, v0 * 0.6, v0, largo
        self.activo, self.inicio, self.fin, self.muestras, self.color, self.extra = True, paso, None, [], color, {}
        self.v = 0.0  # arrancan detenidos: con 8 m/s y 9 m de separación no alcanzaban a frenar y quedaban encimados
AGENTES = []; nid = [0]
def nuevo(tipo, ruta, s, v0, largo, color, paso, **extra):
    a = Agente(nid[0], tipo, ruta, s, v0, largo, color, paso); a.extra.update(extra); nid[0] += 1; AGENTES.append(a); return a
# rutas de carros: entre nodos de la red de carros, de 700 m a 3 km, que no salgan del suelo propio
cache_auto = {}
def ruta_auto(k):
    for intento in range(30):
        a = nodos_auto[int(azar('auto_a', k, intento) * len(nodos_auto))]; b = nodos_auto[int(azar('auto_b', k, intento) * len(nodos_auto))]
        if not (700 < math.dist(XY[a], XY[b]) < 3000): continue
        if a not in cache_auto: cache_auto[a] = dijkstra(a, es_auto, peso_auto)[1]
        c = camino(cache_auto[a], a, b)
        if not c or len(c) < 3 or not all(dentro_zona(XY[i], 30) for i in c): continue
        carril = 7.25 if azar('carril', k) < 0.45 else 3.75
        return Ruta(c, lambda cl: carril if cl == 'major' else 2.25)
    return None
def ruta_peaton(k, origen=None):
    for intento in range(30):
        o = origen if origen is not None else locales[int(azar('casa', k, intento) * len(locales))]
        u = azar('destino', k, intento)
        if u < 0.35: tipo, d = 'tienda', TIENDAS[int(azar('t', k, intento) * len(TIENDAS))]
        elif u < 0.58 and PARADEROS: tipo = 'paradero'; pi = int(azar('p', k, intento) * len(PARADEROS)); d = cercano((PARADEROS[pi]['x'], PARADEROS[pi]['y']), nodos_zona)
        elif u < 0.72 and COLEGIOS: tipo, d = 'colegio', COLEGIOS[int(azar('c', k, intento) * len(COLEGIOS))]
        elif u < 0.88 and PARQUES: tipo = 'parque'; pk = int(azar('q', k, intento) * len(PARQUES)); d = cercano(PARQUES[pk][0], nodos_zona)
        else: tipo, d = 'casa', locales[int(azar('casa2', k, intento) * len(locales))]
        if not (120 < math.dist(XY[o], XY[d]) < 800): continue
        c = camino_pie(o, d)
        if not c or len(c) < 2: continue
        r = Ruta(c, lambda cl: ACERA[cl], jitter=(azar('lado', k) - 0.5) * 0.9)
        r.cruces = []  # tramos sobre la calzada [s0, s1, clase]
        dentro_c = None
        for s in np.arange(0, r.L, 0.5):
            x, y, _, _ = r.pos(s); c_ = en_calzada(x, y)
            if c_ and dentro_c is None: dentro_c = [s, s, c_]
            elif c_ and dentro_c: dentro_c[1] = s
            elif not c_ and dentro_c: r.cruces.append(dentro_c); dentro_c = None
        if dentro_c: r.cruces.append(dentro_c)
        r.cruces = [c_ for c_ in r.cruces if c_[1] - c_[0] > 1.0]
        extra = {'destino': tipo}
        if tipo == 'paradero': extra['paradero'] = pi
        return r, extra
    return None, None
def camino_pie(o, d):  # A* sobre toda la red (los peatones caminan por cualquier calle)
    h0 = math.dist(XY[o], XY[d]); dist = {o: 0.0}; prev = {}; h = [(h0, 0.0, o)]
    while h:
        _, g, i = heapq.heappop(h)
        if i == d: break
        if g > dist[i] or g > 1500: continue
        for j in adj[i]:
            ng = g + math.dist(XY[i], XY[j])
            if ng < dist.get(j, 1e18): dist[j] = ng; prev[j] = i; heapq.heappush(h, (ng + math.dist(XY[j], XY[d]), ng, j))
    return camino(prev, o, d)

N_CARROS, N_PEATONES, N_PERROS = 380, 900, 45   # [SUP] una mañana de día hábil en la zona
print('rutas de carros...'); k_auto = 0; ocupado = {}
def libre(x, y, rb, sep=13.0):  # nadie del mismo sentido a menos de 'sep' metros (posición inicial sin carros encimados)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for (ox, oy, orb) in ocupado.get((int(x // 20) + dx, int(y // 20) + dy), ()):
                if math.hypot(ox - x, oy - y) < sep and math.cos(math.radians(orb - rb)) > 0.3: return False
    return True
for k in range(N_CARROS):
    r = None; s0 = 0.0
    while r is None:
        r = ruta_auto(k_auto); k_auto += 1
        if r is None: continue
        for intento in range(20):
            s0 = azar('s_auto', k, intento) * r.L * 0.85; x0, y0, rb0, _ = r.pos(s0)
            if libre(x0, y0, rb0): break
        else: r = None
    ocupado.setdefault((int(x0 // 20), int(y0 // 20)), []).append((x0, y0, rb0))
    nuevo('carro', r, s0, VEL_AUTO['major'] * (0.85 + 0.25 * azar('v0', k)), 4.5 if azar('tipo', k) < 0.72 else 4.7, int(azar('color', k) * 8), 0, camioneta=azar('tipo', k) >= 0.72)
for k, br in enumerate(BUSES_RUTAS):
    for j, f in enumerate((0.05, 0.55)):
        nuevo('bus', br['ruta'], br['ruta'].L * f, 11.0, 11.0, 0, 0, linea=k, servidas=set())
print('rutas de peatones...'); k_pie = 0
for k in range(N_PEATONES):
    r = None
    while r is None: r, ex = ruta_peaton(k_pie); k_pie += 1
    a = nuevo('peaton', r, azar('s_pie', k) * r.L * 0.9, 1.1 + 0.4 * azar('vpie', k), 0.5, int(azar('ropa', k) * 64), 0, **ex)
    a.extra['espera'] = 0.0
# perros: deambulan nodo a nodo por los andenes
PERROS = []
for k in range(N_PERROS):
    i0 = locales[int(azar('perro', k) * len(locales))]
    PERROS.append({'id': k, 'nodo': i0, 'sig': next(iter(adj[i0])), 'f': azar('pf', k), 'v': 0.0, 'descanso': azar('pd', k) * 20, 'sigue': -1, 't_sigue': 0.0,
                   'x': XY[i0, 0], 'y': XY[i0, 1], 'rumbo': 0.0, 'lado': 1 if azar('plado', k) < 0.5 else -1, 'muestras': [], 'color': int(azar('pcolor', k) * 4)})
# torcazas en los parques
BANDADAS = []
for k, (c0, q) in enumerate(PARQUES):
    c = FLOCKS[k]; n = 10 + int(azar('nb', k) * 6)
    pos = np.array([[c[0] + (azar('bx', k, j) - 0.5) * 8, c[1] + (azar('by', k, j) - 0.5) * 8] for j in range(n)])
    BANDADAS.append({'id': k, 'centro': np.array(c, float), 'parque': q, 'pos': pos, 'z': np.zeros(n), 'rumbo': np.array([azar('br', k, j) * 360 for j in range(n)]),
                     'vuela': False, 't_vuelo': 0.0, 'fase': np.array([azar('bf', k, j) * 6.283 for j in range(n)]), 'muestras': [[] for _ in range(n)], 'levantadas': 0})

# ---------------------------------------------------------------- simulación
IDM = {'a': 1.2, 'b': 2.0, 'T': 1.4, 's0': 2.0}  # [PUB] valores típicos de ciudad (Treiber y Kesting)
def idm(v, v0, gap, dv):
    ss = IDM['s0'] + max(0.0, v * IDM['T'] + v * dv / (2 * math.sqrt(IDM['a'] * IDM['b'])))
    return IDM['a'] * (1 - (v / max(v0, 0.1)) ** 4 - (ss / max(gap, 0.1)) ** 2)
M = {'cedidas_a_peaton': 0, 'paradas_en_rojo': 0, 'esperas_cruce': [], 'abordajes': 0, 'descensos': 0, 'perro_sigue': 0, 'levantadas': 0,
     'solapes': 0, 'carros_terminados': 0, 'peatones_llegaron': 0, 'velocidades': [], 'creados_peatones': N_PEATONES, 'creados_carros': N_CARROS}
RNG_EVT = 0
for paso in range(TOTAL):
    t = paso * DT
    act = [a for a in AGENTES if a.activo]
    # ---- fase 1: instantánea de posiciones (nadie escribe todavía)
    pos = {}
    for a in act: pos[a.id] = a.ruta.pos(a.s)
    rej_v, rej_p = {}, {}
    for a in act:
        x, y, rb, _ = pos[a.id]
        if a.tipo == 'peaton': rej_p.setdefault((int(x // 25), int(y // 25)), []).append(a)
        else: rej_v.setdefault((int(x // 25), int(y // 25)), []).append(a)
    cerca = lambda rej, x, y: [b for dx in (-1, 0, 1) for dy in (-1, 0, 1) for b in rej.get((int(x // 25) + dx, int(y // 25) + dy), ())]
    en_cruce = {}  # peatones sobre la calzada
    for a in act:
        if a.tipo == 'peaton' and any(c[0] <= a.s <= c[1] for c in a.ruta.cruces): en_cruce[a.id] = pos[a.id]
    nuevos_v = {}; eventos = []
    for a in act:
        x, y, rb, k = pos[a.id]; hx, hy = math.cos(math.radians(rb)), math.sin(math.radians(rb))
        if a.tipo in ('carro', 'bus'):
            gmin = 1e9  # hueco libre al líder del carril: restricción física (§8.4), no una preferencia
            acc = idm(a.v, a.v0 if a.tipo == 'bus' else min(a.v0, VEL_AUTO.get(a.ruta.clases[min(k, len(a.ruta.clases) - 1)], 8.3) * (a.v0 / VEL_AUTO['major'])), 1e9, 0.0)
            for b in cerca(rej_v, x, y):  # líder: el vehículo más restrictivo adelante en el mismo carril
                if b is a: continue
                bx, by, brb, _ = pos[b.id]; dx, dy = bx - x, by - y; lon = dx * hx + dy * hy; lat = -dx * hy + dy * hx
                if 0 < lon < 45 and abs(lat) < 1.7 and math.cos(math.radians(brb - rb)) > 0.5:
                    acc = min(acc, idm(a.v, a.v0, lon - (a.largo + b.largo) / 2, a.v - b.v)); gmin = min(gmin, lon - (a.largo + b.largo) / 2)
                    if lon - (a.largo + b.largo) / 2 < 0:
                        M['solapes'] += 1
            # líder a lo largo de la propia ruta (curvas y empalmes, donde mirar en línea recta no lo ve)
            muestras_r = [(d_, a.ruta.pos(a.s + d_)) for d_ in (3, 6, 9, 13, 18, 24, 32, 42) if a.s + d_ < a.ruta.L]
            for b in cerca(rej_v, x, y):
                if b is a: continue
                bx, by, brb, _ = pos[b.id]
                for d_, (px_, py_, pr_, _) in muestras_r:
                    if abs(bx - px_) < 2.2 and abs(by - py_) < 2.2 and math.hypot(bx - px_, by - py_) < 2.0 and math.cos(math.radians(brb - pr_)) > 0.3:
                        g_ = d_ - (a.largo + b.largo) / 2; acc = min(acc, idm(a.v, a.v0, g_, a.v - b.v)); gmin = min(gmin, g_); break
                        if os.environ.get('K360_DEBUG') and paso % 40 == 0: print('SOLAPE', paso, a.id, b.id, a.tipo, b.tipo, round(lon, 1), round(lat, 1), round(a.v, 1), round(b.v, 1), a.inicio, b.inicio, round(rb), round(brb), k, len(a.ruta.ids))
            for pid, (px, py, _, _) in ((p.id, en_cruce[p.id]) for p in cerca(rej_p, x, y) if p.id in en_cruce):
                dx, dy = px - x, py - y; lon = dx * hx + dy * hy; lat = -dx * hy + dy * hx
                if 0 < lon < 22 and abs(lat) < 2.6:
                    acc2 = idm(a.v, a.v0, lon - a.largo / 2 - 1.0, a.v)
                    if acc2 < acc - 0.3: eventos.append(('cede', a.id))
                    acc = min(acc, acc2)
            # semáforos y cruces sin semáforo en los próximos 50 m de la ruta
            ids = a.ruta.ids
            for kk in range(k + 1, len(ids) - 1):
                ds = a.ruta.S[kk] - a.s
                if ds > 50: break
                n_ = ids[kk]
                if (n_ in nodo_sem or grado_auto.get(n_, 0) >= 3) and ds < 16 and kk + 1 < len(ids):
                    # no entrar al cruce si no hay espacio a la salida (el que entra a un carril ocupado se encimaba)
                    exx, exy, exr, _ = a.ruta.pos(a.ruta.S[kk] + 7.0)
                    for b in cerca(rej_v, exx, exy):
                        if b is a: continue
                        bx, by, brb, _ = pos[b.id]
                        if math.hypot(bx - exx, by - exy) < 5.5 + b.largo / 2 and math.cos(math.radians(brb - exr)) > 0.5:
                            dx, dy = bx - x, by - y; lon = dx * hx + dy * hy; lat = -dx * hy + dy * hx
                            if not (0 < lon < 45 and abs(lat) < 1.7 and math.cos(math.radians(brb - rb)) > 0.5):  # si ya es mi líder, el IDM lo maneja
                                acc = min(acc, idm(a.v, a.v0, max(ds - 6.0 - a.largo / 2, 0.1), a.v)); break
                if n_ in nodo_sem:
                    ks = nodo_sem[n_]; f_ = fase(ks, t, grupo_de(ks, a.ruta.rumbo[kk - 1]))
                    gap = ds - 11.0 - a.largo / 2
                    if f_ != 'verde' and gap > -1.5 and (f_ == 'rojo' or a.v * a.v / (2 * IDM['b']) < gap):
                        acc2 = idm(a.v, a.v0, max(gap, 0.1), a.v)
                        if acc2 < acc: acc = acc2; eventos.append(('rojo', a.id))
                    break
                if grado_auto.get(n_, 0) >= 3 and ds < 22:  # cede el paso: pasa primero el más cercano al cruce
                    for b in cerca(rej_v, x, y):
                        if b is a or b.ruta.ids is ids: continue
                        bk = pos[b.id][3]
                        if n_ in b.ruta.ids[bk + 1:bk + 6]:
                            j = b.ruta.ids.index(n_, bk + 1); db = b.ruta.S[j] - b.s
                            if 0 < db < 22 and (db, b.id) < (ds, a.id) and math.cos(math.radians(pos[b.id][2] - rb)) < 0.8:
                                acc = min(acc, idm(a.v, a.v0, max(ds - 7.0 - a.largo / 2, 0.1), a.v)); break
                    break
            if a.tipo == 'bus':  # paraderos
                br = BUSES_RUTAS[a.extra['linea']]
                for pi in br['paradas']:
                    P_ = PARADEROS[pi]; ds = P_['s'] - a.s
                    if pi in a.extra['servidas'] or ds < -2: continue
                    if ds < 45: acc = min(acc, idm(a.v, a.v0, max(ds, 0.1) + IDM['s0'] + 0.3, a.v))  # se detiene justo en el paradero
                    if abs(ds) < 2.5 and a.v < 0.3:
                        a.extra.setdefault('parado', 0.0); eventos.append(('parada', a.id, pi))
                    break
            nv_ = max(0.0, a.v + max(-6.0, acc) * DT)
            if nv_ * DT > gmin - 0.5: nv_ = max(0.0, (gmin - 0.5) / DT)  # nunca avanza sobre el de adelante
            nuevos_v[a.id] = nv_
        else:  # peatón
            if a.s >= a.ruta.L - 0.3:
                nuevos_v[a.id] = 0.0; continue
            v = a.v0
            for c0, c1, cl in a.ruta.cruces:  # antes de cruzar: hueco en el tráfico
                if c0 - 1.0 <= a.s < c0:
                    cx, cy, _, _ = a.ruta.pos((c0 + c1) / 2); rad = (30 if cl == 'major' else 20) if a.extra['espera'] < 25 else 12
                    peligro = False
                    for b in cerca(rej_v, cx, cy):
                        bx, by, brb, _ = pos[b.id]; d = math.hypot(cx - bx, cy - by)
                        hacia = (cx - bx) * math.cos(math.radians(brb)) + (cy - by) * math.sin(math.radians(brb)) > 0
                        if d < 7 or (d < rad and hacia and b.v > 1.0): peligro = True; break
                    if peligro: v = 0.0
                    break
                if c0 <= a.s <= c1: v = a.v0 * 1.15  # sobre la calzada camina más rápido
            for b in cerca(rej_p, x, y):  # no se monta sobre el que va adelante en su mismo andén
                if b is a: continue
                bx, by, brb, _ = pos[b.id]; dx, dy = bx - x, by - y; lon = dx * hx + dy * hy; lat = -dx * hy + dy * hx
                if 0 < lon < 0.9 and abs(lat) < 0.45 and math.cos(math.radians(brb - rb)) > 0.7: v = min(v, b.v)
            nuevos_v[a.id] = v
    # ---- fase 2: eventos en orden estable (§10.2)
    for ev in sorted(eventos, key=lambda e: azar('orden', paso, *e[:2])):
        if ev[0] == 'cede': M['cedidas_a_peaton'] += 1
        elif ev[0] == 'rojo': M['paradas_en_rojo'] += 1
        elif ev[0] == 'parada':
            bus = next(b for b in act if b.id == ev[1]); pi = ev[2]; bus.extra['parado'] += DT
            if bus.extra['parado'] >= 12.0:  # 12 s en el paradero: suben los que esperan y bajan pasajeros
                P_ = PARADEROS[pi]
                for p in act:
                    if p.tipo == 'peaton' and p.activo and p.extra.get('destino') == 'paradero' and p.extra.get('paradero') == pi and p.s >= p.ruta.L - 0.3:
                        p.activo = False; p.fin = paso; p.extra['subio'] = True; M['abordajes'] += 1
                for j in range(int(azar('bajan', paso, bus.id) * 4)):
                    o = cercano((P_['x'], P_['y']), locales) if locales else None
                    r, ex = ruta_peaton(10 ** 6 + paso * 10 + j, origen=o)
                    if r:
                        nv = nuevo('peaton', r, 0.0, 1.1 + 0.4 * azar('vb', paso, j), 0.5, int(azar('ropab', paso, j) * 64), paso, **ex); nv.extra['espera'] = 0.0
                        M['descensos'] += 1; M['creados_peatones'] += 1
                bus.extra['servidas'].add(pi); bus.extra['parado'] = 0.0
    # ---- fase 3: el motor publica
    for a in act:
        if not a.activo: continue
        if a.tipo == 'peaton':
            nv = nuevos_v[a.id]
            if nv == 0.0 and a.s < a.ruta.L - 0.3: a.extra['espera'] += DT
            elif a.extra['espera'] > 0:
                if a.extra['espera'] > 1: M['esperas_cruce'].append(a.extra['espera'])
                a.extra['espera'] = 0.0
            a.v = nv; a.s += nv * DT
            if a.s >= a.ruta.L - 0.3 and a.extra['destino'] != 'paradero':
                a.activo = False; a.fin = paso; M['peatones_llegaron'] += 1
        else:
            a.v = nuevos_v[a.id]; a.s += a.v * DT
            if a.s >= a.ruta.L - 2:
                a.activo = False; a.fin = paso
                if a.tipo == 'carro': M['carros_terminados'] += 1
    # reposición: la población se mantiene (entran carros y peatones nuevos por el inicio de otras rutas)
    n_c = sum(1 for a in AGENTES if a.activo and a.tipo == 'carro'); n_p = sum(1 for a in AGENTES if a.activo and a.tipo == 'peaton')
    for j in range(N_CARROS - n_c):
        r = ruta_auto(k_auto); k_auto += 1
        if r is None: continue
        x0, y0, _, _ = r.pos(0)
        if any(math.hypot(pos[b.id][0] - x0, pos[b.id][1] - y0) < 12 for b in cerca(rej_v, x0, y0)): continue
        nuevo('carro', r, 0.0, VEL_AUTO['major'] * (0.85 + 0.25 * azar('v0', k_auto)), 4.5, int(azar('color', k_auto) * 8), paso, camioneta=azar('tipo', k_auto) >= 0.72)
        M['creados_carros'] += 1
    for j in range(max(0, N_PEATONES - n_p)):
        r, ex = ruta_peaton(k_pie); k_pie += 1
        if r is None: continue
        nv = nuevo('peaton', r, 0.0, 1.1 + 0.4 * azar('vpie', k_pie), 0.5, int(azar('ropa', k_pie) * 64), paso, **ex); nv.extra['espera'] = 0.0; M['creados_peatones'] += 1
    for a in AGENTES:  # buses que terminan su recorrido vuelven a salir del inicio
        if a.tipo == 'bus' and not a.activo and not a.extra.get('relevado'):
            a.extra['relevado'] = True; br = BUSES_RUTAS[a.extra['linea']]; nuevo('bus', br['ruta'], 0.0, 11.0, 11.0, 0, paso, linea=a.extra['linea'], servidas=set())
    # perros
    peat_xy = [(pos[a.id][0], pos[a.id][1], a) for a in act if a.tipo == 'peaton' and a.activo]
    for d in PERROS:
        if d['sigue'] >= 0:
            obj = next((a for a in AGENTES if a.id == d['sigue'] and a.activo), None); d['t_sigue'] -= DT
            if obj is None or d['t_sigue'] <= 0: d['sigue'] = -1
            else:
                ox, oy, orb, _ = obj.ruta.pos(obj.s); tx, ty = ox - math.cos(math.radians(orb)) * 1.3, oy - math.sin(math.radians(orb)) * 1.3
                dx, dy = tx - d['x'], ty - d['y']; dd = math.hypot(dx, dy)
                if dd > 0.05: st = min(dd, (obj.v + 0.4) * DT); d['x'] += dx / dd * st; d['y'] += dy / dd * st; d['rumbo'] = math.degrees(math.atan2(dy, dx))
                continue
        if d['descanso'] > 0: d['descanso'] -= DT; continue
        a_, b_ = XY[d['nodo']], XY[d['sig']]; L_ = max(math.dist(a_, b_), 0.5); d['f'] += 0.85 * DT / L_
        if d['f'] >= 1:
            prev = d['nodo']; d['nodo'] = d['sig']; vec = [j for j in adj[d['nodo']] if j != prev and dentro_zona(XY[j], -50)] or [prev]
            d['sig'] = vec[int(azar('perro_paso', d['id'], paso) * len(vec))]; d['f'] = 0.0
            if azar('perro_descansa', d['id'], paso) < 0.2: d['descanso'] = 8 + 20 * azar('pdur', d['id'], paso)
            a_, b_ = XY[d['nodo']], XY[d['sig']]; L_ = max(math.dist(a_, b_), 0.5)
        cl = adj[d['nodo']][d['sig']]; ux, uy = (b_[0] - a_[0]) / L_, (b_[1] - a_[1]) / L_
        off = (ANCHO[cl] / 2 + 0.4) * d['lado']
        d['x'] = a_[0] + (b_[0] - a_[0]) * d['f'] + uy * off; d['y'] = a_[1] + (b_[1] - a_[1]) * d['f'] - ux * off; d['rumbo'] = math.degrees(math.atan2(uy, ux))
        if paso % 4 == 0:
            for px, py, pa in peat_xy:
                if abs(px - d['x']) < 4 and abs(py - d['y']) < 4 and azar('sigue', d['id'], paso) < 0.25:
                    d['sigue'] = pa.id; d['t_sigue'] = 6 + 8 * azar('tsig', d['id'], paso); M['perro_sigue'] += 1; break
    # torcazas: se levantan si alguien se acerca a menos de 9 m
    for B in BANDADAS:
        c = B['centro']
        if not B['vuela']:
            amenaza = any(abs(px - c[0]) < 9 and abs(py - c[1]) < 9 and math.hypot(px - c[0], py - c[1]) < 9 for px, py, _ in peat_xy) or \
                      any(math.hypot(d['x'] - c[0], d['y'] - c[1]) < 9 for d in PERROS)
            if amenaza:
                B['vuela'] = True; B['t_vuelo'] = 12 + 10 * azar('vuelo', B['id'], paso); B['levantadas'] += 1; M['levantadas'] += 1
            else:  # caminan picoteando
                for j in range(len(B['pos'])):
                    if azar('pica', B['id'], j, paso) < 0.08:
                        ang = azar('pang', B['id'], j, paso) * 6.283; np_ = B['pos'][j] + [math.cos(ang) * 0.4, math.sin(ang) * 0.4]
                        if math.dist(np_, c) < 5: B['pos'][j] = np_; B['rumbo'][j] = math.degrees(ang)
        else:
            B['t_vuelo'] -= DT; pc = np.array(B['parque_c'] if 'parque_c' in B else c)
            B['fase'] += 9.0 / 22 * DT
            for j in range(len(B['pos'])):
                r_ = 22 + 4 * math.sin(j * 1.7); ang = B['fase'][j] + j * 0.12
                obj = pc + [math.cos(ang) * r_, math.sin(ang) * r_]
                if B['t_vuelo'] < 3:  # aterrizan en un punto nuevo del parque
                    if 'nuevo' not in B:
                        q = B['parque']; xs = [p[0] for p in q]; ys = [p[1] for p in q]
                        for intento in range(50):
                            nc = (min(xs) + (max(xs) - min(xs)) * azar('nc', B['id'], paso, intento), min(ys) + (max(ys) - min(ys)) * azar('ncy', B['id'], paso, intento))
                            if dentro(*nc, q) and math.dist(nc, c) > 6: break
                        B['nuevo'] = np.array(nc)
                    obj = B['nuevo'] + [(azar('lx', B['id'], j) - 0.5) * 8, (azar('ly', B['id'], j) - 0.5) * 8]
                dv = obj - B['pos'][j]; dd = np.linalg.norm(dv); st = min(dd, 9.0 * DT)
                if dd > 1e-3: B['pos'][j] = B['pos'][j] + dv / dd * st; B['rumbo'][j] = math.degrees(math.atan2(dv[1], dv[0]))
                B['z'][j] = max(0.0, min(16 + 3 * math.sin(j), B['z'][j] + (3.0 if B['t_vuelo'] >= 3 else -6.0) * DT))
            if B['t_vuelo'] <= 0:
                B['vuela'] = False; B['centro'] = B.pop('nuevo', c); B['z'][:] = 0
    # ---- registro: una muestra cada 0,5 s en la ventana exportada
    if paso >= CAL and (paso - CAL) % 2 == 0 or paso == TOTAL - 1:
        fr = cuadro(paso)
        for a in AGENTES:
            if a.activo or (a.fin is not None and a.fin >= paso - 1):
                x, y, rb, _ = a.ruta.pos(a.s); a.muestras.append([fr, round(x, 2), round(y, 2), round(rb, 1)])
                if a.tipo == 'carro' and a.activo: M['velocidades'].append(a.v)
        for d in PERROS: d['muestras'].append([fr, round(d['x'], 2), round(d['y'], 2), round(d['rumbo'], 1)])
        for B in BANDADAS:
            for j in range(len(B['pos'])): B['muestras'][j].append([fr, round(float(B['pos'][j][0]), 2), round(float(B['pos'][j][1]), 2), round(float(B['z'][j]), 2), round(float(B['rumbo'][j]), 1), int(B['z'][j] > 0.3)])
    if paso % 40 == 0:
        print('  t=%5.1f s  carros %d  peatones %d  buses %d' % (t, sum(1 for a in AGENTES if a.activo and a.tipo == 'carro'), sum(1 for a in AGENTES if a.activo and a.tipo == 'peaton'), sum(1 for a in AGENTES if a.activo and a.tipo == 'bus')), flush=True)

# ---------------------------------------------------------------- exportar (con claves simplificadas: se quitan las que la interpolación lineal ya da)
def simplificar(m, tol=0.12, tol_ang=4.0, col_xy=(1, 2), col_ang=3):
    if len(m) < 3: return m
    out = [m[0]]
    for i in range(1, len(m) - 1):
        a, b, c = out[-1], m[i], m[i + 1]
        f = (b[0] - a[0]) / max(c[0] - a[0], 1e-9)
        ex = max(abs(a[j] + (c[j] - a[j]) * f - b[j]) for j in col_xy)
        da = ((c[col_ang] - a[col_ang] + 180) % 360) - 180; ang = abs(((a[col_ang] + da * f - b[col_ang] + 180) % 360) - 180)
        if ex > tol or ang > tol_ang or (len(b) > 5 and b[5] != a[5]): out.append(b)
    out.append(m[-1]); return out
ag_out = []
for a in AGENTES:
    if not a.muestras: continue
    ini = a.muestras[0][0] if a.inicio > CAL else None
    fin = cuadro(a.fin) if a.fin is not None and a.fin < TOTAL - 1 else None
    d = {'tipo': a.tipo, 'color': a.color, 'inicio': ini, 'fin': fin, 'claves': simplificar(a.muestras)}
    if a.tipo == 'carro': d['camioneta'] = bool(a.extra.get('camioneta'))
    if a.tipo == 'peaton': d['destino'] = a.extra.get('destino')
    ag_out.append(d)
for d in PERROS: ag_out.append({'tipo': 'perro', 'color': d['color'], 'inicio': None, 'fin': None, 'claves': simplificar(d['muestras'])})
for B in BANDADAS:
    for j, m in enumerate(B['muestras']): ag_out.append({'tipo': 'torcaza', 'color': 0, 'inicio': None, 'fin': None, 'claves': simplificar(m, col_xy=(1, 2, 3), col_ang=4)})
sem_out = []
for k, s in enumerate(SEM):
    cambios = {0: [], 1: []}
    for g in (0, 1):
        ult = None
        for paso in range(CAL, TOTAL, 2):
            f_ = fase(k, paso * DT, g)
            if f_ != ult: cambios[g].append([cuadro(paso), f_]); ult = f_
    sem_out.append({'x': round(float(s['xy'][0]), 1), 'y': round(float(s['xy'][1]), 1), 'eje': round(math.degrees(s['eje']), 1), 'fases': cambios})
# punto para la cámara de calle: el semáforo más transitado cerca del humedal
cuenta = {k: 0 for k in range(len(SEM))}
for a in AGENTES:
    if a.tipo == 'carro':
        for n_ in a.ruta.ids:
            if n_ in nodo_sem: cuenta[nodo_sem[n_]] += 1
cam_k = max((k for k in cuenta if math.hypot(*SEM[k]['xy']) < 700), key=lambda k: cuenta[k], default=0) if SEM else None
json.dump({'fps': FPS, 'cuadros': CUADROS, 'suelo': SUELO, 'agentes': ag_out, 'semaforos': sem_out,
           'paraderos': [{'x': round(p['x'], 1), 'y': round(p['y'], 1), 'rumbo': round(p['rumbo'], 1)} for p in PARADEROS],
           'camara_calle': [round(float(SEM[cam_k]['xy'][0]), 1), round(float(SEM[cam_k]['xy'][1]), 1)] if cam_k is not None else [0, 0]},
          open(os.path.join(OUT, 'calles.json'), 'w', encoding='utf-8'))
cuentas = {t_: sum(1 for d in ag_out if d['tipo'] == t_) for t_ in ('carro', 'bus', 'peaton', 'perro', 'torcaza')}
claves = sum(len(d['claves']) for d in ag_out)
esp = M['esperas_cruce']
RES = {'agentes_exportados': cuentas, 'claves_totales': claves, 'semaforos': len(SEM), 'paraderos': len(PARADEROS),
       'velocidad_media_carros_kmh': round(3.6 * float(np.mean(M['velocidades'])), 1) if M['velocidades'] else 0,
       'carros_detenidos_pct': round(100 * float(np.mean(np.array(M['velocidades']) < 0.5)), 1) if M['velocidades'] else 0,
       'cedidas_a_peaton_pasos': M['cedidas_a_peaton'], 'paradas_en_rojo_pasos': M['paradas_en_rojo'],
       'cruces_con_espera': len(esp), 'espera_media_cruce_s': round(float(np.mean(esp)), 1) if esp else 0, 'espera_max_cruce_s': round(float(max(esp)), 1) if esp else 0,
       'abordajes_bus': M['abordajes'], 'descensos_bus': M['descensos'], 'perro_sigue_persona': M['perro_sigue'], 'torcazas_levantan_vuelo': M['levantadas'],
       'solapes_promedio_por_paso': round(M['solapes'] / TOTAL, 1), 'carros_que_terminaron_ruta': M['carros_terminados'], 'peatones_que_llegaron': M['peatones_llegaron'],
       'cuenta_peatones': {'creados': M['creados_peatones'], 'activos_al_final': sum(1 for a in AGENTES if a.activo and a.tipo == 'peaton'),
                           'llegaron': M['peatones_llegaron'], 'subieron_al_bus': M['abordajes']}}
cp = RES['cuenta_peatones']
assert cp['creados'] == cp['activos_al_final'] + cp['llegaron'] + cp['subieron_al_bus'], 'I: cuenta de peatones'
json.dump(RES, open(os.path.join(OUT, 'resultados_calles.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(RES, ensure_ascii=False))

# ---------------------------------------------------------------- mallas
def obj(nombre, partes):
    with open(os.path.join(OUT, nombre + '.obj'), 'w') as f:
        f.write('# REN3D - %s\ng %s\n' % (nombre, nombre)); n = 0
        for m, tris in partes:
            for t_ in tris:
                for p in t_: f.write('v %.4f %.4f %.4f\n' % p)
        for m, tris in partes:
            for t_ in tris:
                for p in t_: f.write('vt %.4f %.4f\n' % (p[0], p[1] + p[2]))
        for m, tris in partes:
            f.write('usemtl %s\n' % m)
            for t_ in tris: f.write('f %d/%d %d/%d %d/%d\n' % (n + 1, n + 1, n + 2, n + 2, n + 3, n + 3)); n += 3
def caja(c, s):
    v = [(c[0] + sx * s[0], c[1] + sy * s[1], c[2] + sz * s[2]) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]; T = []
    for f in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
        a, b, cc, d = (v[i] for i in f); T += [(a, b, cc), (a, cc, d)]
    return T
def elipsoide(c, r, nu=10, nv=6):
    T = []
    def p(i, j):
        a = 2 * math.pi * i / nu; b = math.pi * j / nv - math.pi / 2
        return (c[0] + r[0] * math.cos(b) * math.cos(a), c[1] + r[1] * math.cos(b) * math.sin(a), c[2] + r[2] * math.sin(b))
    for i in range(nu):
        for j in range(nv):
            a, b, cc, d = p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1); T += [(a, b, cc), (a, cc, d)]
    return T
def cil(c, r, h, n=10, z0=0.0):
    T = []
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0, p1 = (c[0] + r * math.cos(a), c[1] + r * math.sin(a)), (c[0] + r * math.cos(b), c[1] + r * math.sin(b))
        T += [((p0[0], p0[1], z0), (p1[0], p1[1], z0), (p1[0], p1[1], z0 + h)), ((p0[0], p0[1], z0), (p1[0], p1[1], z0 + h), (p0[0], p0[1], z0 + h)),
              ((c[0], c[1], z0 + h), (p0[0], p0[1], z0 + h), (p1[0], p1[1], z0 + h))]
    return T
# persona de 1,70 m: piernas, torso, brazos y cabeza; frente hacia +X
obj('persona_calle', [('pantalon', caja((0, 0.09, 0.42), (0.08, 0.07, 0.42)) + caja((0, -0.09, 0.42), (0.08, 0.07, 0.42))),
                      ('camisa', caja((0, 0, 1.12), (0.12, 0.2, 0.3)) + caja((0, 0.26, 1.1), (0.06, 0.05, 0.28)) + caja((0, -0.26, 1.1), (0.06, 0.05, 0.28))),
                      ('piel', elipsoide((0.01, 0, 1.55), (0.1, 0.09, 0.12))), ('pelo', elipsoide((-0.02, 0, 1.62), (0.1, 0.095, 0.07)))])
obj('perro', [('pelaje', elipsoide((0, 0, 0.42), (0.32, 0.12, 0.13)) + elipsoide((0.36, 0, 0.55), (0.12, 0.09, 0.09)) + caja((-0.4, 0, 0.5), (0.12, 0.02, 0.02)) +
               cil((0.2, 0.07), 0.035, 0.36) + cil((0.2, -0.07), 0.035, 0.36) + cil((-0.2, 0.07), 0.035, 0.36) + cil((-0.2, -0.07), 0.035, 0.36)),
              ('oscuro', elipsoide((0.47, 0, 0.53), (0.04, 0.035, 0.035)) + caja((0.33, 0.06, 0.66), (0.03, 0.02, 0.05)) + caja((0.33, -0.06, 0.66), (0.03, 0.02, 0.05)))])
obj('bus_sitp', [('carroceria', caja((0, 0, 1.75), (5.5, 1.25, 1.3))), ('vidrio', caja((0.2, 0, 2.1), (5.2, 1.27, 0.45)) + caja((5.51, 0, 2.0), (0.02, 1.1, 0.6))),
                 ('franja', caja((0, 0, 1.15), (5.52, 1.27, 0.1))), ('llantas', caja((3.6, 0, 0.5), (0.5, 1.3, 0.5)) + caja((-3.4, 0, 0.5), (0.5, 1.3, 0.5)))])
obj('torcaza_suelo', [('cuerpo', elipsoide((0, 0, 0.09), (0.12, 0.05, 0.05)) + elipsoide((0.1, 0, 0.15), (0.035, 0.03, 0.03)) + caja((-0.15, 0, 0.1), (0.05, 0.03, 0.005)))])
obj('torcaza_vuelo', [('cuerpo', elipsoide((0, 0, 0), (0.12, 0.04, 0.035)) + elipsoide((0.12, 0, 0.01), (0.035, 0.03, 0.03))),
                      ('alas', [((0.03, 0.03, 0), (-0.05, 0.03, 0), (-0.06, 0.26, 0)), ((0.03, -0.03, 0), (-0.05, -0.03, 0), (-0.06, -0.26, 0))])])
obj('semaforo', [('poste', cil((0, 0), 0.08, 4.2, 8)), ('caja', caja((0, 0, 4.6), (0.18, 0.18, 0.5)))])
obj('luz', [('luz', elipsoide((0, 0, 0), (0.16, 0.16, 0.16), 8, 5))])
obj('paradero', [('techo', caja((0, 0, 2.5), (1.6, 0.8, 0.05))), ('poste', cil((1.5, 0.7), 0.05, 2.5, 6) + cil((-1.5, 0.7), 0.05, 2.5, 6)),
                 ('banca', caja((0, 0.5, 0.45), (1.2, 0.2, 0.04)))])
print('listo: %s' % OUT)
