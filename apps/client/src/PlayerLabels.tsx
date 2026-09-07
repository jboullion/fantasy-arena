import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { sim } from './runtime';
import { networked, useNetwork } from './network';
export function PlayerLabels() {
  const layer = useRef<HTMLDivElement | null>(null), position = useRef(new Vector3());
  useEffect(() => {
    if (!networked) return;
    const element = document.createElement('div'); element.className = 'player-labels'; element.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) element.appendChild(document.createElement('span'));
    document.body.appendChild(element); layer.current = element;
    return () => { element.remove(); layer.current = null; };
  }, []);
  useFrame(({ camera, gl }) => {
    if (!layer.current) return;
    const bounds = gl.domElement.getBoundingClientRect();
    Array.from(layer.current.children).forEach((child, i) => {
      const label = child as HTMLSpanElement, p = sim.players[i];
      if (!p) { label.style.display = 'none'; return; }
      position.current.set(p.x, 2.25, p.z).project(camera);
      label.style.display = Math.abs(position.current.z) > 1 ? 'none' : 'block';
      label.textContent = `${p.name}${p.id === sim.localPlayerId ? ' · YOU' : ''}${p.hp <= 0 && useNetwork.getState().lobby?.stage !== 'won' ? ' · Fallen' : ''}`;
      label.className = p.character;
      label.style.transform = `translate(${bounds.left + (position.current.x + 1) * bounds.width / 2}px, ${bounds.top + (1 - position.current.y) * bounds.height / 2}px) translate(-50%, -100%)`;
    });
  });
  return null;
}
