"""Convierte los fotogramas del render de Unreal (Kennedy360/Saved/Giro/giro_NNN.jpeg) a WebP para el visor web:
f_NNN.webp en alta (1920 px) y s_NNN.webp livianos (960 px) para girar mientras se arrastra."""
import os, sys
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360\Saved\Giro'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'giro')
os.makedirs(OUT, exist_ok=True)
fs = sorted(f for f in os.listdir(SRC) if f.lower().endswith(('.jpeg', '.jpg', '.png')))
tot_f = tot_s = 0
for k, f in enumerate(fs):
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    a = os.path.join(OUT, 'f_%03d.webp' % k); im.save(a, 'WEBP', quality=80, method=6)
    s = os.path.join(OUT, 's_%03d.webp' % k); im.resize((960, round(960 * im.height / im.width)), Image.LANCZOS).save(s, 'WEBP', quality=64, method=6)
    tot_f += os.path.getsize(a); tot_s += os.path.getsize(s)
print('%d fotogramas · alta %.1f MB · livianos %.1f MB' % (len(fs), tot_f / 1e6, tot_s / 1e6))
