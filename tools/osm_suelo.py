"""Baja de OpenStreetMap (Overpass, ODbL) las superficies que no son pasto en la zona del humedal El Burro: canchas, parques
infantiles, parqueaderos, plazoletas y zonas duras, colegios, comercio e industria. Guarda data3d/osm_suelo.json.
Uso: python tools/osm_suelo.py"""
import json, math, os, urllib.parse, urllib.request
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MX = 111320 * math.cos(math.radians(4.63))
lon0, lat0 = -74.17 + (7437 - 5193.24) / MX, 4.63 + (3271 - 2090.06) / 110540
d = 1700
bb = '%.6f,%.6f,%.6f,%.6f' % (lat0 - d / 110540, lon0 - d / MX, lat0 + d / 110540, lon0 + d / MX)
q = ('[out:json][timeout:90];('
     'way[leisure~"pitch|playground|track|sports_centre|fitness_station"](%s);'
     'way[amenity~"parking|school|college|university|hospital|place_of_worship"](%s);'
     'way[highway=pedestrian][area=yes](%s);way[place=square](%s);'
     'way[landuse~"construction|brownfield|retail|commercial|industrial|railway"](%s);'
     ');out geom tags;') % ((bb,) * 5)
req = urllib.request.Request('https://overpass-api.de/api/interpreter', data=urllib.parse.urlencode({'data': q}).encode(),
                             headers={'User-Agent': 'REN3D-Kennedy/1.0 (maqueta territorial; anascmodelamiento@gmail.com)', 'Accept': 'application/json'})
data = json.load(urllib.request.urlopen(req, timeout=150))
salida = []
for e in data['elements']:
    g = e.get('geometry'); t = e.get('tags', {})
    if not g or len(g) < 4: continue
    tipo = t.get('leisure') or t.get('amenity') or t.get('landuse') or ('plaza' if t.get('highway') == 'pedestrian' or t.get('place') == 'square' else 'otro')
    salida.append({'tipo': tipo, 'deporte': t.get('sport', ''), 'superficie': t.get('surface', ''), 'nombre': t.get('name', ''), 'pts': [[p['lon'], p['lat']] for p in g]})
json.dump(salida, open(os.path.join(RAIZ, 'data3d', 'osm_suelo.json'), 'w', encoding='utf-8'), ensure_ascii=False)
import collections
print(len(salida), collections.Counter(s['tipo'] + ('/' + s['deporte'] if s['deporte'] else '') for s in salida).most_common(15))
