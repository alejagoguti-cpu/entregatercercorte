"""Pone en el nivel Kennedy los edificios REN3D (una malla por material) y siembra los árboles reales de Poly Haven como
instancias (HISM: jacaranda e island tree, hojas y madera), cada uno escalado a la altura de su árbol en los datos.
El OBJ ya viene en (este, norte, alto) y el importador lo deja en (este, sur, alto) de la georreferencia Cesium, en cm."""
import json, os, unreal

PROY = r'C:\Users\ACER\Documents\Unreal Projects\Kennedy360'
R = '/Game/Kennedy/Ren3D'
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
les.load_level('/Game/Kennedy/Kennedy')
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
info = []
for a in eas.get_all_level_actors():
    if a.get_actor_label().startswith('REN3D_'): eas.destroy_actor(a)
for parte in ('ladrillo', 'salmon', 'crema', 'blanco', 'techo', 'lamina', 'balcon'):
    m = unreal.load_asset('%s/%s.%s' % (R, parte, parte))
    if not m: info.append('falta ' + parte); continue
    act = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, 0))
    act.static_mesh_component.set_static_mesh(m)
    act.set_actor_label('REN3D_edificios_' + parte); act.set_actor_scale3d(unreal.Vector(100, 100, 100))
    info.append('edificios %s' % parte)

D = json.load(open(os.path.join(PROY, 'Importar', 'arboles.json'), encoding='utf-8'))
ESPECIES = [('jacaranda', 19.58), ('island_tree_01', 4.94)]  # alto del modelo (m)
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
        e = alto / alto0  # altura real del árbol
        tr.append(unreal.Transform(unreal.Vector(x * 100, -y * 100, (suelo - 0.2) * 100), unreal.Rotator(roll=0.0, pitch=0.0, yaw=rot), unreal.Vector(e * wf, e * wf, e)))
    for parte in ('hojas', 'madera'):
        n = '%s_L0_%s' % (esp, parte)
        m = unreal.load_asset('%s/Arboles/%s/%s/StaticMeshes/%s.%s' % (R, n, n, n, n))
        c = hism(host, m); c.add_instances(tr, False)
        info.append('arboles %s %s: %d' % (esp, parte, c.get_instance_count()))
les.save_current_level()
with open(os.path.join(PROY, 'Saved', 'colocar_ren3d.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(str(s) for s in info))
