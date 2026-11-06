"""Corredor El Burro - La Vaca (paradas intermedias del giro) con la MISMA estética del giro de El Burro (armar_escena.py + ajustes_giro.py +
importar/colocar_ren3d del 29-oct): nivel nuevo /Game/Kennedy/KennedyVaca con la malla de Google, sol de media mañana,
bruma y postproceso iguales; edificios REN3D (exportar_vaca.py) con los materiales de /Game/Kennedy/Ren3D; árboles de
Poly Haven; cámara a 260 m de altura y 650 m de radio con lente de 20 mm, 72 fotogramas. El nivel Kennedy no se toca."""
import json, math, os, unreal
PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
SRC = os.path.join(PROY, 'Importar', 'corredor')
R, DV = '/Game/Kennedy/Ren3D', '/Game/Kennedy/Ren3DCorredor'
lineas = []
def log(s): lineas.append(str(s)); unreal.log('[Kennedy360] ' + str(s))
TOKEN = open(os.path.join(PROY, 'Config', 'cesium_ion_token.txt'), encoding='utf-8').read().strip()
LAT, LON, H = 4.640683, -74.149778, 2548.0  # misma georreferencia que el nivel Kennedy (origen El Burro)
MXg, MYg = 111320 * math.cos(math.radians(4.63)), 110540.0
VX, VY = (-74.161978 - LON) * MXg, -(4.628701 - LAT) * MYg  # La Vaca en Unreal (m): X este, Y sur
FRAMES, RADIO_M, ALTO_M, FOCAL = 72, 650.0, 260.0, 20.0
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
tools = unreal.AssetToolsHelpers.get_asset_tools(); EAL = unreal.EditorAssetLibrary

# ---------- mallas de edificios ----------
if EAL.does_directory_exist(DV): EAL.delete_directory(DV)
t = unreal.AssetImportTask()
t.set_editor_property('filename', os.path.join(SRC, 'edificios.obj')); t.set_editor_property('destination_path', DV)
t.set_editor_property('automated', True); t.set_editor_property('replace_existing', True); t.set_editor_property('save', True)
tools.import_asset_tasks([t])
MATS = {'ladrillo': 'M_Fachada_ladrillo', 'salmon': 'M_Fachada_salmon', 'crema': 'M_Fachada_crema', 'blanco': 'M_Fachada_blanco', 'techo': 'M_Techo', 'lamina': 'M_Lamina', 'balcon': 'M_Balcon'}
mallas = []
for p in t.get_editor_property('imported_object_paths'):
    o = unreal.load_asset(p)
    if not isinstance(o, unreal.StaticMesh): continue
    n = o.get_name()
    if n in MATS: o.set_material(0, unreal.load_asset('%s/%s' % (R, MATS[n])))
    ns = o.get_editor_property('nanite_settings'); ns.set_editor_property('enabled', False); o.set_editor_property('nanite_settings', ns)
    EAL.save_loaded_asset(o); mallas.append(o)
log('mallas: %s' % ', '.join(m.get_name() for m in mallas))

# ---------- nivel ----------
if EAL.does_asset_exist('/Game/Kennedy/KennedyCorredor'): EAL.delete_asset('/Game/Kennedy/KennedyCorredor')
les.new_level('/Game/Kennedy/KennedyCorredor')
geo = eas.spawn_actor_from_class(unreal.CesiumGeoreference, unreal.Vector(0, 0, 0))
geo.set_origin_longitude_latitude_height(unreal.Vector(LON, LAT, H)); geo.set_actor_label('Georreferencia_Kennedy')
ts = eas.spawn_actor_from_class(unreal.Cesium3DTileset, unreal.Vector(0, 0, 0)); ts.set_actor_label('Google_Fotorrealista')
ts.set_editor_property('tileset_source', unreal.TilesetSource.FROM_CESIUM_ION)
ts.set_editor_property('georeference', geo)  # la malla en Bogotá; el sol queda con la georreferencia por defecto, como en el giro de El Burro
ts.set_editor_property('ion_asset_id', 2275207); ts.set_editor_property('ion_access_token', TOKEN)
ts.set_editor_property('maximum_screen_space_error', 4.0)
ts.set_editor_property('maximum_simultaneous_tile_loads', 40)
ts.set_editor_property('enable_occlusion_culling', False)
ts.set_editor_property('enable_frustum_culling', False)          # ajustes_giro.py
ts.set_editor_property('enforce_culled_screen_space_error', True)
ts.set_editor_property('culled_screen_space_error', 8.0)
ts.set_editor_property('enable_fog_culling', False)
ts.set_editor_property('maximum_cached_bytes', 4 * 1024 * 1024 * 1024)
sky = eas.spawn_actor_from_class(unreal.CesiumSunSky, unreal.Vector(0, 0, 0)); sky.set_actor_label('Sol_y_cielo')
for k, v in (('time_zone', -5.0), ('solar_time', 10.8), ('day', 15), ('month', 1), ('year', 2026), ('use_daylight_saving_time', False)):
    try: sky.set_editor_property(k, v)
    except Exception as e: log('sol %s: %s' % (k, e))
try: sky.update_sun()
except Exception as e: log('update_sun: %s' % e)
for a in eas.get_all_level_actors():
    for comp in a.get_components_by_class(unreal.VolumetricCloudComponent):
        comp.set_visibility(False); comp.set_editor_property('hidden_in_game', True); log('nubes ocultas')
fog = eas.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 0)); fog.set_actor_label('Bruma')
fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
fc.set_editor_property('fog_density', 0.002); fc.set_editor_property('fog_height_falloff', 0.04)
fc.set_editor_property('fog_inscattering_luminance', unreal.LinearColor(0.55, 0.65, 0.8, 1.0))
ppv = eas.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 0)); ppv.set_actor_label('Postproceso_render')
ppv.set_editor_property('unbound', True)
ps = ppv.get_editor_property('settings')
def pp(nombre, valor):
    try: ps.set_editor_property('override_' + nombre, True)
    except Exception: pass
    try: ps.set_editor_property(nombre, valor)
    except Exception as e: log('pp %s: %s' % (nombre, e))
pp('auto_exposure_method', unreal.AutoExposureMethod.AEM_HISTOGRAM); pp('auto_exposure_min_brightness', 12.5); pp('auto_exposure_max_brightness', 14.5)
pp('auto_exposure_bias', 0.55); pp('bloom_intensity', 0.3); pp('vignette_intensity', 0.18)
pp('color_saturation', unreal.Vector4(1.1, 1.1, 1.1, 1.0)); pp('color_contrast', unreal.Vector4(1.08, 1.08, 1.08, 1.0))
pp('color_gamma_shadows', unreal.Vector4(1.0, 1.0, 1.0, 1.18)); pp('color_saturation_highlights', unreal.Vector4(1.0, 1.0, 1.0, 0.95))
pp('white_temp', 7000.0); pp('lens_flare_intensity', 0.0); pp('motion_blur_amount', 0.0)
ppv.set_editor_property('settings', ps)

# edificios y árboles (colocar_ren3d.py del 29-oct)
for m in mallas:
    act = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0))
    act.static_mesh_component.set_static_mesh(m); act.set_actor_label('REN3D_edificios_' + m.get_name()); act.set_actor_scale3d(unreal.Vector(100, 100, 100))
D = json.load(open(os.path.join(SRC, 'arboles.json'), encoding='utf-8'))
ESPECIES = [('jacaranda', 19.58), ('island_tree_01', 4.94)]
sds = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
def hism(host, malla):
    raiz = sds.k2_gather_subobject_data_for_instance(host)[0]
    h, _ = sds.add_new_subobject(unreal.AddNewSubobjectParams(parent_handle=raiz, new_class=unreal.HierarchicalInstancedStaticMeshComponent, blueprint_context=None))
    c = unreal.SubobjectDataBlueprintFunctionLibrary.get_object(unreal.SubobjectDataBlueprintFunctionLibrary.get_data(h))
    c.set_static_mesh(malla); c.set_editor_property('cast_shadow', True); return c
suelo = D['suelo']
for k, (esp, alto0) in enumerate(ESPECIES):
    host = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0)); host.set_actor_label('REN3D_arboles_' + esp)
    tr = []
    for x, y, alto, rot, wf, s in D['arboles']:
        if s != k: continue
        e = alto / alto0 * (1.0 if k == 0 else 1.6)
        tr.append(unreal.Transform(unreal.Vector(x * 100, -y * 100, (suelo - 0.2) * 100), unreal.Rotator(roll=0.0, pitch=0.0, yaw=rot), unreal.Vector(e * wf, e * wf, e)))
    for parte in ('hojas', 'madera'):
        n = '%s_L0_%s' % (esp, parte)
        c = hism(host, unreal.load_asset('%s/Arboles/%s/%s/StaticMeshes/%s.%s' % (R, n, n, n, n))); c.add_instances(tr, False)
        if parte == 'hojas':  # follaje original del glTF (gris), como en el giro de El Burro
            hoja = unreal.load_asset('%s/Arboles/%s/%s/Materials/%s' % (R, n, n, 'jacaranda_tree_leaves' if k == 0 else 'island_tree_01_leaves'))
            for i in range(c.get_num_materials()): c.set_material(i, hoja)
        log('arboles %s %s: %d' % (esp, parte, c.get_instance_count()))

# ---------- cámara y secuencia: paradas intermedias entre El Burro (0) y La Vaca (1), cada una con su giro de 72 vistas ----------
# (las paradas de los extremos ya están renderizadas: giro/ y giro_vaca/). Cada parada empieza con PAD fotogramas quietos
# en el ángulo 0 (para que bajen las teselas tras el salto), que luego se descartan.
PARADAS, PAD = [0.25, 0.5, 0.75], 6
BLOQUE = PAD + FRAMES
TOTAL = BLOQUE * len(PARADAS)
cam = eas.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(0, 0, ALTO_M * 100))
cc = cam.get_cine_camera_component(); cc.set_editor_property('current_focal_length', FOCAL)
fs = cc.get_editor_property('focus_settings'); fs.set_editor_property('focus_method', unreal.CameraFocusMethod.DISABLE); cc.set_editor_property('focus_settings', fs)
fb = cc.get_editor_property('filmback'); fb.set_editor_property('sensor_width', 36.0); fb.set_editor_property('sensor_height', 20.25); cc.set_editor_property('filmback', fb)
if EAL.does_asset_exist('/Game/Kennedy/GiroCorredor'): EAL.delete_asset('/Game/Kennedy/GiroCorredor')
seq = tools.create_asset('GiroCorredor', '/Game/Kennedy', unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
seq.set_display_rate(unreal.FrameRate(24, 1)); seq.set_playback_start(0); seq.set_playback_end(TOTAL)
b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, cam)
eas.destroy_actor(cam)
sec = b.add_track(unreal.MovieScene3DTransformTrack).add_section(); sec.set_range(0, TOTAL + 1)
ch = sec.get_all_channels(); prev = None
for s, tt in enumerate(PARADAS):
    PX, PY = VX * tt, VY * tt
    for j in range(BLOQUE + (1 if s == len(PARADAS) - 1 else 0)):
        f = s * BLOQUE + j
        g = max(0, j - PAD)  # ángulo
        a = 2 * math.pi * g / FRAMES
        x, y, z = (PX + math.sin(a) * RADIO_M) * 100, (PY - math.cos(a) * RADIO_M) * 100, ALTO_M * 100
        dx, dy, dz = PX * 100 - x, PY * 100 - y, 25 * 100 - z
        yaw = math.degrees(math.atan2(dy, dx)); pitch = math.degrees(math.atan2(dz, math.hypot(dx, dy)))
        if prev is not None:
            while yaw - prev > 180: yaw -= 360
            while yaw - prev < -180: yaw += 360
        prev = yaw
        modo = unreal.RichCurveInterpMode.RCIM_CONSTANT if (j < PAD or j == BLOQUE - 1) else unreal.RichCurveInterpMode.RCIM_LINEAR
        for cnl, val in zip(ch[:6], (x, y, z, 0.0, pitch, yaw)):
            k = cnl.add_key(unreal.FrameNumber(f), val)
            try: k.set_interpolation_mode(modo)
            except Exception: pass
cs = seq.add_track(unreal.MovieSceneCameraCutTrack).add_section(); cs.set_range(0, TOTAL + 1)
cs.set_camera_binding_id(unreal.MovieSceneSequenceExtensions.get_binding_id(seq, b))
EAL.save_loaded_asset(seq)
log('secuencia: %d paradas x (%d + %d)' % (len(PARADAS), PAD, FRAMES))

def config(nombre, desde, hasta, ancho, alto, carpeta):
    ruta = '/Game/Kennedy/' + nombre
    if EAL.does_asset_exist(ruta): EAL.delete_asset(ruta)
    cfg = tools.create_asset(nombre, '/Game/Kennedy', unreal.MoviePipelinePrimaryConfig, None)
    out = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
    out.set_editor_property('output_directory', unreal.DirectoryPath(os.path.join(PROY, 'Saved', carpeta).replace('\\', '/')))
    out.set_editor_property('file_name_format', 'giro_{frame_number}')
    out.set_editor_property('output_resolution', unreal.IntPoint(ancho, alto))
    out.set_editor_property('use_custom_playback_range', True)
    out.set_editor_property('custom_start_frame', desde); out.set_editor_property('custom_end_frame', hasta)
    out.set_editor_property('zero_pad_frame_numbers', 3)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_JPG)
    aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
    aa.set_editor_property('override_anti_aliasing', True); aa.set_editor_property('anti_aliasing_method', unreal.AntiAliasingMethod.AAM_NONE)
    aa.set_editor_property('spatial_sample_count', 1); aa.set_editor_property('temporal_sample_count', 8)
    aa.set_editor_property('engine_warm_up_count', 1500); aa.set_editor_property('render_warm_up_count', 64)
    aa.set_editor_property('use_camera_cut_for_warm_up', False)
    go = cfg.find_or_add_setting_by_class(unreal.MoviePipelineGameOverrideSetting)
    go.set_editor_property('cinematic_quality_settings', True); go.set_editor_property('flush_streaming_managers', True)
    EAL.save_loaded_asset(cfg)
config('ConfigGiroCorredorPrueba', PAD, PAD + 1, 1920, 1080, 'GiroCorredorPrueba')
config('ConfigGiroCorredor', 0, TOTAL, 1920, 1080, 'GiroCorredor')
les.save_current_level()
log('nivel KennedyCorredor listo')
with open(os.path.join(PROY, 'Saved', 'armar_corredor.txt'), 'w', encoding='utf-8') as fh: fh.write('\n'.join(lineas))
