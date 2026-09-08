import { expect, it } from 'vitest';
import { Simulation } from './index';

it('adds bounded, repeatable perpendicular variation and passes it to corpses', () => {
  const sample = () => {
    const s = new Simulation({knockback:4});
    return s.enemies.slice(0,3).map(e => {
      Object.assign(e,{x:s.player.x,z:s.player.z+2,hp:1});
      s['damageEnemy'](s.player,e,2,0);
      expect(e.vz).toBeCloseTo(4);
      expect(Math.abs(e.vx)).toBeLessThanOrEqual(.6);
      expect(s.events.at(-1)?.knockbackFacing).toBeCloseTo(Math.atan2(e.vx,e.vz));
      return e.vx;
    });
  };
  const values=sample();
  expect(new Set(values).size).toBeGreaterThan(1);
  expect(sample()).toEqual(values);
});
