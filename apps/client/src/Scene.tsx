import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { advance, effects, sim, useUI } from './runtime';
import { DamageNumbers } from './DamageNumbers';
import { characters, enemyTypes } from '@arena/game-data';
import { PlayerLabels } from './PlayerLabels';

const dummy = new THREE.Object3D(), color = new THREE.Color();
function Warrior({ playerId }: { playerId: number }) {
  const player = sim.players.find(p => p.id === playerId);
  const group = useRef<THREE.Group>(null!), sword = useRef<THREE.Group>(null!), arc = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const p = sim.players.find(p => p.id === playerId); if (!p) return;
    group.current.position.set(p.x, Math.hypot(p.vx, p.vz) > .1 ? Math.sin(sim.time * 18) * .045 : 0, p.z);
    group.current.rotation.set(p.hp <= 0 ? -1.4 : 0, p.facing, 0);
    sword.current.rotation.y = p.swing > 0 ? -1.1 + (1 - p.swing / .23) * 2.2 : p.windup > 0 ? -1.2 : .3;
    arc.current.visible = p.swing > 0 && p.hp > 0;
    const material = arc.current.material as THREE.MeshBasicMaterial; material.opacity = p.swing / .23 * .65;
  });
  // A network departure can arrive between the parent render and this render.
  if (!player) return null;
  return <group ref={group} scale={player.character === 'guardian' ? [1.15, .85, 1.15] : [1, 1, 1]}>
    <mesh rotation-x={-Math.PI / 2} position-y={.035}><ringGeometry args={[.55, .6, 40]}/><meshBasicMaterial color="#cdeee1" transparent opacity={.6}/></mesh>
    <mesh castShadow position={[0, .83, 0]}><capsuleGeometry args={[.34, .55, 4, 8]}/><meshStandardMaterial color={characters[player.character].color} metalness={.55} roughness={.5}/></mesh>
    <mesh castShadow position={[0, 1.5, 0]}><boxGeometry args={[.48, .46, .48]}/><meshStandardMaterial color="#d5e1de" metalness={.6} roughness={.4}/></mesh>
    <mesh position={[0, 1.49, .249]}><boxGeometry args={[.32, .075, .02]}/><meshStandardMaterial color="#132b2e"/></mesh>
    <mesh castShadow position={[0, 1.77, -.03]}><boxGeometry args={[.1, .21, .4]}/><meshStandardMaterial color="#b75339"/></mesh>
    {[-1, 1].map(n => <group key={n}><mesh castShadow position={[n * .2, .22, 0]}><boxGeometry args={[.25, .44, .35]}/><meshStandardMaterial color="#293c42"/></mesh><mesh castShadow position={[n * .44, 1.08, 0]}><boxGeometry args={[.35, .32, .42]}/><meshStandardMaterial color="#bccac4" metalness={.6}/></mesh></group>)}
    <mesh castShadow position={[-.52, .72, .2]} rotation-x={.1}><boxGeometry args={[.17, .7, .6]}/><meshStandardMaterial color="#bd8148" metalness={.25}/></mesh>
    <group ref={sword} position={[0, .8, 0]}>
      <mesh castShadow position={[.48, 0, 1.05]} rotation-x={Math.PI / 2}><boxGeometry args={[.15, 1.5, .07]}/><meshStandardMaterial color="#e3ece7" metalness={.8} roughness={.2}/></mesh>
      <mesh position={[.48, 0, .35]}><boxGeometry args={[.48, .13, .13]}/><meshStandardMaterial color="#d8b067" metalness={.6}/></mesh>
    </group>
    <mesh ref={arc} rotation={[-Math.PI / 2, 0, 0]} position-y={.65}><ringGeometry args={[sim.config.swordRange - .5, sim.config.swordRange, 40, 1, -Math.PI / 2 - sim.config.swordArc * Math.PI / 360, sim.config.swordArc * Math.PI / 180]}/><meshBasicMaterial color="#fff0bd" side={THREE.DoubleSide} transparent depthWrite={false}/></mesh>
  </group>;
}

function Horde() {
  const body = useRef<THREE.InstancedMesh>(null!), head = useRef<THREE.InstancedMesh>(null!), ears = useRef<THREE.InstancedMesh>(null!), warning = useRef<THREE.InstancedMesh>(null!);
  const marker = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const enemies = sim.enemies;
    [body, head, ears, warning].forEach(ref => { ref.current.count = enemies.length; });
    enemies.forEach((e, i) => {
      const definition = enemyTypes[e.enemyType ?? 'goblin'], scale = definition.scale;
      const bob = e.windup > 0 ? .08 : Math.sin(sim.time * 13 + e.id) * .055;
      dummy.position.set(e.x, .65 * scale + bob, e.z); dummy.rotation.set(e.flash > 0 ? -.2 : 0, e.facing, 0); dummy.scale.setScalar(scale); dummy.updateMatrix(); body.current.setMatrixAt(i, dummy.matrix);
      color.set(e.flash > 0 ? '#fff2d3' : e.windup > 0 ? '#e79853' : definition.color); body.current.setColorAt(i, color);
      dummy.position.y = 1.17 * scale + bob; dummy.updateMatrix(); head.current.setMatrixAt(i, dummy.matrix); head.current.setColorAt(i, color);
      dummy.scale.set(scale, .3 * scale, .55 * scale); dummy.position.y = 1.2 * scale + bob; dummy.updateMatrix(); ears.current.setMatrixAt(i, dummy.matrix); ears.current.setColorAt(i, color);
      dummy.position.set(e.x, .045, e.z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.setScalar(e.windup > 0 ? scale : 0); dummy.updateMatrix(); warning.current.setMatrixAt(i, dummy.matrix);
    });
    [body, head, ears, warning].forEach(ref => { ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; });
    const target = enemies.find(e => e.id === sim.targetId); marker.current.visible = !!target;
    if (target) marker.current.position.set(target.x, .055, target.z);
  });
  return <>
    <instancedMesh ref={body} args={[undefined, undefined, 500]} castShadow frustumCulled={false}><capsuleGeometry args={[.3, .38, 3, 6]}/><meshStandardMaterial roughness={.95}/></instancedMesh>
    <instancedMesh ref={head} args={[undefined, undefined, 500]} castShadow frustumCulled={false}><boxGeometry args={[.46, .39, .4]}/><meshStandardMaterial roughness={.9}/></instancedMesh>
    <instancedMesh ref={ears} args={[undefined, undefined, 500]} frustumCulled={false}><octahedronGeometry args={[.49, 0]}/><meshStandardMaterial color="#849c51"/></instancedMesh>
    <instancedMesh ref={warning} args={[undefined, undefined, 500]} frustumCulled={false}><ringGeometry args={[.62, .79, 20]}/><meshBasicMaterial color="#ff895d" transparent opacity={.8}/></instancedMesh>
    <mesh ref={marker} rotation-x={-Math.PI / 2}><ringGeometry args={[.43, .48, 24]}/><meshBasicMaterial color="#f4df9b"/></mesh>
  </>;
}
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
function Corpses() {
  useUI(s => s.revision);
  return <Physics paused={sim.phase !== 'playing'} timeStep={1 / 60} gravity={[0, -14, 0]}>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[50, .1, 50]} position={[0, -.12, 0]}/></RigidBody>
    {effects.filter(e => e.type === 'kill').slice(-20).map(e => <RigidBody key={e.id} position={[e.x, .9, e.z]} linearVelocity={[Math.sin(e.facing) * 5, 4, Math.cos(e.facing) * 5]} angularVelocity={[4, 2, 3]} colliders="cuboid" collisionGroups={0x00020001}>
      <mesh castShadow><boxGeometry args={[.5, 1, .4]}/><meshStandardMaterial color={enemyTypes[e.enemyType ?? 'goblin'].color}/></mesh>
      <mesh position={[0, .6, 0]}><boxGeometry args={[.45, .38, .4]}/><meshStandardMaterial color="#93a45e"/></mesh>
    </RigidBody>)}
  </Physics>;
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
    <CameraAndLoop/><Environment/>{sim.players.map(p => <Warrior key={p.id} playerId={p.id}/>)}<Horde/><HitParticles/><DamageNumbers/><PlayerLabels/><Suspense fallback={null}><Corpses/></Suspense>
  </Canvas>;
}
