"""Original low-poly static furnishings with a single baked diffuse/AO atlas.
Blender 4.3+, CPU Cycles. Source wood is the project's verified CC0 Poly Haven scan.
"""
import bpy, math, random, json, hashlib, os
from mathutils import Vector
random.seed(184)
OUT='/workspace/public/assets/room'
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.cycles.device='CPU';scene.render.bake.margin=8
props=[]
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def colour(h):return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
def material(name,h,wood=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear()
 out=n.new('ShaderNodeOutputMaterial');emit=n.new('ShaderNodeEmission');l.new(emit.outputs[0],out.inputs['Surface'])
 rgb=n.new('ShaderNodeRGB');rgb.outputs[0].default_value=(*colour(h),1);base=rgb.outputs[0]
 if wood:
  image=bpy.data.images.load('/tmp/strand-materials/wood_table_worn-Diffuse.jpg',check_existing=True)
  tex=n.new('ShaderNodeTexImage');tex.image=image;tex.projection='BOX';tex.projection_blend=.2
  coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Object'],tex.inputs['Vector'])
  mul=n.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;l.new(tex.outputs['Color'],mul.inputs[1]);mul.inputs[2].default_value=(.64,.49,.35,1);base=mul.outputs[0]
 ao=n.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.095;ao.samples=12
 multiply=n.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=.83;l.new(base,multiply.inputs[1]);l.new(ao.outputs['Color'],multiply.inputs[2])
 normal=n.new('ShaderNodeNewGeometry');dot=n.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=Vector((-.55,-.65,.73)).normalized();l.new(normal.outputs['Normal'],dot.inputs[0])
 ramp=n.new('ShaderNodeMapRange');ramp.inputs['From Min'].default_value=-.65;ramp.inputs['From Max'].default_value=1;ramp.inputs['To Min'].default_value=.46;ramp.inputs['To Max'].default_value=1.16;ramp.clamp=True;l.new(dot.outputs['Value'],ramp.inputs['Value'])
 shade=n.new('ShaderNodeMixRGB');shade.blend_type='MULTIPLY';shade.inputs[0].default_value=1;l.new(multiply.outputs[0],shade.inputs[1]);l.new(ramp.outputs[0],shade.inputs[2]);l.new(shade.outputs[0],emit.inputs['Color'])
 return m
wood=material('Scanned walnut with baked cavities','583119',True)
bronze=material('Aged brass','897042');ivory=material('Warm chalk ceramic','dfc9a5');clay=material('Unglazed terracotta','b77759');peach=material('Dusty peach clay','d1a48b');paper=material('Ivory paper','cdbf9d');red=material('Oxblood binding','753831');navy=material('Indigo binding','303e42');gold=material('Ochre binding','ad8051');orange=material('Warm citrus','b94d20');olive=material('Olive foliage','65725a');charcoal=material('Ink','30352d');cream=material('Art ground','d4c3a0')
def finish(o,name,mat):o.name=name;o.data.materials.append(mat);props.append(o);return o
def cube(name,loc,dim,mat=wood,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft worn edges','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,mat)
def sphere(name,loc,scale,mat,segments=12,rings=6):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,mat)
def tube(name,points,radius,mat,sides=6):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=0;curve.resolution_u=6
 sp=curve.splines.new('POLY');sp.points.add(len(points)-1)
 for p,xyz in zip(sp.points,points):p.co=(*xyz,1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return finish(o,name,mat)
def lathe(name,x,y,z,profile,mat,sides=20):
 vertices=[];faces=[]
 for r,h in profile:
  for i in range(sides):a=i/sides*math.tau;vertices.append((x+r*math.cos(a),y+r*math.sin(a),z+h))
 for j in range(len(profile)-1):
  for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;faces.append((a,b,b+sides,a+sides))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 for f in mesh.polygons:f.use_smooth=True
 return finish(o,name,mat)
# A narrow, carved Rajasthani-style cabinet; all relief is real low-poly geometry.
floor=-.8
cube('Cabinet body',(0,-.285,-.24),(1.04,.44,.98),wood,.016)
cube('Dark recessed door ground',(0,-.515,-.20),(.94,.025,.83),wood,.006)
for x in [-.475,.475]:cube('Carved stile',(x,-.537,-.22),(.065,.045,.91),wood,.006)
cube('Centre stile',(0,-.545,-.22),(.04,.055,.91),wood,.004)
for row in range(6):
 for col in range(4):
  x=(col-1.5)*.218;z=-.582+row*.137
  cube('Recessed panel',(x,-.537,z),(.19,.018,.105),wood,.008)
  for dx in [-.101,.101]:cube('Raised panel bead',(x+dx,-.558,z),(.013,.027,.125),wood,.003)
  for dz in [-.061,.061]:cube('Raised panel bead',(x,-.558,z+dz),(.207,.027,.013),wood,.003)
  sphere('Carved centre rosette',(x,-.562,z),(.027,.013,.027),wood,8,4)
  sphere('Aged brass pin',(x,-.579,z),(.006,.004,.006),bronze,8,4)
for z,w,d,h in [(.26,1.16,.55,.055),(.215,1.10,.49,.034),(-.714,1.11,.49,.055)]:cube('Moulded cabinet cornice',(0,-.29,z),(w,d,h),wood,.01)
for x in [-.43,.43]:
 for y in [-.12,-.45]:cube('Block foot',(x,y,-.767),(.09,.09,.067),wood,.009)
# Books and citrus on top.
for i,(w,d,mat) in enumerate([(.43,.24,red),(.45,.23,paper),(.39,.24,navy)]):
 z=.303+i*.027
 cube('Clothbound book',(-.18,-.34,z),(w,d,.024),mat,.003)
 cube('Book page edge',(-.18,-.463,z),(w-.018,.006,.015),paper)
 for dz in [-.007,.005]:cube('Page leaf line',(-.18,-.468,z+dz),(w-.025,.002,.0014),gold)
lathe('Low brass fruit dish',-.17,-.29,.372,[(.015,0),(.11,.007),(.12,.025),(.115,.034)],bronze,20)
for x,y,z,r in [(-.21,-.29,.425,.045),(-.13,-.28,.429,.047),(-.17,-.345,.417,.042)]:sphere('Citrus fruit',(x,y,z),(r,r,r),orange,12,6)
lathe('Small dark woven bowl',.32,-.30,.29,[(.05,0),(.09,.025),(.105,.06),(.10,.09)],wood,20)
for k in range(5):
 z=.312+k*.013;lathe('Basket rim course',.32,-.30,z,[(.078+k*.004,0),(.085+k*.004,.006)],gold,20)
# Three pottery silhouettes with thick lips and open, dark interiors.
for name,x,y,h,r,mat in [('Tall chalk vessel',-.89,-.24,.64,.145,ivory),('Terracotta handled urn',-.88,-.54,.39,.14,clay),('Peach bud jar',-1.17,-.33,.36,.115,peach)]:
 profile=[(.65*r,0),(r,.08*h),(r,.5*h),(.86*r,.72*h),(.48*r,.84*h),(.42*r,.98*h),(.48*r,h),(.32*r,h),(.30*r,.91*h),(.20*r,.86*h)]
 lathe(name,x,y,floor,profile,mat,24)
 if 'handled' in name:
  for sign in [-1,1]:
   pts=[]
   for j in range(11):a=-math.pi/2+j*math.pi/10;pts.append((x+sign*(r*.82+.065*math.cos(a)),y,floor+h*.55+.11*math.sin(a)))
   tube('Loop handle',pts,.015,mat)
# Small, original botanical pictures in dark walnut frames.
for idx,(x,z,w,h) in enumerate([(1.02,1.87,.36,.30),(1.00,1.46,.31,.34)]):
 cube('Picture backing',(x,.011,z),(w,.026,h),wood,.004)
 cube('Art paper',(x,-.008,z),(w-.035,.006,h-.035),cream)
 for sx in [-1,1]:cube('Frame side',(x+sx*(w/2-.01),-.017,z),(.018,.025,h),wood,.003)
 for sz in [-1,1]:cube('Frame edge',(x,-.017,z+sz*(h/2-.01)),(w,.025,.018),wood,.003)
 # Flat raised ink forms get baked into the shared atlas with their paper.
 for stem in range(3):
  bx=x+(stem-1)*.065;pts=[(bx,-.014,z-h*.31),(bx+.008,-.014,z),(bx-.012,-.014,z+h*.28)]
  tube('Botanical stem',pts,.0018,charcoal)
  for side in [-1,1]:
   for leaf in range(3):sphere('Botanical leaf',(bx+side*.023,-.017,z-h*.12+leaf*.06),(.025,.002,.01),olive,8,4)
# A small aged-brass wall sconce above the textile.
tube('Sconce elbow',[(0,.00,3.26),(0,-.08,3.29),(0,-.20,3.26),(0,-.24,3.19)],.009,bronze)
lathe('Milk-glass sconce shade',0,-.24,3.09,[(.092,0),(.10,.012),(.065,.075),(.035,.12)],ivory,24)
sphere('Sconce cap',(0,-.24,3.215),(.039,.039,.018),bronze,12,6)
# Join into a single draw mesh. Smart UVs retain all real relief in one baked atlas.
bpy.ops.object.select_all(action='DESELECT')
for o in props:o.select_set(True)
bpy.context.view_layer.objects.active=props[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='Heritage room - baked static furnishings'
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15192,island_margin=.006);bpy.ops.object.mode_set(mode='OBJECT')
atlas=bpy.data.images.new('Heritage room baked colour and AO',width=1024,height=1024,alpha=False);atlas.generated_color=(.06,.03,.015,1)
for m in mesh.data.materials:
 n=m.node_tree.nodes;target=n.new('ShaderNodeTexImage');target.image=atlas;n.active=target
bpy.ops.object.bake(type='EMIT',use_clear=True)
atlas.filepath_raw=OUT+'/heritage-room-atlas.png';atlas.file_format='PNG';atlas.save()
final=bpy.data.materials.new('Baked room atlas - unlit');final.use_nodes=True;n=final.node_tree.nodes;l=final.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');emit=n.new('ShaderNodeEmission');tex=n.new('ShaderNodeTexImage');tex.image=atlas;l.new(tex.outputs['Color'],emit.inputs['Color']);l.new(emit.outputs[0],out.inputs[0]);mesh.data.materials.clear();mesh.data.materials.append(final)
for f in mesh.data.polygons:f.material_index=0
triangles=sum(len(f.vertices)-2 for f in mesh.data.polygons)
assert triangles<40000,triangles
params=dict(filepath=OUT+'/heritage-room.glb',export_format='GLB',use_selection=True,export_materials='EXPORT',export_image_format='JPEG')
keys=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
if 'export_jpeg_quality' in keys:params['export_jpeg_quality']=87
bpy.ops.export_scene.gltf(**params)
path=OUT+'/heritage-room.glb'
manifest={'name':'Heritage room furnishings','license':'CC0-1.0','mesh_author':'Original Strand procedural models','triangles':triangles,'atlas_dimensions':[1024,1024],'runtime_material':'unlit baked colour + AO + upper-left diffuse shading','source_wood':'https://polyhaven.com/a/wood_table_worn','source_wood_license':'CC0-1.0','source_wood_sha256':hashlib.sha256(open('/tmp/strand-materials/wood_table_worn-Diffuse.jpg','rb').read()).hexdigest(),'model_sha256':hashlib.sha256(open(path,'rb').read()).hexdigest(),'model_bytes':os.path.getsize(path),'bake':'Cycles CPU, 24 samples, AO 12 samples, 8px margin','excluded':['chair','paid generation','runtime furniture normal maps','additional lights']}
json.dump(manifest,open(OUT+'/provenance.json','w'),indent=2)
print('ROOM_ASSET',json.dumps(manifest))
