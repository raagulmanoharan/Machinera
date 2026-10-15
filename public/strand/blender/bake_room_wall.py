"""Bake a warm, worn limewash colour map from the existing CC0 plaster scan."""
import bpy,json,hashlib,os
OUT='/workspace/public/assets/room';os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_plane_add(size=2);plane=bpy.context.object
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
m=bpy.data.materials.new('Aged warm limewash');m.use_nodes=True;plane.data.materials.append(m);n=m.node_tree.nodes;l=m.node_tree.links;n.clear()
out=n.new('ShaderNodeOutputMaterial');emit=n.new('ShaderNodeEmission');l.new(emit.outputs[0],out.inputs[0]);coord=n.new('ShaderNodeTexCoord')
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4.4;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.65;l.new(coord.outputs['UV'],noise.inputs['Vector'])
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.27;ramp.color_ramp.elements[0].color=(.48,.35,.23,1);ramp.color_ramp.elements[1].position=.68;ramp.color_ramp.elements[1].color=(.78,.70,.58,1);l.new(noise.outputs['Fac'],ramp.inputs[0])
source=bpy.data.images.load('/tmp/strand-materials/painted_plaster_wall-Diffuse.jpg');tex=n.new('ShaderNodeTexImage');tex.image=source;l.new(coord.outputs['UV'],tex.inputs['Vector'])
bw=n.new('ShaderNodeRGBToBW');l.new(tex.outputs['Color'],bw.inputs[0]);range=n.new('ShaderNodeMapRange');range.inputs['To Min'].default_value=.84;range.inputs['To Max'].default_value=1.12;l.new(bw.outputs[0],range.inputs[0]);mul=n.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;l.new(ramp.outputs[0],mul.inputs[1]);l.new(range.outputs[0],mul.inputs[2]);l.new(mul.outputs[0],emit.inputs[0])
image=bpy.data.images.new('Baked limewash patina',width=1024,height=1024,alpha=False);target=n.new('ShaderNodeTexImage');target.image=image;n.active=target
bpy.ops.object.bake(type='EMIT',margin=4);image.filepath_raw=OUT+'/wall-patina.jpg';image.file_format='JPEG';scene.render.image_settings.quality=90;image.save()
path=OUT+'/provenance.json';meta=json.load(open(path));meta['wall_map']={'path':'wall-patina.jpg','license':'CC0-1.0','source':'https://polyhaven.com/a/painted_plaster_wall','source_sha256':hashlib.sha256(open('/tmp/strand-materials/painted_plaster_wall-Diffuse.jpg','rb').read()).hexdigest(),'bake':'Original procedural limewash patina multiplied by scanned plaster detail, Cycles emission bake','sha256':hashlib.sha256(open(OUT+'/wall-patina.jpg','rb').read()).hexdigest()};json.dump(meta,open(path,'w'),indent=2)
print('WALL_BAKE_COMPLETE',os.path.getsize(OUT+'/wall-patina.jpg'))
