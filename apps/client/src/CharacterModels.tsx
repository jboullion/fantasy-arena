import { createRef, memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider, useRevoluteJoint, useSphericalJoint, useRapier, useAfterPhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Actor, Player } from '@arena/game-core';
import { enemyTypes, isRanged, getWeapon, elements, type WeaponId, type Element, type CharacterId, type EnemyType } from '@arena/game-data';
import data from '../public/models/manifest.json';
import { networked, useNetwork } from './network';
import { effects, sim, useUI, projectileMotion } from './runtime';

type V3 = [number, number, number];
type Kind = CharacterId | EnemyType | 'arrow' | 'magic_missile' | WeaponId;
type Part = { position: V3; halfExtents: V3; role: string; parent?: string; anchor?: V3 };
type Definition = { url: string; parts: Record<string, Part> };
type Model = { definition: Definition; meshes: Record<string, THREE.Mesh> };
const definitions = data.models as unknown as Record<Kind, Definition>;
const rotation = new THREE.Matrix4(), translation = new THREE.Matrix4();
const axisX = new THREE.Vector3(1, 0, 0);
const axisY = new THREE.Vector3(0, 1, 0);
const minus = (a: V3, b: V3): V3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const tuple = (p: THREE.Vector3): V3 => [p.x, p.y, p.z];
const accessoryLimit = (name: string) => name === 'hat_tip' ? .18 : name === 'beard_tip' ? .12 : .10;
// Local-space snapshots survive removal of an enemy from the live roster.
const deathPoses = new Map<string, {url:string; time:number; poses:Record<string,THREE.Matrix4>}>();
function rememberPose(key:string, model:Model, matrices:Record<string,THREE.Matrix4>) {
  let entry=deathPoses.get(key);
  if(!entry || entry.url!==model.definition.url) entry={url:model.definition.url,time:0,poses:{}};
  entry.time=performance.now();
  for(const [name,matrix] of Object.entries(matrices)) (entry.poses[name]??=new THREE.Matrix4()).copy(matrix);
  deathPoses.delete(key);deathPoses.set(key,entry);
  if(deathPoses.size>600) deathPoses.delete(deathPoses.keys().next().value!);
}

function useModel(kind: Kind): Model {
  const definition = definitions[(getWeapon(kind)?.model??kind) as Kind];
  const gltf = useLoader(GLTFLoader, definition.url);
  return useMemo(() => {
    const meshes: Record<string, THREE.Mesh> = {};
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.userData.part) meshes[object.userData.part] = object;
    });
    for (const name of Object.keys(definition.parts)) if (!meshes[name]) throw new Error(`Missing ${kind} model part: ${name}`);
    return { definition, meshes };
  }, [gltf, kind]);
}

function useHeroModel(character: CharacterId, equipped?: WeaponId): Model {
  const base=useModel(character),gear=useModel(equipped??character);
  return useMemo(()=>equipped ? {...base,meshes:{...base.meshes,weapon:gear.meshes.weapon}} : base,[base,gear,equipped]);
}

function WeaponParticles({element,origin,parentMatrix}:{element:Element;origin:V3;parentMatrix?:()=>THREE.Matrix4|undefined}) {
  const mesh=useRef<THREE.InstancedMesh>(null!);
  const scratch=useMemo(()=>({object:new THREE.Object3D(),out:new THREE.Matrix4()}),[]);
  useFrame(({clock})=>{
    const {object,out}=scratch,t=clock.elapsedTime;
    const parent=parentMatrix?.();
    for(let i=0;i<18;i++) {
      const age=(t*(element==='lightning'?3:1.2)+i/18)%1,a=i*2.4;
      object.position.set(origin[0]+Math.cos(a+t)*.12*age,origin[1]+(element==='poison'?-age*.35:age*.4),origin[2]+Math.sin(a+t)*.12*age);
      const size=(1-age)*.045;
      object.scale.set(size,element==='lightning'?size*5:size,element==='ice'?size*2:size);
      object.rotation.set(t+i,a,element==='lightning'?Math.sin(t*30+i)*1.3:t);
      object.updateMatrix();out.copy(object.matrix);if(parent)out.premultiply(parent);
      mesh.current.setMatrixAt(i,out);
    }
    mesh.current.instanceMatrix.needsUpdate=true;
  });
  return <instancedMesh name={`weapon-particles-${element}`} ref={mesh} args={[undefined,undefined,18]} frustumCulled={false}><octahedronGeometry args={[1]}/><meshBasicMaterial color={elements[element].color} toneMapped={false} transparent opacity={.85} depthWrite={false}/></instancedMesh>;
}

// Shared joint-space walk pose. No animation values enter the combat simulation.
function pose(model: Model, actor: Actor, matrices: Record<string, THREE.Matrix4>, seated = false, accessoryAngle = 0) {
  const speed = Math.min(1, Math.hypot(actor.vx, actor.vz) / 3);
  const stride = Math.sin(sim.time * 11 + actor.id) * .43 * speed;
  const player = actor as Player;
  for (const [name, part] of Object.entries(model.definition.parts)) {
    const matrix = matrices[name] ??= new THREE.Matrix4();
    let parent = part.parent, anchor = part.anchor;
    if (name === 'weapon') { parent = 'forearm_r'; anchor = part.position; }
    if (name === 'shield') { parent = 'forearm_l'; anchor = part.position; }
    if (!parent || !anchor) { matrix.makeTranslation(...part.position); continue; }
    let angle = part.role === 'accessory' ? accessoryAngle : 0;
    if (name.startsWith('thigh_')) angle = name.endsWith('_l') ? stride : -stride;
    if (name.startsWith('shin_')) angle = Math.max(0, name.endsWith('_l') ? -stride : stride) * .8;
    if (name.startsWith('upper_arm_')) angle = (name.endsWith('_l') ? -stride : stride) * .95;
    if (name.startsWith('forearm_')) angle = -.15-Math.abs(stride)*.4;
    if (seated && name.startsWith('thigh_')) angle = -Math.PI / 2;
    if (seated && name.startsWith('shin_')) angle = Math.PI / 2;
    const follow = player.swing > 0 ? player.swing/.23 : actor.enemyType && actor.cooldown > 0 ? Math.max(0,1-(sim.config.contactCooldown-actor.cooldown)/.23) : 0;
    if (!seated && name === 'upper_arm_r') {
      if(actor.windup > 0) angle=-1.15;
      else if(follow>0) angle=-1.15+1.8*(1-Math.min(1,follow));
    }
    if (!seated && player.character && isRanged(player.character) && name === 'upper_arm_r') angle = player.character === 'archer' ? -.65 : -.25;
    if (!seated && player.character === 'archer' && name === 'forearm_l' && (actor.windup > 0 || player.swing > 0)) angle = -1.2;
    matrix.copy(matrices[parent]);
    matrix.multiply(translation.makeTranslation(...minus(anchor, model.definition.parts[parent].position)));
    matrix.multiply(rotation.makeRotationX(angle));
    if (name === 'weapon' && !(player.character && isRanged(player.character))) matrix.multiply(rotation.makeRotationY(player.swing > 0 ? -1.0 + (1-player.swing/.23)*2.0 : actor.windup > 0 ? -.8 : .12));
    matrix.multiply(translation.makeTranslation(...minus(part.position, anchor)));
  }
}

function Hinge({ a, b, anchorA, anchorB, limits = [-.65, .65], spring = false }: { a: RefObject<RapierRigidBody>; b: RefObject<RapierRigidBody>; anchorA: V3; anchorB: V3; limits?: [number, number]; spring?: boolean }) {
  const joint = useRevoluteJoint(a, b, [anchorA, anchorB, [1, 0, 0], limits]);
  useEffect(() => { if (spring) joint.current?.configureMotorPosition(0, 8, 1.5); }, [joint, spring]);
  return null;
}
function Shoulder({a,b,anchorA,anchorB}:{a:RefObject<RapierRigidBody>;b:RefObject<RapierRigidBody>;anchorA:V3;anchorB:V3}) {
  useSphericalJoint(a,b,[anchorA,anchorB]);
  return null;
}

const Accessories = memo(function Accessories({ model, playerId }: { model: Model; playerId: number }) {
  const root = useRef<RapierRigidBody>(null!);
  const player = sim.players.find(p => p.id === playerId) ?? {x:0,z:0,facing:0};
  const accessories = useMemo(() => Object.entries(model.definition.parts).filter(([,p]) => p.role === 'accessory'), [model]);
  const refs = useMemo(() => Object.fromEntries(accessories.map(([name]) => [name, createRef<RapierRigidBody>() as RefObject<RapierRigidBody>])), [accessories]);
  const initial = useMemo(() => {
    const q = new THREE.Quaternion().setFromAxisAngle(axisY, player.facing);
    return Object.fromEntries(accessories.map(([name, part]) => [name, tuple(new THREE.Vector3(...part.position).applyQuaternion(q).add(new THREE.Vector3(player.x, 0, player.z)))]));
  }, []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const constraint = useMemo(() => ({ current: new THREE.Quaternion(), parent: new THREE.Quaternion(), relative: new THREE.Quaternion(), bounded: new THREE.Quaternion(), position: new THREE.Vector3(), offset: new THREE.Vector3() }), []);
  useAfterPhysicsStep(() => {
    // Sudden facing changes can briefly overwhelm Rapier's iterative joint limits.
    // Project cosmetic attachments back onto their bounded hinge, preserving the anchor.
    for (const [name, part] of accessories) {
      const body=refs[name].current, parent=refs[part.parent!]?.current ?? root.current;
      if (!body || !parent) continue;
      const c=constraint, q=c.current.copy(body.rotation());
      c.parent.copy(parent.rotation());
      c.relative.copy(c.parent).invert().multiply(q);
      const angle=2*Math.atan2(c.relative.x,c.relative.w);
      const wrapped=Math.atan2(Math.sin(angle),Math.cos(angle));
      const bounded=THREE.MathUtils.clamp(wrapped,-accessoryLimit(name),accessoryLimit(name));
      c.bounded.setFromAxisAngle(axisX,bounded).premultiply(c.parent);
      const anchorA=refs[part.parent!] ? minus(part.anchor!,model.definition.parts[part.parent!].position) : part.anchor!;
      c.position.set(...anchorA).applyQuaternion(c.parent).add(parent.translation());
      c.offset.set(...minus(part.anchor!,part.position)).applyQuaternion(c.bounded);
      c.position.sub(c.offset);
      if (1-Math.abs(c.bounded.dot(q))>.000001 || c.position.distanceTo(body.translation())>.005) {
        body.setRotation(c.bounded,true);body.setTranslation(c.position,true);
        // Discard solver energy from a violated limit, rather than bouncing off it.
        body.setAngvel(parent.angvel(),true);body.setLinvel(parent.linvel(),true);
      }
    }
  });
  useFrame(({clock}) => {
    const p = sim.players.find(p => p.id === playerId);
    if (!p || !root.current) return;
    const jumping = useNetwork.getState().lobby?.stage === 'won';
    root.current.setNextKinematicTranslation({ x: p.x, y: jumping ? Math.abs(Math.sin(clock.elapsedTime * 5 + p.id)) * .65 : 0, z: p.z });
    root.current.setNextKinematicRotation(quaternion.setFromAxisAngle(axisY, p.facing));
  });
  return <>
    <RigidBody ref={root} type="kinematicPosition" position={[player.x,0,player.z]} rotation={[0,player.facing,0]} colliders={false}/>
    {accessories.map(([name, part]) => {
      const parentIsAccessory = !!refs[part.parent!];
      const anchor = part.anchor!;
      return <group key={name}>
        <RigidBody ref={refs[name]} userData={{part:name,role:'accessory'}} position={initial[name]} rotation={[0,player.facing,0]} colliders={false} angularDamping={9} linearDamping={3} canSleep={false}>
          <CuboidCollider args={part.halfExtents} mass={.08} collisionGroups={0}/>
          <mesh name={`accessory-${name}`} geometry={model.meshes[name].geometry} material={model.meshes[name].material} castShadow/>
        </RigidBody>
        <Hinge a={parentIsAccessory ? refs[part.parent!] : root} b={refs[name]} anchorA={parentIsAccessory ? minus(anchor, model.definition.parts[part.parent!].position) : anchor} anchorB={minus(anchor,part.position)} limits={[-accessoryLimit(name),accessoryLimit(name)]} spring/>
      </group>;
    })}
  </>;
});

function AlivePlayer({ playerId, model }: { playerId: number; model: Model }) {
  const group = useRef<THREE.Group>(null!);
  const arc = useRef<THREE.Mesh>(null!);
  const objects = useRef<Record<string, THREE.Mesh>>({});
  const matrices = useMemo(() => ({} as Record<string, THREE.Matrix4>), []);
  const weapon=getWeapon(sim.players.find(p=>p.id===playerId)?.equippedWeapon);
  useFrame(({clock}) => {
    const p = sim.players.find(p => p.id === playerId); if (!p || !group.current) return;
    const won = useNetwork.getState().lobby?.stage === 'won';
    group.current.position.set(p.x, won ? Math.abs(Math.sin(clock.elapsedTime * 5 + p.id)) * .65 : 0, p.z); group.current.rotation.y=p.facing;
    pose(model, won ? {...p, vx: 0, vz: 0, swing: 0, windup: 0} : p, matrices);
    if(p.hp>0) rememberPose(`player:${playerId}`,model,matrices);
    for (const [name, object] of Object.entries(objects.current)) object.matrix.copy(matrices[name]);
    arc.current.visible=sim.phase === 'playing' && p.swing>0 && !isRanged(p.character);
    (arc.current.material as THREE.MeshBasicMaterial).opacity=p.swing/.23*.65;
  });
  return <>
    <group ref={group} name={`player-model-${playerId}`}>
      {Object.entries(model.meshes).filter(([name])=>model.definition.parts[name].role!=='accessory').map(([name, mesh]) => <mesh name={`equipped-${name}`} userData={{equipment:name==='weapon'?weapon?.id:undefined}} key={name} ref={o=>{if(o)objects.current[name]=o;}} matrixAutoUpdate={false} geometry={mesh.geometry} material={mesh.material} castShadow/>) }
      {weapon&&<WeaponParticles element={weapon.element} origin={weapon.effectOrigin} parentMatrix={()=>matrices.weapon}/>}
      <mesh rotation-x={-Math.PI/2} position-y={.035}><ringGeometry args={[.55,.6,32]}/><meshBasicMaterial color="#cdeee1" transparent opacity={.6}/></mesh>
      <mesh ref={arc} rotation-x={-Math.PI/2} position-y={.65}><ringGeometry args={[sim.config.swordRange-.5,sim.config.swordRange,40,1,-Math.PI/2-sim.config.swordArc*Math.PI/360,sim.config.swordArc*Math.PI/180]}/><meshBasicMaterial color="#fff0bd" side={THREE.DoubleSide} transparent depthWrite={false}/></mesh>
    </group>
    <Accessories key={model.definition.url} model={model} playerId={playerId}/>
  </>;
}

export function PlayerModel({ playerId }: { playerId: number }) {
  const player=sim.players.find(p=>p.id===playerId);
  const model=useHeroModel(player?.character ?? 'warrior',player?.equippedWeapon);
  // A departure can arrive after Scene renders but before this child resumes.
  const won = useNetwork(s => s.lobby?.stage === 'won');
  if (!player) return null;
  return player.hp<=0 && !won ? <Ragdoll poseKey={`player:${playerId}`} model={model} x={player.x} z={player.z} facing={player.facing} scale={1} seed={player.id}/> : <AlivePlayer key={model.definition.url} model={model} playerId={playerId}/>;
}

export function ModelHorde() {
  return <>{(Object.keys(enemyTypes) as EnemyType[]).map(kind => <HordeKind key={kind} kind={kind}/>)}<StatusParticles/></>;
}
function StatusParticles() {
  const mesh=useRef<THREE.InstancedMesh>(null!);
  const scratch=useMemo(()=>({object:new THREE.Object3D(),color:new THREE.Color()}),[]);
  useFrame(({clock})=>{
    let count=0;const {object,color}=scratch,t=clock.elapsedTime;
    for(const e of sim.enemies) for(const element of ['fire','poison','ice'] as const) {
      const active=element==='fire'?!!e.burn:element==='poison'?(e.poisoned??0)>0:(e.chilled??0)>0;
      if(!active || useNetwork.getState().lobby?.stage==='won')continue;
      color.set(elements[element].color);
      for(let i=0;i<6 && count<3600;i++) {
        const age=(t+i/6)%1,a=t+i*2.4+e.id;
        object.position.set(e.x+Math.cos(a)*.4,element==='fire'?.2+age*1.3:element==='ice'?.15+Math.sin(a)*.07:.8-age*.5,e.z+Math.sin(a)*.4);
        object.scale.setScalar(.035*(1-age)+.015);object.rotation.set(a,t,0);object.updateMatrix();
        mesh.current.setMatrixAt(count,object.matrix);mesh.current.setColorAt(count++,color);
      }
    }
    mesh.current.count=count;mesh.current.instanceMatrix.needsUpdate=true;
    if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  });
  return <instancedMesh name="status-particles" ref={mesh} args={[undefined,undefined,3600]} frustumCulled={false}><octahedronGeometry args={[1]}/><meshBasicMaterial toneMapped={false} transparent opacity={.8} depthWrite={false}/></instancedMesh>;
}
function HordeKind({kind}:{kind:EnemyType}) {
  const model=useModel(kind);
  const springs = useRef(new Map<number, {x:number;z:number;angle:number;velocity:number}>());
  const instances=useRef<Record<string,THREE.InstancedMesh>>({});
  const warning=useRef<THREE.InstancedMesh>(null!), marker=useRef<THREE.Mesh>(null!);
  const scratch=useMemo(()=>({root:new THREE.Matrix4(),out:new THREE.Matrix4(),q:new THREE.Quaternion(),p:new THREE.Vector3(),s:new THREE.Vector3(),color:new THREE.Color(),poses:[] as Record<string,THREE.Matrix4>[]}),[]);
  useFrame((_,delta)=>{
    const {root,out,q,p,s,color,poses}=scratch;
    const enemies=useNetwork.getState().lobby?.stage === 'won' ? [] : sim.enemies.filter(e => (e.enemyType ?? 'goblin') === kind).slice(0,500);
    for(const mesh of Object.values(instances.current)) mesh.count=enemies.length;
    enemies.forEach((e,i)=>{
      const definition=enemyTypes[e.enemyType??'goblin'], size=definition.scale;
      root.compose(p.set(e.x,0,e.z),q.setFromAxisAngle(axisY,e.facing),s.setScalar(size));
      const state = springs.current.get(e.id) ?? {x:e.x,z:e.z,angle:0,velocity:0};
      const dt = Math.min(delta,.04);
      if (sim.phase === 'playing' && dt > 0) {
        const forward = ((e.x-state.x)*Math.sin(e.facing)+(e.z-state.z)*Math.cos(e.facing))/Math.max(delta,.001);
        state.velocity += (-35*state.angle-7*state.velocity-forward*.7)*dt;
        state.angle = THREE.MathUtils.clamp(state.angle+state.velocity*dt,-.6,.6);
      }
      // Enemy vx/vz store knockback only; derive walking speed from rendered displacement.
      const walking={...e,vx:(e.x-state.x)/Math.max(delta,.001),vz:(e.z-state.z)/Math.max(delta,.001)};
      state.x=e.x;state.z=e.z;springs.current.set(e.id,state);
      pose(model,walking,poses[i]??={},false,state.angle);
      if(e.hp>0) rememberPose(`enemy:${e.id}`,model,poses[i]);
      color.set(e.flash>0?'#fff2cf':e.windup>0?'#ffd39d':'#ffffff');
      for(const [name,mesh] of Object.entries(instances.current)) {
        out.multiplyMatrices(root,poses[i][name]); mesh.setMatrixAt(i,out); mesh.setColorAt(i,color);
      }
      out.makeRotationX(-Math.PI/2);out.scale(s.setScalar(e.windup>0?size:0));out.setPosition(e.x,.045,e.z);warning.current.setMatrixAt(i,out);
    });
    for(const id of springs.current.keys()) if(!enemies.some(e=>e.id===id)) springs.current.delete(id);
    for(const mesh of Object.values(instances.current)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    warning.current.count=enemies.length;warning.current.instanceMatrix.needsUpdate=true;
    const target=enemies.find(e=>e.id===sim.targetId);marker.current.visible=!!target;if(target)marker.current.position.set(target.x,.055,target.z);
  });
  return <>
    {Object.entries(model.meshes).map(([name,mesh])=><instancedMesh key={name} name={`horde-${kind}-${name}`} ref={o=>{if(o)instances.current[name]=o;}} args={[mesh.geometry,mesh.material,500]} castShadow frustumCulled={false}/>)}
    <instancedMesh ref={warning} args={[undefined,undefined,500]} frustumCulled={false}><ringGeometry args={[.62,.79,20]}/><meshBasicMaterial color="#ff895d" transparent opacity={.8}/></instancedMesh>
    <mesh ref={marker} rotation-x={-Math.PI/2}><ringGeometry args={[.43,.48,24]}/><meshBasicMaterial color="#f4df9b"/></mesh>
  </>;
}

const Ragdoll = memo(function Ragdoll({model,x,z,facing,scale,seed,poseKey,knockbackFacing=facing+Math.PI,tint='#ffffff'}:{model:Model;x:number;z:number;facing:number;scale:number;seed:number;poseKey?:string;knockbackFacing?:number;tint?:string}) {
  // Capture once at death. Subsequent snapshots must not reposition the physics bodies.
  const initial=useMemo(()=>{
    const root=new THREE.Matrix4().compose(new THREE.Vector3(x,.07,z),new THREE.Quaternion().setFromAxisAngle(axisY,facing),new THREE.Vector3(scale,scale,scale));
    const saved=poseKey?deathPoses.get(poseKey):undefined;
    const valid=saved?.url===model.definition.url && performance.now()-saved.time<500;
    return Object.fromEntries(Object.entries(model.definition.parts).map(([name,part])=>{
      const matrix=root.clone().multiply(valid?saved.poses[name]:new THREE.Matrix4().makeTranslation(...part.position));
      const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();matrix.decompose(p,q,s);
      const e=new THREE.Euler().setFromQuaternion(q);
      return [name,{position:tuple(p),rotation:[e.x,e.y,e.z] as V3}];
    }));
  },[]);
  const refs=useMemo(()=>Object.fromEntries(Object.keys(model.definition.parts).map(name=>[name,createRef<RapierRigidBody>() as RefObject<RapierRigidBody>])),[model]);
  const tags=useMemo(()=>Object.fromEntries(Object.entries(model.definition.parts).map(([name,p])=>[name,{part:name,role:p.role==='weapon'?'dropped':'ragdoll',seed}])),[model,seed]);
  useEffect(()=>{
    const pushX=Math.sin(knockbackFacing), pushZ=Math.cos(knockbackFacing);
    for(const [name,ref] of Object.entries(refs)) {
      const weapon=model.definition.parts[name].role==='weapon';
      ref.current.setLinvel({x:Math.sin(knockbackFacing)*(weapon?5:2)+(weapon?Math.cos(seed)*2:0),y:weapon?4:1.7,z:Math.cos(knockbackFacing)*(weapon?5:2)},true);
      // Rotate the top toward the impact direction, rather than a fixed world axis.
      ref.current.setAngvel(weapon?{x:3,y:6,z:4}:{x:pushZ*2.5,y:0,z:-pushX*2.5},true);
      if(name.startsWith('upper_arm_')||name.startsWith('forearm_')) {
        const side=name.endsWith('_l')?-1:1;
        const noise=Math.sin(seed*12.9898+side*78.233+(name.startsWith('forearm_')?19:0))*43758.5453;
        const variation=noise-Math.floor(noise);
        const outward=side*(.7+variation*.9), forward=.5+variation*.7;
        const body=ref.current,mass=body.mass();
        body.applyImpulse({x:mass*(pushX*forward+Math.cos(facing)*outward),y:mass*(.25+variation*.5),z:mass*(pushZ*forward-Math.sin(facing)*outward)},true);
      }
      if(name==='torso'||name==='head') {
        const body=ref.current, center=body.worldCom();
        const impulse=body.mass()*(name==='torso'?2.8:1.6);
        // A shoulder-height hit adds both translation and a backward tipping moment.
        body.applyImpulseAtPoint({x:pushX*impulse,y:0,z:pushZ*impulse},
          {x:center.x,y:center.y+(name==='torso'?.24:.06)*scale,z:center.z},true);
      }
    }
  },[]);
  const material=useMemo(()=>{
    const m=(model.meshes.torso.material as THREE.MeshStandardMaterial).clone();m.color.set(tint);return m;
  },[model,tint]);
  useEffect(()=>()=>material.dispose(),[material]);
  const scaleV=(v:V3):V3=>[v[0]*scale,v[1]*scale,v[2]*scale];
  return <group name={`ragdoll-${seed}`}>
    {Object.entries(model.definition.parts).map(([name,part])=>{
      const weapon=part.role==='weapon',mesh=model.meshes[name];
      mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox!;
      const half=box.getSize(new THREE.Vector3()).multiplyScalar(scale*.46);
      const center=box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      const mass=weapon ? .3 : part.role==='accessory' ? .08 : name==='torso' ? 2 : .6;
      return <group key={name}>
        <RigidBody ref={refs[name]} userData={tags[name]} name={`${weapon?'dropped':'body'}-${name}`} position={initial[name].position} rotation={initial[name].rotation} colliders={false} linearDamping={weapon ? .4 : .65} angularDamping={weapon ? 1.5 : name.includes('arm_') ? 2.5 : 4} additionalSolverIterations={4} ccd={weapon}>
          <CuboidCollider args={[Math.max(.025,half.x),Math.max(.025,half.y),Math.max(.025,half.z)]} position={tuple(center)} mass={mass} friction={.8} restitution={.02} collisionGroups={0x00020001}/>
          <mesh geometry={mesh.geometry} material={material} scale={scale} castShadow/>
        </RigidBody>
        {part.parent&&part.anchor&&(name.startsWith('upper_arm_')
          ? <Shoulder a={refs[part.parent]} b={refs[name]} anchorA={scaleV(minus(part.anchor,model.definition.parts[part.parent].position))} anchorB={scaleV(minus(part.anchor,part.position))}/>
          : name.startsWith('shin_')||name.startsWith('forearm_')||part.role==='accessory'
          ? <Hinge a={refs[part.parent]} b={refs[name]} anchorA={scaleV(minus(part.anchor,model.definition.parts[part.parent].position))} anchorB={scaleV(minus(part.anchor,part.position))} spring limits={part.role==='accessory'?[-.45,.45]:[-1.25,.1]}/>
          : <Hinge spring limits={name === 'head' ? [-.3,.3] : [-.7,.7]} a={refs[part.parent]} b={refs[name]} anchorA={scaleV(minus(part.anchor,model.definition.parts[part.parent].position))} anchorB={scaleV(minus(part.anchor,part.position))}/>)}
      </group>;
    })}
  </group>;
});

function EnemyCorpse({type,x,z,facing,seed,actorId,knockbackFacing}:{type:EnemyType;x:number;z:number;facing:number;seed:number;actorId?:number;knockbackFacing?:number}) {
  const model=useModel(type);
  return <Ragdoll poseKey={`enemy:${actorId??seed}`} model={model} x={x} z={z} facing={facing} scale={enemyTypes[type].scale} seed={seed} knockbackFacing={knockbackFacing}/>;
}
export function EnemyRagdolls() {
  useUI(s=>s.revision);
  return <>{effects.filter(e=>e.type==='kill').slice(-8).map(e=><EnemyCorpse key={e.id} actorId={e.targetId} type={e.enemyType??'goblin'} x={e.x} z={e.z} facing={e.facing} seed={e.id} knockbackFacing={e.knockbackFacing}/>)}</>;
}
export function VictoryRagdolls() {
  const won = useNetwork(s => s.lobby?.stage === 'won');
  return won ? <>{sim.enemies.map(e=><EnemyCorpse key={e.id} type={e.enemyType??'goblin'} x={e.x} z={e.z} facing={e.facing} seed={e.id}/>)}</> : null;
}
export function Projectiles() {
  return <><ProjectileBatch kind="arrow"/><ProjectileBatch kind="magic_missile"/><ElementalTrails/></>;
}
function ElementalTrails() {
  const mesh=useRef<THREE.InstancedMesh>(null!);
  const scratch=useMemo(()=>({object:new THREE.Object3D(),color:new THREE.Color()}),[]);
  useFrame(()=>{
    let count=0;const now=performance.now()/1000,{object,color}=scratch;
    for(const shot of sim.projectiles)if(shot.element) {
      const visual=networked?projectileMotion.sample(shot.id,now)??shot:shot;
      color.set(elements[shot.element].color);
      for(let i=0;i<7&&count<896;i++) {
        const age=i/7,jitter=Math.sin(now*22+i*3)*.035;
        object.position.set(visual.x-Math.sin(visual.facing)*age*.65+jitter,1.05+(shot.element==='poison'?-1:1)*age*.16,visual.z-Math.cos(visual.facing)*age*.65);
        object.scale.setScalar((1-age)*.075);if(shot.element==='lightning')object.scale.y*=2.5;
        object.rotation.set(now*3,i,now*7);object.updateMatrix();mesh.current.setMatrixAt(count,object.matrix);mesh.current.setColorAt(count++,color);
      }
    }
    mesh.current.count=count;mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  });
  return <instancedMesh name="elemental-projectile-trails" ref={mesh} args={[undefined,undefined,896]} frustumCulled={false}><octahedronGeometry args={[1]}/><meshBasicMaterial toneMapped={false} transparent opacity={.8} depthWrite={false}/></instancedMesh>;
}
function ProjectileBatch({kind}:{kind:'arrow'|'magic_missile'}) {
  const model=useModel(kind), mesh=useRef<THREE.InstancedMesh>(null!);
  const object=useMemo(()=>new THREE.Object3D(),[]);
  const material=useMemo(()=>{
    const m=(model.meshes.projectile.material as THREE.MeshStandardMaterial).clone();
    if(kind==='magic_missile'){m.emissive.set('#62c9ed');m.emissiveIntensity=2;m.toneMapped=false;}
    return m;
  },[model,kind]);
  useEffect(()=>()=>material.dispose(),[material]);
  useFrame(()=>{
    let count=0;
    const now=performance.now()/1000;
    if(sim.phase==='playing' || sim.phase==='paused') for(const shot of sim.projectiles) if(shot.kind===kind && count<128){
      const visual = networked ? projectileMotion.sample(shot.id,now) ?? shot : shot;
      object.position.set(visual.x,1.05,visual.z);object.rotation.set(0,visual.facing,0);object.updateMatrix();
      mesh.current.setMatrixAt(count++,object.matrix);
    }
    mesh.current.count=count;mesh.current.instanceMatrix.needsUpdate=true;
  });
  return <instancedMesh name={'projectiles-'+kind} ref={mesh} args={[model.meshes.projectile.geometry,material,128]} frustumCulled={false}/>;
}

export function SocialPlayer({ character, equippedWeapon, position, facing, seated, seed }: { character: CharacterId; equippedWeapon?: WeaponId; position: V3; facing: number; seated: boolean; seed: number }) {
  const model = useHeroModel(character,equippedWeapon);
  const weapon=getWeapon(equippedWeapon);
  const objects = useRef<Record<string, THREE.Mesh>>({});
  const group = useRef<THREE.Group>(null!);
  const matrices = useMemo(() => ({} as Record<string, THREE.Matrix4>), [model]);
  useFrame(({ clock }) => {
    const actor = { id: seed, vx: 0, vz: 0, windup: 0, swing: 0 } as Player;
    pose(model, actor, matrices, seated);
    group.current.position.y = position[1] + (seated ? -.08 : Math.sin(clock.elapsedTime * 2 + seed) * .015);
    for (const [name, object] of Object.entries(objects.current)) object.matrix.copy(matrices[name]);
  });
  return <group ref={group} position={position} rotation-y={facing} name={`social-player-${seed}`}>
    {Object.entries(model.meshes).filter(([name]) => name!=='shield' && (name!=='weapon'||!!weapon)).map(([name, mesh]) => <mesh name={`social-${name}`} key={name} ref={o => { if (o) objects.current[name] = o; else delete objects.current[name]; }} matrixAutoUpdate={false} geometry={mesh.geometry} material={mesh.material} castShadow/>)}
    {weapon&&<WeaponParticles element={weapon.element} origin={weapon.effectOrigin} parentMatrix={()=>matrices.weapon}/>}
  </group>;
}

export function PhysicsInspection() {
  const { world } = useRapier();
  const scene = useThree(s => s.scene);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const arena = (window as unknown as {arena: {physics?: typeof world; scene?: THREE.Scene}}).arena;
    arena.physics = world;
    arena.scene = scene;
    return () => { delete arena.physics; delete arena.scene; };
  }, [world, scene]);
  return null;
}



