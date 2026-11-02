"""Script de inicio del proyecto: si existe Saved/vista_arriba.pedido, al cargar el visor pone la cámara del editor donde dice
el pedido y lo borra (se hace una sola vez). Pedido vacío: cenital a 1.500 m sobre el humedal El Burro. Si trae texto
"x y z pitch yaw" (cm y grados), usa esa cámara."""
import os, unreal
PEDIDO = os.path.join(unreal.Paths.project_saved_dir(), 'vista_arriba.pedido')
if os.path.exists(PEDIDO):
    txt = open(PEDIDO, encoding='utf-8-sig').read().split()  # utf-8-sig: ignora la marca BOM de PowerShell
    pos, rot = unreal.Vector(0, 0, 150000), unreal.Rotator(roll=0.0, pitch=-89.9, yaw=0.0)
    if len(txt) >= 5:
        x, y, z, p, w = (float(t) for t in txt[:5]); pos, rot = unreal.Vector(x, y, z), unreal.Rotator(roll=0.0, pitch=p, yaw=w)
    estado = {'n': 0, 'h': None}
    def tick(dt):
        estado['n'] += 1
        if estado['n'] < 300: return  # que termine de cargar el nivel y el visor
        try:
            unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(pos, rot)
            unreal.log('[Kennedy360] vista aplicada')
            os.remove(PEDIDO)
        finally:
            unreal.unregister_slate_post_tick_callback(estado['h'])
    estado['h'] = unreal.register_slate_post_tick_callback(tick)
