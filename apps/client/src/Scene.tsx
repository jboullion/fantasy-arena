import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { advance, effects, sim, useUI } from './runtime';
import { DamageNumbers } from './DamageNumbers';
import { PlayerLabels } from './PlayerLabels';
import { PlayerModel, ModelHorde, EnemyRagdolls, PhysicsInspection } from './CharacterModels';

const dummy = new THREE.Object3D();
function HitParticles() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  useFrame(() => {
    let index = 0;
    for (const e of effects) if (e.type === 'hit' && e.life > .65) for (let n = 0; n < 5 && index < 640; n++) {
      const age = .9 - e.life, angle = n * 2.4 + e.id;
      dummy.position.set(e.x + Math.cos(angle) * age * 5, .8 + Math.sin(age * 10) * .6, e.z + Math.sin(angle) * age * 5);
      dummy.rotation.set(angle, age * 15, 0); dummy.scale.setScalar((.25 - age) * .45); dummy.updateMatrix(); mesh.current.setMatrixAt(index++, dummy.matrix);
    }
    mesh.current.count = index; mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 640]} frustumCulled={false}><octahedronGeometry args={[1]}/><meshBasicMaterial color="#ffe4a1"/></instancedMesh>;
}
function Environment() {
  const c = sim.config;
  const trees = useMemo(() => Array.from({ length: 56 }, (_, i) => {
    const a = i / 56 * Math.PI * 2, noise = Math.sin(i * 37) * 1.7;
    return { x: Math.cos(a) * (c.arenaWidth / 2 + 3 + noise), z: Math.sin(a) * (c.arenaLength / 2 + 3 + noise), scale: 1 + (Math.sin(i * 19) + 1) * .45 };
  }), [c.arenaWidth, c.arenaLength]);
  return <>
    <color attach="background" args={['#172b27']}/><fog attach="fog" args={['#172b27', 38, 77]}/>
    <hemisphereLight args={['#e0edcb', '#314039', 2]}/><directionalLight position={[-12, 24, 10]} intensity={2.6} color="#ffe1ae" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} shadow-normalBias={.04}/>
    <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-.04}><planeGeometry args={[180, 180]}/><meshStandardMaterial color="#344c36" roughness={1}/></mesh>
    <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-.01}><planeGeometry args={[c.arenaWidth, c.arenaLength]}/><meshStandardMaterial color="#647050" roughness={1}/></mesh>
    {[-1, 1].map(n => <group key={n}><mesh position={[n * c.arenaWidth / 2, .02, 0]}><boxGeometry args={[.12, .08, c.arenaLength]}/><meshStandardMaterial color="#b9b48c"/></mesh><mesh position={[0, .02, n * c.arenaLength / 2]}><boxGeometry args={[c.arenaWidth, .08, .12]}/><meshStandardMaterial color="#b9b48c"/></mesh></group>)}
    {[3.5, 7, 10.5].map(r => <mesh key={r} rotation-x={-Math.PI / 2} position-y={.004}><ringGeometry args={[r, r + .035, 80]}/><meshBasicMaterial color="#a3ab80" transparent opacity={.18}/></mesh>)}
    {trees.map((t, i) => <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
      <mesh castShadow position-y={1}><cylinderGeometry args={[.17, .3, 2, 5]}/><meshStandardMaterial color="#504536"/></mesh>
      {[1.7, 2.5, 3.2].map((y, j) => <mesh castShadow key={y} position-y={y}><coneGeometry args={[1.4 - j * .3, 2, 5]}/><meshStandardMaterial color={i % 3 === 0 ? '#38584a' : '#294b3b'}/></mesh>) }
    </group>)}
    {Array.from({ length: 22 }, (_, i) => <mesh key={i} castShadow position={[Math.sin(i * 5.3) * (c.arenaWidth / 2 + 1.5), .25, (i % 2 ? 1 : -1) * (c.arenaLength / 2 + 1)]} rotation={[i, i * 2, 0]} scale={[.6 + i % 3 * .2, .6, .7]}><dodecahedronGeometry args={[.7, 0]}/><meshStandardMaterial color="#788379" flatShading/></mesh>)}
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
    <CameraAndLoop/><Environment/><HitParticles/><DamageNumbers/><PlayerLabels/>
    <Suspense fallback={null}><Physics paused={sim.phase === 'paused'} timeStep={1 / 60} gravity={[0,-14,0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[50,.1,50]} position={[0,-.12,0]}/></RigidBody>
      {sim.players.map(p=><PlayerModel key={p.id} playerId={p.id}/>)}<ModelHorde/><EnemyRagdolls/><PhysicsInspection/>
    </Physics></Suspense>
  </Canvas>;
}
