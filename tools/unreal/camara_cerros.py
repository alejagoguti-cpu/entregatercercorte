"""Vista hacia los cerros orientales de Bogotá: cámara de dron 750 m al occidente del humedal El Burro, a 170 m de altura,
mirando al oriente (unos 7° hacia abajo, lente de 30 mm): en primer plano el humedal y los conjuntos, al fondo la ciudad y
los cerros. Baja la bruma (se veía como velo blanco sobre los cerros) y pide detalle de Google también lejos.
Secuencia /Game/Kennedy/Cerros (2 cuadros); se renderiza con ConfigPrueba."""
import unreal
EAL = unreal.EditorAssetLibrary; tools = unreal.AssetToolsHelpers.get_asset_tools()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les.load_level('/Game/Kennedy/Kennedy')
for a in eas.get_all_level_actors():
    fc = a.get_component_by_class(unreal.ExponentialHeightFogComponent)
    if fc:
        fc.set_editor_property('fog_density', 0.0007); fc.set_editor_property('fog_height_falloff', 0.06)
        fc.set_editor_property('fog_inscattering_luminance', unreal.LinearColor(0.45, 0.55, 0.7, 1.0))
    if isinstance(a, unreal.Cesium3DTileset):
        a.set_editor_property('culled_screen_space_error', 6.0)
cam = eas.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(-75000, 9000, (15.8 + 170) * 100), unreal.Rotator(roll=0.0, pitch=-7.0, yaw=-4.0))
cc = cam.get_cine_camera_component(); cc.set_editor_property('current_focal_length', 30.0)
fs = cc.get_editor_property('focus_settings'); fs.set_editor_property('focus_method', unreal.CameraFocusMethod.DISABLE); cc.set_editor_property('focus_settings', fs)
fb = cc.get_editor_property('filmback'); fb.set_editor_property('sensor_width', 36.0); fb.set_editor_property('sensor_height', 20.25); cc.set_editor_property('filmback', fb)
if EAL.does_asset_exist('/Game/Kennedy/Cerros'): EAL.delete_asset('/Game/Kennedy/Cerros')
seq = tools.create_asset('Cerros', '/Game/Kennedy', unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
seq.set_display_rate(unreal.FrameRate(24, 1)); seq.set_playback_start(0); seq.set_playback_end(2)
b = unreal.MovieSceneSequenceExtensions.add_spawnable_from_instance(seq, cam); eas.destroy_actor(cam)
cut = seq.add_track(unreal.MovieSceneCameraCutTrack); cs = cut.add_section(); cs.set_range(0, 3)
cs.set_camera_binding_id(seq.get_binding_id(b) if hasattr(seq, 'get_binding_id') else unreal.MovieSceneSequenceExtensions.get_binding_id(seq, b))
EAL.save_loaded_asset(seq)
cfg = unreal.load_asset('/Game/Kennedy/ConfigPrueba')
out = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
out.set_editor_property('custom_start_frame', 0); out.set_editor_property('custom_end_frame', 1); EAL.save_loaded_asset(cfg)
les.save_current_level()
unreal.log('[Kennedy360] vista Cerros lista')
