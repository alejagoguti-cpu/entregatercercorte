"""Config de render rápido para video corto: 1280x720, 20 s (frames 240-720), sin muestras temporales."""
import os, unreal
EAL = unreal.EditorAssetLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()
PROY = unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir())
D = '/Game/Kennedy/Calles'
cam = 'Cam_Calles_Cruce'
nombre = 'Rapido_' + cam
if EAL.does_asset_exist(D + '/' + nombre):
    EAL.delete_asset(D + '/' + nombre)
cfg = tools.create_asset(nombre, D, unreal.MoviePipelinePrimaryConfig, None)
out = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
out.set_editor_property('output_directory', unreal.DirectoryPath(os.path.join(PROY, 'Saved', 'Video', cam).replace('\\', '/')))
out.set_editor_property('file_name_format', cam + '_{frame_number}')
out.set_editor_property('output_resolution', unreal.IntPoint(1280, 720))
out.set_editor_property('zero_pad_frame_numbers', 4)
out.set_editor_property('use_custom_playback_range', True)
out.set_editor_property('custom_start_frame', 240)
out.set_editor_property('custom_end_frame', 720)
cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase)
cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_JPG)
aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
aa.set_editor_property('spatial_sample_count', 1)
aa.set_editor_property('temporal_sample_count', 1)
aa.set_editor_property('engine_warm_up_count', 300)
aa.set_editor_property('render_warm_up_count', 32)
aa.set_editor_property('use_camera_cut_for_warm_up', False)
go = cfg.find_or_add_setting_by_class(unreal.MoviePipelineGameOverrideSetting)
go.set_editor_property('cinematic_quality_settings', True)
go.set_editor_property('flush_streaming_managers', True)
EAL.save_loaded_asset(cfg)
with open(os.path.join(PROY, 'Saved', 'config_rapido.txt'), 'w', encoding='utf-8') as f:
    f.write('ok ' + cfg.get_path_name())
