"""Cambia la fuente de la malla fotorrealista: en vez de Cesium ion (se agotó su cuota de Google: error 429), Google Map Tiles
directo con la llave del proyecto (Config/google_maps_key.txt, no va a GitHub). Conserva el recorte de la zona y los ajustes."""
import os, unreal
PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
KEY = open(os.path.join(PROY, 'Config', 'google_maps_key.txt'), encoding='utf-8').read().strip()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les.load_level('/Game/Kennedy/Kennedy')
for a in eas.get_all_level_actors():
    if isinstance(a, unreal.Cesium3DTileset):
        a.set_editor_property('tileset_source', unreal.TilesetSource.FROM_URL)
        a.set_editor_property('url', 'https://tile.googleapis.com/v1/3dtiles/root.json?key=' + KEY)
        a.set_editor_property('culled_screen_space_error', 8.0)
        a.refresh_tileset()
        unreal.log('[Kennedy360] malla de Google directa: %s' % a.get_actor_label())
les.save_current_level()
