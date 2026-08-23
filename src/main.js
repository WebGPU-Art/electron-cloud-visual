import './style.css';
import { elements, molecules, periodicRows } from './science-data.js';
import { createElectronCloud } from './webgpu-cloud.js';

const app = document.querySelector('#app');
const current = { kind: 'element', id: 'H' };

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

function cloudAtoms() {
  if (current.kind === 'element') {
    const element = elementBySymbol(current.id);
    return [{ ...element, x: 0, y: 0, z: 0 }];
  }
  return molecules.find((item) => item.id === current.id).atoms;
}

function selectedInfo() {
  if (current.kind === 'element') {
    const element = elementBySymbol(current.id);
    return {
      eyebrow: `${element.category} · ${element.atomic} 号元素`,
      name: element.name,
      symbol: element.symbol,
      description: element.description,
      electrons: element.atomic,
      shells: shellDistribution(element.atomic),
      charge: '中性原子',
    };
  }
  const molecule = molecules.find((item) => item.id === current.id);
  const electronCount = molecule.atoms.reduce((sum, atom) => sum + elementBySymbol(atom.symbol).atomic, 0);
  return {
    eyebrow: `常见化合物 · ${molecule.formula}`,
    name: molecule.name,
    symbol: molecule.formula,
    description: molecule.description,
    electrons: electronCount,
    shells: molecule.atoms.map((atom) => elementBySymbol(atom.symbol).atomic),
    charge: molecule.geometry,
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
  app.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#top" aria-label="Orbital Atlas home">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>ORBITAL<br><em>ATLAS</em></span>
      </a>
      <div class="nav-label">Documentation</div>
      <nav class="nav-links">
        <a class="nav-link active" href="#top"><span class="nav-dot"></span>电子云图谱</a>
        <a class="nav-link" href="#periodic"><span>⌘</span>元素周期表</a>
        <a class="nav-link" href="#molecules"><span>◇</span>分子结构</a>
        <a class="nav-link" href="#guide"><span>?</span>阅读指南</a>
      </nav>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-note"><span></span> GPU ACCELERATED<br><small>WebGPU particle field</small></div>
      <div class="sidebar-footer">v0.1.0 <b>◒</b></div>
    </aside>
    <main id="top">
      <header class="topbar">
        <div class="breadcrumb">REFERENCE <span>/</span> QUANTUM ATLAS</div>
        <div class="top-actions"><span class="status-light"></span><span>INTERACTIVE MODEL</span><button class="about-button" aria-label="Information">i</button></div>
      </header>
      <section class="intro">
        <div>
          <p class="eyebrow">ATOMIC ORBITALS / LIVE MODEL</p>
          <h1>电子云<br><em>可视化图谱</em></h1>
          <p class="lede">以概率密度呈现原子轨道。选择元素或分子，在空间中观察电子云的几何分布。</p>
        </div>
        <div class="legend"><span class="legend-line hot"></span><span>高概率密度</span><span class="legend-line cool"></span><span>低概率密度</span></div>
      </section>
      <section class="canvas-section" aria-label="3D electronic cloud">
        <div class="canvas-frame">
          <canvas id="electron-canvas"></canvas>
          <div class="canvas-grid"></div>
          <div class="orientation orientation-x">X</div><div class="orientation orientation-y">Y</div><div class="orientation orientation-z">Z</div>
          <div class="canvas-caption"><span class="pulse"></span><span>3D PARTICLE FIELD</span><small>拖拽以旋转视图</small></div>
          <div class="zoom-hint">SCROLL<br><b>⌁</b></div>
        </div>
        <aside class="inspector">
          <div class="inspector-top"><span>${info.eyebrow}</span><button id="randomize" title="Random element">↻</button></div>
          <div class="atom-identity"><span class="atom-symbol">${info.symbol}</span><div><h2>${info.name}</h2><p>${info.charge}</p></div></div>
          <p class="inspector-copy">${info.description}</p>
          <div class="orbit-card"><div class="orbit-card-title">电子层分布 <span>${info.electrons} e⁻</span></div>
            <div class="shells">${info.shells.slice(0, 5).map((count, index) => `<div class="shell"><span>n=${index + 1}</span><i style="--fill:${Math.min(100, count / [2,8,18,32,32][index] * 100)}%"></i><b>${count}</b></div>`).join('')}</div>
          </div>
          <div class="field-keys"><span><i class="key-point"></i>核 / 原子中心</span><span><i class="key-point cloud"></i>电子概率密度</span></div>
        </aside>
      </section>
      <section class="catalog" id="periodic">
        <div class="section-heading"><div><p class="eyebrow">SELECT A SPECIMEN</p><h2>元素周期表</h2></div><p>118 种元素 · 点击任一元素更新 3D 轨道</p></div>
        <div class="periodic-table">${renderPeriodicTable()}</div>
        <div class="lanthanide-note">镧系 <span>La–Lu</span>　锕系 <span>Ac–Lr</span></div>
      </section>
      <section class="molecules" id="molecules">
        <div class="section-heading"><div><p class="eyebrow">MOLECULAR LIBRARY</p><h2>常见化合物</h2></div><p>多原子电子云叠加模型</p></div>
        <div class="molecule-grid">
          ${molecules.map((molecule) => `<button class="molecule-card ${current.kind === 'molecule' && current.id === molecule.id ? 'active' : ''}" data-molecule="${molecule.id}"><span>${molecule.formula}</span><b>${molecule.name}</b><small>${molecule.geometry}</small><i>→</i></button>`).join('')}
        </div>
      </section>
      <section id="guide" class="guide"><div><span>01</span><h3>概率，而非轨迹</h3><p>云团的明亮与密集程度代表电子在该位置被测得的相对概率。</p></div><div><span>02</span><h3>四元数视角</h3><p>进入画布即暂停演示转动，拖拽可避免欧拉角万向锁。</p></div><div><span>03</span><h3>GPU 粒子场</h3><p>每个粒子在 GPU 上实时变换和混合，保持高密度云团的流畅浏览。</p></div></section>
      <footer>ORBITAL ATLAS <span>构建于 WEBGPU / VITE</span><span>© 2026</span></footer>
    </main>`;

  app.querySelectorAll('[data-element]').forEach((button) => button.addEventListener('click', () => {
    current.kind = 'element'; current.id = button.dataset.element; refresh();
  }));
  app.querySelectorAll('[data-molecule]').forEach((button) => button.addEventListener('click', () => {
    current.kind = 'molecule'; current.id = button.dataset.molecule; refresh();
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
  destroyCloud = await createElectronCloud(document.querySelector('#electron-canvas'), cloudAtoms());
}

refresh();
