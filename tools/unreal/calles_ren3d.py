"""Agentes de calle en Kennedy360: lleva a Unreal lo que calcula simular_calles.py (Importar/calles).

Arma /Game/Kennedy/Calles/Calles (60 s): carros (el sedán y la camioneta del tráfico, con sus pinturas), buses azules del SITP
zonal, peatones con ropa de colores, perros, bandadas de torcazas (posadas o en vuelo), semáforos con sus luces cambiando y
paraderos. Reemplaza el tráfico de velocidad constante (/Game/Kennedy/Trafico) dentro de todas las secuencias de cámara
(Giro, Oblicua, Calle, Arriba, Cerros y las de /Game/Kennedy/Agentes) y agrega dos cámaras: Cam_Calles_Cruce (cruce con
semáforo cerca del humedal) y Cam_Calles_Barrio (vista de dron sobre los barrios), con Render_ y Prueba_ para Movie Render Queue."""
import json, math, os, unreal
PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
SRC = os.path.join(PROY, 'Importar', 'calles'); D = '/Game/Kennedy/Calles'
EAL, MEL = unreal.EditorAssetLibrary, unreal.MaterialEditingLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
info = []
def log(s): info.append(str(s)); unreal.log('[Kennedy360] ' + str(s))
les.load_level('/Game/Kennedy/Kennedy')
if EAL.does_directory_exist(D): EAL.delete_directory(D)
EAL.make_directory(D)
with open(os.path.join(SRC, 'calles.json'), encoding='utf-8') as f: CA = json.load(f)
SUELO = CA['suelo']; C_ = CA['cuadros']
def U(x, y, z=0.0): return unreal.Vector(x * 100, -y * 100, (SUELO + z) * 100)
def lineal(h):
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

def material(nombre, color, rug=0.6, emis=0.0):
    m = tools.create_asset(nombre, D, unreal.Material, unreal.MaterialFactoryNew()); m.set_editor_property('two_sided', True)
    def k3(c, y):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -500, y); e.set_editor_property('constant', unreal.LinearColor(c[0], c[1], c[2], 1)); return e
    def k1(v, y):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -500, y); e.set_editor_property('r', v); return e
    MEL.connect_material_property(k3(color, 0), '', unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(k1(rug, 200), '', unreal.MaterialProperty.MP_ROUGHNESS)
    if emis: MEL.connect_material_property(k3([c * emis for c in color], 400), '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    MEL.recompile_material(m); EAL.save_loaded_asset(m); return m
MAT = {}
def mat(color, emis=0.0, rug=0.6):
    k = (color, emis)
    if k not in MAT: MAT[k] = material('M_%s_%d' % (color.lstrip('#'), int(emis * 10)), lineal(color), rug, emis)
    return MAT[k]
def importar(nombre):
    t = unreal.AssetImportTask(); t.set_editor_property('filename', os.path.join(SRC, nombre + '.obj')); t.set_editor_property('destination_path', D)
    t.set_editor_property('automated', True); t.set_editor_property('replace_existing', True); t.set_editor_property('save', True)
    tools.import_asset_tasks([t])
    for p in t.get_editor_property('imported_object_paths'):
        o = unreal.load_asset(p)
        if isinstance(o, unreal.StaticMesh):
            ns = o.get_editor_property('nanite_settings'); ns.set_editor_property('enabled', False); o.set_editor_property('nanite_settings', ns)
            EAL.save_loaded_asset(o); return o, [str(sm.material_slot_name).lower() for sm in o.static_materials]
    raise RuntimeError('no se importó ' + nombre)
MALLA = {n: importar(n) for n in ('persona_calle', 'perro', 'bus_sitp', 'torcaza_suelo', 'torcaza_vuelo', 'semaforo', 'luz', 'paradero')}
def malla_trafico(n):
    o = unreal.load_asset('/Game/Kennedy/Trafico/%s' % n)
    if not o: raise RuntimeError('falta /Game/Kennedy/Trafico/%s: correr antes trafico_ren3d.py' % n)
    return o, [str(sm.material_slot_name).lower() for sm in o.static_materials]
MALLA['sedan'] = malla_trafico('sedan'); MALLA['camioneta'] = malla_trafico('camioneta')
PINTURA = [unreal.load_asset('/Game/Kennedy/Trafico/M_Pintura_%d' % i) for i in range(8)]
log('mallas: ' + ', '.join(MALLA))

CAMISA = ['#C0392B', '#2C3E50', '#F1F1EE', '#2E86C1', '#7D3C98', '#E67E22', '#1E8449', '#7F8C8D']   # ropa de calle
PANTALON = ['#1F2A44', '#2B2B2B', '#5D4E3C', '#3D5A80']
PIEL = ['#C69C7B', '#8D5B3E', '#E0B899']; PELO = ['#1B1410', '#4A3222']
PERRO = ['#8A6A48', '#3A2E26', '#C8B090', '#6E6E6A']
def actor(malla, colores, emis=0.0, especial=None):
    a = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, -100000)); c = a.static_mesh_component
    c.set_static_mesh(MALLA[malla][0]); c.set_mobility(unreal.ComponentMobility.MOVABLE)
    for i, s in enumerate(MALLA[malla][1]):
        if especial and 'pintura' in s: c.set_material(i, especial); continue
        col = next((v for k, v in colores.items() if k in s), None)
        if col: c.set_material(i, mat(col, emis))
    return a
seq = tools.create_asset('Calles', D, unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
seq.set_display_rate(unreal.FrameRate(24, 1)); seq.set_playback_start(0); seq.set_playback_end(C_)
def agregar(a):
    b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, a); eas.destroy_actor(a)
    tr = b.add_track(unreal.MovieScene3DTransformTrack); sec = tr.add_section(); sec.set_range(0, C_ + 1); return sec.get_all_channels()
LIN, CON = unreal.RichCurveInterpMode.RCIM_LINEAR, unreal.RichCurveInterpMode.RCIM_CONSTANT
def clave(canal, fr, val, modo=LIN):
    k = canal.add_key(unreal.FrameNumber(int(fr)), float(val))
    try: k.set_interpolation_mode(modo)
    except Exception: pass
def recorrido(ch, claves, esc, inicio, fin, con_z=False, visible=None):
    """claves [cuadro, x, y, (z), rumbo, (vuela)]; visible(c) decide si se ve en esa clave (torcazas posadas / en vuelo)."""
    prev = None
    for c in claves:
        z = c[3] if con_z else 0.0; rumbo = c[4] if con_z else c[3]; yaw = -rumbo
        if prev is not None:
            while yaw - prev > 180: yaw -= 360
            while yaw - prev < -180: yaw += 360
        prev = yaw; p = U(c[1], c[2], z)
        clave(ch[0], c[0], p.x); clave(ch[1], c[0], p.y); clave(ch[2], c[0], p.z); clave(ch[5], c[0], yaw)
    clave(ch[3], 0, 0.0); clave(ch[4], 0, 0.0)
    for canal in ch[6:9]:
        if visible is not None:
            ult = None
            for c in claves:
                v = esc if visible(c) else 0.0
                if v != ult: clave(canal, c[0], v, CON); ult = v
            continue
        if inicio: clave(canal, 0, 0.0, CON)
        clave(canal, inicio or 0, esc, CON)
        if fin is not None and fin < C_: clave(canal, fin + 1, 0.0, CON)
def fijo(ch, x, y, z, yaw=0.0, esc=100.0):
    p = U(x, y, z)
    for canal, v in zip(ch, (p.x, p.y, p.z, 0.0, 0.0, yaw, esc, esc, esc)): clave(canal, 0, v)

cuenta = {}
for ag in CA['agentes']:
    t, col = ag['tipo'], ag['color']
    if t == 'carro':
        ch = agregar(actor('camioneta' if ag.get('camioneta') else 'sedan', {}, especial=PINTURA[col % 8])); recorrido(ch, ag['claves'], 100, ag['inicio'], ag['fin'])
    elif t == 'bus':
        ch = agregar(actor('bus_sitp', {'carroceria': '#1F4E9C', 'vidrio': '#10161C', 'franja': '#E8E8E8', 'llantas': '#151515'})); recorrido(ch, ag['claves'], 100, ag['inicio'], ag['fin'])
    elif t == 'peaton':
        ch = agregar(actor('persona_calle', {'camisa': CAMISA[col % 8], 'pantalon': PANTALON[(col // 8) % 4], 'piel': PIEL[(col * 7) % 3], 'pelo': PELO[(col // 32) % 2]}))
        recorrido(ch, ag['claves'], 100, ag['inicio'], ag['fin'])
    elif t == 'perro':
        ch = agregar(actor('perro', {'pelaje': PERRO[col % 4], 'oscuro': '#1A1410'})); recorrido(ch, ag['claves'], 100, None, None)
    elif t == 'torcaza':  # dos mallas: posada y en vuelo; se ve una u otra según la clave (x2,5 para que se lean)
        ch = agregar(actor('torcaza_suelo', {'cuerpo': '#8A7A6A'})); recorrido(ch, ag['claves'], 250, None, None, True, lambda c: not c[5])
        ch = agregar(actor('torcaza_vuelo', {'cuerpo': '#8A7A6A', 'alas': '#6E6052'})); recorrido(ch, ag['claves'], 250, None, None, True, lambda c: bool(c[5]))
    cuenta[t] = cuenta.get(t, 0) + 1
log('agentes: %s' % cuenta)
# semáforos: un poste por grupo (paralelo a la avenida y transversal) con verde, amarillo y rojo que se prenden por fase
LUZ = {'verde': '#2BFF5A', 'ambar': '#FFB020', 'rojo': '#FF2A1E'}
for s in CA['semaforos']:
    eje = math.radians(s['eje'])
    for g, (ox, oy) in ((0, (-math.sin(eje) * 11, math.cos(eje) * 11)), (1, (math.cos(eje) * 11, math.sin(eje) * 11))):
        x, y = s['x'] + ox, s['y'] + oy; fijo(agregar(actor('semaforo', {'poste': '#3A3A3A', 'caja': '#1C1C1C'})), x, y, 0.0)
        for j, (nombre, colr) in enumerate(LUZ.items()):
            ch = agregar(actor('luz', {'luz': colr}, emis=12.0)); p = U(x, y, 4.95 - 0.33 * j)
            for canal, v in zip(ch[:6], (p.x, p.y, p.z, 0.0, 0.0, 0.0)): clave(canal, 0, v)
            for canal in ch[6:9]:
                for fr, f_ in s['fases'][str(g)] if str(g) in s['fases'] else s['fases'][g]:
                    clave(canal, max(fr, 0), 220.0 if f_ == nombre else 0.0, CON)
for p in CA['paraderos']:
    fijo(agregar(actor('paradero', {'techo': '#E4E6E8', 'poste': '#5A5E62', 'banca': '#7A5C3A'})), p['x'], p['y'], 0.0, yaw=-p['rumbo'])
EAL.save_loaded_asset(seq); log('Calles: %d semáforos, %d paraderos, %d cuadros' % (len(CA['semaforos']), len(CA['paraderos']), C_))

# ---------------------------------------------------------------- reemplazar el tráfico viejo en todas las cámaras
def poner_calles(s):
    cuadros = int(s.get_playback_end()); quitados = 0
    for tr in list(s.get_tracks()):
        if isinstance(tr, unreal.MovieSceneSubTrack):
            subs = [sec.get_sequence() for sec in tr.get_sections()]
            if any(x and x.get_path_name().split('.')[0] in ('/Game/Kennedy/Trafico/Trafico', '/Game/Kennedy/Calles/Calles') for x in subs) or not any(subs):
                s.remove_track(tr); quitados += 1
    st = s.add_track(unreal.MovieSceneSubTrack); paso = C_; ini = int(s.get_playback_start())
    while ini < max(cuadros, ini + 2):  # las tomas de más de 60 s repiten la secuencia
        sec = st.add_section(); sec.set_sequence(seq); sec.set_range(ini, min(max(cuadros, 2), ini + paso) + 1); ini += paso
        if ini >= cuadros: break
    EAL.save_loaded_asset(s); return quitados
for ruta in ['/Game/Kennedy/%s' % n for n in ('Giro', 'Oblicua', 'Calle', 'Arriba', 'Cerros')] + \
            [a.split('.')[0] for a in EAL.list_assets('/Game/Kennedy/Agentes', recursive=False) if '/Cam_' in a]:
    s = unreal.load_asset(ruta)
    if isinstance(s, unreal.LevelSequence): log('%s: calles (quitado tráfico viejo: %d)' % (ruta, poner_calles(s)))

# ---------------------------------------------------------------- cámaras propias
CAMS = []
def camara(nombre, trayecto, objetivo, focal):
    p0 = trayecto(0.0); cam = eas.spawn_actor_from_class(unreal.CineCameraActor, U(*p0)); cc = cam.get_cine_camera_component()
    cc.set_editor_property('current_focal_length', focal)
    fs = cc.get_editor_property('focus_settings'); fs.set_editor_property('focus_method', unreal.CameraFocusMethod.DISABLE); cc.set_editor_property('focus_settings', fs)
    fb = cc.get_editor_property('filmback'); fb.set_editor_property('sensor_width', 36.0); fb.set_editor_property('sensor_height', 20.25); cc.set_editor_property('filmback', fb)
    s = tools.create_asset(nombre, D, unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
    s.set_display_rate(unreal.FrameRate(24, 1)); s.set_playback_start(0); s.set_playback_end(C_)
    b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(s, cam); eas.destroy_actor(cam)
    tr = b.add_track(unreal.MovieScene3DTransformTrack); sec = tr.add_section(); sec.set_range(0, C_ + 1); ch = sec.get_all_channels()
    o = U(*objetivo); prev = None
    for f in range(0, C_ + 1, 24):
        p = U(*trayecto(f / C_)); dx, dy, dz = o.x - p.x, o.y - p.y, o.z - p.z
        yaw = math.degrees(math.atan2(dy, dx)); pitch = math.degrees(math.atan2(dz, math.hypot(dx, dy)))
        if prev is not None:
            while yaw - prev > 180: yaw -= 360
            while yaw - prev < -180: yaw += 360
        prev = yaw
        for canal, v in zip(ch[:6], (p.x, p.y, p.z, 0.0, pitch, yaw)): clave(canal, f, v)
    cut = s.add_track(unreal.MovieSceneCameraCutTrack); cs = cut.add_section(); cs.set_range(0, C_ + 1)
    cs.set_camera_binding_id(s.get_binding_id(b) if hasattr(s, 'get_binding_id') else unreal.MovieSceneSequenceExtensions.get_binding_id(s, b))
    poner_calles(s); CAMS.append(nombre); log('cámara %s' % nombre)
cx, cy = CA['camara_calle']
camara('Cam_Calles_Cruce', lambda t: (cx + 58 * math.cos(math.radians(200 + 50 * t)), cy + 58 * math.sin(math.radians(200 + 50 * t)), 22.0), (cx, cy, 1.0), 26.0)
camara('Cam_Calles_Barrio', lambda t: (-650 + 180 * t, -700 + 60 * t, 260.0), (-150.0, -150.0, 0.0), 30.0)
def config(nombre, prueba, cam):
    cfg = tools.create_asset(nombre, D, unreal.MoviePipelinePrimaryConfig, None)
    out = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
    out.set_editor_property('output_directory', unreal.DirectoryPath(os.path.join(PROY, 'Saved', 'Agentes', cam).replace('\\', '/')))
    out.set_editor_property('file_name_format', cam + ('_prueba_' if prueba else '_') + '{frame_number}'); out.set_editor_property('output_resolution', unreal.IntPoint(1920, 1080))
    out.set_editor_property('zero_pad_frame_numbers', 4)
    if prueba: out.set_editor_property('use_custom_playback_range', True); out.set_editor_property('custom_start_frame', 480); out.set_editor_property('custom_end_frame', 481)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase); cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_JPG)
    aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
    aa.set_editor_property('override_anti_aliasing', True); aa.set_editor_property('anti_aliasing_method', unreal.AntiAliasingMethod.AAM_NONE)
    aa.set_editor_property('spatial_sample_count', 1); aa.set_editor_property('temporal_sample_count', 8 if prueba else 4)
    aa.set_editor_property('engine_warm_up_count', 400); aa.set_editor_property('render_warm_up_count', 64); aa.set_editor_property('use_camera_cut_for_warm_up', False)
    go = cfg.find_or_add_setting_by_class(unreal.MoviePipelineGameOverrideSetting)
    go.set_editor_property('cinematic_quality_settings', True); go.set_editor_property('flush_streaming_managers', True)
    EAL.save_loaded_asset(cfg)
for cam in CAMS: config('Render_' + cam, False, cam); config('Prueba_' + cam, True, cam)
les.save_current_level()
with open(os.path.join(PROY, 'Saved', 'calles_ren3d.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(info))
