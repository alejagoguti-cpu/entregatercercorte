"""Bodegas de Corabastos -> data3d/corabastos.json

Toma las huellas reales (data3d/buildings.json, OSM) dentro del polígono de Corabastos (data3d/giro_sim.json) y deja,
para cada nave casi rectangular, su rectángulo orientado: centro, eje largo, largo, ancho y en qué lados largos va
alero (marquesina de los muelles de carga), que solo se pone donde no hay otra media bodega pegada.
La forma (bóvedas/cubiertas transversales cada ~7,5 m, aleros, portones) la arma data3d/corabastos.js.
Marco: el del modelo (data3d/buildings.json), metros. Uso: python tools/corabastos_build.py"""
import json, math, os
from shapely.geometry import Polygon, Point

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = os.path.join(RAIZ, 'data3d')
# polígono de Corabastos: marco del giro -> lon/lat -> marco del modelo
G = json.load(open(os.path.join(D, 'giro_sim.json'), encoding='utf-8'))['corabastos']
LAT0, LON0 = 4.640683, -74.149778
MX = 111320 * math.cos(math.radians(4.63)); MY = 110540.0
EX, EY = -5193.24, -2090.06  # GEO de index.html
poly = [((LON0 + x / MX + 74.17) * MX - EX, (LAT0 - y / MY - 4.63) * MY - EY) for x, y in G['poly']]
CORA = Polygon(poly)

B = json.load(open(os.path.join(D, 'buildings.json')))
naves, otros = [], 0
for b in B:
    pg = Polygon(b['pts'])
    if not pg.is_valid or not CORA.contains(pg.centroid): continue
    r = pg.minimum_rotated_rectangle
    fill = pg.area / max(r.area, 1)
    c = list(r.exterior.coords)
    e1, e2 = (c[1][0] - c[0][0], c[1][1] - c[0][1]), (c[2][0] - c[1][0], c[2][1] - c[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    if l1 < l2: e1, e2, l1, l2 = e2, e1, l2, l1
    if pg.area < 700 or fill < 0.9 or l2 < 12:
        otros += 1; continue
    a = math.atan2(e1[1], e1[0])
    if a < -math.pi / 2: a += math.pi
    if a > math.pi / 2: a -= math.pi
    naves.append({'c': [round(r.centroid.x, 2), round(r.centroid.y, 2)], 'a': round(a, 4), 'L': round(l1, 2), 'W': round(l2, 2), 'pg': pg})

# alero en cada lado largo solo si a 4 m afuera no hay otra nave
for n in naves:
    ux, uy = math.cos(n['a']), math.sin(n['a']); vx, vy = -uy, ux
    al = []
    for s in (1, -1):
        libre = True
        for t in (-0.35, 0, 0.35):
            p = Point(n['c'][0] + ux * n['L'] * t + vx * s * (n['W'] / 2 + 4), n['c'][1] + uy * n['L'] * t + vy * s * (n['W'] / 2 + 4))
            if any(m is not n and m['pg'].contains(p) for m in naves): libre = False
        al.append(1 if libre else 0)
    n['al'] = al
# color real de cada cubierta: promedio de la imagen satelital (Esri World Imagery, z18) dentro de la nave
import io, urllib.request
from PIL import Image
CACHE = os.path.join(RAIZ, 'tools', 'cache', 'esri18'); os.makedirs(CACHE, exist_ok=True)
GX, GY = 111320 * math.cos(math.radians(4.63)), 110540.0
def tesela(X, Y):
    f = os.path.join(CACHE, f'{X}_{Y}.jpg')
    if not os.path.exists(f):
        u = f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/{Y}/{X}'
        open(f, 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'ren3d-kennedy'})).read())
    return Image.open(f).convert('RGB')
TES = {}
def pixel(x, y):  # marco del modelo -> color
    lon = -74.17 + (x + EX) / GX; lat = 4.63 + (y + EY) / GY
    nn = 2 ** 18; px = (lon + 180) / 360 * nn * 256
    py = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * nn * 256
    X, Y = int(px // 256), int(py // 256)
    if (X, Y) not in TES: TES[(X, Y)] = tesela(X, Y)
    return TES[(X, Y)].getpixel((int(px % 256), int(py % 256)))
for n in naves:
    ux, uy = math.cos(n['a']), math.sin(n['a']); vx, vy = -uy, ux; m = []
    for i in range(-8, 9):
        for j in range(-3, 4):
            m.append(pixel(n['c'][0] + ux * n['L'] * 0.45 * i / 8 + vx * n['W'] * 0.4 * j / 3, n['c'][1] + uy * n['L'] * 0.45 * i / 8 + vy * n['W'] * 0.4 * j / 3))
    m.sort(key=sum); m = m[len(m) // 5: -len(m) // 5 or None]  # sin carros ni sombras
    n['col'] = '#%02x%02x%02x' % tuple(round(sum(p[k] for p in m) / len(m)) for k in range(3))
for n in naves: del n['pg']
json.dump({'poly': [[round(x, 1), round(y, 1)] for x, y in poly], 'naves': naves}, open(os.path.join(D, 'corabastos.json'), 'w'), separators=(',', ':'))
print('naves', len(naves), '· otras huellas', otros)
