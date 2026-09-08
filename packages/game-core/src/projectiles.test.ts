import { describe, it, expect } from 'vitest';
import { Simulation } from './index';
import { defaults, type WeaponId, type CharacterId } from '@arena/game-data';
const tick = (s: Simulation, seconds: number) => { for(let i=0;i<Math.round(seconds*60);i++) s.stepMultiplayer(1/60,new Map()); };
function setup(character: CharacterId, equippedWeapon?: WeaponId) {
  const s = new Simulation({enemySpeed:0,knockback:0});
  s.reset([{id:10000,name:character,character,equippedWeapon}]);s.spawnClock=999;
  s.enemies=s.enemies.slice(0,2);
  Object.assign(s.enemies[0],{x:0,z:6,hp:500});Object.assign(s.enemies[1],{x:1,z:7,hp:500});
  return s;
}
describe('ranged characters',()=>{
  for(const character of ['archer','mage'] as const) {
    it(`${character} launches at the nearest target and deals the same base damage as the warrior to only it on arrival`,()=>{
      const s=setup(character);tick(s,.17);
      expect(s.projectiles).toHaveLength(1);expect(s.projectiles[0].targetId).toBe(s.enemies[0].id);
      expect(s.enemies.map(e=>e.hp)).toEqual([500,500]);
      tick(s,.55);expect(s.enemies.map(e=>e.hp)).toEqual([475,500]);
      expect(s.player.stats.totalDamage).toBe(25);
      expect(s.player.stats.damageByWeapon[character==='archer'?'weapon.bow':'weapon.staff']).toBe(25);
      expect(s.events.some(e=>e.type==='swing')).toBe(false);
      expect(s.projectiles).toHaveLength(0);
    });
    it(`${character} respects range, cooldown and upgrade damage`,()=>{
      const s=setup(character,`${character}_ice`);s.enemies.forEach(e=>e.z=12);tick(s,.5);expect(s.projectiles).toHaveLength(0);
      s.enemies[0].z=5;tick(s,.7);expect(s.player.stats.totalDamage).toBe(25);
      expect(s.events.filter(e=>e.type==='shoot')).toHaveLength(1);
    });
    it(`${character} does not retarget a projectile when its target dies`,()=>{
      const s=setup(character);tick(s,.17);s.enemies.shift();tick(s,.5);
      expect(s.projectiles).toHaveLength(0);expect(s.enemies[0].hp).toBe(500);expect(s.kills).toBe(0);
    });
  }
  it('resolves simultaneous lethal projectiles once, with no overkill in statistics',()=>{
    const s=setup('archer');s.enemies=s.enemies.slice(0,1);s.enemies[0].hp=30;
    tick(s,.17);s.projectiles.push({...s.projectiles[0],id:s.nextId++});tick(s,.5);
    expect(s.kills).toBe(1);expect(s.player.stats.totalDamage).toBe(30);expect(s.player.stats.kills).toBe(1);
    expect(s.projectiles).toHaveLength(0);
  });
  it('freezes projectiles on pause and clears them on reset, completion and owner departure',()=>{
    const s=setup('mage');tick(s,.17);s.phase='paused';const before=structuredClone(s.projectiles);tick(s,.5);expect(s.projectiles).toEqual(before);
    s.reset();expect(s.projectiles).toHaveLength(0);
    const a=setup('mage');tick(a,.17);a.time=a.config.duration;tick(a,.02);expect(a.projectiles).toHaveLength(0);
    const b=setup('mage');tick(b,.17);b.players[0].id=20000;tick(b,.02);expect(b.projectiles).toHaveLength(0);
  });
  it('expires shots that cannot reach a retreating target',()=>{
    const s=setup('mage');tick(s,.17);s.player.cooldown=999;s.enemies[0].z=100; s.config.arenaLength=300;
    tick(s,2);expect(s.projectiles).toHaveLength(0);expect(s.player.stats.totalDamage).toBe(0);
  });
  it('records dwarf axe damage separately from the longsword',()=>{
    const s=setup('guardian');s.enemies[0].z=2;tick(s,.2);expect(s.player.stats.damageByWeapon['weapon.axe']).toBe(35);
  });
  it('reduces full-round spawn pressure while retaining the enemy unlock schedule',()=>{
    const s=new Simulation({enemySpeed:0,enemyDamage:0,swordRange:0,playerHealth:99999});
    tick(s,59.9);expect(s.enemies.length).toBeLessThan(75);expect(s.enemies.length).toBeGreaterThan(25);
    expect(defaults.spawnInterval).toBe(2.4);
  });
});
