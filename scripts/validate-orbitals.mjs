import assert from 'node:assert/strict';
import {bondFrame,sampleDirection} from '../src/webgpu-cloud.js';
import {molecules} from '../src/science-data.js';
import {inferBonds} from '../src/molecular-model.js';

const benzene=molecules.find(m=>m.id==='benzene');
for(const angle of [0,.4,Math.PI/2,2.2]) {
  const atoms=benzene.atoms.map(a=>({...a,y:a.y*Math.cos(angle)-a.z*Math.sin(angle),z:a.y*Math.sin(angle)+a.z*Math.cos(angle)}));
  const bonds=inferBonds(atoms,benzene.id,benzene.bonds);
  for(const bond of bonds.filter(b=>b.order>1.2)) {
    const {v,axial}=bondFrame(atoms,bond,bonds);
    assert.equal(axial,false);
    assert.ok(Math.abs(-Math.sin(angle)*v[1]+Math.cos(angle)*v[2])>1-1e-10,'π direction must follow the molecular plane after rotation');
  }
}
// A deterministic stream rejects more than 24 proposals before accepting one.
// The previous bounded sampler returned one of those rejected directions.
const original=Math.random;
let calls=0;
try {
  Math.random=()=>{const i=calls++;return i<90?[.5,.25,.5][i%3]:[.5,0,0][i%3];};
  const direction=sampleDirection(1,0);
  assert.ok(direction[0]>.999);
  assert.ok(calls>90);
} finally {Math.random=original;}
console.log('PASS orbital rotation covariance and rejection sampling');
