const covalentRadii = {
  H:.60, C:.85, N:.82, O:.78, F:.74, Na:1.25, Mg:1.15, P:1.02, S:1.05,
  Cl:1.05, Br:1.14, I:1.28,
};

const maximumNeighbors = {
  H:1, C:4, N:4, O:2, F:1, Na:1, Mg:2, P:5, S:6, Cl:1, Br:1, I:1,
};

const bondOrderOverrides = {
  co2:{'0-1':2,'0-2':2}, oxygen:{'0-1':2}, nitrogen:{'0-1':3},
  benzene:{'0-1':1.5,'1-2':1.5,'2-3':1.5,'3-4':1.5,'4-5':1.5,'0-5':1.5},
  ozone:{'0-1':1.5,'0-2':1.5}, carbonmonoxide:{'0-1':3},
  sulfurdioxide:{'0-1':1.5,'0-2':1.5}, nitrogendioxide:{'0-1':1.5,'0-2':1.5},
  nitricacid:{'0-1':1.33,'0-2':1.33,'0-3':1.33}, formaldehyde:{'0-1':2},
  acetylene:{'1-2':3}, ethylene:{'0-1':2}, aceticacid:{'1-2':2},
  urea:{'0-1':2}, acetone:{'0-1':2},
  bicarbonate:{'1-2':1.33,'1-3':1.33,'1-4':1.33},
};

function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function inferBonds(atoms, moleculeId='') {
  const candidates=[];
  for (let a=0; a<atoms.length; a++) {
    for (let b=a+1; b<atoms.length; b++) {
      const first=atoms[a], second=atoms[b];
      const dx=second.x-first.x, dy=second.y-first.y, dz=second.z-first.z;
      const distance=Math.hypot(dx,dy,dz);
      const radius=(covalentRadii[first.symbol]||.9)+(covalentRadii[second.symbol]||.9);
      const normalizedDistance=distance/radius;
      if (normalizedDistance<=1.24) candidates.push({a,b,distance,normalizedDistance});
    }
  }
  candidates.sort((left,right)=>left.normalizedDistance-right.normalizedDistance);
  const neighbors=new Array(atoms.length).fill(0), selected=[];
  for (const candidate of candidates) {
    const firstLimit=maximumNeighbors[atoms[candidate.a].symbol]||6;
    const secondLimit=maximumNeighbors[atoms[candidate.b].symbol]||6;
    if (neighbors[candidate.a]>=firstLimit||neighbors[candidate.b]>=secondLimit) continue;
    neighbors[candidate.a]++; neighbors[candidate.b]++;
    const key=pairKey(candidate.a,candidate.b);
    selected.push({...candidate,order:bondOrderOverrides[moleculeId]?.[key]||1});
  }
  return selected;
}

export function molecularComposition(atoms) {
  const counts=new Map();
  for (const atom of atoms) counts.set(atom.symbol,(counts.get(atom.symbol)||0)+1);
  return [...counts].map(([symbol,count])=>({symbol,count}));
}
