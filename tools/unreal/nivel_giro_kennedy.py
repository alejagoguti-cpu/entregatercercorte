"""Copia limpia del nivel para el giro de toda Kennedy: /Game/Kennedy/KennedyGiro = Kennedy sin los edificios/árboles/agua
de REN3D alrededor de El Burro (se veían como una mancha de maqueta en medio de la foto de Google). El nivel original no se toca."""
import os, unreal
PROY = unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir())
EAL = unreal.EditorAssetLibrary
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
DEST = '/Game/Kennedy/KennedyGiro'
if EAL.does_asset_exist(DEST): EAL.delete_asset(DEST)
EAL.duplicate_asset('/Game/Kennedy/Kennedy', DEST)
les.load_level(DEST)
QUEDAN = ('Cesium', 'SkyAtmosphere', 'DirectionalLight', 'SkyLight', 'ExponentialHeightFog', 'PostProcessVolume', 'WorldSettings',
          'Brush', 'DefaultPhysicsVolume', 'GameplayDebugger', 'AbstractNavData', 'WorldDataLayers', 'WorldPartition', 'Volumetric', 'Info')
info = []
for a in eas.get_all_level_actors():
    cl = a.get_class().get_name()
    if isinstance(a, unreal.Cesium3DTileset):  # sin el recorte que dejaba el hueco para el suelo de REN3D
        for comp in a.get_components_by_class(unreal.CesiumPolygonRasterOverlay):
            comp.set_editor_property('polygons', []); info.append('recorte quitado del tileset')
    if any(q in cl for q in QUEDAN) and cl != 'CesiumCartographicPolygon':
        info.append('queda  %s (%s)' % (a.get_actor_label(), cl))
    else:
        info.append('borra  %s (%s)' % (a.get_actor_label(), cl)); eas.destroy_actor(a)
les.save_current_level()
with open(os.path.join(PROY, 'Saved', 'nivel_giro_kennedy.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(info))
