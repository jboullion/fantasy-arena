import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { sim } from './runtime';
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';

const models = ['rock-0','rock-1','rock-2','tree-0','tree-1','tree-2','grass-0','grass-1','grass-2'];
type Placement = {x:number;z:number;scale:number;rotation:number};
function Batch({model,items,grass=false}:{model:string;items:Placement[];grass?:boolean}) {
  const gltf=useLoader(GLTFLoader,`/models/terrain/${model}.glb`);
  const parts=useMemo(()=>{gltf.scene.updateMatrixWorld(true);const result:{geometry:THREE.BufferGeometry;material:THREE.Material|THREE.Material[]}[]=[];gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)result.push({geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material});});return result;},[gltf]);
  const refs=useRef<THREE.InstancedMesh[]>([]);
  const state=useMemo(()=>items.map(()=>({x:0,z:0,vx:0,vz:0})),[items]);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  useFrame((_,delta)=>{
    const dt=sim.phase==='paused'?0:Math.min(delta,1/30);
    const actors=grass?[...sim.players,...sim.enemies].filter(a=>a.hp>0):[];
    items.forEach((p,i)=>{
      const s=state[i];let tx=0,tz=0;
      for(const a of actors){const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);if(d<1.35){const force=(1-d/1.35)*.9;tx+=dx/Math.max(.1,d)*force;tz+=dz/Math.max(.1,d)*force;}}
      s.vx+=(tx*65-s.x*65-s.vx*12)*dt;s.vz+=(tz*65-s.z*65-s.vz*12)*dt;s.x+=s.vx*dt;s.z+=s.vz*dt;
      dummy.position.set(p.x,0,p.z);dummy.scale.setScalar(p.scale);dummy.rotation.set(Math.max(-1,Math.min(1,s.z)),p.rotation,Math.max(-1,Math.min(1,-s.x)));dummy.updateMatrix();
      refs.current.forEach(mesh=>mesh?.setMatrixAt(i,dummy.matrix));
    });refs.current.forEach(mesh=>{if(mesh)mesh.instanceMatrix.needsUpdate=true;});
  });
  return <>{parts.map((p,i)=><instancedMesh key={i} ref={m=>{if(m)refs.current[i]=m;}} args={[p.geometry,p.material,items.length]} castShadow={!grass} receiveShadow frustumCulled={false}/>)}</>;
}
export function Terrain(){const layout=sim.terrain;return <>{models.map(model=><Batch key={model} model={model} grass={model.startsWith('grass')} items={model.startsWith('grass')?layout.grass.filter(o=>o.model===model):[...layout.obstacles,...layout.walls].filter(o=>o.model===model)}/>)}</>;}
export function TerrainColliders(){return <RigidBody type="fixed" colliders={false}>{sim.terrain.obstacles.map((o,i)=><CylinderCollider key={i} args={[o.model.startsWith('tree')?1.8:o.scale*.8,o.radius]} position={[o.x,o.model.startsWith('tree')?1.8:o.scale*.8,o.z]}/>)}{[-1,1].map(n=><group key={n}><CuboidCollider args={[1,3,sim.config.arenaLength/2+2]} position={[n*(sim.config.arenaWidth/2+1),3,0]}/><CuboidCollider args={[sim.config.arenaWidth/2+2,3,1]} position={[0,3,n*(sim.config.arenaLength/2+1)]}/></group>)}</RigidBody>;}
