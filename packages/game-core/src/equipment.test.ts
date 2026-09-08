import { describe, it, expect } from 'vitest';
import { equipment, characters, type CharacterId } from '@arena/game-data';
import { Simulation } from './index';
import { RunProgress } from './run';

describe('elemental equipment', () => {
  for (const character of Object.keys(characters) as CharacterId[]) {
    it(`${character} validates offers and replaces gear across shops`, () => {
      const roster=[{id:10000,name:'Hero',character}];
      const run=new RunProgress('gear',roster),s=new Simulation();
      s.reset(roster);run.finish(s.players,true);
      const p=run.summary.players[0];
      expect(p.offers).toEqual([`${character}_fire`,`${character}_lightning`]);
      expect(run.buy(p.id,`${character}_ice`)).toBe(false);
      expect(run.buy(p.id,character==='mage'?'archer_fire':'mage_fire')).toBe(false);
      expect(run.buy(p.id,'__proto__')).toBe(false);
      p.gold=79;expect(run.buy(p.id,p.offers[0])).toBe(false);p.gold=100;
      expect(run.buy(p.id,p.offers[0])).toBe(true);
      expect(run.buy(p.id,p.offers[1])).toBe(false);expect(p.gold).toBe(20);
      run.next();s.reset(run.summary.players,2);
      expect(s.player.equippedWeapon).toBe(`${character}_fire`);
      expect(run.buy(p.id,p.offers[1])).toBe(false);
      run.finish(s.players,true);expect(p.offers).toEqual([`${character}_ice`,`${character}_poison`]);
      expect(run.buy(p.id,p.offers[1])).toBe(true);expect(p.equippedWeapon).toBe(`${character}_poison`);
      run.next();s.reset(run.summary.players,3);expect(s.player.equippedWeapon).toBe(`${character}_poison`);
    });
  }
  for (const weapon of Object.values(equipment)) {
    it(`${weapon.id} applies and records its elemental damage`, () => {
      const s=new Simulation({enemySpeed:0,knockback:0});
      s.reset([{id:10000,name:'Hero',character:weapon.character,equippedWeapon:weapon.id}]);
      s.spawnClock=999;s.enemies=s.enemies.slice(0,1);
      Object.assign(s.enemies[0],{x:0,z:2,hp:500});
      for(let i=0;i<40;i++)s.stepMultiplayer(1/60,new Map());
      const base=characters[weapon.character].damage;
      expect(s.player.stats.totalDamage).toBe(base);
      expect(s.player.stats.damageByWeapon[weapon.id]).toBe(base);
      expect(s.player.stats.damageByType?.[weapon.element]).toBe(0);
      expect(s.player.stats.damageByType?.physical).toBe(base);
      expect(s.events.find(e=>e.type==='hit')?.element).toBe(weapon.element);
      if(weapon.element==='fire') expect(s.enemies[0].burn).toBeDefined();
      if(weapon.element==='poison') expect(s.enemies[0].poisoned).toBeGreaterThan(4);
      if(weapon.element==='ice') expect(s.enemies[0].chilled).toBeGreaterThan(4);
    });
  }
});
