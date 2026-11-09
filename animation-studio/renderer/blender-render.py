# Bundled Blender renderer: only validated JSON, never runs user-supplied Python.
import bpy, sys, json, math, os
from mathutils import Vector
argv=sys.argv
if '--' not in argv: raise SystemExit('usage: blender -b -P blender-render.py -- manifest output')
args=argv[argv.index('--')+1:]
if len(args)!=2: raise SystemExit('manifest/output required')
with open(args[0],encoding='utf-8') as f: data=json.load(f)
out=args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
fps=24
sc.render.fps=fps
aspect=data.get('aspect','9:16')
w,h={'9:16':(720,1280),'16:9':(1280,720),'1:1':(900,900)}[aspect]
sc.render.resolution_x=w; sc.render.resolution_y=h; sc.render.resolution_percentage=100
sc.render.engine='BLENDER_EEVEE_NEXT' if bpy.app.version >= (4, 2, 0) else 'BLENDER_EEVEE'
world=bpy.data.worlds.new('Masar world');sc.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.025,.035,.075,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
def material(name, color, metallic=0, roughness=.3):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metallic;bs.inputs['Roughness'].default_value=roughness
 return m
blue=material('cyan',(.09,.7,.95),.18)
floor_mat=material('stage',(.045,.065,.13))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1.6));floor=bpy.context.object;floor.name='Stage';floor.data.materials.append(floor_mat)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=(0,0,0));hero=bpy.context.object;hero.name='Animated character';hero.data.materials.append(blue)
bpy.ops.object.camera_add(location=(0,-8,2));cam=bpy.context.object
direction=Vector((0,0,0))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();sc.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=7 if aspect!='16:9' else 9
for loc,power,size in [((3,-4,6),1400,5),((-3,-2,3),900,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size
frame=1
for i,scene in enumerate(data['scenes']):
 n=max(1,round(float(scene['duration'])*fps))
 hero.location=(0,0,0);hero.rotation_euler=(0,0,0)
 hero.keyframe_insert(data_path='location',frame=frame)
 hero.keyframe_insert(data_path='rotation_euler',frame=frame)
 hero.location=(math.sin(i+1)*1.2,0,.35)
 hero.rotation_euler=(.1,0,math.pi*1.5)
 hero.keyframe_insert(data_path='location',frame=frame+n-1)
 hero.keyframe_insert(data_path='rotation_euler',frame=frame+n-1)
 frame+=n
sc.frame_start=1;sc.frame_end=frame-1
sc.render.image_settings.file_format='FFMPEG'
sc.render.ffmpeg.format='MPEG4';sc.render.ffmpeg.codec='H264'
sc.render.ffmpeg.constant_rate_factor='MEDIUM';sc.render.ffmpeg.ffmpeg_preset='GOOD'
sc.render.filepath=out
bpy.ops.render.render(animation=True)
print('MASAR_RENDER_COMPLETE',out)
