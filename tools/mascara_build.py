"""Máscara de huellas de edificios (blanco = libre, negro = edificio) para recortar la geometría de Google
donde la Maqueta dibuja su propio edificio. Se calcula aquí una sola vez (antes se dibujaba en el navegador
y se subía a la tarjeta gráfica 51 veces, una por celda: 44 MB cada vez).
Mismo encuadre que el shader: 2,5 m por píxel, coordenadas del modelo, norte arriba."""
import json, os
from PIL import Image, ImageDraw

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data3d')
XM, YM, R = 10800, 6400, 2.5
W, H = int(XM // R + (XM % R > 0)), int(YM // R + (YM % R > 0))

# Niveles: 255 libre · 100 edificio genérico (se recorta lo de Google por encima de uCut) · 0 modelo propio detallado
# (Corabastos, Bavaria: se recorta desde 0,9 m, para que la malla "derretida" no tape zócalos, portones ni marquesinas)
import math
from shapely.geometry import Polygon, Point

def propios():
    P = []
    C = json.load(open(os.path.join(D, 'corabastos.json')))
    for n in C['naves']:
        ux, uy = math.cos(n['a']), math.sin(n['a']); vx, vy = -uy, ux
        L2, W2 = n['L'] / 2 + 2, n['W'] / 2
        vp = W2 + (6 if n['al'][0] else 2); vm = W2 + (6 if n['al'][1] else 2)  # franja de la marquesina (4,5 m) + margen
        P.append(Polygon([(n['c'][0] + ux * u + vx * v, n['c'][1] + uy * u + vy * v) for u, v in ((-L2, -vm), (L2, -vm), (L2, vp), (-L2, vp))]))
    B = json.load(open(os.path.join(D, 'bavaria.json')))
    for e in B['edif']: P.append(Polygon(e['p']).buffer(3))
    for t in B['tanques']: P.append(Point(t).buffer(9))
    return P

def mascara(B, salida):
    im = Image.new('L', (W, H), 255)
    dr = ImageDraw.Draw(im)
    n = 0
    for b in B:
        p = b['pts']
        if len(p) > 1 and p[0] == p[-1]: p = p[:-1]
        if len(p) < 3: continue
        xs = [q[0] for q in p]; ys = [q[1] for q in p]
        if (max(xs) - min(xs)) < 2 and (max(ys) - min(ys)) < 2 and b['h'] <= 3: continue  # la misma basura que descarta buildChunks
        poly = [(x / R, (YM - y) / R) for x, y in p]
        dr.polygon(poly, fill=100, outline=100, width=2)  # el borde agranda cada huella ~2,5 m, como antes
        n += 1
    for pg in propios():
        dr.polygon([(x / R, (YM - y) / R) for x, y in pg.exterior.coords], fill=0, outline=0, width=1)
    im.save(salida, optimize=True)
    print(os.path.basename(salida), n, 'huellas', '%.2f MB' % (os.path.getsize(salida) / 1e6))

os.makedirs(os.path.join(D, 'edif'), exist_ok=True)
mascara(json.load(open(os.path.join(D, 'buildings.json'))), os.path.join(D, 'edif', 'mascara.png'))
mascara(json.load(open(os.path.join(D, 'buildings_humedal.json'))), os.path.join(D, 'edif', 'mascara_humedal.png'))
