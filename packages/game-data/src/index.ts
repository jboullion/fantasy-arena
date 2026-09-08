export const defaults = {
  playerHealth: 100, playerSpeed: 7, enemyHealth: 50, enemySpeed: 2.8,
  enemyDamage: 10, contactRange: 1.1, contactWindup: 0.45, contactCooldown: 1.2,
  swordDamage: 25, swordRange: 2.7, swordCooldown: 0.85, swordArc: 130,
  swordWindup: 0.12, knockback: 7, duration: 60, spawnInterval: 2.4,
  projectileRange: 10, arrowSpeed: 18, missileSpeed: 12,
  fireTickDamage: 5, fireTickInterval: 1, fireDuration: 5, lightningDamage: 5, lightningRadius: 2,
  poisonDuration: 5, poisonDamageMultiplier: .5, iceDuration: 5, iceSpeedMultiplier: .5,
  maxEnemies: 200, arenaWidth: 64, arenaLength: 56,
  cameraHeight: 19, cameraDistance: 16, cameraFov: 48, cameraSmoothing: 5,
};
export type Config = typeof defaults;
export const characters = {
  warrior: { name: 'Human Warrior', title: 'The balanced blade', description: 'Quick on his feet. A sweeping longsword keeps the horde at bay.', health: 100, speed: 7, damage: 25, cooldown: .85, color: '#6b99af' },
  guardian: { name: 'Dwarf Guardian', title: 'Stand your ground', description: 'More health and heavier hits, with a slower stride and sweeping axe.', health: 140, speed: 5.8, damage: 35, cooldown: 1.05, color: '#bc8b50' },
  archer: { name: 'Archer', title: 'One arrow. One target.', description: 'A nimble hunter. Automatically shoots an arrow at the nearest enemy within range.', health: 100, speed: 7, damage: 25, cooldown: .85, color: '#79a965' },
  mage: { name: 'Mage', title: 'A spark of arcane power', description: 'Casts a homing magic missile at the nearest enemy within range. Each missile hits only one foe.', health: 100, speed: 7, damage: 25, cooldown: .85, color: '#a78adb' },
};
export type CharacterId = keyof typeof characters;
export const isRanged = (character: CharacterId) => character === 'archer' || character === 'mage';
export const characterWeapons: Record<CharacterId, string> = { warrior: 'weapon.longsword', guardian: 'weapon.axe', archer: 'weapon.bow', mage: 'weapon.staff' };
export const weaponNames: Record<string, string> = { 'weapon.longsword': 'Longsword', 'weapon.axe': 'Axe', 'weapon.bow': 'Bow', 'weapon.staff': 'Staff' };
export const elements = {
  fire: { name: 'Fire', color: '#ff783c', prefix: 'Ember' },
  lightning: { name: 'Lightning', color: '#e7d8ff', prefix: 'Storm' },
  ice: { name: 'Ice', color: '#79e4ff', prefix: 'Frost' },
  poison: { name: 'Poison', color: '#a4ec40', prefix: 'Venom' },
};
export type Element = keyof typeof elements;
export type WeaponId = `${CharacterId}_${Element}`;
export type WeaponDefinition = { id: WeaponId; character: CharacterId; element: Element; name: string; price: number; effectDescription: string; model: string; effectOrigin: [number,number,number] };
const weaponKinds: Record<CharacterId,string> = { warrior:'Longsword',guardian:'Greataxe',archer:'Bow',mage:'Staff' };
export const equipment = Object.fromEntries((Object.keys(characters) as CharacterId[]).flatMap(character =>
  (Object.keys(elements) as Element[]).map(element => {
    const id: WeaponId = `${character}_${element}`;
    const value: WeaponDefinition = { id,character,element,name:`${elements[element].prefix} ${weaponKinds[character]}`,price:80,effectDescription:element === 'fire' ? `Burns for ${defaults.fireTickDamage} damage every ${defaults.fireTickInterval}s for ${defaults.fireDuration}s` : element === 'lightning' ? `Deals ${defaults.lightningDamage} splash damage within ${defaults.lightningRadius} metres` : element === 'poison' ? `Reduces enemy damage by ${100*(1-defaults.poisonDamageMultiplier)}% for ${defaults.poisonDuration}s` : `Slows enemy movement by ${100*(1-defaults.iceSpeedMultiplier)}% for ${defaults.iceDuration}s`,model:id.replace('_poison','_acid'),
      effectOrigin: character === 'mage' ? [0,1.1,.05] : character === 'archer' ? [0,.2,.3] : [0,0,.85] };
    weaponNames[id]=value.name;
    return [id,value];
  }))) as Record<WeaponId,WeaponDefinition>;
export const getWeapon = (id?: string): WeaponDefinition | undefined => id && Object.hasOwn(equipment,id) ? equipment[id as WeaponId] : undefined;
export function weaponOffers(character: CharacterId, round: number, equipped?: WeaponId): WeaponId[] {
  const available=(Object.keys(equipment) as WeaponId[]).filter(id=>equipment[id].character===character);
  const start=((round-1)*2)%available.length;
  return [...available.slice(start),...available.slice(0,start)].filter(id=>id!==equipped).slice(0,2);
}
export const enemyTypes = {
  goblin: { name: 'Goblin Grunt', unlock: 1, health: 50, speed: 2.8, damage: 10, scale: 1, color: '#647f40' },
  runner: { name: 'Ember Runner', unlock: 2, health: 35, speed: 4.3, damage: 8, scale: .8, color: '#c87943' },
  brute: { name: 'Stone Brute', unlock: 4, health: 120, speed: 2, damage: 18, scale: 1.35, color: '#9a779d' },
  revenant: { name: 'Frost Revenant', unlock: 6, health: 85, speed: 3.5, damage: 15, scale: 1.1, color: '#71b8cc' },
  boss: { name: 'Forest Warlord', unlock: 3, health: 650, speed: 2.1, damage: 25, scale: 2.3, color: '#cc5750' },
};
export type EnemyType = keyof typeof enemyTypes;
export const upgrades = {
  armor: { name: 'Forged plate', description: '+25 maximum health and 2 less damage taken per hit, per rank.', baseCost: 70, costStep: 35, maxLevel: 5 },
};
export type UpgradeId = keyof typeof upgrades;
export const runRules = { rounds: 6, reward: 100 };
export function bossEncounter(round: number) {
  if (round === 3) return { label: 'Mini boss', healthMultiplier: .6 };
  if (round === runRules.rounds) return { label: 'Major boss', healthMultiplier: 1.5 };
  return undefined;
}
export const definitions = { warrior: { id: 'character.warrior', name: 'Human Warrior' }, longsword: { id: 'weapon.longsword', tags: ['melee', 'physical', 'sword'] }, goblin: { id: 'enemy.goblin', name: 'Goblin Grunt' } };
