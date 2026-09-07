import { createRef, memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { RigidBody, CuboidCollider, useRevoluteJoint, useSphericalJoint, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Actor, Player } from '@arena/game-core';
import { enemyTypes, type CharacterId, type EnemyType } from '@arena/game-data';
import data from '../public/models/manifest.json';
import { useNetwork } from './network';
import { effects, sim, useUI } from './runtime';

type V3 = [number, number, number];
type Kind = CharacterId | 'goblin';
type Part = { position: V3; halfExtents: V3; role: string; parent?: string; anchor?: V3 };
type Definition = { url: string; parts: Record<string, Part> };
type Model = { definition: Definition; meshes: Record<string, THREE.Mesh> };
const definitions = data.models as unknown as Record<Kind, Definition>;
const rotation = new THREE.Matrix4(), translation = new THREE.Matrix4();
const axisY = new THREE.Vector3(0, 1, 0);
const minus = (a: V3, b: V3): V3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const tuple = (p: THREE.Vector3): V3 => [p.x, p.y, p.z];

function useModel(kind: Kind): Model {
  const gltf = useLoader(GLTFLoader, definitions[kind].url);
  return useMemo(() => {
    const meshes: Record<string, THREE.Mesh> = {};
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.userData.part) meshes[object.userData.part] = object;
    });
    for (const name of Object.keys(definitions[kind].parts)) if (!meshes[name]) throw new Error(`Missing ${kind} model part: ${name}`);
    return { definition: definitions[kind], meshes };
  }, [gltf, kind]);
}

// Shared joint-space walk pose. No animation values enter the combat simulation.
function pose(model: Model, actor: Actor, matrices: Record<string, THREE.Matrix4>, seated = false) {
  const speed = Math.min(1, Math.hypot(actor.vx, actor.vz) / 3);
  const stride = Math.sin(sim.time * 11 + actor.id) * .43 * speed;
  const player = actor as Player;
  for (const [name, part] of Object.entries(model.definition.parts)) {
    const matrix = matrices[name] ??= new THREE.Matrix4();
    let parent = part.parent, anchor = part.anchor;
    if (name === 'weapon') { parent = 'forearm_r'; anchor = part.position; }
    if (name === 'shield') { parent = 'forearm_l'; anchor = part.position; }
    if (!parent || !anchor) { matrix.makeTranslation(...part.position); continue; }
    let angle = 0;
    if (name.startsWith('thigh_')) angle = name.endsWith('_l') ? stride : -stride;
    if (name.startsWith('shin_')) angle = Math.max(0, name.endsWith('_l') ? -stride : stride) * .8;
    if (name.startsWith('upper_arm_')) angle = (name.endsWith('_l') ? -stride : stride) * .4;
    if (seated && name.startsWith('thigh_')) angle = -Math.PI / 2;
    if (seated && name.startsWith('shin_')) angle = Math.PI / 2;
    if (name === 'upper_arm_r' && actor.windup > 0) angle = -.45;
    matrix.copy(matrices[parent]);
    matrix.multiply(translation.makeTranslation(...minus(anchor, model.definition.parts[parent].position)));
    matrix.multiply(rotation.makeRotationX(angle));
    if (name === 'weapon') matrix.multiply(rotation.makeRotationY(player.swing > 0 ? -1.0 + (1-player.swing/.23)*2.0 : actor.windup > 0 ? -.8 : .12));
    matrix.multiply(translation.makeTranslation(...minus(part.position, anchor)));
  }
}

function Hinge({ a, b, anchorA, anchorB, limits = [-.65, .65] }: { a: RefObject<RapierRigidBody>; b: RefObject<RapierRigidBody>; anchorA: V3; anchorB: V3; limits?: [number, number] }) {
  useRevoluteJoint(a, b, [anchorA, anchorB, [1, 0, 0], limits]);
  return null;
}
function BallJoint({ a, b, anchorA, anchorB }: { a: RefObject<RapierRigidBody>; b: RefObject<RapierRigidBody>; anchorA: V3; anchorB: V3 }) {
  useSphericalJoint(a, b, [anchorA, anchorB]);
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
        <RigidBody ref={refs[name]} userData={{part:name,role:'accessory'}} position={initial[name]} rotation={[0,player.facing,0]} colliders={false} angularDamping={4} linearDamping={1} canSleep={false}>
          <CuboidCollider args={part.halfExtents} mass={.08} collisionGroups={0}/>
          <mesh name={`accessory-${name}`} geometry={model.meshes[name].geometry} material={model.meshes[name].material} castShadow/>
        </RigidBody>
        <Hinge a={parentIsAccessory ? refs[part.parent!] : root} b={refs[name]} anchorA={parentIsAccessory ? minus(anchor, model.definition.parts[part.parent!].position) : anchor} anchorB={minus(anchor,part.position)}/>
      </group>;
    })}
  </>;
});

function AlivePlayer({ playerId, model }: { playerId: number; model: Model }) {
  const group = useRef<THREE.Group>(null!);
  const arc = useRef<THREE.Mesh>(null!);
  const objects = useRef<Record<string, THREE.Mesh>>({});
  const matrices = useMemo(() => ({} as Record<string, THREE.Matrix4>), []);
  useFrame(({clock}) => {
    const p = sim.players.find(p => p.id === playerId); if (!p || !group.current) return;
    const won = useNetwork.getState().lobby?.stage === 'won';
    group.current.position.set(p.x, won ? Math.abs(Math.sin(clock.elapsedTime * 5 + p.id)) * .65 : 0, p.z); group.current.rotation.y=p.facing;
    pose(model, won ? {...p, vx: 0, vz: 0, swing: 0, windup: 0} : p, matrices);
    for (const [name, object] of Object.entries(objects.current)) object.matrix.copy(matrices[name]);
    arc.current.visible=sim.phase === 'playing' && p.swing>0;
    (arc.current.material as THREE.MeshBasicMaterial).opacity=p.swing/.23*.65;
  });
  return <>
    <group ref={group} name={`player-model-${playerId}`}>
      {Object.entries(model.meshes).filter(([name])=>model.definition.parts[name].role!=='accessory').map(([name, mesh]) => <mesh key={name} ref={o=>{if(o)objects.current[name]=o;}} matrixAutoUpdate={false} geometry={mesh.geometry} material={mesh.material} castShadow/>) }
      <mesh rotation-x={-Math.PI/2} position-y={.035}><ringGeometry args={[.55,.6,32]}/><meshBasicMaterial color="#cdeee1" transparent opacity={.6}/></mesh>
      <mesh ref={arc} rotation-x={-Math.PI/2} position-y={.65}><ringGeometry args={[sim.config.swordRange-.5,sim.config.swordRange,40,1,-Math.PI/2-sim.config.swordArc*Math.PI/360,sim.config.swordArc*Math.PI/180]}/><meshBasicMaterial color="#fff0bd" side={THREE.DoubleSide} transparent depthWrite={false}/></mesh>
    </group>
    <Accessories key={model.definition.url} model={model} playerId={playerId}/>
  </>;
}

export function PlayerModel({ playerId }: { playerId: number }) {
  const player=sim.players.find(p=>p.id===playerId);
  const model=useModel(player?.character ?? 'warrior');
  // A departure can arrive after Scene renders but before this child resumes.
  const won = useNetwork(s => s.lobby?.stage === 'won');
  if (!player) return null;
  return player.hp<=0 && !won ? <Ragdoll model={model} x={player.x} z={player.z} facing={player.facing} scale={1} seed={player.id}/> : <AlivePlayer key={model.definition.url} model={model} playerId={playerId}/>;
}

export function ModelHorde() {
  const model=useModel('goblin');
  const instances=useRef<Record<string,THREE.InstancedMesh>>({});
  const warning=useRef<THREE.InstancedMesh>(null!), marker=useRef<THREE.Mesh>(null!);
  const scratch=useMemo(()=>({root:new THREE.Matrix4(),out:new THREE.Matrix4(),q:new THREE.Quaternion(),p:new THREE.Vector3(),s:new THREE.Vector3(),color:new THREE.Color(),poses:[] as Record<string,THREE.Matrix4>[]}),[]);
  useFrame(()=>{
    const {root,out,q,p,s,color,poses}=scratch;
    const enemies=useNetwork.getState().lobby?.stage === 'won' ? [] : sim.enemies.slice(0,500);
    for(const mesh of Object.values(instances.current)) mesh.count=enemies.length;
    enemies.forEach((e,i)=>{
      const definition=enemyTypes[e.enemyType??'goblin'], size=definition.scale;
      root.compose(p.set(e.x,0,e.z),q.setFromAxisAngle(axisY,e.facing),s.setScalar(size));
      pose(model,e,poses[i]??={});
      color.set(e.flash>0?'#fff2cf':e.windup>0?'#ffd39d':e.enemyType==='goblin'||!e.enemyType?'#ffffff':definition.color);
      for(const [name,mesh] of Object.entries(instances.current)) {
        out.multiplyMatrices(root,poses[i][name]); mesh.setMatrixAt(i,out); mesh.setColorAt(i,color);
      }
      out.makeRotationX(-Math.PI/2);out.scale(s.setScalar(e.windup>0?size:0));out.setPosition(e.x,.045,e.z);warning.current.setMatrixAt(i,out);
    });
    for(const mesh of Object.values(instances.current)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    warning.current.count=enemies.length;warning.current.instanceMatrix.needsUpdate=true;
    const target=enemies.find(e=>e.id===sim.targetId);marker.current.visible=!!target;if(target)marker.current.position.set(target.x,.055,target.z);
  });
  return <>
    {Object.entries(model.meshes).map(([name,mesh])=><instancedMesh key={name} name={`horde-${name}`} ref={o=>{if(o)instances.current[name]=o;}} args={[mesh.geometry,mesh.material,500]} castShadow frustumCulled={false}/>)}
    <instancedMesh ref={warning} args={[undefined,undefined,500]} frustumCulled={false}><ringGeometry args={[.62,.79,20]}/><meshBasicMaterial color="#ff895d" transparent opacity={.8}/></instancedMesh>
    <mesh ref={marker} rotation-x={-Math.PI/2}><ringGeometry args={[.43,.48,24]}/><meshBasicMaterial color="#f4df9b"/></mesh>
  </>;
}

const Ragdoll = memo(function Ragdoll({model,x,z,facing,scale,seed,tint='#ffffff'}:{model:Model;x:number;z:number;facing:number;scale:number;seed:number;tint?:string}) {
  // Capture once at death. Subsequent snapshots must not reposition the physics bodies.
  const initial=useMemo(()=>{
    const q=new THREE.Quaternion().setFromAxisAngle(axisY,facing);
    return Object.fromEntries(Object.entries(model.definition.parts).map(([name,part])=>[name,tuple(new THREE.Vector3(...part.position).multiplyScalar(scale).applyQuaternion(q).add(new THREE.Vector3(x,.07,z)))]));
  },[]);
  const refs=useMemo(()=>Object.fromEntries(Object.keys(model.definition.parts).map(name=>[name,createRef<RapierRigidBody>() as RefObject<RapierRigidBody>])),[model]);
  const tags=useMemo(()=>Object.fromEntries(Object.entries(model.definition.parts).map(([name,p])=>[name,{part:name,role:p.role==='weapon'?'dropped':'ragdoll',seed}])),[model,seed]);
  useEffect(()=>{
    for(const [name,ref] of Object.entries(refs)) {
      const weapon=model.definition.parts[name].role==='weapon';
      ref.current.setLinvel({x:Math.sin(facing)*(weapon?5:2)+(weapon?Math.cos(seed)*2:0),y:weapon?4:1.7,z:Math.cos(facing)*(weapon?5:2)},true);
      ref.current.setAngvel(weapon?{x:3,y:6,z:4}:{x:1.4,y:0,z:.5},true);
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
        <RigidBody ref={refs[name]} userData={tags[name]} name={`${weapon?'dropped':'body'}-${name}`} position={initial[name]} rotation={[0,facing,0]} colliders={false} linearDamping={.4} angularDamping={1.5} ccd={weapon}>
          <CuboidCollider args={[Math.max(.025,half.x),Math.max(.025,half.y),Math.max(.025,half.z)]} position={tuple(center)} mass={mass} friction={.8} restitution={.1} collisionGroups={0x00020001}/>
          <mesh geometry={mesh.geometry} material={material} scale={scale} castShadow/>
        </RigidBody>
        {part.parent&&part.anchor&&(name.startsWith('shin_')||name.startsWith('forearm_')||part.role==='accessory'
          ? <Hinge a={refs[part.parent]} b={refs[name]} anchorA={scaleV(minus(part.anchor,model.definition.parts[part.parent].position))} anchorB={scaleV(minus(part.anchor,part.position))} limits={part.role==='accessory'?[-.7,.7]:[-1.8,.25]}/>
          : <BallJoint a={refs[part.parent]} b={refs[name]} anchorA={scaleV(minus(part.anchor,model.definition.parts[part.parent].position))} anchorB={scaleV(minus(part.anchor,part.position))}/>)}
      </group>;
    })}
  </group>;
});

export function EnemyRagdolls() {
  useUI(s=>s.revision);
  const model=useModel('goblin');
  return <>{effects.filter(e=>e.type==='kill').slice(-8).map(e=>{
    const type:EnemyType=e.enemyType??'goblin';
    return <Ragdoll key={e.id} model={model} x={e.x} z={e.z} facing={e.facing} scale={enemyTypes[type].scale} seed={e.id} tint={type==='goblin'?'#ffffff':enemyTypes[type].color}/>;
  })}</>;
}

export function VictoryRagdolls() {
  const won = useNetwork(s => s.lobby?.stage === 'won');
  const model = useModel('goblin');
  return won ? <>{sim.enemies.map(e => <Ragdoll key={e.id} model={model} x={e.x} z={e.z} facing={e.facing} scale={enemyTypes[e.enemyType ?? 'goblin'].scale} seed={e.id} tint={enemyTypes[e.enemyType ?? 'goblin'].color}/>)}</> : null;
}

export function SocialPlayer({ character, position, facing, seated, seed }: { character: CharacterId; position: V3; facing: number; seated: boolean; seed: number }) {
  const model = useModel(character);
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
    {Object.entries(model.meshes).filter(([name]) => !['weapon','shield'].includes(name)).map(([name, mesh]) => <mesh key={name} ref={o => { if (o) objects.current[name] = o; else delete objects.current[name]; }} matrixAutoUpdate={false} geometry={mesh.geometry} material={mesh.material} castShadow/>)}
  </group>;
}

export function PhysicsInspection() {
  const { world } = useRapier();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const arena = (window as unknown as {arena: {physics?: typeof world}}).arena;
    arena.physics = world;
    return () => { delete arena.physics; };
  }, [world]);
  return null;
}
