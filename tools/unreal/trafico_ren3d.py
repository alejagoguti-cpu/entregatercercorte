"""Tráfico en movimiento en Kennedy360: importa el sedán y la camioneta (una malla con pintura, vidrio, llantas y luces), crea
pinturas de carros comunes de Bogotá y arma la secuencia /Game/Kennedy/Trafico (30 s, en bucle) con un carro por cada
trayectoria de trafico.json. Un actor de secuencia la reproduce sola al darle Play y durante los renders.
Quita los carros quietos de las avenidas (actor CARROS) y deja los estacionados en las calles locales."""
import json, os, unreal
PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
SRC = os.path.join(PROY, 'Importar'); D = '/Game/Kennedy/Trafico'
EAL, MEL = unreal.EditorAssetLibrary, unreal.MaterialEditingLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
info = []
def log(s): info.append(str(s)); unreal.log('[Kennedy360] ' + str(s))
if EAL.does_directory_exist(D): EAL.delete_directory(D)
def importar(ruta):
    t = unreal.AssetImportTask(); t.set_editor_property('filename', ruta); t.set_editor_property('destination_path', D)
    t.set_editor_property('automated', True); t.set_editor_property('replace_existing', True); t.set_editor_property('save', True)
    tools.import_asset_tasks([t]); return [unreal.load_asset(p) for p in t.get_editor_property('imported_object_paths')]
def material(nombre, color, rug, met=0.0, emis=None, clearcoat=False):
    m = tools.create_asset(nombre, D, unreal.Material, unreal.MaterialFactoryNew()); m.set_editor_property('two_sided', True)
    def k3(c, y):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -500, y); e.set_editor_property('constant', unreal.LinearColor(c[0], c[1], c[2], 1)); return e
    def k1(v, y):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -500, y); e.set_editor_property('r', v); return e
    MEL.connect_material_property(k3(color, 0), '', unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(k1(rug, 200), '', unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.connect_material_property(k1(met, 300), '', unreal.MaterialProperty.MP_METALLIC)
    if emis: MEL.connect_material_property(k3(emis, 400), '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    if clearcoat:  # pintura de carro: reflejo más fuerte (especular alto)
        MEL.connect_material_property(k1(0.8, 500), '', unreal.MaterialProperty.MP_SPECULAR)
    MEL.recompile_material(m); EAL.save_loaded_asset(m); return m
# colores más comunes en Bogotá: blanco, plata, gris, negro, rojo, azul oscuro, y amarillo de taxi
PINTURAS = [(0.8, 0.8, 0.8), (0.55, 0.56, 0.58), (0.18, 0.19, 0.2), (0.015, 0.016, 0.018), (0.45, 0.03, 0.03), (0.03, 0.06, 0.18), (0.75, 0.75, 0.74), (0.7, 0.45, 0.0)]
pint = [material('M_Pintura_%d' % i, c, 0.35, 0.4, clearcoat=True) for i, c in enumerate(PINTURAS)]
vidrio = material('M_Vidrio', (0.005, 0.007, 0.009), 0.04, 0.0)
llanta = material('M_Llanta', (0.012, 0.012, 0.012), 0.75)
luces = material('M_Luces', (0.9, 0.85, 0.75), 0.3, 0.0, emis=(0.4, 0.35, 0.25))
rin = material('M_Rin', (0.55, 0.56, 0.58), 0.25, 1.0)
traseras = material('M_Traseras', (0.35, 0.0, 0.0), 0.3, 0.0, emis=(0.25, 0.0, 0.0))
negro = material('M_Plastico', (0.02, 0.02, 0.02), 0.6)
placa = material('M_Placa', (0.75, 0.55, 0.0), 0.5)
PORRANURA = [('vidrio', vidrio), ('llanta', llanta), ('rin', rin), ('luces', luces), ('traseras', traseras), ('negro', negro), ('placa', placa)]
mallas = {}
for n in ('sedan', 'camioneta'):
    for o in importar(os.path.join(SRC, n + '.obj')):
        if not isinstance(o, unreal.StaticMesh): continue
        ns = o.get_editor_property('nanite_settings'); ns.set_editor_property('enabled', False); o.set_editor_property('nanite_settings', ns)
        ranuras = {}
        for i, sm in enumerate(o.static_materials):
            s = str(sm.material_slot_name).lower(); ranuras[i] = s
            o.set_material(i, next((mm for nn, mm in PORRANURA if nn in s), pint[0]))
        EAL.save_loaded_asset(o); mallas[n] = (o, ranuras)
        log('%s: %d ranuras %s' % (n, len(ranuras), list(ranuras.values())))

les.load_level('/Game/Kennedy/Kennedy')
for a in eas.get_all_level_actors():
    if a.get_actor_label() in ('TRAFICO',) or isinstance(a, unreal.LevelSequenceActor) and a.get_actor_label() == 'TRAFICO': eas.destroy_actor(a)
T = json.load(open(os.path.join(SRC, 'trafico.json'), encoding='utf-8'))
seq = tools.create_asset('Trafico', '/Game/Kennedy' if False else D, unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
seq.set_display_rate(unreal.FrameRate(T['fps'], 1)); seq.set_playback_start(0); seq.set_playback_end(T['cuadros'])
z = (T['suelo'] + 0.1) * 100
for k, c in enumerate(T['carros']):
    malla, ranuras = mallas['camioneta' if c['tipo'] else 'sedan']
    x0, y0, _, r0 = c['claves'][0]
    a = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(x0 * 100, -y0 * 100, z))
    a.static_mesh_component.set_static_mesh(malla); a.set_actor_label('carro_%03d' % k)
    for i, s in ranuras.items():
        if 'pintura' in s: a.static_mesh_component.set_material(i, pint[c['color']])
    a.static_mesh_component.set_mobility(unreal.ComponentMobility.MOVABLE)
    b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, a); eas.destroy_actor(a)
    tr = b.add_track(unreal.MovieScene3DTransformTrack); sec = tr.add_section(); sec.set_range(0, T['cuadros'] + 1)
    ch = sec.get_all_channels()  # x, y, z, roll, pitch, yaw, sx, sy, sz
    prev = None
    for fr, x, y, rumbo in c['claves']:
        yaw = -rumbo  # Unreal: Y hacia el sur
        if prev is not None:
            while yaw - prev > 180: yaw -= 360
            while yaw - prev < -180: yaw += 360
        prev = yaw
        t = unreal.FrameNumber(fr)
        for canal, val in ((ch[0], x * 100), (ch[1], -y * 100), (ch[2], z), (ch[5], yaw)):
            kk = canal.add_key(t, val)
            try: kk.set_interpolation_mode(unreal.RichCurveInterpMode.RCIM_LINEAR)
            except Exception: pass
    for canal in (ch[3], ch[4]): canal.add_key(unreal.FrameNumber(0), 0.0)
    for canal in ch[6:9]: canal.add_key(unreal.FrameNumber(0), 100.0)  # el OBJ entra en cm: x100 = metros reales
EAL.save_loaded_asset(seq)
log('secuencia Trafico: %d carros, %d cuadros' % (len(T['carros']), T['cuadros']))
# carros estacionados (calles locales): mismo sedán, en instancias, pintura al azar por instancia
for a in eas.get_all_level_actors():
    if a.get_actor_label() in ('TRAFICO', 'CARROS', 'ESTACIONADOS'): eas.destroy_actor(a)
C = json.load(open(os.path.join(SRC, 'carros.json'), encoding='utf-8'))
host = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0)); host.set_actor_label('ESTACIONADOS')
sds = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
raiz = sds.k2_gather_subobject_data_for_instance(host)[0]
h, _ = sds.add_new_subobject(unreal.AddNewSubobjectParams(parent_handle=raiz, new_class=unreal.HierarchicalInstancedStaticMeshComponent, blueprint_context=None))
hc = unreal.SubobjectDataBlueprintFunctionLibrary.get_object(unreal.SubobjectDataBlueprintFunctionLibrary.get_data(h))
malla, ranuras = mallas['sedan']; hc.set_static_mesh(malla)
pint_azar = unreal.load_asset('/Game/Kennedy/Suelo/M_Pintura')  # color al azar por instancia
for i, s in ranuras.items():
    if 'pintura' in s and pint_azar: hc.set_material(i, pint_azar)
hc.add_instances([unreal.Transform(unreal.Vector(x * 100, -y * 100, (C['suelo'] + 0.1) * 100), unreal.Rotator(roll=0.0, pitch=0.0, yaw=-r), unreal.Vector(100, 100, 100)) for x, y, r, _ in C['carros']], False)
log('estacionados: %d' % hc.get_instance_count())
# el tráfico va como subsecuencia dentro de cada secuencia de cámara: así se mueve cuadro a cuadro en los renders y al reproducirlas
for nombre in ('Giro', 'Oblicua', 'Calle', 'Arriba', 'Cerros'):
    s = unreal.load_asset('/Game/Kennedy/%s.%s' % (nombre, nombre))
    if not s: continue
    for tr in list(s.get_tracks()):
        if isinstance(tr, unreal.MovieSceneSubTrack): s.remove_track(tr)
    st = s.add_track(unreal.MovieSceneSubTrack); sec = st.add_section(); sec.set_sequence(seq)
    sec.set_range(s.get_playback_start(), max(s.get_playback_end(), 2) + 1)
    EAL.save_loaded_asset(s); log('tráfico dentro de %s' % nombre)
les.save_current_level()
with open(os.path.join(PROY, 'Saved', 'trafico_ren3d.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(info))