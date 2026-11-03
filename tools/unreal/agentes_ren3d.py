"""Agentes en Kennedy360: lleva a Unreal lo que calcula simular_agentes.py (Importar/agentes).

Arma en /Game/Kennedy/Agentes:
- Fauna (40 s): golondrinas, torcazas, aguililla, fochas, patos, garzas, abejas y custodios del humedal El Burro.
- Alimentos_actual / Alimentos_propuesto / Alimentos_propuesto_apagon (60 s): un viaje del día por ficha, por la malla vial
  (rojo: camión externo a Corabastos; ocre: tendero que compra en Corabastos; naranja: compra conjunta al acopio; verde: bicicarga
  del acopio; verde oscuro: furgón del acopio; morado: hongos del distrito; verde claro: cosecha de huertas; café: compost), y
  los nodos de la red como columnas de color (la clase del nodo se ve en el color; ver la leyenda en RESULTADOS.md).
- Cámaras: Cam_Fauna (órbita baja sobre el humedal), Cam_<escenario>_Oblicua y Cam_<escenario>_Planta (vista de dron y
  planta para comparar la red centralizada con la distribuida). Cada cámara trae su secuencia de agentes y el tráfico.
- Render_<cámara> (toma completa) y Prueba_<cámara> (un cuadro) para Movie Render Queue; salen en Saved/Agentes/<cámara>.
Las aves en vuelo van a escala x4, las del agua x2 y las fichas de vehículos x10 para que se lean en el render (se declara en las láminas)."""
import json, math, os, unreal
PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
SRC = os.path.join(PROY, 'Importar', 'agentes'); D = '/Game/Kennedy/Agentes'
EAL, MEL = unreal.EditorAssetLibrary, unreal.MaterialEditingLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
info = []
def log(s): info.append(str(s)); unreal.log('[Kennedy360] ' + str(s))
les.load_level('/Game/Kennedy/Kennedy')
if EAL.does_directory_exist(D): EAL.delete_directory(D)
EAL.make_directory(D)
FA = json.load(open(os.path.join(SRC, 'fauna.json'), encoding='utf-8'))
NO = json.load(open(os.path.join(SRC, 'nodos.json'), encoding='utf-8'))
MA = json.load(open(os.path.join(SRC, 'mallas.json'), encoding='utf-8'))
RES = json.load(open(os.path.join(SRC, 'resultados.json'), encoding='utf-8'))
SUELO = FA['suelo']
def U(x, y, z=0.0): return unreal.Vector(x * 100, -y * 100, (SUELO + z) * 100)  # metros (este, norte, altura) -> Unreal
def lineal(h):
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

# ---------------------------------------------------------------- materiales y mallas
def material(nombre, color, rug=0.6, emis=0.0, opacidad=None):
    m = tools.create_asset(nombre, D, unreal.Material, unreal.MaterialFactoryNew()); m.set_editor_property('two_sided', True)
    if opacidad is not None: m.set_editor_property('blend_mode', unreal.BlendMode.BLEND_TRANSLUCENT)
    def k3(c, y):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -500, y); e.set_editor_property('constant', unreal.LinearColor(c[0], c[1], c[2], 1)); return e
    def k1(v, y):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -500, y); e.set_editor_property('r', v); return e
    MEL.connect_material_property(k3(color, 0), '', unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(k1(rug, 200), '', unreal.MaterialProperty.MP_ROUGHNESS)
    if emis: MEL.connect_material_property(k3([c * emis for c in color], 400), '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    if opacidad is not None: MEL.connect_material_property(k1(opacidad, 600), '', unreal.MaterialProperty.MP_OPACITY)
    MEL.recompile_material(m); EAL.save_loaded_asset(m); return m
def importar(nombre):
    t = unreal.AssetImportTask(); t.set_editor_property('filename', os.path.join(SRC, nombre + '.obj')); t.set_editor_property('destination_path', D)
    t.set_editor_property('automated', True); t.set_editor_property('replace_existing', True); t.set_editor_property('save', True)
    tools.import_asset_tasks([t])
    for p in t.get_editor_property('imported_object_paths'):
        o = unreal.load_asset(p)
        if isinstance(o, unreal.StaticMesh):
            ns = o.get_editor_property('nanite_settings'); ns.set_editor_property('enabled', False); o.set_editor_property('nanite_settings', ns)
            ranuras = [str(sm.material_slot_name).lower() for sm in o.static_materials]; EAL.save_loaded_asset(o)
            return o, ranuras
    raise RuntimeError('no se importó ' + nombre)
MALLA = {n: importar(n) for n in ('ave_vuelo', 'ave_agua', 'garza', 'abeja', 'persona', 'camion', 'furgon', 'bicicarga', 'faro', 'area_cedida')}
log('mallas: ' + ', '.join('%s %s' % (k, v[1]) for k, v in MALLA.items()))
# especies: malla, escala (x100 = metros reales; las aves en vuelo van agrandadas x4 para leerse en el render) y color por ranura
ESPECIE = {
    'golondrina': ('ave_vuelo', 0.75 * 4, {'cuerpo': '#1B2340', 'alas': '#141A30'}),            # Pygochelidon cyanoleuca, ~27 cm de envergadura
    'torcaza': ('ave_vuelo', 1.25 * 4, {'cuerpo': '#8A7A6A', 'alas': '#6E6052'}),               # Zenaida auriculata
    'rapaz': ('ave_vuelo', 2.2 * 4, {'cuerpo': '#5A4030', 'alas': '#3E2C20'}),                  # Rupornis magnirostris, ~80 cm
    'focha': ('ave_agua', 1.1 * 2, {'cuerpo': '#1A1A1E', 'pico': '#E8E4DA'}),                    # Fulica americana
    'pato': ('ave_agua', 1.0 * 2, {'cuerpo': '#7A3A1E', 'pico': '#4A78C8'}),                     # Oxyura ferruginea
    'garza_blanca': ('garza', 1.0 * 1.5, {'cuerpo': '#F4F4F0', 'pico': '#E8B820'}),              # Ardea alba
    'garcilla': ('garza', 0.55 * 1.5, {'cuerpo': '#F2EEE0', 'pico': '#E8A020'}),                 # Ardea ibis
    'abeja': ('abeja', 12.0, {'cuerpo': '#F2B533', 'alas': '#F8F2E0'}),                          # Apis mellifera (x12 para verse)
    'custodio': ('persona', 1.0, {'cuerpo': '#3E8FB0', 'cabeza': '#C89A78'}),                    # custodios del humedal
}
FICHA = {  # paleta de los gráficos del grupo (corabastos.js)
    'camion_externo': ('camion', '#C8322B'), 'comprador': ('furgon', '#B9771E'), 'camion_conjunta': ('camion', '#E8892B'),
    'bicicarga': ('bicicarga', '#2E8B57'), 'comprador_acopio': ('furgon', '#1F6B43'), 'hongos': ('furgon', '#6A4FB3'),
    'cosecha': ('bicicarga', '#8BC34A'), 'compost': ('bicicarga', '#6B4F2A')}
NODO = {  # tipo: color, radio y alto de la columna (m)
    'corabastos': ('#C8322B', 28, 170), 'acopio': ('#B9771E', 16, 110), 'distrito': ('#6A4FB3', 16, 110), 'compostaje': ('#6B4F2A', 13, 85),
    'huerta': ('#2E8B57', 14, 55), 'tienda': ('#F2B53A', 9, 30), 'comedor': ('#4ADE80', 13, 60), 'colegio': ('#3B82F6', 13, 60)}
MAT = {}
def mat(nombre, color, **kw):
    if nombre not in MAT: MAT[nombre] = material(nombre, lineal(color) if isinstance(color, str) else color, **kw)
    return MAT[nombre]
def poner_materiales(comp, malla, colores, emis=0.0, prefijo=''):
    for i, s in enumerate(MALLA[malla][1]):
        c = next((v for k, v in colores.items() if k in s), None)
        if c: comp.set_material(i, mat('M_%s%s' % (prefijo, c.lstrip('#')), c, emis=emis))

# ---------------------------------------------------------------- utilidades de secuencias
def secuencia(nombre, cuadros):
    seq = tools.create_asset(nombre, D, unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
    seq.set_display_rate(unreal.FrameRate(24, 1)); seq.set_playback_start(0); seq.set_playback_end(cuadros); return seq
def actor_malla(malla, colores, emis=0.0, prefijo=''):
    a = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, -100000)); c = a.static_mesh_component
    c.set_static_mesh(MALLA[malla][0]); c.set_mobility(unreal.ComponentMobility.MOVABLE); c.set_cast_shadow(False) if hasattr(c, 'set_cast_shadow') else None
    poner_materiales(c, malla, colores, emis, prefijo); return a
def agregar(seq, actor, cuadros):
    b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, actor); eas.destroy_actor(actor)
    tr = b.add_track(unreal.MovieScene3DTransformTrack); sec = tr.add_section(); sec.set_range(0, cuadros + 1)
    return sec.get_all_channels()  # x, y, z, roll, pitch, yaw, sx, sy, sz
def clave(canal, fr, val, modo=unreal.RichCurveInterpMode.RCIM_LINEAR):
    k = canal.add_key(unreal.FrameNumber(int(fr)), float(val))
    try: k.set_interpolation_mode(modo)
    except Exception: pass
def fijo(ch, x, y, z, yaw=0.0, pitch=0.0, esc=(100, 100, 100)):
    p = U(x, y, z)
    for canal, v in zip(ch, (p.x, p.y, p.z, 0.0, pitch, yaw, esc[0], esc[1], esc[2])): clave(canal, 0, v)
def recorrido(ch, claves, esc, inicio=None, fin=None, total=None, z_fija=None, con_pitch=False):
    """claves: [cuadro, x, y, (z), rumbo°, (pitch°)]; la escala es 0 antes de 'inicio' y después de 'fin' (aparece y desaparece)."""
    prev = None
    for c in claves:
        fr, x, y = c[0], c[1], c[2]
        z = z_fija if z_fija is not None else c[3]; rumbo = c[4] if z_fija is None else c[3]
        yaw = -rumbo
        if prev is not None:
            while yaw - prev > 180: yaw -= 360
            while yaw - prev < -180: yaw += 360
        prev = yaw; p = U(x, y, z)
        clave(ch[0], fr, p.x); clave(ch[1], fr, p.y); clave(ch[2], fr, p.z); clave(ch[5], fr, yaw)
        if con_pitch: clave(ch[4], fr, c[5])
    clave(ch[3], 0, 0.0)
    if not con_pitch: clave(ch[4], 0, 0.0)
    C = unreal.RichCurveInterpMode.RCIM_CONSTANT
    for canal in ch[6:9]:
        if inicio: clave(canal, 0, 0.0, C)
        clave(canal, inicio or 0, esc, C)
        if fin is not None and total is not None and fin < total: clave(canal, fin + 1, 0.0, C)

# ---------------------------------------------------------------- secuencia de fauna
CF = FA['cuadros']; seq_f = secuencia('Fauna', CF); n_f = 0
for clave_a, ag in sorted(FA['agentes'].items()):
    malla, esc, colores = ESPECIE[ag['esp']]; ch = agregar(seq_f, actor_malla(malla, colores, 0.15 if ag['esp'] in ('abeja', 'custodio') else 0.0), CF)
    ult = ag['claves'][-1][0]
    recorrido(ch, ag['claves'], 100 * esc, fin=ult if ult < CF - 6 else None, total=CF, con_pitch=malla == 'ave_vuelo')
    n_f += 1
EAL.save_loaded_asset(seq_f); log('Fauna: %d agentes, %d cuadros' % (n_f, CF))

# ---------------------------------------------------------------- secuencias de alimentos (fichas + nodos)
VIS = 10.0
def nodos_en(seq, escenario, cuadros):
    n = 0
    for nd in NO['nodos']:
        if nd['tipo'] not in NODO or (nd['escenario'] == 'propuesto' and escenario == 'actual'): continue
        col, r, h = NODO[nd['tipo']]
        if nd['tipo'] == 'corabastos' and escenario != 'actual': r, h = r * 0.8, h * 0.8  # función reducida
        ch = agregar(seq, actor_malla('faro', {'faro': col}, 0.6), cuadros); fijo(ch, nd['x'], nd['y'], 0.0, esc=(100 * r, 100 * r, 100 * h)); n += 1
    if escenario != 'actual':  # área que Corabastos cede al humedal La Vaca
        a = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, -100000)); c = a.static_mesh_component
        c.set_static_mesh(MALLA['area_cedida'][0]); c.set_material(0, mat('M_Cedida', '#3FA34D', emis=0.3, opacidad=0.6))
        ch = agregar(seq, a, cuadros); fijo(ch, MA['centro_cedida'][0], MA['centro_cedida'][1], 13.0); n += 1  # sobre las bodegas de la malla de Google
    return n
SEQ_AL = {}
for esc_ in ('actual', 'propuesto', 'propuesto_apagon'):
    AL = json.load(open(os.path.join(SRC, 'alimentos_%s.json' % esc_), encoding='utf-8')); C_ = AL['cuadros']
    seq = secuencia('Alimentos_' + esc_, C_); nn = nodos_en(seq, esc_, C_); cuenta = {}
    for f in AL['fichas']:
        malla, col = FICHA[f['tipo']]
        ch = agregar(seq, actor_malla(malla, {'carga': col, 'cabina': col, 'llantas': '#202020'}, 3.0, 'F'), C_)
        recorrido(ch, f['claves'], 100 * VIS * (1.6 if malla == 'bicicarga' else 1.0), inicio=f['inicio'], fin=f['fin'], total=C_, z_fija=0.3)
        cuenta[f['tipo']] = cuenta.get(f['tipo'], 0) + 1
    EAL.save_loaded_asset(seq); SEQ_AL[esc_] = seq; log('Alimentos_%s: %d nodos, fichas %s' % (esc_, nn, cuenta))

# ---------------------------------------------------------------- cámaras con letreros y subsecuencias
# agentes de calle (calles_ren3d.py) si ya existen; si no, el tráfico de velocidad constante. Ambos se repiten en secciones.
_CALLES = unreal.load_asset('/Game/Kennedy/Calles/Calles')
TRAF = _CALLES or unreal.load_asset('/Game/Kennedy/Trafico/Trafico')
BUCLE_TRAF = int(_CALLES.get_playback_end()) if _CALLES else 720
def subsecuencia(seq, sub, cuadros, bucle=None):
    st = seq.add_track(unreal.MovieSceneSubTrack); paso = bucle or cuadros; ini = 0
    while ini < cuadros:  # el tráfico dura 30 s: se repite en secciones seguidas para cubrir toda la toma
        sec = st.add_section(); sec.set_sequence(sub); sec.set_range(ini, min(cuadros, ini + paso) + 1); ini += paso
def letrero(seq, texto, x, y, z, color, tam, cam, cuadros, planta=False):
    a = eas.spawn_actor_from_class(unreal.TextRenderActor, U(x, y, z)); t = a.get_component_by_class(unreal.TextRenderComponent)
    t.set_text(texto); t.set_world_size(tam * 100)
    try: t.set_horizontal_alignment(unreal.HorizTextAligment.EHTA_CENTER)
    except Exception: pass
    try: t.set_vertical_alignment(unreal.VerticalTextAligment.EVRTA_TEXT_BOTTOM)
    except Exception: pass
    c = lineal(color); t.set_text_render_color(unreal.Color(int(255 * c[0] ** (1 / 2.2)), int(255 * c[1] ** (1 / 2.2)), int(255 * c[2] ** (1 / 2.2)), 255))
    # el texto mira hacia +X local: se orienta hacia la cámara (rumbo y elevación)
    p = U(x, y, z); dx, dy, dz = cam.x - p.x, cam.y - p.y, cam.z - p.z
    yaw = math.degrees(math.atan2(dy, dx)); pitch = math.degrees(math.atan2(dz, math.hypot(dx, dy)))
    if planta: yaw, pitch = 90.0, 89.0  # en planta el texto mira hacia arriba y se lee con el norte arriba (comprobado en render)
    b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, a); eas.destroy_actor(a)
    tr = b.add_track(unreal.MovieScene3DTransformTrack); sec = tr.add_section(); sec.set_range(0, cuadros + 1); ch = sec.get_all_channels()
    for canal, v in zip(ch, (p.x, p.y, p.z, 0.0, pitch, yaw, 1.0, 1.0, 1.0)): clave(canal, 0, v)
CAMARAS = []
def camara(nombre, cuadros, trayecto, objetivo, focal, subs, letreros=(), planta=False):
    """trayecto(t) -> (x, y, z) en metros para t en [0, 1]; objetivo (x, y, z) fijo."""
    p0 = trayecto(0.0); cam = eas.spawn_actor_from_class(unreal.CineCameraActor, U(*p0)); cc = cam.get_cine_camera_component()
    cc.set_editor_property('current_focal_length', focal)
    fs = cc.get_editor_property('focus_settings'); fs.set_editor_property('focus_method', unreal.CameraFocusMethod.DISABLE); cc.set_editor_property('focus_settings', fs)
    fb = cc.get_editor_property('filmback'); fb.set_editor_property('sensor_width', 36.0); fb.set_editor_property('sensor_height', 20.25); cc.set_editor_property('filmback', fb)
    seq = secuencia(nombre, cuadros)
    b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, cam); eas.destroy_actor(cam)
    tr = b.add_track(unreal.MovieScene3DTransformTrack); sec = tr.add_section(); sec.set_range(0, cuadros + 1); ch = sec.get_all_channels()
    o = U(*objetivo); prev = None
    for f in range(0, cuadros + 1, 24):
        p = U(*trayecto(f / cuadros)); dx, dy, dz = o.x - p.x, o.y - p.y, o.z - p.z
        yaw = math.degrees(math.atan2(dy, dx)); pitch = math.degrees(math.atan2(dz, math.hypot(dx, dy)))
        if abs(pitch) > 89.5: pitch, yaw = -89.9, -90.0  # planta: el norte queda arriba
        if prev is not None:
            while yaw - prev > 180: yaw -= 360
            while yaw - prev < -180: yaw += 360
        prev = yaw
        for canal, v in zip(ch[:6], (p.x, p.y, p.z, 0.0, pitch, yaw)): clave(canal, f, v)
    cut = seq.add_track(unreal.MovieSceneCameraCutTrack); cs = cut.add_section(); cs.set_range(0, cuadros + 1)
    cs.set_camera_binding_id(seq.get_binding_id(b) if hasattr(seq, 'get_binding_id') else unreal.MovieSceneSequenceExtensions.get_binding_id(seq, b))
    pc = U(*trayecto(0.5))
    for texto, x, y, z, color, tam in letreros: letrero(seq, texto, x, y, z, color, tam, pc, cuadros, planta)
    for sub, bucle in subs: subsecuencia(seq, sub, cuadros, bucle)
    EAL.save_loaded_asset(seq); CAMARAS.append(nombre); log('cámara %s (%d cuadros)' % (nombre, cuadros)); return seq

FX, FY = FA['foco']
camara('Cam_Fauna', CF, lambda t: (FX + 65 * math.cos(math.radians(-115 + 40 * t)), FY + 65 * math.sin(math.radians(-115 + 40 * t)), 15.0),
       (FX, FY, 7.0), 30.0, [(seq_f, None)] + ([(TRAF, BUCLE_TRAF)] if TRAF else []))
nd = {n['tipo'] + ('' if n['tipo'] != 'humedal' else n['nombre']): n for n in NO['nodos']}
ALR = RES['alimentos']
def pct(e): return '%.0f %%' % (100 * ALR[e]['dependencia_volumen_ult30'])
def textos(e, tam, planta=False):
    # en planta la altura no separa los letreros: se corren en x/y para que no se monten (comprobado en render)
    def d(dx, dy): return (dx, dy) if planta else (0.0, 0.0)
    c = nd['corabastos']; L = []; ox, oy = d(150, -330)
    if e == 'actual': L.append(('Corabastos<br>todo pasa por aquí · %s' % pct(e), c['x'] + ox, c['y'] + oy, 200, '#FF6B5E', tam * 1.2))
    else:
        L.append(('Corabastos · función reducida<br>trae lo que Kennedy no produce · %s' % pct(e), c['x'] + ox, c['y'] + oy, 170, '#FF6B5E', tam * 1.2))
        for t, k, col, (dx, dy) in (('Punto de acopio', 'acopio', '#F2B53A', d(0, 60)), ('Distrito de hongos', 'distrito', '#B9A4FF', d(420, 40)),
                                    ('Compostaje', 'compostaje', '#D7B98A', d(330, -20))):
            L.append((t, nd[k]['x'] + dx, nd[k]['y'] + dy, 125 if k != 'compostaje' else 100, col, tam))
        cx, cy = MA['centro_cedida']; dx, dy = d(-480, 160)
        L.append(('Área cedida al humedal La Vaca<br>%.1f ha' % RES['territorio']['cedida_ha'], cx + dx, cy + dy, 40, '#8EE29A', tam * 0.9))
    for k, t, (dx, dy) in (('humedalHumedal El Burro', 'Humedal El Burro', d(0, 0)), ('humedalHumedal La Vaca', 'Humedal La Vaca', d(-250, -200))):
        L.append((t, nd[k]['x'] + dx, nd[k]['y'] + dy, 30, '#9AD4F0', tam))
    if e == 'propuesto_apagon':
        dx, dy = d(450, 160); L.append(('Apagón de 4 días en el distrito<br>respaldo con biogás y solar: 60 %', nd['distrito']['x'] + dx, nd['distrito']['y'] + dy, 175, '#FFD166', tam * 0.9))
    return L
OB = (-450.0, -480.0, 0.0)  # centro de interés entre Corabastos y El Burro
for e, seq in SEQ_AL.items():
    C_ = int(seq.get_playback_end())
    camara('Cam_%s_Oblicua' % e, C_, lambda t: (-2150 + 260 * t, -2350 - 120 * t, 1150.0), OB, 24.0, [(seq, None)] + ([(TRAF, BUCLE_TRAF)] if TRAF else []), textos(e, 46))
    camara('Cam_%s_Planta' % e, C_, lambda t: (-380.0, -280.0, 3300.0), (-380.0, -280.5, 0.0), 24.0, [(seq, None)], textos(e, 50, True), planta=True)

# ---------------------------------------------------------------- configuraciones de render (Movie Render Queue)
def config(nombre, prueba, cam):
    # una configuración por cámara: {sequence_name} sale vacío al renderizar por línea de comandos y los cuadros se pisaban
    cfg = tools.create_asset(nombre, D, unreal.MoviePipelinePrimaryConfig, None)
    out = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
    out.set_editor_property('output_directory', unreal.DirectoryPath(os.path.join(PROY, 'Saved', 'Agentes', cam).replace('\\', '/')))
    out.set_editor_property('file_name_format', cam + ('_prueba_' if prueba else '_') + '{frame_number}'); out.set_editor_property('output_resolution', unreal.IntPoint(1920, 1080))
    out.set_editor_property('zero_pad_frame_numbers', 4)
    if prueba:
        out.set_editor_property('use_custom_playback_range', True); out.set_editor_property('custom_start_frame', 480); out.set_editor_property('custom_end_frame', 481)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase); cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_JPG)
    aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
    aa.set_editor_property('override_anti_aliasing', True); aa.set_editor_property('anti_aliasing_method', unreal.AntiAliasingMethod.AAM_NONE)
    aa.set_editor_property('spatial_sample_count', 1); aa.set_editor_property('temporal_sample_count', 8 if prueba else 4)
    aa.set_editor_property('engine_warm_up_count', 400); aa.set_editor_property('render_warm_up_count', 64); aa.set_editor_property('use_camera_cut_for_warm_up', False)
    go = cfg.find_or_add_setting_by_class(unreal.MoviePipelineGameOverrideSetting)
    go.set_editor_property('cinematic_quality_settings', True); go.set_editor_property('flush_streaming_managers', True)
    EAL.save_loaded_asset(cfg); log('config %s' % nombre)
for cam in CAMARAS: config('Render_' + cam, False, cam); config('Prueba_' + cam, True, cam)
les.save_current_level()
with open(os.path.join(PROY, 'Saved', 'agentes_ren3d.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(info))
