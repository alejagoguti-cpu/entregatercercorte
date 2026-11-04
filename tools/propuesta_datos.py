"""Prepara data3d/propuesta.json para el simulador web (panel PROPUESTA de data3d/propuesta.js).

Toma los nodos del modelo de agentes de Unreal (tools/unreal/simular_agentes.py -> Importar/agentes/nodos.json:
Corabastos, tiendas, comedores, colegios, huertas, área cedida) y los parques de data3d/parques.json como lugares
candidatos para huertas, y los pasa a coordenadas del mundo 3D del index (x, z en metros, ver lw() en index.html).
Uso: python tools/propuesta_datos.py [ruta a nodos.json]
"""
import json, math, os, sys

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NODOS = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360\Importar\agentes\nodos.json'
MXg = 111320 * math.cos(math.radians(4.63)); MYg = 110540.0
DX = -5193.24 - (-74.149778 + 74.17) * MXg; DY = -2090.06 - (4.640683 - 4.63) * MYg  # marco 'en' de simular_agentes.py
LC = (5341.33, 3161.9)                                                                   # LC de index.html

def en_a_mundo(x, y):  # marco 'en' -> datos (Rhino) -> mundo 3D del index
    dx, dy = x - DX, y - DY
    return round(dx - LC[0], 1), round(LC[1] - dy, 1)

def datos_a_mundo(x, y): return round(x - LC[0], 1), round(LC[1] - y, 1)

def area(p): return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2

D = json.load(open(NODOS, encoding='utf-8'))
nodos = []
for n in D['nodos']:
    x, z = en_a_mundo(n['x'], n['y'])
    d = {'t': n['tipo'], 'n': n['nombre'], 'x': x, 'z': z}
    for k in ('raciones', 'area_m2'):
        if k in n: d[k] = n[k]
    nodos.append(d)
cora = next(n for n in nodos if n['t'] == 'corabastos')
burro = next(n for n in nodos if n['n'] == 'Humedal El Burro')

def poligono(clave):
    v = D.get(clave)
    if not v: return None
    pts = v.get('pts') if isinstance(v, dict) else v
    return [list(en_a_mundo(*p)) for p in pts]

# parques a menos de 1,6 km de El Burro, con área entre 800 m² y 6 ha: lugares posibles para huertas comunitarias
parques = []
for p in json.load(open(os.path.join(RAIZ, 'data3d', 'parques.json'), encoding='utf-8')):
    pts = p['pts']; a = area(pts)
    if not (800 <= a <= 60000): continue
    cx = sum(q[0] for q in pts) / len(pts); cy = sum(q[1] for q in pts) / len(pts)
    x, z = datos_a_mundo(cx, cy)
    if math.hypot(x - burro['x'], z - burro['z']) > 1600: continue
    parques.append({'n': p.get('nombre') or 'Parque', 'x': x, 'z': z, 'a': round(a)})
parques.sort(key=lambda p: math.hypot(p['x'] - burro['x'], p['z'] - burro['z']))

out = {'fuente': 'tools/unreal/simular_agentes.py (nodos) + data3d/parques.json', 'nodos': nodos, 'parques': parques,
       'cedida': poligono('cedida'), 'corabastos': poligono('corabastos')}
json.dump(out, open(os.path.join(RAIZ, 'data3d', 'propuesta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('nodos', len(nodos), 'parques', len(parques), 'cora', cora['x'], cora['z'], 'burro', burro['x'], burro['z'])
