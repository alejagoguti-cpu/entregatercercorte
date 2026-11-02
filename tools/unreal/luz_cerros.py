"""Luz para que los cerros orientales se vean reales: el sol de la tarde (15:30) les da de frente (miran al occidente; a media
mañana quedaban a contraluz, azul oscuro y planos) y una bruma clara de distancia (perspectiva aérea gris azulada, como en
las fotos de Bogotá) en vez del velo azul oscuro."""
import unreal
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les.load_level('/Game/Kennedy/Kennedy')
for a in eas.get_all_level_actors():
    if isinstance(a, unreal.CesiumSunSky):
        a.set_editor_property('solar_time', 15.5); a.update_sun()
    fc = a.get_component_by_class(unreal.ExponentialHeightFogComponent)
    if fc:
        fc.set_editor_property('fog_density', 0.0012); fc.set_editor_property('fog_height_falloff', 0.035)
        fc.set_editor_property('fog_inscattering_luminance', unreal.LinearColor(0.72, 0.78, 0.86, 1.0))
        fc.set_editor_property('start_distance', 2500.0 * 100)  # cerca, aire limpio; la bruma empieza a 2,5 km
les.save_current_level()
unreal.log('[Kennedy360] luz de la tarde y bruma de distancia')
