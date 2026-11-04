"""Datos de la simulación sobre el giro (giro.html + data3d/giro_sim.js) -> data3d/giro_sim.json

1. Red de vías de Kennedy (OpenStreetMap, tools/cache/kennedy_osm.json de tools/kennedy_osm.py) partida en tramos entre
   cruces, con SINTAXIS ESPACIAL (análisis angular de segmentos, como DepthmapX):
     - integración angular (radio n): qué tan "a mano" queda cada tramo de todos los demás, con pocos giros
     - elección angular (radio n): por cuántos recorridos más cortos (en giros) pasa cada tramo
   Se calcula con fuentes muestreadas (Brandes) sobre toda la localidad + 500 m, para que no haya efecto de borde.
2. Lugares de las convenciones P1-P4: bordes de humedales, biofábrica junto a Corabastos, cocinas comunitarias,
   colegios cercanos y huertas en lotes baldíos.
Marco: el del giro de Unreal (X = este, Y = sur, metros; origen en el humedal El Burro, ver G en giro.html).
Uso: python tools/kennedy_sim_datos.py"""
import json, math, os, random
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LAT0, LON0 = 4.640683, -74.149778
MX = 111320 * math.cos(math.radians(4.63)); MY = 110540.0
def xy(lon, lat): return ((lon - LON0) * MX, -(lat - LAT0) * MY)

OSM = json.load(open(os.path.join(RAIZ, 'tools', 'cache', 'kennedy_osm.json'), encoding='utf-8'))['elements']
K = json.load(open(os.path.join(RAIZ, 'data3d', 'kennedy.json'), encoding='utf-8'))
LIM = Polygon([xy(*p) for p in K['limite']])
ZONA = LIM.buffer(500)
random.seed(20261104)

# ---------------- 1. red de vías y sintaxis espacial ----------------
VEH = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service',
       'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
JER = {'motorway': 5, 'trunk': 5, 'motorway_link': 4, 'trunk_link': 4, 'primary': 4, 'primary_link': 3, 'secondary': 3,
       'secondary_link': 3, 'tertiary': 2, 'tertiary_link': 2}
vias = []
for el in OSM:
    t = el.get('tags', {})
    if el['type'] != 'way' or 'highway' not in t or 'geometry' not in el: continue
    pts = [xy(g['lon'], g['lat']) for g in el['geometry']]
    if not ZONA.intersects(LineString(pts)): continue
    vias.append((el['nodes'], pts, t['highway']))
uso = {}
for nodos, _, _ in vias:
    for i, nd in enumerate(nodos): uso[nd] = uso.get(nd, 0) + (2 if 0 < i < len(nodos) - 1 else 1)
# tramos entre cruces (nodo usado por más de una vía o extremo)
tramos = []
for nodos, pts, hw in vias:
    ini = 0
    for i in range(1, len(nodos)):
        if i == len(nodos) - 1 or uso[nodos[i]] > 2:
            tp = pts[ini:i + 1]
            L = sum(math.dist(tp[k], tp[k + 1]) for k in range(len(tp) - 1))
            if L > 0.5: tramos.append({'a': nodos[ini], 'b': nodos[i], 'p': tp, 'L': L, 'hw': hw})
            ini = i
print('tramos', len(tramos))
def rumbo(p, q): return math.atan2(q[1] - p[1], q[0] - p[0])
# grafo dual: tramo -> tramo por un cruce, costo angular = giro / 90° (como DepthmapX: 90° = 1, 180° = 2)
por_nodo = {}
for i, s in enumerate(tramos):
    por_nodo.setdefault(s['a'], []).append((i, 'a')); por_nodo.setdefault(s['b'], []).append((i, 'b'))
def salida(s, extremo):  # dirección al salir del tramo por ese extremo
    p = s['p']
    return rumbo(p[1], p[0]) if extremo == 'a' else rumbo(p[-2], p[-1])
fil, col, cos_ = [], [], []
for nd, lst in por_nodo.items():
    for i, ei in lst:
        di = salida(tramos[i], ei)
        for j, ej in lst:
            if i == j: continue
            dj = salida(tramos[j], ej) + math.pi  # dirección al entrar al tramo j
            giro = abs((dj - di + math.pi) % (2 * math.pi) - math.pi)
            fil.append(i); col.append(j); cos_.append(giro / (math.pi / 2) + 1e-3)
N = len(tramos)
G = csr_matrix((cos_, (fil, col)), shape=(N, N))
dentro = np.array([LIM.buffer(80).intersects(LineString(s['p'])) for s in tramos])
fuentes = random.sample([i for i in range(N) if dentro[i]], min(700, int(dentro.sum())))
TD = np.zeros(N); CNT = np.zeros(N); ELEC = np.zeros(N)
LOTE = 50
for k in range(0, len(fuentes), LOTE):
    F = fuentes[k:k + LOTE]
    D, PRED = dijkstra(G, directed=True, indices=F, return_predecessors=True)
    for r in range(len(F)):
        d = D[r]; ok = np.isfinite(d)
        TD[ok] += d[ok]; CNT[ok] += 1
        # elección: acumulación de Brandes (un camino más corto por destino)
        orden = np.argsort(-np.where(ok, d, -1)); delta = np.zeros(N); pr = PRED[r]
        for v in orden:
            if not ok[v]: break
            u = pr[v]
            if u >= 0: delta[u] += 1 + delta[v]
        ELEC += delta
    print('fuentes', min(k + LOTE, len(fuentes)), '/', len(fuentes))
md = np.where(CNT > 0, TD / np.maximum(CNT, 1), np.inf)
integ = np.where(np.isfinite(md), 1 / np.maximum(md, 1e-6), 0)
def rango(v):  # 0..1 por percentil (como el color por rangos de DepthmapX)
    o = np.argsort(np.argsort(v)); return o / max(1, len(v) - 1)
I01 = rango(integ); C01 = rango(np.log1p(ELEC))

# solo se exporta lo que se alcanza a ver desde el giro (7 km) y se simplifica la geometría
nid = {}
def nodo(n, p):
    if n not in nid: nid[n] = (len(nid), p)
    return nid[n][0]
seg = []
for i, s in enumerate(tramos):
    ls = LineString(s['p']).simplify(1.5)
    c = ls.interpolate(0.5, normalized=True)
    dc = math.hypot(c.x, c.y)
    if dc > 7000 or (dc > 3200 and JER.get(s['hw'], 0) < 2) or (dc > 1800 and s['hw'] in ('footway', 'path', 'steps', 'cycleway', 'service')): continue
    pts = [[round(x), round(y)] for x, y in ls.coords]
    seg.append({'a': nodo(s['a'], s['p'][0]), 'b': nodo(s['b'], s['p'][-1]), 'p': pts, 'L': round(s['L'], 1),
                'v': 1 if s['hw'] in VEH else 0, 'j': JER.get(s['hw'], 1 if s['hw'] in VEH else 0),
                'i': round(float(I01[i]), 3), 'c': round(float(C01[i]), 3), 'k': 1 if dentro[i] else 0})
nodos = [None] * len(nid)
for n, (k, p) in nid.items(): nodos[k] = [round(p[0]), round(p[1])]
print('exportados', len(seg), 'tramos,', len(nodos), 'cruces')

# ---------------- 2. lugares de las convenciones ----------------
def poli(el):
    if el['type'] == 'way' and 'geometry' in el and len(el['geometry']) > 3:
        return Polygon([xy(g['lon'], g['lat']) for g in el['geometry']])
    if el['type'] == 'relation':
        outs = [Polygon([xy(g['lon'], g['lat']) for g in m['geometry']]) for m in el.get('members', []) if m.get('role') == 'outer' and m.get('geometry') and len(m['geometry']) > 3]
        return unary_union(outs) if outs else None
    return None
# humedales: El Burro, La Vaca y Techo (los de agua o humedal dentro de la localidad, por nombre o tamaño)
hum = []
for el in OSM:
    t = el.get('tags', {})
    if t.get('natural') not in ('wetland', 'water'): continue
    g = poli(el)
    if g is None or not g.is_valid: g = g.buffer(0) if g is not None else None
    if g is None or g.area < 3000 or not LIM.buffer(50).intersects(g): continue
    hum.append((t.get('name', ''), g))
grupos = {}
for nombre, centro in (('Humedal El Burro', xy(-74.149576, 4.641417)), ('Humedal La Vaca', xy(-74.161978, 4.628701)), ('Humedal de Techo', xy(-74.141652, 4.645179))):
    cerca = [g for n, g in hum if g.distance(Point(centro)) < 250]
    if cerca: grupos[nombre] = unary_union(cerca)
humedales = []
for nombre, g in grupos.items():
    g = max(g.geoms, key=lambda q: q.area) if g.geom_type == 'MultiPolygon' else g
    borde = g.buffer(22).exterior.simplify(4)  # sendero de cuidado: 22 m por fuera del humedal
    humedales.append({'n': nombre, 'poly': [[round(x), round(y)] for x, y in g.exterior.simplify(4).coords],
                      'borde': [[round(x), round(y)] for x, y in borde.coords], 'area_ha': round(g.area / 1e4, 1)})
    print(nombre, round(g.area / 1e4, 1), 'ha')
# Corabastos
cora = None
for el in OSM:
    t = el.get('tags', {}); n = t.get('name', '')
    if 'abastos' in n.lower():
        g = poli(el)
        if g is not None and g.area > 50000 and (cora is None or g.area > cora.area): cora = g
cora_c = cora.centroid if cora is not None else Point(xy(-74.159504, 4.63089))
burro = Point(xy(-74.149576, 4.641417))
# P2 biofábrica: en el borde de Corabastos hacia el humedal La Vaca / El Burro, 50 m afuera
if cora is not None:
    b = cora.exterior; t0 = b.project(Point(xy(-74.161978, 4.628701))); bp = b.interpolate(t0)
    dx, dy = bp.x - cora_c.x, bp.y - cora_c.y; dl = math.hypot(dx, dy) or 1
    bio = (bp.x + dx / dl * 50, bp.y + dy / dl * 50)
else: bio = (cora_c.x + 300, cora_c.y)
# P3 cocinas: centros comunitarios y comedores a menos de 1,4 km de la biofábrica (los 3 más repartidos)
def punto(el):
    if el['type'] == 'node': return xy(el['lon'], el['lat'])
    if 'geometry' in el: g = el['geometry']; return xy(sum(q['lon'] for q in g) / len(g), sum(q['lat'] for q in g) / len(g))
    return None
cand = []
for el in OSM:
    t = el.get('tags', {})
    if t.get('amenity') in ('community_centre', 'social_facility'):
        p = punto(el)
        if p and math.dist(p, bio) < 1400 and LIM.contains(Point(p)): cand.append((t.get('name') or 'Centro comunitario', p))
cocinas = []
for n, p in sorted(cand, key=lambda c: math.dist(c[1], bio)):
    if len(cocinas) >= 3: break
    if all(math.dist(p, q['p']) > 450 for q in cocinas): cocinas.append({'n': n, 'p': [round(p[0]), round(p[1])]})
while len(cocinas) < 3:  # si OSM no trae suficientes, se ubican entre la biofábrica y El Burro
    f = 0.3 + 0.2 * len(cocinas); p = (bio[0] + (burro.x - bio[0]) * f + 120 * len(cocinas), bio[1] + (burro.y - bio[1]) * f)
    cocinas.append({'n': 'Cocina comunitaria %d' % (len(cocinas) + 1), 'p': [round(p[0]), round(p[1])]})
# colegios: los 6 más cercanos a las cocinas
cole = []
for el in OSM:
    t = el.get('tags', {})
    if t.get('amenity') == 'school':
        p = punto(el)
        if p and LIM.contains(Point(p)): cole.append((t.get('name') or 'Colegio', p))
cole.sort(key=lambda c: min(math.dist(c[1], q['p']) for q in cocinas))
colegios = []
for n, p in cole:
    if len(colegios) >= 6: break
    if all(math.dist(p, q['p']) > 150 for q in colegios): colegios.append({'n': n, 'p': [round(p[0]), round(p[1])]})
# P4 huertas en lotes baldíos (OSM: brownfield, greenfield, construction, vacant) a menos de 2,5 km de El Burro
lotes = []
for el in OSM:
    t = el.get('tags', {})
    if t.get('landuse') not in ('brownfield', 'greenfield', 'construction', 'vacant'): continue
    g = poli(el)
    if g is None or not g.is_valid or not (600 < g.area < 40000): continue
    c = g.centroid
    if c.distance(burro) > 2500 or not LIM.contains(c) or (cora is not None and cora.contains(c)): continue
    lotes.append((g.area, g))
lotes.sort(key=lambda a: a[1].centroid.distance(burro))
huertas = []
for a, g in lotes:
    if len(huertas) >= 8: break
    c = g.centroid
    if all(math.dist((c.x, c.y), h['c']) > 250 for h in huertas):
        huertas.append({'n': 'Huerta en lote baldío %d' % (len(huertas) + 1), 'c': [round(c.x), round(c.y)], 'area': round(a),
                        'poly': [[round(x), round(y)] for x, y in g.exterior.simplify(2).coords]})
print('cocinas', len(cocinas), 'colegios', len(colegios), 'huertas', len(huertas), 'lotes candidatos', len(lotes))

out = {'fuente': 'OpenStreetMap (© colaboradores, ODbL); sintaxis espacial: análisis angular de segmentos con %d fuentes muestreadas' % len(fuentes),
       'nodos': nodos, 'seg': seg, 'humedales': humedales,
       'corabastos': {'c': [round(cora_c.x), round(cora_c.y)], 'poly': [[round(x), round(y)] for x, y in cora.exterior.simplify(4).coords] if cora is not None else None},
       'biofabrica': [round(bio[0]), round(bio[1])], 'cocinas': cocinas, 'colegios': colegios, 'huertas': huertas,
       'lugares': [{'n': l['n'], 'p': [round(v) for v in xy(l['lng'], l['lat'])], 'd': l['d']} for l in K['lugares']],
       'limite': [[round(x), round(y)] for x, y in LIM.exterior.simplify(5).coords]}
json.dump(out, open(os.path.join(RAIZ, 'data3d', 'giro_sim.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('listo', os.path.getsize(os.path.join(RAIZ, 'data3d', 'giro_sim.json')) // 1024, 'KB')
