import bpy, math, random, os, json, re, base64
from mathutils import Vector
random.seed(24)
OUT='/workspace/public/assets/blender-poc'
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=96;scene.cycles.use_denoising=False
scene.cycles.max_bounces=6
scene.render.resolution_x=900;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
# Use the same real HDR radiance as the browser, packed into the editable scene.
hdr_module=open('/workspace/public/studio-environment.js').read()
hdr_bytes=base64.b64decode(re.search(r"const data='([^']+)'",hdr_module).group(1))
hdr_path='/workspace/blender/studio-small08.hdr';open(hdr_path,'wb').write(hdr_bytes)
scene.world.use_nodes=True
wn=scene.world.node_tree.nodes;wl=scene.world.node_tree.links
bg=wn.get('Background');bg.inputs['Strength'].default_value=.16
env=wn.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(hdr_path);env.image.pack();wl.new(env.outputs['Color'],bg.inputs['Color'])
scene.view_settings.view_transform='AgX'
P=.016; L=P*8
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h):return tuple(linear(int(h[i:i+2],16)/255)for i in (0,2,4))+(1,)
colours=[rgb(h)for h in ['265a64','b75036','c79837','dbca9e']]
def material(name,colour,rough=.85):
 m=bpy.data.materials.new(name);m.diffuse_color=colour;m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=colour;bs.inputs['Roughness'].default_value=rough
 return m
materials=[material(n,c)for n,c in zip(['Indigo cotton','Madder rust','Turmeric ochre','Unbleached cotton'],colours)]
for m in materials:
 n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Sheen Weight'].default_value=.35;bs.inputs['Sheen Roughness'].default_value=.8
 uv=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs['UV'],sep.inputs[0])
 freq=n.new('ShaderNodeMath');freq.operation='MULTIPLY';freq.inputs[1].default_value=math.tau*24;l.new(sep.outputs['Y'],freq.inputs[0])
 wave=n.new('ShaderNodeMath');wave.operation='SINE';l.new(freq.outputs[0],wave.inputs[0])
 tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=125;tex.inputs['Detail'].default_value=3;l.new(uv.outputs['UV'],tex.inputs['Vector'])
 mix=n.new('ShaderNodeMixRGB');mix.blend_type='ADD';mix.inputs[0].default_value=.3;l.new(wave.outputs[0],mix.inputs[1]);l.new(tex.outputs['Fac'],mix.inputs[2])
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.45;bump.inputs['Distance'].default_value=.0003;l.new(mix.outputs[0],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])

def tile_mesh(name,warp):
 verts=[];faces=[];steps=8*10;sides=6;radius=P*(.28 if warp else .47)
 for strand in range(8):
  phase=random.random()*math.tau
  for ply in range(3):
   start=len(verts)
   for j in range(steps+1):
    t=j/steps;along=(t*8-.5)*P;across=strand*P
    height=math.cos(math.pi*(t*8-.5+strand))*P*.32*(-1 if warp else 1)
    turn=along/radius*1.15+ply*math.tau/3+phase
    for s in range(sides):
     angle=s/sides*math.tau
     a=radius*(.42*math.cos(turn)+.57*math.cos(angle));z=height+radius*.72*(.42*math.sin(turn)+.57*math.sin(angle))
     x,y=(across+a,along)if warp else(along,across+a)
     verts.append((x,y,z))
    if j<steps:
     for s in range(sides):
      a=start+j*sides+s;b=start+j*sides+(s+1)%sides
      faces.append((a,b,b+sides,a+sides))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 uv=mesh.uv_layers.new(name='Yarn fibres')
 for loop in mesh.loops:
  vertex=loop.vertex_index;ring=(vertex//sides)%(steps+1);uv.data[loop.index].uv=(ring/steps,(vertex%sides)/sides)
 for p in mesh.polygons:p.use_smooth=True
 return mesh
warp=tile_mesh('Blender cotton warp',True);weft=tile_mesh('Blender cotton weft',False)
# Export a compact reusable Blender-authored weave tile, with two material slots.
export_objects=[]
for mesh,mat in [(warp,materials[0]),(weft,materials[1])]:
 ob=bpy.data.objects.new(mesh.name,mesh);scene.collection.objects.link(ob);ob.data.materials.append(mat);export_objects.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in export_objects:ob.select_set(True)
bpy.context.view_layer.objects.active=export_objects[0]
bpy.ops.export_scene.gltf(filepath=OUT+'/weave-tile.gltf',export_format='GLTF_SEPARATE',use_selection=True,export_yup=False,export_materials='EXPORT')
import base64
gltf_path=OUT+'/weave-tile.gltf'
gltf=json.load(open(gltf_path))
for buffer in gltf['buffers']:
 raw=open(OUT+'/'+buffer['uri'],'rb').read();buffer['uri']='data:application/octet-stream;base64,'+base64.b64encode(raw).decode()
json.dump(gltf,open(gltf_path,'w'),separators=(',',':'))
for ob in export_objects:bpy.data.objects.remove(ob,do_unlink=True)
# Linked tile instances retain detailed ply geometry without duplicating the mesh.
pattern=[0,0,0,3,1,2,0,0,1,1,1,3,2,2,3,0,0,0]
for iy in range(18):
 for ix in range(12):
  for mesh,mi in [(warp,0),(weft,pattern[iy])]:
   ob=bpy.data.objects.new('Cotton weave',mesh);scene.collection.objects.link(ob)
   ob.rotation_euler.x=math.pi/2
   ob.location=((ix*8-47.5)*P,-.014,1.8+(iy*8-71.5)*P)
   ob.material_slots[0].link='OBJECT';ob.material_slots[0].material=materials[mi]
# Very fine fibres sit on the exposed yarn surface, not a second fabric shell.
hairmat=material('Cotton flyaway fibres',(.32,.26,.16,1),1)
curve=bpy.data.curves.new('Fine cotton fuzz','CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=.00010;curve.bevel_resolution=0
for k in range(15000):
 x=random.uniform(-.76,.76);z=random.uniform(.65,2.95);length=random.uniform(.001,.006)
 sp=curve.splines.new('POLY');sp.points.add(2)
 angle=random.random()*math.tau
 for j in range(3):
  t=j/2;sp.points[j].co=(x+math.cos(angle)*length*t,-.024-math.sin(t*2)*length*.6,z+math.sin(angle)*length*t,1)
hair=bpy.data.objects.new('Small loose cotton fibres',curve);scene.collection.objects.link(hair);hair.data.materials.append(hairmat)
# Lime plaster uses two real-scale bump frequencies and subtle pigment variation.
plaster=material('Warm lime plaster',(.64,.59,.49,1),.94)
n=plaster.node_tree.nodes;l=plaster.node_tree.links;bs=n.get('Principled BSDF')
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=5
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.48,.43,.35,1);ramp.color_ramp.elements[1].color=(.72,.67,.57,1);l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],bs.inputs['Base Color'])
fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=380;fine.inputs['Detail'].default_value=3
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.0012;l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
def cube(name,loc,scale,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(mat)
 if bevel:m=ob.modifiers.new('Soft physical edges','BEVEL');m.width=bevel;m.segments=3;ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return ob
cube('Plastered wall',(0,.12,2.3),(8,.18,4.6),plaster)
stone=material('Honed limestone floor',(.39,.33,.25,1),.9);cube('Room floor',(0,-1.7,-.05),(8,4,.1),stone)
wood=material('Oiled oak rail',(.15,.073,.026,1),.65);cube('Oak hanging rail',(0,-.018,2.985),(1.7,.04,.035),wood,.009)
cube('Oak skirting',(0,-.006,.075),(8,.06,.15),wood,.006)
brass=material('Brushed brass pins',(.32,.22,.09,1),.4);brass.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.75
for x in [-.73,.73]:cube('Small wall fixing',(x,-.049,2.985),(.018,.012,.018),brass,.005)
# Fine fringes at the lower short edge.
fringe=bpy.data.curves.new('Cotton fringe','CURVE');fringe.dimensions='3D';fringe.bevel_depth=.0025;fringe.bevel_resolution=1
for i in range(96):
 sp=fringe.splines.new('POLY');sp.points.add(8)
 for j in range(9):
  t=j/8;sp.points[j].co=((i-47.5)*P+.002*math.sin(t*3+i),-.014-.003*math.sin(t*2),.648-.055*t,1)
ob=bpy.data.objects.new('Fine bottom fringe',fringe);scene.collection.objects.link(ob);ob.data.materials.append(materials[3])
def aim(ob,at):ob.rotation_euler=(Vector(at)-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(-3,-2.5,5.5));sun=bpy.context.object;sun.name='Upper-left afternoon sun';sun.data.energy=1.8;sun.data.angle=.16;sun.data.color=(1,.91,.78);aim(sun,(0,0,1.5))
bpy.ops.object.light_add(type='AREA',location=(-1.2,-1.5,3.5));fill=bpy.context.object;fill.name='Broad upper-left window';fill.data.energy=110;fill.data.color=(1,.91,.80);fill.data.shape='DISK';fill.data.size=1.8;aim(fill,(-.1,0,1.8))
bpy.ops.object.camera_add(location=(0,-5.8,1.8));cam=bpy.context.object;cam.data.lens=57;aim(cam,(0,0,1.8));scene.camera=cam
scene.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath='/workspace/blender/strand-room.blend')
scene.render.filepath=OUT+'/room.png';bpy.ops.render.render(write_still=True)
cam.location=(.05,-.78,1.8);aim(cam,(.05,-.015,1.8));cam.data.lens=62;cam.data.dof.use_dof=True;cam.data.dof.focus_distance=(cam.location-Vector((.05,-.015,1.8))).length;cam.data.dof.aperture_fstop=8
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.filepath=OUT+'/detail.png';bpy.ops.render.render(write_still=True)
print('BLENDER_POC_COMPLETE',flush=True)
