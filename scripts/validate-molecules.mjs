import { pubchem3dMolecules } from '../src/pubchem-3d-data.js';

function eigenvalues3(matrix) {
  const values=matrix.map((row)=>[...row]);
  for (let iteration=0; iteration<32; iteration++) {
    let p=0,q=1;
    for (const [a,b] of [[0,1],[0,2],[1,2]]) if (Math.abs(values[a][b])>Math.abs(values[p][q])) { p=a; q=b; }
    if (Math.abs(values[p][q])<1e-12) break;
    const angle=.5*Math.atan2(2*values[p][q],values[q][q]-values[p][p]), cosine=Math.cos(angle), sine=Math.sin(angle);
    const pp=values[p][p],qq=values[q][q],pq=values[p][q];
    values[p][p]=cosine*cosine*pp-2*sine*cosine*pq+sine*sine*qq;
    values[q][q]=sine*sine*pp+2*sine*cosine*pq+cosine*cosine*qq;
    values[p][q]=values[q][p]=0;
    for (let axis=0; axis<3; axis++) if (axis!==p&&axis!==q) {
      const ap=values[axis][p],aq=values[axis][q];
      values[axis][p]=values[p][axis]=cosine*ap-sine*aq;
      values[axis][q]=values[q][axis]=sine*ap+cosine*aq;
    }
  }
  return [values[0][0],values[1][1],values[2][2]].sort((a,b)=>b-a);
}

function inspectMolecule(molecule) {
  const {atoms,bonds}=molecule, adjacency=Array.from({length:atoms.length},()=>[]), errors=[];
  for (const [a,b] of bonds) {
    if (!atoms[a]||!atoms[b]||a===b) { errors.push(`invalid bond ${a}-${b}`); continue; }
    adjacency[a].push(b); adjacency[b].push(a);
  }
  const visited=new Set([0]), queue=[0];
  while (queue.length) for (const neighbor of adjacency[queue.shift()]) if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
  if (visited.size!==atoms.length) errors.push(`disconnected ${visited.size}/${atoms.length}`);
  const center=atoms.reduce((sum,atom)=>[sum[0]+atom.x,sum[1]+atom.y,sum[2]+atom.z],[0,0,0]).map((value)=>value/atoms.length);
  const covariance=Array.from({length:3},()=>[0,0,0]);
  for (const atom of atoms) {
    const point=[atom.x-center[0],atom.y-center[1],atom.z-center[2]];
    for (let row=0; row<3; row++) for (let column=0; column<3; column++) covariance[row][column]+=point[row]*point[column]/atoms.length;
  }
  const eigenvalues=eigenvalues3(covariance), thickness=Math.sqrt(Math.max(0,eigenvalues[2])), spatialRatio=Math.sqrt(Math.max(0,eigenvalues[2]/eigenvalues[0]));
  const lengths=bonds.map(([a,b])=>Math.hypot(atoms[b].x-atoms[a].x,atoms[b].y-atoms[a].y,atoms[b].z-atoms[a].z));
  const meanLength=lengths.reduce((sum,length)=>sum+length,0)/lengths.length, minLength=Math.min(...lengths), maxLength=Math.max(...lengths);
  if (minLength<.72||maxLength>1.72) errors.push(`bond range ${minLength.toFixed(2)}–${maxLength.toFixed(2)}`);
  if (thickness<.32||spatialRatio<.10) errors.push(`near-planar thickness=${thickness.toFixed(2)} ratio=${spatialRatio.toFixed(3)}`);
  if (!molecule.source?.startsWith('PubChem CID ')) errors.push('missing PubChem source');
  return {errors,summary:`${molecule.id.padEnd(15)} atoms=${String(atoms.length).padStart(2)} bonds=${String(bonds.length).padStart(2)} bond=${meanLength.toFixed(2)} [${minLength.toFixed(2)},${maxLength.toFixed(2)}] axes=${eigenvalues.map((value)=>Math.sqrt(Math.max(0,value)).toFixed(2)).join('/')} ratio=${spatialRatio.toFixed(3)}`};
}

let failures=0;
for (const molecule of pubchem3dMolecules) {
  const result=inspectMolecule(molecule);
  console.log(`${result.errors.length?'FAIL':'PASS'} ${result.summary}`);
  for (const error of result.errors) console.error(`  ${error}`);
  failures+=result.errors.length;
}
if (failures) process.exitCode=1;
