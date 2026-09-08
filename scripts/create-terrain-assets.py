"""Original low-poly terrain. Run with Blender --background --python this file."""
import bpy, math, random, os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'apps/client/public/models/terrain'; out.mkdir(parents=True,exist_ok=True)
source=root/'assets/terrain'; source.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(7319)
def material(name,color):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1); m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95; return m
stones=[material('Granite',(.31,.35,.32)),material('Slate',(.23,.29,.29)),material('Mossy stone',(.37,.40,.26))]
bark=material('Bark',(.23,.12,.055)); leaves=[material('Pine',(.065,.20,.105)),material('Oak',(.17,.29,.075)),material('Silver pine',(.10,.25,.20))]
grasses=[material('Meadow',(.27,.39,.10)),material('Gold grass',(.43,.43,.16)),material('Fern',(.14,.31,.13))]
for kind in ['rock','tree','grass']:
 for variant in range(3):
  scene=bpy.data.scenes.new(f'{kind}-{variant}'); bpy.context.window.scene=scene
  if kind=='rock':
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1)
   o=bpy.context.object; o.name='Weathered boulder';
   for v in o.data.vertices:
    v.co*=random.uniform(.87,1.03); v.co.x*=.95; v.co.y*=.85; v.co.z=(v.co.z+1)*(.55+variant*.19)
   o.data.materials.append(stones[variant])
  elif kind=='tree':
   bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=.48,radius2=.18,depth=3.6,location=(0,0,1.8)); bpy.context.object.data.materials.append(bark)
   for j in range(3):
    if variant==1:
     bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1.45,location=((j-1)*.7,0,3.5+(j%2)*.7))
    else:
     bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=1.55-j*.3,radius2=0,depth=2.1,location=(0,0,2.6+j*.8))
    bpy.context.object.data.materials.append(leaves[variant])
  else:
   verts=[]; faces=[]
   for j in range(9+variant*3):
    a=random.random()*math.tau; x=random.uniform(-.35,.35); y=random.uniform(-.35,.35); h=random.uniform(.35,.75); w=.055; n=len(verts)
    verts.extend([(x-w*math.cos(a),y-w*math.sin(a),0),(x+w*math.cos(a),y+w*math.sin(a),0),(x+.12*math.sin(a),y+.12*math.cos(a),h*.65),(x+.25*math.sin(a),y+.25*math.cos(a),h)])
    faces.extend([(n,n+1,n+2),(n,n+2,n+3)])
   mesh=bpy.data.meshes.new('Blades');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Grass tuft',mesh);scene.collection.objects.link(o);o.data.materials.append(grasses[variant]);grasses[variant].use_backface_culling=False
  bpy.ops.export_scene.gltf(filepath=str(out/f'{kind}-{variant}.glb'),export_format='GLB',use_active_scene=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(source/'fantasy-arena-terrain.blend'))
