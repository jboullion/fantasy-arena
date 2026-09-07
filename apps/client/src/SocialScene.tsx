import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { type CharacterId } from '@arena/game-data';
import { SocialPlayer } from './CharacterModels';
import { useNetwork } from './network';

function Asset({ camp }: { camp: boolean }) {
  const gltf = useLoader(GLTFLoader, `/models/environments/${camp ? 'campfire' : 'tavern'}.glb`);
  const scene = useMemo(() => { const copy = gltf.scene.clone(true); copy.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true; }); return copy; }, [gltf]);
  return <primitive object={scene}/>;
}
function Fire({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);
  const light = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => { const t = clock.elapsedTime; group.current.scale.y = 1 + Math.sin(t * 9) * .12; light.current.intensity = 35 + Math.sin(t * 11) * 4; });
  return <group position={position}><pointLight ref={light} color="#ffad51" distance={13} decay={2}/><group ref={group}>
    {[0,1,2].map(i => <mesh key={i} position={[(i-1)*.22,.35+i*.1,0]} rotation-z={(i-1)*.2}><coneGeometry args={[.27,.9,5]}/><meshBasicMaterial color={i===1?'#ffe39a':'#ff8b32'}/></mesh>)}
  </group></group>;
}
function Camera({ camp }: { camp: boolean }) {
  useFrame(({ camera, size }) => { camera.position.set(7, camp ? 6 : 5, camp ? 11 : 10); camera.lookAt(size.width > 900 ? 1.9 : 0, .9, 0); });
  return null;
}
export function SocialScene({ camp = false, character = 'warrior' }: { camp?: boolean; character?: CharacterId }) {
  const net = useNetwork();
  const members = net.lobby?.members ?? [{ actorId: 0, name: 'Your adventurer', character, ready: false }];
  const seats: [number,number,number][] = [[-2.4,0,.8],[-1,0,-2.3],[1,0,-2.3],[2.4,0,.8]];
  return <div className="social-world" data-testid={camp ? 'campfire-scene' : 'tavern-scene'} aria-label={camp ? 'Party seated around a woodland campfire' : 'Party gathered inside the tavern'}>
    <Canvas shadows dpr={[1,1.5]} camera={{ fov: 48 }} fallback={<div className="fallback">Enable WebGL to view the party.</div>}>
      <color attach="background" args={[camp ? '#101e24' : '#241b14']}/><fog attach="fog" args={[camp ? '#101e24' : '#241b14',18,40]}/>
      <Camera camp={camp}/><hemisphereLight args={[camp ? '#a8c9e8' : '#ffe4b1','#3c2921',camp ? 1.6 : 2]}/>
      <directionalLight position={[-3,9,4]} intensity={camp ? 1.5 : 2.3} color={camp ? '#9bbfe9' : '#ffe0af'} castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={.04}/>
      <Suspense fallback={null}><Asset camp={camp}/>{members.map((m,i) => <SocialPlayer key={m.actorId} character={m.character} position={camp ? seats[i] : [(i-(members.length-1)/2)*1.55,0,0]} facing={camp ? Math.atan2(-seats[i][0],-seats[i][2]) : .35} seated={camp} seed={m.actorId}/>)}</Suspense>
      <Fire position={camp ? [0,.2,0] : [-3.6,.35,-4.7]}/>
    </Canvas>
    <div className="scene-caption">{camp ? 'THE EMBER CAMP · A MOMENT OF RESPITE' : 'THE WAYFARER’S REST · PARTY LOBBY'}<div>{members.map(m => <span key={m.actorId}>{m.name} {m.ready ? '· Ready' : ''}</span>)}</div></div>
  </div>;
}
