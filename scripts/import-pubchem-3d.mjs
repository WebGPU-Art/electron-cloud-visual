const targets = [
  {cid:5997,id:'cholesterol',formula:'C27H46O',name:'胆固醇',geometry:'甾体四环',description:'四个稠合环与柔性烃链共同形成明显的三维甾体构象。'},
  {cid:5288826,id:'morphine',formula:'C17H19NO3',name:'吗啡',geometry:'桥连稠合环',description:'桥连多环骨架、醚桥和羟基构成刚性的三维构象。'},
  {cid:5904,id:'penicillin-g',formula:'C16H18N2O4S',name:'青霉素 G',geometry:'β-内酰胺',description:'张力 β-内酰胺环与含硫五元环形成非平面的稠合核心。'},
  {cid:5280795,id:'vitamin-d3',formula:'C27H44O',name:'维生素 D₃',geometry:'开环甾体',description:'开环甾体骨架与长烃链呈现柔性而非平面的构象。'},
  {cid:14985,id:'vitamin-e',formula:'C29H50O2',name:'维生素 E',geometry:'苯并吡喃侧链',description:'杂环头部连接长支化侧链，展示显著的三维构象自由度。'},
  {cid:135398744,id:'sildenafil',formula:'C22H30N6O4S',name:'西地那非',geometry:'多杂环药物',description:'多个含氮杂环、磺酰胺和柔性侧链共同组成复杂三维骨架。'},
  {cid:5743,id:'dexamethasone',formula:'C22H29FO5',name:'地塞米松',geometry:'含氟甾体',description:'含氟多羟基甾体具有多个手性中心和刚性稠合环。'},
  {cid:33613,id:'amoxicillin',formula:'C16H19N3O5S',name:'阿莫西林',geometry:'β-内酰胺抗生素',description:'β-内酰胺、含硫环和芳香侧链组成多手性中心三维结构。'},
];

const subscript = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
const prettyFormula = (formula) => formula.replace(/\d/g,(digit)=>subscript[digit]);
const pause = (milliseconds) => new Promise((resolve)=>setTimeout(resolve,milliseconds));

function parseSdf(sdf, target) {
  const lines=sdf.split(/\r?\n/), atomCount=Number(lines[3].slice(0,3)), bondCount=Number(lines[3].slice(3,6));
  if (!atomCount||!bondCount) throw new Error(`Invalid PubChem SDF for CID ${target.cid}`);
  const rawAtoms=lines.slice(4,4+atomCount).map((line)=>({symbol:line.slice(31,34).trim(),x:Number(line.slice(0,10)),y:Number(line.slice(10,20)),z:Number(line.slice(20,30))}));
  const rawBonds=lines.slice(4+atomCount,4+atomCount+bondCount).map((line)=>[Number(line.slice(0,3))-1,Number(line.slice(3,6))-1,Number(line.slice(6,9))]);
  const heavyMap=new Map(), atoms=[];
  rawAtoms.forEach((atom,index)=>{if(atom.symbol!=='H'){heavyMap.set(index,atoms.length);atoms.push(atom);}});
  const bonds=rawBonds.filter(([a,b])=>heavyMap.has(a)&&heavyMap.has(b)).map(([a,b,order])=>[heavyMap.get(a),heavyMap.get(b),order]);
  const center=atoms.reduce((sum,atom)=>[sum[0]+atom.x,sum[1]+atom.y,sum[2]+atom.z],[0,0,0]).map((value)=>value/atoms.length);
  const lengths=bonds.map(([a,b])=>Math.hypot(atoms[b].x-atoms[a].x,atoms[b].y-atoms[a].y,atoms[b].z-atoms[a].z)).sort((a,b)=>a-b);
  const median=lengths[Math.floor(lengths.length/2)], scale=1.24/median;
  const normalizedAtoms=atoms.map((atom)=>({symbol:atom.symbol,x:+((atom.x-center[0])*scale).toFixed(3),y:+((atom.y-center[1])*scale).toFixed(3),z:+((atom.z-center[2])*scale).toFixed(3)}));
  return {...target,formula:prettyFormula(target.formula),source:`PubChem CID ${target.cid}`,validated3d:true,atoms:normalizedAtoms,bonds};
}

const molecules=[];
for (const target of targets) {
  const response=await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${target.cid}/SDF?record_type=3d`);
  if (!response.ok) throw new Error(`PubChem CID ${target.cid}: HTTP ${response.status}`);
  molecules.push(parseSdf(await response.text(),target));
  await pause(260);
}
process.stdout.write(`// Generated from PubChem PUG REST 3D conformers by scripts/import-pubchem-3d.mjs.\nexport const pubchem3dMolecules=${JSON.stringify(molecules)};\n`);
