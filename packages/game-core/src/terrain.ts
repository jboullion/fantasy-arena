export type TerrainItem = { x: number; z: number; radius: number; scale: number; rotation: number; model: string; wall: boolean };
/** Separate random stream: scenery never changes combat/spawn randomness. */
export function createTerrain(width: number, length: number) {
  let seed = 7319;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const obstacles: TerrainItem[] = [];
  for (let i = 0; i < Math.floor(width * length / 95); i++) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = (random() - .5) * (width - 12), z = (random() - .5) * (length - 12);
      const tree = random() < .45, scale = .8 + random() * .5, radius = (tree ? .48 : 1.05) * scale;
      if (Math.hypot(x,z) < 7 + radius || obstacles.some(o => Math.hypot(o.x-x,o.z-z) < o.radius + radius + 3.5)) continue;
      obstacles.push({x,z,radius,scale,rotation:random()*Math.PI*2,model:`${tree?'tree':'rock'}-${i%3}`,wall:false}); break;
    }
  }
  const walls: TerrainItem[] = [];
  for (const side of [-1,1]) {
    for (let x = -width/2-2; x <= width/2+2; x += 2.2) walls.push({x,z:side*(length/2+1.6),radius:1.8,scale:1.9+random()*.6,rotation:random()*6.28,model:`rock-${walls.length%3}`,wall:true});
    for (let z = -length/2; z <= length/2; z += 2.2) walls.push({x:side*(width/2+1.6),z,radius:1.8,scale:1.9+random()*.6,rotation:random()*6.28,model:`rock-${walls.length%3}`,wall:true});
  }
  const rocks = [...walls];
  rocks.forEach((o,i) => { if(i%2===0) walls.push({...o,x:o.x+Math.sign(o.x)*1.5,z:o.z+Math.sign(o.z)*1.5,model:`tree-${i%3}`,scale:1.5+random()*.7}); });
  const grass = Array.from({length:Math.floor(width*length/3)},(_,i)=>({x:(random()-.5)*(width-2),z:(random()-.5)*(length-2),rotation:random()*6.28,scale:.65+random()*.65,model:`grass-${i%3}`})).filter(g=>!obstacles.some(o=>Math.hypot(g.x-o.x,g.z-o.z)<o.radius+.25));
  return {obstacles,walls,grass};
}
