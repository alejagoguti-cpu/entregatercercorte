"""Baja de OpenStreetMap (Overpass) lo que necesita la simulación de Kennedy 3D: vías (con 500 m alrededor de la
localidad, para que la sintaxis espacial no tenga efecto de borde), humedales, colegios, lotes sin construir y
equipamientos comunitarios. Guarda la respuesta cruda en tools/cache/kennedy_osm.json (no se sube al repositorio).
Uso: python tools/kennedy_osm.py"""
import json, os, urllib.parse, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
K = json.load(open(os.path.join(RAIZ, 'data3d', 'kennedy.json'), encoding='utf-8'))
lon = [p[0] for p in K['limite']]; lat = [p[1] for p in K['limite']]
s, w, n, e = min(lat) - 0.0045, min(lon) - 0.0045, max(lat) + 0.0045, max(lon) + 0.0045
bb = f'{s},{w},{n},{e}'
Q = f"""[out:json][timeout:180];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path|cycleway|steps|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"]({bb});
  way["natural"="wetland"]({bb}); relation["natural"="wetland"]({bb});
  way["natural"="water"]({bb}); relation["natural"="water"]({bb});
  way["amenity"~"^(school|kindergarten)$"]({bb}); node["amenity"~"^(school|kindergarten)$"]({bb});
  way["landuse"~"^(brownfield|greenfield|construction|vacant|meadow|grass)$"]({bb});
  node["amenity"~"^(community_centre|social_facility|marketplace)$"]({bb}); way["amenity"~"^(community_centre|social_facility|marketplace)$"]({bb});
  way["landuse"="retail"]["name"~"Abastos|Corabastos",i]({bb}); way["name"~"Corabastos|Abastos",i]({bb});
);
out body geom;"""
os.makedirs(os.path.join(RAIZ, 'tools', 'cache'), exist_ok=True)
d = None
for url in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'):
    try:
        req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': Q}).encode(), headers={'User-Agent': 'REN3D-kennedy-visor/1.0'})
        with urllib.request.urlopen(req, timeout=240) as r:
            d = json.loads(r.read().decode('utf-8'))
        break
    except Exception as ex:
        print('falló', url, ex)
if d is None: raise SystemExit('Overpass no respondió')
json.dump(d, open(os.path.join(RAIZ, 'tools', 'cache', 'kennedy_osm.json'), 'w', encoding='utf-8'))
from collections import Counter
c = Counter()
for el in d['elements']:
    t = el.get('tags', {})
    c[t.get('highway') and 'highway' or t.get('natural') or t.get('amenity') or t.get('landuse') or 'otro'] += 1
print(len(d['elements']), dict(c))
