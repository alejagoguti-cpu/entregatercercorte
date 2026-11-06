"""Estrategias de la propuesta (shapefile de lotes con campo PROPUESTA P1-P5) -> data3d/estrategias.json

Fuente: Propuesta shp/lote.shp (lotes catastrales de Kennedy, WGS84) con PROPUESTA (P1..P5) y descripci.
Cada lote se pasa al marco del modelo (data3d/buildings.json), se simplifica (0,5 m), sin agujeros, y se guarda por estrategia.
Las estrategias se nombran por la descripción que trae el shape para cada propuesta:
  E1 (P1) Huertas en humedal y ronda de río · E2 (P2) Huertas en lotes baldíos · E3 (P3) Huertas en cubiertas de vivienda en altura
  E4 (P4) Distrito biotecnológico · E5 (P5) Huertas en viviendas
Uso: python tools/estrategias_build.py [carpeta del shapefile]   (requiere pyshp y shapely)"""
import json, math, os, sys
import shapefile
from shapely.geometry import Polygon

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHP = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\ACER\Downloads\Propuesta shp\Propuesta shp\lote'
MX = 111320 * math.cos(math.radians(4.63)); MY = 110540.0
def xy(lo, la): return ((lo + 74.17) * MX + 5193.24, (la - 4.63) * MY + 2090.06)  # GEO de index.html

EST = {
    # P1 (E1 huertas en humedal y ronda de río) se quitó de la propuesta
    'P2': ('E2', 'Huertas en lotes baldíos', '#a3e635'),
    'P3': ('E3', 'Huertas en cubiertas de vivienda en altura', '#f59e0b'),
    'P4': ('E4', 'Distrito biotecnológico', '#a78bfa'),
    'P5': ('E5', 'Huertas en viviendas', '#f472b6'),
}
r = shapefile.Reader(SHP, encoding='utf-8')
F = [f[0] for f in r.fields[1:]]; iP, iD = F.index('PROPUESTA'), F.index('descripci')
out = {k: {'id': v[0], 'p': k, 'n': v[1], 'c': v[2], 'lotes': [], 'area': 0.0, 'desc': {}} for k, v in EST.items()}
for sr in r.iterShapeRecords():
    p = sr.record[iP]
    if p not in out: continue
    e = out[p]; d = sr.record[iD] or '(sin descripción)'; e['desc'][d] = e['desc'].get(d, 0) + 1
    s = sr.shape; partes = list(s.parts) + [len(s.points)]
    for i in range(len(partes) - 1):
        ll = s.points[partes[i]:partes[i + 1]]
        if len(ll) < 4: continue
        sa = sum(ll[k][0] * ll[k + 1][1] - ll[k + 1][0] * ll[k][1] for k in range(len(ll) - 1))
        if sa > 0: continue  # anillo antihorario = agujero (en el shapefile los exteriores van en sentido horario)
        pg = Polygon([xy(*q) for q in ll]).simplify(0.5, preserve_topology=True)
        if pg.is_empty or pg.area < 4: continue
        e['area'] += pg.area
        c = list(pg.exterior.coords)[:-1]
        e['lotes'].append([v for q in c for v in (round(q[0] * 2), round(q[1] * 2))])  # medio metro, enteros
# altura del edificio que hay sobre cada lote (para pintar la estrategia sobre el techo; 0 = lote sin edificio, a ras del suelo)
from shapely.strtree import STRtree
from shapely.geometry import Point
BLD = json.load(open(os.path.join(RAIZ, 'data3d', 'buildings.json')))
geos, alts = [], []
for b in BLD:
    try:
        g = Polygon(b['pts'])
        if g.is_valid and g.area > 4: geos.append(g); alts.append(b['h'])
    except Exception: pass
arbol = STRtree(geos)
pr = [g.representative_point() for g in geos]
for e in out.values():
    # huertas en cubiertas (E3) y en viviendas (E5): se pinta el TECHO de cada edificio que cae dentro del lote; si no tiene edificios, el lote en el suelo
    e['n0'] = len(e['lotes']); techo = e['id'] in ('E3', 'E5'); suelo, techos = [], []
    for l in e['lotes']:
        lote = Polygon([(l[k] / 2, l[k + 1] / 2) for k in range(0, len(l), 2)]); hay = False
        if techo and lote.is_valid:
            for j in arbol.query(lote):
                if lote.contains(pr[j]):
                    c = list(geos[j].simplify(0.5).exterior.coords)[:-1]
                    techos.append([v for q in c for v in (round(q[0] * 2), round(q[1] * 2))] + [round(alts[j] * 10)]); hay = True
        if not hay: suelo.append(l)
    e['lotes'], e['techos'] = suelo, techos  # techos: anillo + altura en decímetros al final
res = []
for p in sorted(out):
    e = out[p]
    if not e['lotes']: continue
    T = e['lotes'] or [t[:-1] for t in e['techos']]
    xs = [l[k] for l in T for k in range(0, len(l), 2)]; ys = [l[k] for l in T for k in range(1, len(l), 2)]
    e['centro'] = [round(sum(xs) / len(xs) / 2), round(sum(ys) / len(ys) / 2)]
    e['area'] = round(e['area']); e['n_lotes'] = e.pop('n0')
    res.append(e)
json.dump({'fuente': 'Propuesta shp/lote.shp (campo PROPUESTA y descripci)', 'escala': 0.5, 'estrategias': res},
          open(os.path.join(RAIZ, 'data3d', 'estrategias.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for e in res: print(e['id'], e['n'], '·', e['n_lotes'], 'anillos ·', round(e['area'] / 1e4, 1), 'ha ·', e['desc'])
print('tamaño', round(os.path.getsize(os.path.join(RAIZ, 'data3d', 'estrategias.json')) / 1e6, 2), 'MB')
