import { Terrain, TerrainColliders } from './Terrain';
import { EnemyTelegraphs } from './EnemyTelegraphs';
import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { advance, effects, sim, useUI } from './runtime';
import { DamageNumbers } from './DamageNumbers';
import { PlayerLabels } from './PlayerLabels';
import { elements } from '@arena/game-data';
import { PlayerModel, Projectiles, ModelHorde, EnemyRagdolls, VictoryRagdolls, PhysicsInspection } from './CharacterModels';

const dummy = new THREE.Object3D();
const hitColor = new THREE.Color();
function HitParticles() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  useFrame(() => {
    let index = 0;
    for (const e of effects) if (e.type === 'hit' && e.life > .65) for (let n = 0; n < 5 && index < 640; n++) {
      const age = .9 - e.life, angle = n * 2.4 + e.id;
      dummy.position.set(e.x + Math.cos(angle) * age * 5, .8 + Math.sin(age * 10) * .6, e.z + Math.sin(angle) * age * 5);
      dummy.rotation.set(angle, age * 15, 0); dummy.scale.setScalar((.25 - age) * .45); dummy.updateMatrix(); mesh.current.setMatrixAt(index, dummy.matrix);mesh.current.setColorAt(index++,hitColor.set(e.element?elements[e.element].color:'#ffe4a1'));
    }
    mesh.current.count = index; mesh.current.instanceMatrix.needsUpdate = true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 640]} frustumCulled={false}><octahedronGeometry args={[1]}/><meshBasicMaterial toneMapped={false}/></instancedMesh>;
}
function Environment() {
  const c = sim.config;
  return <>
    <color attach="background" args={['#172b27']}/><fog attach="fog" args={['#172b27', 38, 77]}/>
    <hemisphereLight args={['#e0edcb', '#314039', 2]}/><directionalLight position={[-12, 24, 10]} intensity={2.6} color="#ffe1ae" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-normalBias={.04}/>
    <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-.04}><planeGeometry args={[180, 180]}/><meshStandardMaterial color="#344c36" roughness={1}/></mesh>
    <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-.01}><planeGeometry args={[c.arenaWidth, c.arenaLength]}/><meshStandardMaterial color="#647050" roughness={1}/></mesh>
    {[-1, 1].map(n => <group key={n}><mesh position={[n * c.arenaWidth / 2, .02, 0]}><boxGeometry args={[.12, .08, c.arenaLength]}/><meshStandardMaterial color="#b9b48c"/></mesh><mesh position={[0, .02, n * c.arenaLength / 2]}><boxGeometry args={[c.arenaWidth, .08, .12]}/><meshStandardMaterial color="#b9b48c"/></mesh></group>)}
    <Suspense fallback={null}><Terrain/></Suspense>
  </>;
}
function CameraAndLoop() {
  const look = useRef(new THREE.Vector3());
  useFrame(({ camera }, delta) => {
    advance(delta);
    const c = sim.config, p = sim.player;
    look.current.lerp(new THREE.Vector3(p.x * .72, 0, p.z * .72), 1 - Math.exp(-c.cameraSmoothing * delta));
    camera.position.set(look.current.x, c.cameraHeight, look.current.z + c.cameraDistance);
    camera.lookAt(look.current.x, 0, look.current.z);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== c.cameraFov) { camera.fov = c.cameraFov; camera.updateProjectionMatrix(); }
  }, -1);
  return null;
}
export function Scene() {
  useUI(s => s.revision);
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 19, 16], fov: 48 }} gl={{ antialias: true }} fallback={<div className="fallback">WebGL is unavailable. Open this prototype in a desktop browser with hardware acceleration enabled.</div>}>
    <CameraAndLoop/><Environment/><HitParticles/><DamageNumbers/><PlayerLabels/><EnemyTelegraphs/>
    <Suspense fallback={null}><Physics paused={sim.phase === 'paused'} timeStep={1 / 60} gravity={[0,-14,0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[50,.1,50]} position={[0,-.12,0]}/></RigidBody>
      {sim.players.map(p=><PlayerModel key={p.id} playerId={p.id}/>)}<ModelHorde/><Projectiles/><EnemyRagdolls/><VictoryRagdolls/><PhysicsInspection/><TerrainColliders/>
    </Physics></Suspense>
  </Canvas>;
}
