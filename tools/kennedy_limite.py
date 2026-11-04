"""Descarga de OpenStreetMap (Nominatim) el límite de la localidad de Kennedy y la ubicación de sus lugares de referencia,
y los guarda en data3d/kennedy.json para el recorrido 3D (giro.html). Uso: python tools/kennedy_limite.py"""
import json, os, time, urllib.parse, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
UA = {'User-Agent': 'REN3D-kennedy-visor/1.0'}

def pedir(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))

lim = pedir('https://nominatim.openstreetmap.org/lookup?osm_ids=R4740229&format=json&polygon_geojson=1&polygon_threshold=0.0003')[0]
geo = lim['geojson']
anillos = geo['coordinates'] if geo['type'] == 'Polygon' else max(geo['coordinates'], key=lambda p: len(p[0]))
limite = [[round(x, 6), round(y, 6)] for x, y in anillos[0]]

LUGARES = [  # nombre, búsqueda, descripción
    ('Humedal El Burro', 'Humedal El Burro, Bogotá', 'Humedal urbano: refugio de tinguas, garzas y patos, y pieza de la estructura ecológica del suroccidente.'),
    ('Humedal La Vaca', 'Humedal La Vaca, Bogotá', 'Humedal junto a Corabastos, en recuperación por la comunidad.'),
    ('Humedal de Techo', 'Humedal de Techo, Bogotá', 'Humedal pequeño rodeado de barrios.'),
    ('Corabastos', 'Abastos, Bogotá', 'Central mayorista de alimentos de Bogotá: el nodo que concentra el abastecimiento.'),
    ('Portal Américas', 'Portal Américas, Bogotá', 'Portal de TransMilenio en el occidente de Kennedy.'),
    ('Parque Timiza', 'Parque Timiza, Bogotá', 'Parque metropolitano con lago.'),
    ('Plaza de las Américas', 'Centro Comercial Plaza de las Américas, Bogotá', 'Centro comercial y nodo urbano.'),
    ('Biblioteca El Tintal', 'Biblioteca El Tintal, Bogotá', 'Biblioteca pública en una antigua planta de basuras.'),
    ('Parque Cayetano Cañizares', 'Parque Cayetano Cañizares, Bogotá', 'Parque zonal de Kennedy.'),
    ('Kennedy Central', 'Kennedy Central, Bogotá', 'Barrio fundacional de la localidad (1961).'),
    ('Banderas', 'Banderas, Kennedy, Bogotá', 'Glorieta y portal de Banderas, sobre la Avenida Américas.'),
]
lugares = []
for n, q, d in LUGARES:
    time.sleep(1.1)
    r = pedir('https://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=-74.21,4.66,-74.10,4.58&bounded=1&q=' + urllib.parse.quote(q))
    if not r: print('sin resultado:', n); continue
    lugares.append({'n': n, 'lat': round(float(r[0]['lat']), 6), 'lng': round(float(r[0]['lon']), 6), 'd': d})
    print(n, lugares[-1]['lat'], lugares[-1]['lng'], '·', r[0]['display_name'][:70])

json.dump({'fuente': 'OpenStreetMap (Nominatim), © colaboradores de OpenStreetMap, ODbL', 'limite': limite, 'lugares': lugares},
          open(os.path.join(RAIZ, 'data3d', 'kennedy.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('límite:', len(limite), 'puntos ·', len(lugares), 'lugares')
