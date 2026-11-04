"""Giro 360 de TODA la localidad de Kennedy (no solo el humedal El Burro): dron en órbita de 7 km de radio a 3,5 km de altura
alrededor del centro de la localidad (límite OSM 4740229), lente de 24 mm. El límite completo cabe en los 72 ángulos.
Cada ángulo se sostiene QUIETO durante SOSTEN fotogramas (claves constantes) para que bajen las teselas de Google y el
suavizado temporal converja; luego tools/giro_build.py se queda con el último fotograma de cada ángulo.
No guarda el nivel: solo crea /Game/Kennedy/GiroKennedy y sus configuraciones de render."""
import math, os, unreal
PROY = unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir())
VISTAS, SOSTEN = 72, 10
CX, CY = -250.0, 1225.0          # centro de Kennedy en el marco del giro (m; X este, Y sur), origen El Burro
RADIO, ALTO, FOCAL, CORRE = 7000.0, 3500.0, 24.0, 1500.0  # CORRE: el objetivo se corre hacia la cámara
EAL = unreal.EditorAssetLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les.load_level('/Game/Kennedy/Kennedy')
info = []

cam = eas.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(0, 0, ALTO * 100))
cam.set_actor_label('Camara_giro_Kennedy')
cc = cam.get_cine_camera_component()
cc.set_editor_property('current_focal_length', FOCAL)
fs = cc.get_editor_property('focus_settings'); fs.set_editor_property('focus_method', unreal.CameraFocusMethod.DISABLE); cc.set_editor_property('focus_settings', fs)
fb = cc.get_editor_property('filmback'); fb.set_editor_property('sensor_width', 36.0); fb.set_editor_property('sensor_height', 20.25); cc.set_editor_property('filmback', fb)

RUTA = '/Game/Kennedy/GiroKennedy'
if EAL.does_asset_exist(RUTA): EAL.delete_asset(RUTA)
seq = tools.create_asset('GiroKennedy', '/Game/Kennedy', unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
N = VISTAS * SOSTEN
seq.set_display_rate(unreal.FrameRate(24, 1)); seq.set_playback_start(0); seq.set_playback_end(N)
b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, cam)
eas.destroy_actor(cam)  # el nivel queda como estaba
sec = b.add_track(unreal.MovieScene3DTransformTrack).add_section(); sec.set_range(0, N + 1)
ch = sec.get_all_channels()
prev = None
for i in range(VISTAS):
    a = 2 * math.pi * i / VISTAS
    x, y = CX + math.sin(a) * RADIO, CY - math.cos(a) * RADIO
    tx, ty = CX + math.sin(a) * CORRE, CY - math.cos(a) * CORRE
    # Unreal: X este, Y sur (como el visor web), Z arriba; cm
    dx, dy, dz = tx - x, ty - y, -ALTO
    yaw = math.degrees(math.atan2(dy, dx)); pitch = math.degrees(math.atan2(dz, math.hypot(dx, dy)))
    if prev is not None:
        while yaw - prev > 180: yaw -= 360
        while yaw - prev < -180: yaw += 360
    prev = yaw
    for c, v in zip(ch[:6], (x * 100, y * 100, ALTO * 100, 0.0, pitch, yaw)):
        k = c.add_key(unreal.FrameNumber(i * SOSTEN), v)
        k.set_interpolation_mode(unreal.RichCurveInterpMode.RCIM_CONSTANT)  # quieto durante todo el sostén
cs = seq.add_track(unreal.MovieSceneCameraCutTrack).add_section(); cs.set_range(0, N + 1)
cs.set_camera_binding_id(unreal.MovieSceneSequenceExtensions.get_binding_id(seq, b))
EAL.save_loaded_asset(seq)
info.append('secuencia %s: %d vistas x %d' % (RUTA, VISTAS, SOSTEN))

def config(nombre, desde, hasta, ancho, alto, carpeta):
    ruta = '/Game/Kennedy/' + nombre
    if EAL.does_asset_exist(ruta): EAL.delete_asset(ruta)
    cfg = tools.create_asset(nombre, '/Game/Kennedy', unreal.MoviePipelinePrimaryConfig, None)
    out = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
    out.set_editor_property('output_directory', unreal.DirectoryPath(os.path.join(PROY, 'Saved', carpeta).replace('\\', '/')))
    out.set_editor_property('file_name_format', 'gk_{frame_number}')
    out.set_editor_property('output_resolution', unreal.IntPoint(ancho, alto))
    out.set_editor_property('zero_pad_frame_numbers', 4)
    out.set_editor_property('use_custom_playback_range', True)
    out.set_editor_property('custom_start_frame', desde); out.set_editor_property('custom_end_frame', hasta)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_JPG)
    aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
    aa.set_editor_property('spatial_sample_count', 1); aa.set_editor_property('temporal_sample_count', 1)
    aa.set_editor_property('engine_warm_up_count', 600)  # que baje Kennedy completo antes del primer fotograma
    aa.set_editor_property('render_warm_up_count', 64)
    aa.set_editor_property('use_camera_cut_for_warm_up', False)
    go = cfg.find_or_add_setting_by_class(unreal.MoviePipelineGameOverrideSetting)
    go.set_editor_property('cinematic_quality_settings', True); go.set_editor_property('flush_streaming_managers', True)
    EAL.save_loaded_asset(cfg)
    info.append('config %s: %d-%d %dx%d -> Saved/%s' % (nombre, desde, hasta, ancho, alto, carpeta))

config('ConfigGiroKennedyPrueba', 0, 3 * SOSTEN, 1280, 720, 'GiroKennedyPrueba')
config('ConfigGiroKennedy', 0, N, 1920, 1080, 'GiroKennedy')
with open(os.path.join(PROY, 'Saved', 'giro_kennedy.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(info))
