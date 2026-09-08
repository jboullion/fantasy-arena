import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateBytes} from 'gltf-validator';
const manifest=JSON.parse(readFileSync('apps/client/public/models/manifest.json'));
const report=[];
for(const [kind,model] of Object.entries(manifest.models)) {
  const bytes=readFileSync(`apps/client/public${model.url}`);
  const validation=await validateBytes(new Uint8Array(bytes),{uri:model.url});
  assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const nodes=json.nodes.filter(n=>n.mesh!==undefined);
  assert.equal(nodes.length,Object.keys(model.parts).length);
  assert.equal(json.materials.length,1,'One shared vertex-color material');
  assert.equal(json.images?.length??0,0,'No texture downloads');
  assert.ok(bytes.length<250000,'Per-model download budget');
  for(const [name,part] of Object.entries(model.parts)) {
    const node=nodes.find(n=>n.extras?.part===name); assert.ok(node,`Missing ${kind}/${name}`);
    assert.ok(part.halfExtents.every(n=>n>0));
    (node.translation ?? [0,0,0]).forEach((v,i)=>assert.ok(Math.abs(v-part.position[i])<.0001,'Pivot matches physics manifest'));
    if(part.role==='weapon') assert.equal(part.parent,undefined,'Weapons have no death joint');
    if(part.parent){assert.ok(model.parts[part.parent]);assert.equal(part.anchor.length,3);}
  }
  let triangles=0;
  for(const mesh of json.meshes)for(const primitive of mesh.primitives){triangles+=json.accessors[primitive.indices].count/3;assert.ok(primitive.attributes.COLOR_0!==undefined);}
  assert.ok(triangles<4000,'Low-poly triangle budget');
  report.push({kind,bytes:bytes.length,triangles,parts:nodes.length,sha256:createHash('sha256').update(bytes).digest('hex'),issues:validation.issues});
}
mkdirSync('test-results',{recursive:true});writeFileSync('test-results/character-assets.json',JSON.stringify(report,null,2));
console.log(report.map(({issues,...r})=>({...r,errors:issues.numErrors,warnings:issues.numWarnings})));
