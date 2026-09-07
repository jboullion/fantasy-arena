"""Original Fantasy Arena rigid-part characters. Run in Blender via MCP.
Coordinates in this authoring script are game-space: meters, Y up, +Z forward.
"""
import bpy, math, json, os
from mathutils import Vector

ROOT = 'E:/2026_Experiments/fantasy-arena'
OUT = ROOT + '/apps/client/public/models'
os.makedirs(OUT, exist_ok=True)
os.makedirs(ROOT + '/assets/characters', exist_ok=True)
scene = bpy.data.scenes.new('Fantasy Arena Character Workshop')
bpy.context.window.scene = scene
scene.world = bpy.data.worlds.new('Workshop World')
scene.world.color = (0.16, 0.19, 0.23)
material = bpy.data.materials.new('Arena_VertexPalette')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .76
vertex = material.node_tree.nodes.new('ShaderNodeVertexColor')
vertex.layer_name = 'Color'
material.node_tree.links.new(vertex.outputs['Color'], bsdf.inputs['Base Color'])

def cv(p): return (p[0], -p[2], p[1])
def rgb(h):
    c = [int(h[i:i+2], 16)/255 for i in (1,3,5)]
    return tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in c)

manifest = {'version': 1, 'units': 'meters', 'forward': '+Z', 'models': {}}
class Model:
    def __init__(self, name):
        self.name=name; self.objects=[]; self.parts={}; self.vertices=[]; self.faces=[]; self.colors=[]
    def part(self, name, pivot, half, parent=None, anchor=None, role='body'):
        self.finish()
        self.current=name; self.pivot=pivot
        self.parts[name]={'position':list(pivot),'halfExtents':list(half),'role':role}
        if parent: self.parts[name].update(parent=parent,anchor=list(anchor))
    def shape(self, verts, faces, color):
        start=len(self.vertices); self.vertices.extend(verts)
        for i,f in enumerate(faces):
            self.faces.append([start+n for n in f]); self.colors.append(tuple(min(1,v*(.93+(i%3)*.035)) for v in rgb(color)))
    def box(self,p,s,c):
        x,y,z=p; a,b,d=[v/2 for v in s]
        v=[(x+i*a,y+j*b,z+k*d) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        self.shape(v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],c)
    def prism(self,p,radii,height,c,n=6,top=.8):
        x,y,z=p; rx,rz=radii
        v=[]
        for h,scale in [(-height/2,1),(height/2,top)]:
            v.extend((x+math.cos(a*2*math.pi/n)*rx*scale,y+h,z+math.sin(a*2*math.pi/n)*rz*scale) for a in range(n))
        self.shape(v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],c)
    def finish(self):
        if not self.vertices: return
        pivot=Vector(cv(self.pivot))
        mesh=bpy.data.meshes.new(self.name+'_'+self.current)
        mesh.from_pydata([Vector(cv(v))-pivot for v in self.vertices],[],self.faces); mesh.update()
        col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for poly,c in zip(mesh.polygons,self.colors):
            for index in poly.loop_indices: col.data[index].color=(*c,1)
        obj=bpy.data.objects.new(self.current,mesh); scene.collection.objects.link(obj); obj.location=pivot
        obj.data.materials.append(material); obj['physics_role']=self.parts[self.current]['role']; obj['part']=self.current
        obj['joint_parent']=self.parts[self.current].get('parent','')
        bevel=obj.modifiers.new('Hand cut edges','BEVEL'); bevel.width=.014; bevel.segments=1
        self.objects.append(obj); self.vertices=[]; self.faces=[]; self.colors=[]
    def export(self):
        self.finish()
        bpy.ops.object.select_all(action='DESELECT')
        for obj in self.objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=self.objects[0]
        bpy.ops.export_scene.gltf(filepath=OUT+'/'+self.name+'.glb',export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
        manifest['models'][self.name]={'url':'/models/'+self.name+'.glb','parts':self.parts}
        # Editable skeleton in the Blender source; runtime uses the named rigid parts.
        data=bpy.data.armatures.new(self.name+'_rig'); rig=bpy.data.objects.new(self.name+'_rig',data); scene.collection.objects.link(rig)
        bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
        for name,part in self.parts.items():
            bone=data.edit_bones.new(name); bone.head=cv(part['position']); bone.tail=Vector(bone.head)+Vector((0,0,.15))
            if part.get('parent'): bone.parent=data.edit_bones[part['parent']]
        bpy.ops.object.mode_set(mode='OBJECT'); rig.show_in_front=True
        rig.hide_render=True; self.rig=rig
        for obj,name in zip(self.objects,self.parts):
            world=obj.matrix_world.copy(); obj.parent=rig; obj.parent_type='BONE'; obj.parent_bone=name; obj.matrix_world=world
        return self

def humanoid(name):
    dwarf=name=='guardian'; goblin=name=='goblin'
    m=Model(name)
    metal='#b7c9d0' if not dwarf else '#a88652'
    cloth='#426c91' if not dwarf else '#66503c'
    skin='#e0ad80' if not goblin else '#70954b'
    leather='#43352b'; gold='#d7ad5a'; dark='#222d35'
    hip=.66 if dwarf else .77 if not goblin else .52
    chest=hip+.34; head=hip+.85 if not dwarf else hip+.71
    width=.7 if dwarf else .57 if not goblin else .44
    m.part('pelvis',(0,hip,0),(width*.47,.15,.2))
    m.prism((0,hip,0),(width*.65,.27),.28,cloth,6,top=.83)
    m.box((0,hip+.1,.01),(width+.06,.12,.4),leather)
    m.box((0,hip+.1,.225),(.15,.13,.05),gold)
    m.part('torso',(0,chest,0),(width*.5,.21,.22),'pelvis',(0,hip+.17,0))
    m.prism((0,chest,0),(width*.64,.28),.45,skin if goblin else metal,6,top=1.08)
    if not goblin:
        m.box((0,chest,.275),(width*.65,.35,.04),cloth)
        m.box((0,chest+.02,.307),(.08,.24,.025),gold)
        m.box((0,chest+.02,.308),(.22,.06,.027),gold)
        m.box((0,chest+.23,0),(width*.73,.1,.38),dark)
    else:
        m.box((-.13,chest,.265),(.16,.46,.055),leather)
        m.prism((.13,chest+.18,0),(.25,.27),.12,'#4d5353',5)
    m.part('head',(0,head,0),(.24,.24,.23),'torso',(0,head-.24,0))
    m.prism((0,head,0),(.28 if not dwarf else .31,.255),.43,skin,6,top=.94)
    m.prism((0,head+.2,-.025),(.30 if not dwarf else .34,.28),.25,metal if not goblin else '#536d38',6,top=.7)
    if not goblin:
        m.box((0,head+.1,.246),(.53 if not dwarf else .59,.105,.055),metal)
        m.box((0,head+.03,.273),(.43,.065,.04),dark)
        m.box((0,head+.04,.31),(.07,.24,.065),metal)
        if not dwarf: m.prism((0,head+.39,-.04),(.065,.22),.20,'#a34232',4,top=.7)
        for s in [-1,1]: m.box((s*.245,head-.1,.02),(.09,.23,.31),metal)
    else:
        for s in [-1,1]:
            m.shape([(s*.22,head+.14,0),(s*.65,head+.29,-.04),(s*.30,head-.05,.04),(s*.27,head+.11,.12)],[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],skin)
            m.box((s*.12,head+.045,.236),(.13,.065,.05),'#efc860')
            m.box((s*.12,head+.045,.268),(.038,.055,.015),dark)
        m.prism((0,head-.06,.27),(.12,.16),.16,skin,4,top=.65)
        m.box((0,head-.18,.23),(.27,.045,.045),dark)
        for s in [-1,1]: m.prism((s*.10,head-.14,.27),(.035,.035),.11,'#e9dfb6',4,top=0)
    # Eleven independently pivoted body pieces, with elbow and knee anchors.
    for sign,side in [(-1,'l'),(1,'r')]:
        x=sign*(width*.5+.17); shoulder=chest+.13; elbow=shoulder-.30
        m.part('upper_arm_'+side,(x,shoulder-.13,0),(.13,.17,.15),'torso',(x,shoulder,0))
        m.prism((x,shoulder-.13,0),(.16,.17),.34,skin if goblin else cloth,5)
        if not goblin: m.prism((x,shoulder+.035,0),(.23 if dwarf else .2,.23),.18,metal,5,top=.75)
        m.part('forearm_'+side,(x,elbow-.14,.015),(.12,.16,.13),'upper_arm_'+side,(x,elbow,0))
        m.prism((x,elbow-.14,.015),(.13,.14),.29,leather if goblin else metal,5)
        m.box((x,elbow-.30,.04),(.21,.16,.22),skin if goblin else leather)
        tx=sign*width*.30; knee=hip*.50
        m.part('thigh_'+side,(tx,(hip+knee)/2-.04,0),(.13,(hip-knee)/2,.15),'pelvis',(tx,hip-.1,0))
        m.prism((tx,(hip+knee)/2-.04,0),(.15,.17),hip-knee,skin if goblin else cloth,5)
        m.part('shin_'+side,(tx,knee*.5,0),(.13,knee*.5,.16),'thigh_'+side,(tx,knee,0))
        m.prism((tx,knee*.5,0),(.125,.14),knee*.9,skin if goblin else metal,5)
        m.box((tx,.08,.10),(.27,.16,.40),leather)
    handx=width*.5+.17; handy=chest+.13-.60
    m.part('weapon',(handx,handy,.15),(.07,.055,.5),role='weapon')
    m.box((handx,handy,.22),(.09,.10,.34),leather)
    m.box((handx,handy,.39),(.40,.105,.08),gold if not goblin else '#77736a')
    length=.82 if goblin else 1.15
    m.shape([(handx-.075,handy,.44),(handx+.075,handy,.44),(handx+.075,handy,.44+length*.8),(handx,handy,.44+length),(handx-.075,handy,.44+length*.8),(handx,handy+.055,.44),(handx,handy+.045,.44+length*.8)],[(0,1,5),(1,2,6,5),(2,3,6),(3,4,6),(4,0,5,6),(4,3,2,1,0)],'#c6d8dc' if not goblin else '#92948a')
    if not goblin:
        m.part('shield',(-handx,handy+.12,.22),(.27,.33,.065),role='weapon')
        m.prism((-handx,handy+.12,.22),(.3,.08),.62,metal,6,top=1.06)
        m.box((-handx,handy+.13,.31),(.41,.44,.035),cloth)
        m.box((-handx,handy+.13,.34),(.075,.36,.035),gold)
        m.box((-handx,handy+.13,.34),(.30,.07,.035),gold)
    if dwarf:
        m.part('beard_upper',(0,head-.27,.31),(.20,.18,.09),'head',(0,head-.11,.26),role='accessory')
        m.prism((0,head-.27,.31),(.24,.12),.32,'#a75c32',6,top=1.05)
        for s in [-1,1]: m.prism((s*.11,head-.25,.41),(.075,.045),.30,'#cb8246',5)
        m.part('beard_tip',(0,head-.53,.33),(.13,.14,.08),'beard_upper',(0,head-.42,.33),role='accessory')
        m.prism((0,head-.53,.33),(.075,.075),.26,'#a75c32',5,top=2.1)
        m.prism((0,head-.55,.33),(.105,.085),.065,gold,6,top=1)
    elif not goblin:
        m.part('scabbard',(-.32,hip-.22,-.23),(.075,.31,.055),'pelvis',(-.32,hip+.04,-.23),role='accessory')
        m.box((-.32,hip-.22,-.23),(.13,.59,.105),leather)
        for y in [hip+.04,hip-.48]: m.box((-.32,y,-.23),(.16,.065,.13),gold)
    return m.export()

models=[humanoid(name) for name in ['warrior','guardian','goblin']]
with open(OUT+'/manifest.json','w') as f: json.dump(manifest,f,indent=2)
for m,offset in zip(models,[-2.2,0,2.2]):
    m.rig.location.x=offset
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=1500; scene.render.resolution_y=950; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=200); floor=bpy.context.object
floor.name='Workshop Floor'; floor.location.z=-.035
mat=bpy.data.materials.new('Workshop Slate'); mat.diffuse_color=(.065,.085,.10,1); floor.data.materials.append(mat)
for loc,power,size in [((1,-4,7),1200,6),((-4,-1,4),750,5),((2,4,5),1500,4)]:
    data=bpy.data.lights.new('Softbox','AREA'); data.energy=power; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new('Softbox',data); scene.collection.objects.link(obj); obj.location=loc
    obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Character lineup'); camera=bpy.data.objects.new('Character lineup',data); scene.collection.objects.link(camera)
camera.location=(5,-9,5); camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler(); data.type='ORTHO'; data.ortho_scale=7.4; scene.camera=camera
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/characters/fantasy-arena-characters.blend',copy=True)
scene.render.filepath=ROOT+'/assets/characters/lineup.png'
print('Exported warrior, guardian, goblin and named physics manifest. Source scene preserved separately.')
