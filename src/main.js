import './app.css';
import './workspace.css';
import { elements, molecules, periodicRows } from './science-data.js';
import { createElectronCloud } from './webgpu-cloud.js';
import { inferBonds, molecularComposition } from './molecular-model.js';

const app = document.querySelector('#app');
const current = { kind: 'element', id: 'H', mode: 'orbital' };

function elementBySymbol(symbol) {
  return elements.find((item) => item.symbol === symbol) || elements[0];
}

function shellDistribution(electrons) {
  const capacities = [2, 8, 18, 32, 32, 18, 8];
  const result = [];
  let left = electrons;
  for (const capacity of capacities) {
    if (left <= 0) break;
    const value = Math.min(left, capacity);
    result.push(value);
    left -= value;
  }
  return result;
}

function formulaElectronCount(formula) {
  const subscriptDigits={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
  let total=0;
  for (const match of formula.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
    const count=Number([...match[2]].map((digit)=>subscriptDigits[digit]).join('')||1);
    total+=elementBySymbol(match[1]).atomic*count;
  }
  return total;
}

function cloudAtoms() {
  if (current.kind === 'element') {
    const element = elementBySymbol(current.id);
    return [{ ...element, x: 0, y: 0, z: 0 }];
  }
  return molecules.find((item) => item.id === current.id).atoms.map((atom) => ({
    ...elementBySymbol(atom.symbol),
    ...atom,
  }));
}

function selectedInfo() {
  if (current.kind === 'element') {
    const element = elementBySymbol(current.id);
    return {
      eyebrow: `${element.category} · ${element.atomic} 号元素`,
      name: element.name,
      symbol: element.symbol,
      description: element.description || `${element.name}（${element.symbol}）的电子概率密度模型，展示原子核周围电子层的空间分布。`,
      electrons: element.atomic,
      shells: shellDistribution(element.atomic),
      charge: '中性原子',
      molecule: false,
    };
  }
  const molecule = molecules.find((item) => item.id === current.id);
  const electronCount = formulaElectronCount(molecule.formula);
  const composition=molecularComposition(molecule.atoms);
  return {
    eyebrow: `常见化合物 · ${molecule.formula}`,
    name: molecule.name,
    symbol: molecule.formula,
    description: molecule.description,
    electrons: electronCount,
    shells: molecule.atoms.map((atom) => elementBySymbol(atom.symbol).atomic),
    charge: molecule.geometry,
    molecule: true,
    atomCount: molecule.atoms.length,
    bondCount: inferBonds(molecule.atoms,molecule.id,molecule.bonds).length,
    composition,
  };
}

function renderPeriodicTable() {
  return periodicRows.map((row) => `
    <div class="period-row">
      ${row.map((symbol) => symbol ? `<button class="period-cell ${current.kind === 'element' && current.id === symbol ? 'active' : ''}" data-element="${symbol}" title="${elementBySymbol(symbol).name}">${symbol}</button>` : '<span></span>').join('')}
    </div>`).join('');
}

function renderApp() {
  const info = selectedInfo();
  const orbitalMode = current.mode === 'orbital';
  const moleculeMode = info.molecule;
  const legendPrimary=moleculeMode?(orbitalMode?'原子轨道贡献':'原子中心密度'):(orbitalMode?'波函数正相位':'高概率密度');
  const legendSecondary=moleculeMode?(orbitalMode?'键区 / π 电子密度':'键区总密度'):(orbitalMode?'波函数负相位':'低概率密度');
  const captionTitle=moleculeMode?(orbitalMode?'QUALITATIVE MOLECULAR ORBITAL':'MOLECULAR ELECTRON DENSITY'):(orbitalMode?'REPRESENTATIVE VALENCE ORBITAL':'TOTAL ELECTRON DENSITY');
  const captionCopy=moleculeMode?'LCAO 定性近似 · 亮线为分子骨架':orbitalMode?'颜色表示波函数相位，不是电荷':'所有占据轨道的概率密度之和';
  const modelCard=moleculeMode?`
    <div class="orbit-card molecule-model-card"><div class="orbit-card-title">分子模型 <span>${info.electrons} e⁻</span></div>
      <div class="molecule-stats"><span><b>${info.atomCount}</b>可视原子中心</span><span><b>${info.bondCount}</b>推断键连接</span></div>
      <div class="composition-row">${info.composition.map(({symbol,count})=>`<span>${symbol}<b>×${count}</b></span>`).join('')}</div>
      <p>复杂分子采用可视骨架；分子式中的部分氢原子可能按结构式惯例省略。</p>
    </div>`:`
    <div class="orbit-card"><div class="orbit-card-title">电子层分布 <span>${info.electrons} e⁻</span></div>
      <div class="shells">${info.shells.slice(0, 5).map((count, index) => `<div class="shell"><span>n=${index + 1}</span><i style="--fill:${Math.min(100, count / [2,8,18,32,32][index] * 100)}%"></i><b>${count}</b></div>`).join('')}</div>
    </div>`;
  app.innerHTML = `
    <main id="top">
      <header class="topbar">
        <a class="top-brand" href="#top" aria-label="Orbital Atlas home">
          <span class="brand-mark"><i></i><i></i><i></i></span>
          <span>ORBITAL <em>ATLAS</em></span>
        </a>
        <div class="breadcrumb">REFERENCE <span>/</span> QUANTUM ATLAS</div>
        <div class="top-actions"><span class="status-light"></span><span>INTERACTIVE MODEL</span><button class="about-button" aria-label="Information">i</button></div>
      </header>
      <section class="intro">
        <div>
          <p class="eyebrow">ATOMIC + MOLECULAR ORBITALS / LIVE MODEL</p>
          <h1>电子云<br><em>可视化图谱</em></h1>
          <p class="lede">以概率密度呈现原子轨道，并以键区电子密度构造定性的分子轨道模型。</p>
        </div>
        <div class="legend"><span class="legend-line hot"></span><span>${legendPrimary}</span><span class="legend-line cool"></span><span>${legendSecondary}</span></div>
      </section>
      <section class="workspace" aria-label="3D electronic cloud">
        <div class="viewer-column">
          <div class="canvas-frame">
          <canvas id="electron-canvas"></canvas>
          <div class="canvas-grid"></div>
          <div class="orientation orientation-x">X</div><div class="orientation orientation-y">Y</div><div class="orientation orientation-z">Z</div>
          <div class="canvas-caption"><span class="pulse"></span><span>${captionTitle}</span><small>${captionCopy} · 拖拽旋转</small></div>
          <div class="zoom-hint">SCROLL<br><b>⌁</b></div>
        </div>
        </div>
        <aside class="control-column">
          <div class="inspector">
          <div class="inspector-top"><span>${info.eyebrow}</span><button id="randomize" title="Random element">↻</button></div>
          <div class="atom-identity"><span class="atom-symbol">${info.symbol}</span><div><h2>${info.name}</h2><p>${info.charge}</p></div></div>
          <p class="inspector-copy">${info.description}</p>
          <div class="view-switch" aria-label="电子云显示模式">
            <button class="${orbitalMode ? 'active' : ''}" data-view-mode="orbital"><b>${moleculeMode?'键合轨道近似':'价层轨道'}</b><small>${moleculeMode?'原子轨道 + 键区':'观察花瓣与节点'}</small></button>
            <button class="${orbitalMode ? '' : 'active'}" data-view-mode="density"><b>${moleculeMode?'分子总密度':'总电子密度'}</b><small>观察整体概率云</small></button>
          </div>
          ${modelCard}
          <div class="field-keys ${moleculeMode?'molecular':''}"><span><i class="key-point"></i>核 / 原子中心</span>${moleculeMode?'<span><i class="key-point bond"></i>键骨架</span>':''}<span><i class="key-point cloud"></i>${moleculeMode?'键合概率云':orbitalMode?'轨道概率云':'总概率密度'}</span></div>
          </div>
          <section class="catalog compact-catalog" id="periodic">
            <div class="section-heading"><div><p class="eyebrow">SELECT A SPECIMEN</p><h2>元素周期表</h2></div><p>118 种元素</p></div>
            <div class="periodic-table">${renderPeriodicTable()}</div>
            <div class="lanthanide-note">镧系 <span>La–Lu</span>　锕系 <span>Ac–Lr</span></div>
          </section>
          <section class="molecules compact-molecules" id="molecules">
            <div class="section-heading"><div><p class="eyebrow">MOLECULAR LIBRARY</p><h2>常见化合物</h2></div><p>${molecules.length} 种模型</p></div>
            <div class="molecule-grid">
          ${molecules.map((molecule) => `<button class="molecule-card ${current.kind === 'molecule' && current.id === molecule.id ? 'active' : ''}" data-molecule="${molecule.id}"><span>${molecule.formula}</span><b>${molecule.name}</b><small>${molecule.geometry}</small><i>→</i></button>`).join('')}
            </div>
          </section>
        </aside>
      </section>
      <section id="guide" class="guide"><div><span>01</span><h3>原子轨道组成分子轨道</h3><p>分子模式用原子轨道的线性组合近似键合，并增强两个原子核之间的共享电子密度。</p></div><div><span>02</span><h3>骨架帮助阅读云层</h3><p>亮线表示推断的原子连接；它不是电子轨迹。多重键同时展示轴向 σ 密度与轴外 π 密度。</p></div><div><span>03</span><h3>定性，而非量化计算</h3><p>复杂分子的精确轨道需要量子化学数值求解；本模型用于观察几何、节点和离域趋势。</p></div></section>
      <footer>ORBITAL ATLAS <span>构建于 WEBGPU / VITE</span><span>© 2026</span></footer>
    </main>`;

  app.querySelectorAll('[data-element]').forEach((button) => button.addEventListener('click', () => {
    current.kind = 'element'; current.id = button.dataset.element; refresh();
  }));
  app.querySelectorAll('[data-molecule]').forEach((button) => button.addEventListener('click', () => {
    current.kind = 'molecule'; current.id = button.dataset.molecule; refresh();
  }));
  app.querySelectorAll('[data-view-mode]').forEach((button) => button.addEventListener('click', () => {
    if (current.mode === button.dataset.viewMode) return;
    current.mode = button.dataset.viewMode; refresh();
  }));
  app.querySelector('#randomize').addEventListener('click', () => {
    const element = elements[Math.floor(Math.random() * elements.length)];
    current.kind = 'element'; current.id = element.symbol; refresh();
  });
}

let destroyCloud = () => {};
async function refresh() {
  destroyCloud();
  renderApp();
  const selectedMolecule=current.kind==='molecule'?molecules.find((item)=>item.id===current.id):null;
  destroyCloud = await createElectronCloud(document.querySelector('#electron-canvas'), cloudAtoms(), { mode: current.mode, molecule: Boolean(selectedMolecule), moleculeId: current.id, bonds: selectedMolecule?.bonds });
}

refresh();
