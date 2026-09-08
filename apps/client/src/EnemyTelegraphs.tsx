import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { enemyBehaviors } from '@arena/game-core';
import { sim } from './runtime';

/** Temporary warnings come from authoritative enemy state, not client-side timers. */
export function EnemyTelegraphs() {
  const areas=useRef<THREE.InstancedMesh>(null!), lanes=useRef<THREE.InstancedMesh>(null!);
  const dummy=useMemo(()=>new THREE.Object3D(),[]), color=useMemo(()=>new THREE.Color(),[]);
  useFrame(()=>{
    let areaCount=0,laneCount=0;
    for(const e of sim.enemies){
      const ai=e.ai,type=e.enemyType;
      if(!ai || !type || type==='goblin' || (ai.mode!=='warning' && ai.mode!=='active'))continue;
      const settings=enemyBehaviors[type];
      color.set(type==='revenant'?(ai.mode==='active'?'#a4f1ff':'#64baff'):type==='boss'?'#eeb757':ai.mode==='active'?'#ff4025':'#ffab49');
      if(type==='runner'){
        dummy.position.set(ai.x+Math.sin(ai.facing)*3.25,.075,ai.z+Math.cos(ai.facing)*3.25);
        dummy.rotation.set(-Math.PI/2,0,ai.facing);dummy.scale.set(1.8,6.5,1);dummy.updateMatrix();
        lanes.current.setMatrixAt(laneCount,dummy.matrix);lanes.current.setColorAt(laneCount++,color);
      } else {
        dummy.position.set(ai.x,.065,ai.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(settings.radius);dummy.updateMatrix();
        areas.current.setMatrixAt(areaCount,dummy.matrix);areas.current.setColorAt(areaCount++,color);
      }
    }
    for(const [mesh,count] of [[areas.current,areaCount],[lanes.current,laneCount]] as const){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  });
  return <>
    <instancedMesh name="enemy-area-warnings" ref={areas} args={[undefined,undefined,200]} frustumCulled={false}><circleGeometry args={[1,40]}/><meshBasicMaterial transparent opacity={.32} depthWrite={false} toneMapped={false}/></instancedMesh>
    <instancedMesh name="enemy-charge-warnings" ref={lanes} args={[undefined,undefined,200]} frustumCulled={false}><planeGeometry args={[1,1]}/><meshBasicMaterial transparent opacity={.32} depthWrite={false} toneMapped={false}/></instancedMesh>
  </>;
}
