"""Importa el suelo propio de la zona (pasto, parques, agua, vías, andenes, líneas) y el carro; lo pone en el nivel con 2.170 carros
(instancias con color al azar) y RECORTA la malla de Google dentro de la zona (polígono de Cesium + capa de recorte), así
dentro solo queda lo propio y afuera el contexto de Google tal cual."""
import json, math, os, unreal

PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
SRC = os.path.join(PROY, 'Importar'); TX = r'C:\Users\ACER\REN3D-realista\data3d'
DST = '/Game/Kennedy/Suelo'
EAL, MEL = unreal.EditorAssetLibrary, unreal.MaterialEditingLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
info = []
def log(s): info.append(str(s)); unreal.log('[Kennedy360] ' + str(s))
def importar(ruta, destino=DST):
    t = unreal.AssetImportTask(); t.set_editor_property('filename', ruta); t.set_editor_property('destination_path', destino)
    t.set_editor_property('automated', True); t.set_editor_property('replace_existing', True); t.set_editor_property('save', True)
    tools.import_asset_tasks([t]); return [unreal.load_asset(p) for p in t.get_editor_property('imported_object_paths')]
def textura(ruta, normal=False):
    a = importar(ruta, DST + '/Tex')[0]
    if normal: a.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_NORMALMAP); a.set_editor_property('srgb', False)
    EAL.save_loaded_asset(a); return a
def material(nombre):
    if EAL.does_asset_exist(DST + '/' + nombre): EAL.delete_asset(DST + '/' + nombre)
    return tools.create_asset(nombre, DST, unreal.Material, unreal.MaterialFactoryNew())
def k3(m, c, x=-600, y=0):
    k = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, x, y); k.set_editor_property('constant', unreal.LinearColor(c[0], c[1], c[2], 1)); return k
def k1(m, v, x=-600, y=300):
    k = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, x, y); k.set_editor_property('r', v); return k
def mat_textura(nombre, color, normal, rug, tinte=(1, 1, 1)):
    m = material(nombre)
    c = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -700, -200); c.set_editor_property('texture', color)
    mu = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -350, -200)
    MEL.connect_material_expressions(c, 'RGB', mu, 'A'); MEL.connect_material_expressions(k3(m, tinte, -700, -400), '', mu, 'B')
    MEL.connect_material_property(mu, '', unreal.MaterialProperty.MP_BASE_COLOR)
    if normal:
        n = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -700, 100); n.set_editor_property('texture', normal)
        n.set_editor_property('sampler_type', unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL); MEL.connect_material_property(n, 'RGB', unreal.MaterialProperty.MP_NORMAL)
    MEL.connect_material_property(k1(m, rug), '', unreal.MaterialProperty.MP_ROUGHNESS)
    m.set_editor_property('two_sided', True)  # el cambio de ejes del OBJ deja algunas caras mirando hacia abajo
    MEL.recompile_material(m); EAL.save_loaded_asset(m); return m
def mat_liso(nombre, color, rug, met=0.0, inst=None):
    m = material(nombre)
    if inst:  # carros: color al azar por instancia entre dos tonos (blancos, platas, grises y negros, como en Bogotá)
        r = MEL.create_material_expression(m, unreal.MaterialExpressionPerInstanceRandom, -900, 200)
        lp = MEL.create_material_expression(m, unreal.MaterialExpressionLinearInterpolate, -400, 0)
        MEL.connect_material_expressions(k3(m, inst[0], -900, -200), '', lp, 'A'); MEL.connect_material_expressions(k3(m, inst[1], -900, 0), '', lp, 'B'); MEL.connect_material_expressions(r, '', lp, 'Alpha')
        MEL.connect_material_property(lp, '', unreal.MaterialProperty.MP_BASE_COLOR); m.set_editor_property('used_with_instanced_static_meshes', True)
    else: MEL.connect_material_property(k3(m, color), '', unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(k1(m, rug), '', unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.connect_material_property(k1(m, met, -600, 400), '', unreal.MaterialProperty.MP_METALLIC)
    m.set_editor_property('two_sided', True)
    MEL.recompile_material(m); EAL.save_loaded_asset(m); return m

if EAL.does_directory_exist(DST): EAL.delete_directory(DST)
P = TX + r'\poliigon\Poliigon_GrassPatchyGround_4585_'
mats = {
    'pasto': mat_textura('M_Pasto', textura(P + 'BaseColor.jpg'), textura(P + 'Normal.png', True), 0.95, (0.5, 0.55, 0.4)),  # pasto natural, no verde limón
    'parque': mat_textura('M_Parque', textura(TX + r'\textures\pasto_color.jpg'), textura(TX + r'\textures\pasto_normal.jpg', True), 0.95),
    'via': mat_textura('M_Via', textura(TX + r'\textures\via_color.jpg'), textura(TX + r'\textures\via_normal.jpg', True), 0.85),
    'anden': mat_textura('M_Anden', textura(TX + r'\textures\acera_color.jpg'), textura(TX + r'\textures\acera_normal.jpg', True), 0.8),
    'piso': mat_textura('M_Piso', textura(TX + r'\textures\piso_color.jpg'), textura(TX + r'\textures\piso_normal.jpg', True), 0.9, (0.85, 0.83, 0.8)),
    'plaza': mat_textura('M_Plaza', textura(TX + r'\textures\acera_color.jpg'), textura(TX + r'\textures\acera_normal.jpg', True), 0.85, (1.0, 0.95, 0.9)),
    'parqueo': mat_textura('M_Parqueo', textura(TX + r'\textures\via_color.jpg'), textura(TX + r'\textures\via_normal.jpg', True), 0.85, (0.9, 0.9, 0.92)),
    'tierra': mat_textura('M_Tierra', textura(P + 'BaseColor.jpg'), textura(P + 'Normal.png', True), 0.95, (0.75, 0.55, 0.38)),
    'sintetica': mat_liso('M_Sintetica', (0.05, 0.22, 0.06), 0.7),
    'cancha': mat_liso('M_Cancha', (0.06, 0.16, 0.28), 0.6),
    'caucho': mat_liso('M_Caucho', (0.32, 0.07, 0.05), 0.85),
    'juncal': mat_textura('M_Juncal', textura(P + 'BaseColor.jpg'), textura(P + 'Normal.png', True), 0.95, (0.42, 0.45, 0.24)),  # pasto alto y juncos del humedal
    'agua': mat_liso('M_Agua', (0.02, 0.05, 0.06), 0.05, 0.0),
    'linea': mat_liso('M_Linea', (0.85, 0.82, 0.7), 0.6),
    'pintura': mat_liso('M_Pintura', None, 0.3, 0.3, inst=((0.85, 0.86, 0.87), (0.02, 0.022, 0.025))),
    'vidrio': mat_liso('M_Vidrio', (0.01, 0.012, 0.015), 0.05),
    'llanta': mat_liso('M_Llanta', (0.015, 0.015, 0.015), 0.7),
}
log('materiales: %s' % ', '.join(mats))
mallas = {}
for archivo in ('suelo.obj', 'carro.obj'):
    for o in importar(os.path.join(SRC, archivo)):
        if isinstance(o, unreal.StaticMesh):
            n = o.get_name(); ns = o.get_editor_property('nanite_settings'); ns.set_editor_property('enabled', False); o.set_editor_property('nanite_settings', ns)
            if n in mats: o.set_material(0, mats[n])
            EAL.save_loaded_asset(o); mallas[n] = o
log('mallas: %s' % ', '.join(mallas))

les.load_level('/Game/Kennedy/Kennedy')
for a in eas.get_all_level_actors():
    if a.get_actor_label().startswith(('SUELO_', 'CARROS', 'RECORTE_')): eas.destroy_actor(a)
for n in ('piso', 'pasto', 'parque', 'juncal', 'tierra', 'plaza', 'parqueo', 'sintetica', 'cancha', 'caucho', 'agua', 'anden', 'via', 'linea'):
    if n not in mallas: continue
    act = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0)); act.static_mesh_component.set_static_mesh(mallas[n])
    act.set_actor_label('SUELO_' + n); act.set_actor_scale3d(unreal.Vector(100, 100, 100))
# carros: instancias (cada parte del sedán en su HISM), rumbo de la vía
D = json.load(open(os.path.join(SRC, 'carros.json'), encoding='utf-8'))
host = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0)); host.set_actor_label('CARROS')
sds = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
tr = [unreal.Transform(unreal.Vector(x * 100, -y * 100, (D['suelo'] + 0.1) * 100), unreal.Rotator(roll=0.0, pitch=0.0, yaw=-rumbo), unreal.Vector(100, 100, 100)) for x, y, rumbo, _ in D['carros']]
for n in ('pintura', 'vidrio', 'llanta'):
    raiz = sds.k2_gather_subobject_data_for_instance(host)[0]
    h, _ = sds.add_new_subobject(unreal.AddNewSubobjectParams(parent_handle=raiz, new_class=unreal.HierarchicalInstancedStaticMeshComponent, blueprint_context=None))
    c = unreal.SubobjectDataBlueprintFunctionLibrary.get_object(unreal.SubobjectDataBlueprintFunctionLibrary.get_data(h))
    c.set_static_mesh(mallas[n]); c.add_instances(tr, False)
log('carros: %d' % len(tr))

# recorte de la malla de Google dentro de la zona: polígono (círculo de 900 m) en longitud y latitud
MXg = 111320 * math.cos(math.radians(4.63))
lon0, lat0 = -74.17 + (7437 - 5193.24) / MXg, 4.63 + (3271 - 2090.06) / 110540.0
R = 1600.0
puntos = [unreal.Vector(lon0 + math.cos(a / 64 * 2 * math.pi) * R / MXg, lat0 + math.sin(a / 64 * 2 * math.pi) * R / 110540.0, 2600.0) for a in range(64)]
pol = eas.spawn_actor_from_class(unreal.CesiumCartographicPolygon, unreal.Vector(0, 0, 0)); pol.set_actor_label('RECORTE_zona')
pol.set_polygon_points(unreal.CesiumCoordinateReferenceSystem.LONGITUDE_LATITUDE_HEIGHT, puntos)
ts = [a for a in eas.get_all_level_actors() if isinstance(a, unreal.Cesium3DTileset)][0]
for c in ts.get_components_by_class(unreal.CesiumPolygonRasterOverlay): c.destroy_component(ts)
raiz = sds.k2_gather_subobject_data_for_instance(ts)[0]
h, _ = sds.add_new_subobject(unreal.AddNewSubobjectParams(parent_handle=raiz, new_class=unreal.CesiumPolygonRasterOverlay, blueprint_context=None))
ov = unreal.SubobjectDataBlueprintFunctionLibrary.get_object(unreal.SubobjectDataBlueprintFunctionLibrary.get_data(h))
ov.set_editor_property('polygons', [pol])
log('recorte: capa %s, clave %s' % (ov.get_name(), ov.get_editor_property('material_layer_key')))
les.save_current_level()
with open(os.path.join(PROY, 'Saved', 'importar_suelo.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(info))
