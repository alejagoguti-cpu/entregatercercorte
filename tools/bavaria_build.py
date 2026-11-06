"""Antigua fábrica de Bavaria (Av. Boyacá) -> data3d/bavaria.json

Huellas reales de OpenStreetMap (edificios dentro de la way 1529762990, 'Antigua Fábrica de Cervecería Bavaria') y el
tanque de agua elevado. Cada edificio lleva un estilo según cómo está hoy (foto aérea de 2023, mirando al oriente desde la Av. Boyacá):
  esqueleto: nave de ladrillo en demolición, sin cubierta, con la retícula de columnas y vigas a la vista
  ladrillo:  bloque de ladrillo con cubierta plana gris y franjas de ventanas
  oficina:   edificio administrativo de varios pisos
Marco: el del modelo (data3d/buildings.json). Uso: python tools/bavaria_build.py"""
import json, math, os, urllib.request, urllib.parse

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE = os.path.join(RAIZ, 'tools', 'cache', 'bavaria_osm.json')
if not os.path.exists(CACHE):
    q = '[out:json][timeout:60];way(1529762990);map_to_area->.a;(way(1529762990);way["building"](area.a);node["man_made"="water_tower"](area.a););out geom tags;'
    r = urllib.request.urlopen(urllib.request.Request('https://overpass-api.de/api/interpreter', data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'ren3d-kennedy'}), timeout=90)
    json.dump(json.load(r), open(CACHE, 'w'))
E = json.load(open(CACHE)); E = E['elements'] if isinstance(E, dict) else E
MX = 111320 * math.cos(math.radians(4.63)); MY = 110540.0
def xy(lon, lat): return [round((lon + 74.17) * MX + 5193.24, 2), round((lat - 4.63) * MY + 2090.06, 2)]

ESTILO = {26696906: ('esqueleto', 17), 26696903: ('esqueleto', 11), 26696912: ('ladrillo', 19), 26696915: ('oficina', 26),
          26696908: ('ladrillo', 12), 26696919: ('ladrillo', 9), 26696923: ('ladrillo', 9), 26696929: ('ladrillo', 8),
          790258509: ('ladrillo', 10), 1358213351: ('ladrillo', 8), 1358213363: ('esqueleto', 9), 790258521: ('ladrillo', 9)}
edif, tanques, sitio = [], [], None
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and e['id'] == 1529762990: sitio = [xy(p['lon'], p['lat']) for p in e['geometry']]
    elif e['type'] == 'way' and 'building' in t and t.get('power') != 'substation':
        p = [xy(q['lon'], q['lat']) for q in e['geometry']]
        if p[0] == p[-1]: p = p[:-1]
        if len(p) < 3: continue
        s, h = ESTILO.get(e['id'], ('ladrillo', 6))
        edif.append({'p': p, 's': s, 'h': h})
    elif e['type'] == 'node' and t.get('man_made') == 'water_tower': tanques.append(xy(e['lon'], e['lat']))
# en la foto se ve un solo tanque blanco (detrás de la nave central)
tanques = [t for t in tanques if t[0] > 9300] or tanques[:1]
json.dump({'sitio': sitio, 'edif': edif, 'tanques': tanques}, open(os.path.join(RAIZ, 'data3d', 'bavaria.json'), 'w'), separators=(',', ':'))
print('edificios', len(edif), 'tanques', tanques)
