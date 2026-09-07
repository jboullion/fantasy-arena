"""Original low-poly environments, generated through Blender MCP. Coordinates: metres."""
import bpy, math, os
ROOT = 'E:/2026_Experiments/fantasy-arena'
scene = bpy.data.scenes.new('Fantasy Arena Environments')
bpy.context.window.scene = scene
def mat(name, color):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True; m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*color, 1); m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .85; return m
wood=mat('Oak',(.23,.105,.045)); plank=mat('Honey oak',(.39,.22,.10)); stone=mat('Hearth stone',(.27,.29,.27)); plaster=mat('Warm plaster',(.57,.43,.28)); green=mat('Pine needles',(.055,.17,.12)); earth=mat('Forest earth',(.10,.16,.11)); iron=mat('Iron',(.09,.10,.10)); gold=mat('Brass',(.65,.39,.10))
def box(name, p, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p); o=bpy.context.object; o.name=name; o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); return o
def cylinder(name,p,r,depth,material,vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=p); o=bpy.context.object; o.name=name; o.data.materials.append(material); return o
def export(name):
    path=f'{ROOT}/apps/client/public/models/environments/{name}.glb'
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_active_scene=True)
    print(name,len(scene.objects),os.path.getsize(path))
for i in range(28): box('Floor plank',(i*.5-6.75,0,-.12),(.48,12,.24),plank if i%3 else wood)
box('Back plaster',(0,5.8,2.5),(14,.25,5),plaster)
for x in [-6.8,6.8]: box('Side wall',(x,0,2.5),(.25,12,5),plaster)
for x in [-6.6,-3.3,0,3.3,6.6]: box('Timber post',(x,5.5,2.5),(.28,.35,5),wood)
for z in [.4,3.5,4.9]: box('Wall beam',(0,5.5,z),(13.5,.3,.23),wood)
box('Bar',(3,3.9,.7),(4,1.1,1.4),wood); box('Bar counter',(3,3.9,1.45),(4.3,1.4,.18),plank)
for z in [2.1,3.0]:
    box('Bottle shelf',(3,5.35,z),(4,.6,.13),wood)
    for i in range(7): cylinder('Bottle',(1.4+i*.49,5.3,z+.22),.10,.35,green if i%2 else gold)
box('Hearth base',(-3.6,4.5,.18),(3,2.1,.35),stone)
for x in [-4.7,-2.5]: box('Hearth pillar',(x,4.8,1.2),(.55,1.2,2.2),stone)
box('Mantel',(-3.6,4.8,2.3),(3,1.4,.35),stone)
box('Dark hearth',(-3.6,5.35,1.1),(1.7,.15,1.8),iron)
for x,y in [(-4,-1),(4,-1)]:
    cylinder('Round table',(x,y,1.0),1.05,.15,plank); cylinder('Table leg',(x,y,.48),.17,.95,wood)
    for a in [0,2.1,4.2]:
        sx=x+math.cos(a)*1.5; sy=y+math.sin(a)*1.5
        cylinder('Stool',(sx,sy,.52),.38,.16,plank); cylinder('Stool leg',(sx,sy,.24),.12,.48,wood)
for x in [-5.7,5.7]:
    cylinder('Barrel',(x,3.7,.6),.53,1.2,plank)
    for z in [.2,1]: cylinder('Barrel band',(x,3.7,z),.55,.09,iron)
export('tavern')
# A separate scene keeps the tavern and the user's existing workshop intact.
scene=bpy.data.scenes.new('Fantasy Arena Campfire'); bpy.context.window.scene=scene
cylinder('Clearing',(0,0,-.12),15,.2,earth,48)
for i in range(32):
    a=i*2.39996; r=7+(i%5)*1.3; x=math.cos(a)*r; y=math.sin(a)*r
    if y < -2.5: continue # Open foreground for the menu camera.
    cylinder('Pine trunk',(x,y,1.5),.22,3,wood)
    for j in range(3):
        bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=1.8-j*.35,depth=2.8,location=(x,y,2.4+j*.85)); bpy.context.object.data.materials.append(green)
for i in range(12):
    a=i*math.tau/12; bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.25,location=(math.cos(a)*1.05,math.sin(a)*1.05,.16)); bpy.context.object.data.materials.append(stone)
for a in [0,1.5,3]:
    o=box('Firewood',(0,0,.18),(1.5,.22,.22),wood);o.rotation_euler.z=a
for x,y in [(-2.4,-.8),(-1,2.3),(1,2.3),(2.4,-.8)]:
    o=cylinder('Seat log',(x,y,.35),.36,1.4,wood);o.rotation_euler.y=math.pi/2
export('campfire')
