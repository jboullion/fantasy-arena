import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { effects, sim } from './runtime';
import { enemyTypes } from '@arena/game-data';

// A bounded DOM pool keeps text crisp without textures or per-frame React state.
export function DamageNumbers() {
  const container = useRef<HTMLDivElement>(null!);
  const position = useRef(new Vector3());
  useEffect(() => {
    const layer = document.createElement('div');
    layer.className = 'damage-numbers'; layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 128; i++) { const label = document.createElement('span'); label.style.display = 'none'; layer.appendChild(label); }
    document.body.appendChild(layer); container.current = layer;
    return () => { layer.remove(); };
  }, []);
  useFrame(({ camera, gl }) => {
    if (!container.current) return;
    const labels = container.current.children;
    const bounds = gl.domElement.getBoundingClientRect();
    let index = 0;
    for (const hit of effects) {
      if (hit.type !== 'hit' || hit.amount === undefined || hit.amount <= 0 || index >= labels.length) continue;
      const target = sim.enemies.find(enemy => enemy.id === hit.targetId);
      const age = .9 - hit.life;
      // Follow knockback while alive; after a kill keep the last head position.
      if (target) { hit.x = target.x; hit.z = target.z; }
      position.current.set(hit.x, 1.9 * enemyTypes[hit.enemyType ?? 'goblin'].scale + age * 1.3, hit.z).project(camera);
      const label = labels[index++] as HTMLSpanElement;
      label.textContent = String(hit.amount);
      label.style.display = position.current.z < -1 || position.current.z > 1 ? 'none' : 'block';
      label.style.opacity = String(Math.min(1, hit.life / .3));
      const x = bounds.left + (position.current.x + 1) * bounds.width / 2;
      const y = bounds.top + (1 - position.current.y) * bounds.height / 2;
      label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    for (; index < labels.length; index++) (labels[index] as HTMLSpanElement).style.display = 'none';
  });
  return null;
}
