"""Original modular weapons; run in Blender MCP with the expanded roster open."""
import bpy, json, math, os
from mathutils import Vector
ROOT='E:/2026_Experiments/fantasy-arena'
# Reuse the project's mesh palette/export contract, with an isolated armory scene.
exec(compile(open(ROOT+'/scripts/create-roster-assets.py',encoding='utf-8').read().split('models=[')[0],'roster-builder','exec'))
scene.name='Elemental Armory'
OUT=ROOT+'/apps/client/public/models/weapons';os.makedirs(OUT,exist_ok=True)
colors={'fire':('#e26b34','#ffbd57'),'lightning':('#7864ba','#ece0ff'),'ice':('#589eb4','#adf5ff'),'acid':('#5b813d','#beef57')}
models=[]
def gem(m,p,r,h,color): m.prism(p,(r,r),h,color,5,top=.05)
for row,kind in enumerate(['warrior','guardian','archer','mage']):
    for col,element in enumerate(colors):
        metal,glow=colors[element];wood='#584331';gold='#b99455'
        name=kind+'_'+element;m=Model(name)
        m.part('weapon',(0,0,0),(.3,.6,.6),role='weapon')
        if kind=='warrior':
            m.box((0,0,.06),(.10,.12,.31),wood)
            m.box((0,0,.24),(.44,.12,.10),gold)
            width=.12 if element!='ice' else .09
            m.shape([(-width,0,.30),(width,0,.30),(width,0,1.18),(0,0,1.43),(-width,0,1.18),(0,.08,.30),(0,.055,1.18)],[(0,1,5),(1,2,6,5),(2,3,6),(3,4,6),(4,0,5,6),(4,3,2,1,0)],metal)
            m.beam((0,.083,.36),(0,.062,1.17),.022,glow)
            for side in [-1,1]:
                if element=='fire': gem(m,(side*.19,0,.32),.07,.23,glow)
                elif element=='lightning': m.beam((side*.08,.09,.6),(side*.25,.09,.85),.035,glow);m.beam((side*.25,.09,.85),(side*.08,.09,1.05),.035,glow)
                elif element=='ice': gem(m,(side*.14,0,.34),.08,.32,glow)
                else:
                    for z in [.52,.76,1.0]: m.shape([(side*.10,0,z),(side*.24,0,z+.1),(side*.1,0,z+.15),(side*.10,.055,z+.07)],[(0,1,2),(0,3,1),(1,3,2),(2,3,0)],glow)
        elif kind=='guardian':
            m.box((0,0,.40),(.11,.12,1.05),wood)
            m.box((0,0,.85),(.20,.18,.18),gold)
            for side in [-1,1]:
                tip=.56 if element!='ice' else .47
                m.shape([(side*.05,-.055,.62),(side*.05,-.055,1.0),(side*tip,-.04,1.20),(side*(tip+.06),-.04,.63),(side*.05,.055,.62),(side*.05,.055,1.0),(side*tip,.04,1.20),(side*(tip+.06),.04,.63)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],metal)
                m.beam((side*(tip+.02),.065,.66),(side*tip,.065,1.14),.03,glow)
                if element in ['ice','fire']: gem(m,(side*.28,.04,1.09),.085,.30,glow)
                elif element=='lightning': m.beam((side*.12,.09,.8),(side*.39,.09,1.0),.045,glow)
                else: m.prism((side*.3,.07,.88),(.11,.11),.13,glow,6,top=.7)
        elif kind=='archer':
            ys=[-.72,-.52,-.27,0,.27,.52,.72]
            points=[(0,y,.08+.35*(1-(y/.72)**2)+(0.08 if element=='lightning' and i%2 else 0)) for i,y in enumerate(ys)]
            for a,b in zip(points,points[1:]):m.beam(a,b,.065,metal)
            m.beam(points[0],points[-1],.012,glow)
            m.box((0,0,.42),(.10,.23,.11),wood)
            for sign in [-1,1]:
                if element=='ice': gem(m,(0,sign*.52,.3),.10,.26,glow)
                elif element=='fire':gem(m,(0,sign*.62,.2),.08,.22,glow)
                elif element=='acid':m.prism((0,sign*.4,.36),(.105,.105),.15,glow,6,top=.8)
                else:m.beam((0,sign*.27,.42),(.15,sign*.39,.30),.035,glow)
        else:
            m.prism((0,.16,.05),(.055,.055),1.7,wood,6,top=.9)
            for y in [-.56,.25,.87]:m.prism((0,y,.05),(.08,.08),.08,gold,6,top=1)
            if element=='fire':
                for x,h in [(-.12,.23),(0,.43),(.12,.27)]:gem(m,(x,1.08,.05),.10,h,glow)
            elif element=='lightning':
                for a,b in [((-.15,.9,.05),(.1,1.13,.05)),((.1,1.13,.05),(-.08,1.13,.05)),((-.08,1.13,.05),(.17,1.38,.05))]:m.beam(a,b,.065,glow)
            elif element=='ice':
                for x,h in [(-.13,.28),(0,.49),(.13,.25)]:gem(m,(x,1.12,.05),.105,h,glow)
            else:
                m.prism((0,1.08,.05),(.22,.22),.28,glow,8,top=.7)
                m.prism((0,.92,.05),(.23,.23),.1,metal,8,top=1)
                gem(m,(.13,1.30,.05),.08,.18,glow)
        model=m.export();manifest['models'][name]['url']='/models/weapons/'+name+'.glb'
        model.rig.location=(col*2.0-3,row*2.6-3.9,.8 if kind in ['archer','mage'] else .2)
        models.append(model)
with open(ROOT+'/apps/client/public/models/manifest.json') as f: full=json.load(f)
full['models'].update(manifest['models'])
with open(ROOT+'/apps/client/public/models/manifest.json','w') as f:json.dump(full,f,indent=2)
with bpy.context.temp_override(scene=scene,view_layer=scene.view_layers[0]):
    bpy.ops.mesh.primitive_plane_add(size=40);floor=bpy.context.object;floor.name='Armory Floor';floor.location.z=-.12
    mat=bpy.data.materials.new('Armory Slate');mat.diffuse_color=(.06,.085,.11,1);floor.data.materials.append(mat)
for loc,power,size in [((0,-4,12),2200,8),((-7,0,5),1600,7),((4,6,9),2200,6)]:
    data=bpy.data.lights.new('Armory Softbox','AREA');data.energy=power;data.size=size
    obj=bpy.data.objects.new('Armory Softbox',data);scene.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Armory Camera');camera=bpy.data.objects.new('Armory Camera',data);scene.collection.objects.link(camera)
camera.location=(8,-13,15);camera.rotation_euler=(Vector((0,0,.3))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=13.5;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.filepath=ROOT+'/assets/characters/elemental-armory.png'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/characters/fantasy-arena-roster.blend')
print('Exported 16 modular elemental weapons and saved Elemental Armory in roster blend.')
