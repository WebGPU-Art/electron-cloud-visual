export const elements = [
  ['H','氢'],['He','氦'],['Li','锂'],['Be','铍'],['B','硼'],['C','碳'],['N','氮'],['O','氧'],['F','氟'],['Ne','氖'],['Na','钠'],['Mg','镁'],['Al','铝'],['Si','硅'],['P','磷'],['S','硫'],['Cl','氯'],['Ar','氩'],['K','钾'],['Ca','钙'],['Sc','钪'],['Ti','钛'],['V','钒'],['Cr','铬'],['Mn','锰'],['Fe','铁'],['Co','钴'],['Ni','镍'],['Cu','铜'],['Zn','锌'],['Ga','镓'],['Ge','锗'],['As','砷'],['Se','硒'],['Br','溴'],['Kr','氪'],['Rb','铷'],['Sr','锶'],['Y','钇'],['Zr','锆'],['Nb','铌'],['Mo','钼'],['Tc','锝'],['Ru','钌'],['Rh','铑'],['Pd','钯'],['Ag','银'],['Cd','镉'],['In','铟'],['Sn','锡'],['Sb','锑'],['Te','碲'],['I','碘'],['Xe','氙'],['Cs','铯'],['Ba','钡'],['La','镧'],['Ce','铈'],['Pr','镨'],['Nd','钕'],['Pm','钷'],['Sm','钐'],['Eu','铕'],['Gd','钆'],['Tb','铽'],['Dy','镝'],['Ho','钬'],['Er','铒'],['Tm','铥'],['Yb','镱'],['Lu','镥'],['Hf','铪'],['Ta','钽'],['W','钨'],['Re','铼'],['Os','锇'],['Ir','铱'],['Pt','铂'],['Au','金'],['Hg','汞'],['Tl','铊'],['Pb','铅'],['Bi','铋'],['Po','钋'],['At','砹'],['Rn','氡'],['Fr','钫'],['Ra','镭'],['Ac','锕'],['Th','钍'],['Pa','镤'],['U','铀'],['Np','镎'],['Pu','钚'],['Am','镅'],['Cm','锔'],['Bk','锫'],['Cf','锎'],['Es','锿'],['Fm','镄'],['Md','钔'],['No','锘'],['Lr','铹'],['Rf','𬬻'],['Db','𬭊'],['Sg','𬭳'],['Bh','𬭛'],['Hs','𬭶'],['Mt','鿏'],['Ds','𫟼'],['Rg','𬬭'],['Cn','鿔'],['Nh','鉨'],['Fl','鈇'],['Mc','镆'],['Lv','鉝'],['Ts','鿬'],['Og','鿫']
].map(([symbol, name], index) => ({ symbol, name, atomic: index + 1, category: index < 2 ? '主族元素' : index > 88 ? '锕系 / 合成元素' : '原子轨道' }));

export const periodicRows = [
  ['H',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,'He'],
  ['Li','Be',null,null,null,null,null,null,null,null,null,null,'B','C','N','O','F','Ne'],
  ['Na','Mg',null,null,null,null,null,null,null,null,null,null,'Al','Si','P','S','Cl','Ar'],
  ['K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr'],
  ['Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe'],
  ['Cs','Ba','La','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn'],
  ['Fr','Ra','Ac','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'],
  [null,null,null,'Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu',null],
  [null,null,null,'Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr',null]
];

export const molecules = [
  { id: 'water', formula: 'H₂O', name: '水', geometry: '折线型', description: '氧原子的孤对电子使水分子呈约 104.5° 的弯曲结构。', atoms: [{symbol:'O',x:0,y:0,z:0},{symbol:'H',x:-1.25,y:.72,z:0},{symbol:'H',x:1.25,y:.72,z:0}] },
  { id: 'co2', formula: 'CO₂', name: '二氧化碳', geometry: '线性', description: '中心碳与两个氧原子形成对称的双键电子密度。', atoms: [{symbol:'C',x:0,y:0,z:0},{symbol:'O',x:-1.5,y:0,z:0},{symbol:'O',x:1.5,y:0,z:0}] },
  { id: 'methane', formula: 'CH₄', name: '甲烷', geometry: '正四面体', description: '四个 C–H 键指向正四面体的顶点。', atoms: [{symbol:'C',x:0,y:0,z:0},{symbol:'H',x:1,y:1,z:1},{symbol:'H',x:-1,y:-1,z:1},{symbol:'H',x:-1,y:1,z:-1},{symbol:'H',x:1,y:-1,z:-1}] },
  { id: 'ammonia', formula: 'NH₃', name: '氨', geometry: '三角锥', description: '氮原子的孤对电子塑造三角锥分子构型。', atoms: [{symbol:'N',x:0,y:0,z:0},{symbol:'H',x:1.1,y:.5,z:.65},{symbol:'H',x:-1.1,y:.5,z:.65},{symbol:'H',x:0,y:.5,z:-1.1}] },
  { id: 'oxygen', formula: 'O₂', name: '氧气', geometry: '线性', description: '同核双原子的 π 轨道展示键合和反键合电子密度。', atoms: [{symbol:'O',x:-.9,y:0,z:0},{symbol:'O',x:.9,y:0,z:0}] },
  { id: 'nitrogen', formula: 'N₂', name: '氮气', geometry: '线性', description: '强三键使氮气在常温下具有很高稳定性。', atoms: [{symbol:'N',x:-.9,y:0,z:0},{symbol:'N',x:.9,y:0,z:0}] },
  { id: 'benzene', formula: 'C₆H₆', name: '苯', geometry: '平面六角形', description: '离域 π 电子云包覆在碳环上下方。', atoms: Array.from({length:6},(_,i)=>({symbol:'C',x:1.35*Math.cos(i*Math.PI/3),y:1.35*Math.sin(i*Math.PI/3),z:0})) },
  { id: 'ethanol', formula: 'C₂H₆O', name: '乙醇', geometry: '链状', description: '羟基氧的高电子密度决定其极性与氢键性质。', atoms: [{symbol:'C',x:-1.5,y:0,z:0},{symbol:'C',x:0,y:0,z:0},{symbol:'O',x:1.35,y:.25,z:0},{symbol:'H',x:2.1,y:.9,z:0}] },
  { id: 'sulfuric', formula: 'H₂SO₄', name: '硫酸', geometry: '四面体核心', description: '硫氧四面体核心与极性 O–H 键共同构成酸性结构。', atoms: [{symbol:'S',x:0,y:0,z:0},{symbol:'O',x:1.15,y:1.15,z:1.15},{symbol:'O',x:-1.15,y:-1.15,z:1.15},{symbol:'O',x:-1.15,y:1.15,z:-1.15},{symbol:'O',x:1.15,y:-1.15,z:-1.15}] },
  { id: 'sodiumchloride', formula: 'NaCl', name: '氯化钠', geometry: '离子对', description: '离子键可视为电子密度从钠向氯的显著偏移。', atoms: [{symbol:'Na',x:-1.1,y:0,z:0},{symbol:'Cl',x:1.1,y:0,z:0}] },
  { id: 'ozone', formula: 'O₃', name: '臭氧', geometry: '折线型', description: '共振使 π 电子在三个氧原子之间离域。', atoms: [{symbol:'O',x:0,y:0,z:0},{symbol:'O',x:-1.2,y:.75,z:0},{symbol:'O',x:1.2,y:.75,z:0}] },
  { id: 'glucose', formula: 'C₆H₁₂O₆', name: '葡萄糖', geometry: '环状', description: '碳、氧骨架形成富含羟基的环状分子网络。', atoms: Array.from({length:6},(_,i)=>({symbol:i===0?'O':'C',x:1.5*Math.cos(i*Math.PI/3),y:1.5*Math.sin(i*Math.PI/3),z:i%2?.35:-.35})) }
];
