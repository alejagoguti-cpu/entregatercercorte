"""Árboles del predio de la antigua fábrica de Bavaria -> data3d/bavaria_arboles.json

Se detectan en la imagen satelital (Esri World Imagery, z19): las masas oscuras de follaje dentro del predio, fuera de los
edificios. Se muestrea cada 3 m, se exige que el entorno (3x3 píxeles) sea oscuro y con tono de vegetación, y se ralea a un
árbol cada ~5 m. Altura y copa aleatorias en el rango del arbolado del predio (eucaliptos altos y urapanes).
Marco: el del modelo (data3d/buildings.json). Uso: python tools/bavaria_arboles.py"""
import io, json, math, os, random, urllib.request
from PIL import Image
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE = os.path.join(RAIZ, 'tools', 'cache', 'esri19'); os.makedirs(CACHE, exist_ok=True)
D = json.load(open(os.path.join(RAIZ, 'data3d', 'bavaria.json')))
SITIO = Polygon(D['sitio'])
EDIF = unary_union([Polygon(e['p']).buffer(2.5) for e in D['edif'] if len(e['p']) >= 3])
MX, MY = 111320 * math.cos(math.radians(4.63)), 110540.0
def ll(x, y): return (-74.17 + (x - 5193.24) / MX, 4.63 + (y - 2090.06) / MY)
Z = 19; N = 2 ** Z
def px(lon, lat):
    return ((lon + 180) / 360 * N * 256, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * N * 256)
TES = {}
def tesela(X, Y):
    if (X, Y) not in TES:
        f = os.path.join(CACHE, f'{X}_{Y}.jpg')
        if not os.path.exists(f):
            u = f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{Y}/{X}'
            open(f, 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'ren3d-kennedy'})).read())
        TES[(X, Y)] = Image.open(f).convert('RGB')
    return TES[(X, Y)]
def color(x, y):
    a, b = px(*ll(x, y)); X, Y = int(a // 256), int(b // 256)
    return tesela(X, Y).getpixel((int(a % 256), int(b % 256)))
def oscuro(x, y):  # entorno de ~1,5 m: follaje oscuro (verde casi negro)
    s = [color(x + dx, y + dy) for dx in (-0.6, 0, 0.6) for dy in (-0.6, 0, 0.6)]
    r = sum(c[0] for c in s) / 9; g = sum(c[1] for c in s) / 9; b = sum(c[2] for c in s) / 9
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    return 8 < lum < 72 and g > r * 1.03 and g > b * 1.06  # verde oscuro; el asfalto y las sombras (grises o azulados) no pasan
random.seed(1902)
x0, y0, x1, y1 = SITIO.bounds; cand = []
y = y0
while y < y1:
    x = x0
    while x < x1:
        p = Point(x, y)
        if SITIO.contains(p) and not EDIF.contains(p) and oscuro(x, y): cand.append((x + random.uniform(-1, 1), y + random.uniform(-1, 1)))
        x += 3.0
    y += 3.0
random.shuffle(cand); arb = []; celda = {}
for (x, y) in cand:  # raleo: un árbol cada ~5 m
    k = (int(x // 5), int(y // 5)); ok = True
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for (a, b) in celda.get((k[0] + i, k[1] + j), []):
                if (a - x) ** 2 + (b - y) ** 2 < 4.8 ** 2: ok = False
    if ok: celda.setdefault(k, []).append((x, y)); arb.append([round(x, 1), round(y, 1), round(random.uniform(9, 22), 1), round(random.uniform(2.6, 4.6), 1)])
json.dump({'fuente': 'Esri World Imagery z19 (masas oscuras de follaje dentro del predio)', 'arboles': arb}, open(os.path.join(RAIZ, 'data3d', 'bavaria_arboles.json'), 'w'), separators=(',', ':'))
print('candidatos', len(cand), 'árboles', len(arb))
