import { inferBonds } from './molecular-model.js';

const shader = /* wgsl */`
struct Uniforms { rotation: vec4f, viewport: vec2f, scale: f32, time: f32 }
@group(0) @binding(0) var<uniform> uni: Uniforms;
struct VertexInput { @location(0) position: vec4f, @location(1) color: vec4f }
struct Output { @builtin(position) position: vec4f, @location(0) color: vec4f, @location(1) pointCoord: vec2f, @location(2) kind: f32 }
fn rotate(v: vec3f, q: vec4f) -> vec3f { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
@vertex fn vs(input: VertexInput, @builtin(vertex_index) id: u32) -> Output {
  var o: Output;
  let p = rotate(input.position.xyz, uni.rotation);
  let depth = p.z + 9.0;
  let aspect = uni.viewport.x / uni.viewport.y;
  let screenPosition = vec4f(p.x / (depth * aspect) * uni.scale, p.y / depth * uni.scale, 0.5 + p.z / 30.0, 1.0);
  let isBond = input.position.w < -8.0;
  let encodedSize = select(abs(input.position.w), abs(input.position.w + 10.0), isBond);
  let size = clamp(encodedSize * uni.scale * 13.0 / depth, 1.5, 13.0);
  let cornerX = select(-1.0, 1.0, (id % 2u) == 1u);
  let cornerY = select(-1.0, 1.0, id > 1u);
  o.position = vec4f(screenPosition.xy + vec2f(cornerX, cornerY) * size * 2.0 / uni.viewport, screenPosition.zw);
  o.color = input.color;
  o.pointCoord = vec2f(select(0.0, 1.0, (id % 2u) == 1u), select(0.0, 1.0, id > 1u));
  o.kind = select(0.0, select(1.0, 2.0, isBond), input.position.w < 0.0);
  return o;
}
@fragment fn fs(input: Output) -> @location(0) vec4f {
  let centered = input.pointCoord - vec2f(.5);
  let radius2 = dot(centered, centered);
  if (input.kind > 1.5) {
    let radius = sqrt(radius2);
    let edge = 1.0 - smoothstep(.20, .50, radius);
    let core = 1.0 - smoothstep(.0, .24, radius);
    return vec4f(input.color.rgb * (.88 + core * .30), edge * input.color.a);
  }
  if (input.kind > .5) {
    let radius = sqrt(radius2);
    let edge = 1.0 - smoothstep(.36, .50, radius);
    let core = 1.0 - smoothstep(.0, .34, radius);
    let nucleusColor = mix(input.color.rgb * .82, vec3f(1.0, .91, .46), core * .58);
    return vec4f(nucleusColor, edge * input.color.a);
  }
  let particleCore = exp(-radius2 * 14.0);
  let particleHalo = exp(-radius2 * 5.2) * .28;
  let a = min((particleCore + particleHalo) * input.color.a * 1.68, .19);
  return vec4f(input.color.rgb * 1.12, a);
}`;

function quatMultiply(a, b) { return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]; }
function normalize(q) { const d=Math.hypot(...q); return q.map(v=>v/d); }
function axisAngle(axis, angle) { const half=angle*.5, sine=Math.sin(half); return [axis[0]*sine,axis[1]*sine,axis[2]*sine,Math.cos(half)]; }
function trackballDelta(dx, dy) {
  const distance=Math.hypot(dx,dy);
  if (!distance) return [0,0,0,1];
  // Invert the screen delta so the cloud follows the pointer instead of resisting it.
  return axisAngle([-dy/distance,-dx/distance,0],Math.min(distance*.009,.32));
}
function randomNormal() { let a=0,b=0; while(!a)a=Math.random(); while(!b)b=Math.random(); return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b); }

const elementColors = {
  H:[.40,.76,1], He:[.68,.46,1], C:[.24,.90,.78], N:[.66,.40,1], O:[1,.26,.38], F:[.45,1,.62],
  P:[1,.60,.24], S:[1,.76,.20], Cl:[.28,.96,.49], Na:[1,.50,.25], Mg:[.38,.94,.66], Fe:[1,.46,.26],
  Cu:[1,.55,.27], Zn:[.36,.78,1], Br:[.92,.28,.42], I:[.70,.42,1], Au:[1,.78,.22], U:[.32,.96,.70]
};
const colorCycle = [[.28,.78,1],[.65,.46,1],[1,.40,.36],[.30,1,.67],[1,.72,.24]];
function atomColor(atom) {
  if (elementColors[atom.symbol]) return elementColors[atom.symbol];
  const seed = atom.atomic || atom.symbol.charCodeAt(0) + (atom.symbol.charCodeAt(1) || 0);
  return colorCycle[seed % colorCycle.length];
}

const aufbauOrder = [
  [1,0,2],[2,0,2],[2,1,6],[3,0,2],[3,1,6],[4,0,2],[3,2,10],[4,1,6],[5,0,2],
  [4,2,10],[5,1,6],[6,0,2],[4,3,14],[5,2,10],[6,1,6],[7,0,2],[5,3,14],[6,2,10],[7,1,6]
];

function electronConfiguration(atomicNumber) {
  let remaining = Math.max(1, atomicNumber || 1), cumulative = 0;
  const configuration = [];
  for (const [n,l,capacity] of aufbauOrder) {
    if (!remaining) break;
    const electrons = Math.min(capacity, remaining);
    cumulative += electrons;
    configuration.push({n,l,electrons,cumulative});
    remaining -= electrons;
  }
  return configuration;
}

function generalizedLaguerre(order, alpha, value) {
  if (order === 0) return 1;
  let previous = 1, current = 1 + alpha - value;
  for (let k=2; k<=order; k++) {
    const next = ((2*k-1+alpha-value)*current-(k-1+alpha)*previous)/k;
    previous = current; current = next;
  }
  return current;
}

function makeRadialSampler(n, l) {
  const steps = 640, rhoMax = 6*n + 12, cdf = new Float64Array(steps);
  let total = 0;
  for (let i=1; i<steps; i++) {
    const rho = rhoMax*i/(steps-1);
    const laguerre = generalizedLaguerre(n-l-1,2*l+1,rho);
    const weight = Math.pow(rho,2*l+2)*Math.exp(-rho)*laguerre*laguerre;
    total += Number.isFinite(weight) ? weight : 0;
    cdf[i] = total;
  }
  for (let i=1; i<steps; i++) cdf[i] /= total;
  return () => {
    const target = Math.random();
    let low=1, high=steps-1;
    while (low<high) { const middle=(low+high)>>1; if (cdf[middle]<target) low=middle+1; else high=middle; }
    const before=cdf[low-1], span=Math.max(cdf[low]-before,1e-9), fraction=(target-before)/span;
    const rho=(low-1+fraction)*rhoMax/(steps-1);
    // Compress the n² hydrogenic size growth so shells remain comparable on screen.
    const radius=rho*.42/Math.pow(n,.25);
    const phase=Math.sign(generalizedLaguerre(n-l-1,2*l+1,rho))||1;
    return {radius,phase};
  };
}

function randomDirection() {
  const z=2*Math.random()-1, theta=Math.random()*Math.PI*2, radius=Math.sqrt(1-z*z);
  return [radius*Math.cos(theta),radius*Math.sin(theta),z];
}

function angularAmplitude([x,y,z], l, orbital) {
  if (l===0) return 1;
  if (l===1) return [x,y,z][orbital%3];
  if (l===2) return [2*x*y,2*x*z,2*y*z,x*x-y*y,(3*z*z-1)*.5][orbital%5];
  return [
    z*(5*z*z-3)*.5,
    x*(5*z*z-1)*.5,
    y*(5*z*z-1)*.5,
    2*z*(x*x-y*y),
    5*x*y*z,
    x*(x*x-3*y*y),
    y*(3*x*x-y*y),
  ][orbital%7];
}

function angularProbability(direction, l, orbital) {
  const amplitude=angularAmplitude(direction,l,orbital);
  return Math.min(1,amplitude*amplitude);
}

function sampleDirection(l, orbital) {
  let direction = randomDirection();
  for (let attempt=0; attempt<24; attempt++) {
    direction = randomDirection();
    if (Math.random() <= angularProbability(direction,l,orbital)) return direction;
  }
  return direction;
}

function prepareAtomModels(atoms, mode) {
  let atomTotal=0;
  const models=atoms.map((atom,atomIndex) => {
    const atomic=Math.max(1,atom.atomic||1), configuration=electronConfiguration(atomic), samplers=new Map();
    const frontier=configuration[configuration.length-1];
    const occupiedOrbitals=Math.min(2*frontier.l+1,Math.max(1,frontier.electrons));
    const representativeOrbital=(atomic+atomIndex*2)%occupiedOrbitals;
    atomTotal += mode==='orbital' ? 1 : atomic;
    return {atom,atomic,configuration,frontier,representativeOrbital,samplers,atomCumulative:atomTotal};
  });
  return models.map((model) => ({...model,atomTotal}));
}

function chooseAtomModel(models) {
  const atomTarget=Math.random()*models[0].atomTotal;
  return models.find((candidate)=>atomTarget<candidate.atomCumulative)||models[models.length-1];
}

function perpendicularBasis([x,y,z]) {
  const reference=Math.abs(z)<.82?[0,0,1]:[0,1,0];
  const first=[y*reference[2]-z*reference[1],z*reference[0]-x*reference[2],x*reference[1]-y*reference[0]];
  const firstLength=Math.hypot(...first)||1;
  const u=first.map((value)=>value/firstLength);
  const v=[y*u[2]-z*u[1],z*u[0]-x*u[2],x*u[1]-y*u[0]];
  return [u,v];
}

function writeAtomicCloud(data, index, model, mode, radiusScale) {
    const {atom,atomic,configuration,frontier,representativeOrbital,samplers}=model, offset=index*8;
    let subshell=frontier, orbital=representativeOrbital;
    if (mode==='density') {
      const orbitalTarget=Math.random()*atomic;
      subshell=configuration.find((entry)=>orbitalTarget<entry.cumulative)||frontier;
      const occupiedOrbitals=Math.min(2*subshell.l+1,Math.max(1,subshell.electrons));
      orbital=Math.floor(Math.random()*occupiedOrbitals);
    }
    const key=`${subshell.n}:${subshell.l}`;
    if (!samplers.has(key)) samplers.set(key,makeRadialSampler(subshell.n,subshell.l));
    const radialSample=samplers.get(key)(), radius=radialSample.radius*radiusScale, radialPhase=radialSample.phase;
    const direction=sampleDirection(subshell.l,orbital);
    const angularPhase=Math.sign(angularAmplitude(direction,subshell.l,orbital))||1;
    const [red,green,blue]=atomColor(atom), variation=.82+Math.random()*.18;
    const negative=mode==='orbital'&&radialPhase*angularPhase<0;
    const phaseColor=negative
      ? [.18+(1-red)*.62,.18+(1-green)*.62,.18+(1-blue)*.62]
      : [red,green,blue];
    data.set([atom.x+direction[0]*radius,atom.y+direction[1]*radius,atom.z+direction[2]*radius,.58+Math.random()*1.05,phaseColor[0]*variation,phaseColor[1]*variation,phaseColor[2],.020+Math.random()*.058],offset);
}

function writeBondCloud(data, index, atoms, bond, mode) {
  const first=atoms[bond.a], second=atoms[bond.b], offset=index*8;
  const axis=[(second.x-first.x)/bond.distance,(second.y-first.y)/bond.distance,(second.z-first.z)/bond.distance];
  const [u,v]=perpendicularBasis(axis);
  const t=Math.max(.04,Math.min(.96,.5+randomNormal()*.24));
  let radialU=randomNormal()*.16, radialV=randomNormal()*.16;
  const piOrbital=bond.order>1.2&&Math.random()<.52;
  let phase=1;
  if (piOrbital) {
    phase=Math.random()<.5?-1:1;
    radialV+=phase*(.27+Math.abs(randomNormal())*.10);
  }
  const x=first.x+(second.x-first.x)*t+u[0]*radialU+v[0]*radialV;
  const y=first.y+(second.y-first.y)*t+u[1]*radialU+v[1]*radialV;
  const z=first.z+(second.z-first.z)*t+u[2]*radialU+v[2]*radialV;
  const firstColor=atomColor(first), secondColor=atomColor(second);
  const baseColor=firstColor.map((value,colorIndex)=>value*(1-t)+secondColor[colorIndex]*t);
  const phaseColor=mode==='orbital'&&phase<0
    ? baseColor.map((value)=>.18+(1-value)*.62)
    : baseColor.map((value)=>value*.72+.28);
  data.set([x,y,z,.50+Math.random()*.72,phaseColor[0],phaseColor[1],phaseColor[2],.030+Math.random()*.052],offset);
}

function createBondMarkers(atoms, bonds) {
  const markers=[];
  for (const bond of bonds) {
    const first=atoms[bond.a], second=atoms[bond.b];
    const axis=[(second.x-first.x)/bond.distance,(second.y-first.y)/bond.distance,(second.z-first.z)/bond.distance];
    const [u]=perpendicularBasis(axis);
    const lineCount=bond.order>=2.6?3:bond.order>=1.25?2:1;
    const offsets=lineCount===3?[-.075,0,.075]:lineCount===2?[-.048,.048]:[0];
    const segments=Math.max(12,Math.ceil(bond.distance*16));
    const firstColor=atomColor(first), secondColor=atomColor(second);
    for (const lineOffset of offsets) {
      for (let step=1; step<segments; step++) {
        const t=step/segments;
        const baseColor=firstColor.map((value,colorIndex)=>value*(1-t)+secondColor[colorIndex]*t);
        const color=baseColor.map((value)=>value*.30+.70);
        markers.push([
          first.x+(second.x-first.x)*t+u[0]*lineOffset,
          first.y+(second.y-first.y)*t+u[1]*lineOffset,
          first.z+(second.z-first.z)*t+u[2]*lineOffset,
          -10.43,color[0],color[1],color[2],.68,
        ]);
      }
    }
  }
  return markers;
}

function createParticleData(atoms, mode, {molecule=false,moleculeId='',bonds:explicitBonds}={}) {
  const count=Math.min(36000,30000+atoms.length*1000), data=new Float32Array(count*8), models=prepareAtomModels(atoms,mode);
  const bonds=molecule?inferBonds(atoms,moleculeId,explicitBonds):[];
  const markers=createBondMarkers(atoms,bonds), nucleusCount=atoms.length;
  const cloudCount=count-markers.length-nucleusCount;
  const bondCloudCount=bonds.length?Math.floor(cloudCount*(mode==='orbital'?.46:.32)):0;
  const atomCloudCount=cloudCount-bondCloudCount;
  const radiusScale=molecule?(mode==='orbital'?.56:.48):1;
  let index=0;
  for (; index<atomCloudCount; index++) writeAtomicCloud(data,index,chooseAtomModel(models),mode,radiusScale);
  const totalBondOrder=bonds.reduce((sum,bond)=>sum+bond.order,0);
  for (let bondIndex=0; bondIndex<bondCloudCount; bondIndex++,index++) {
    const target=Math.random()*totalBondOrder;
    let cumulative=0, selectedBond=bonds[bonds.length-1];
    for (const bond of bonds) { cumulative+=bond.order; if (target<cumulative) { selectedBond=bond; break; } }
    writeBondCloud(data,index,atoms,selectedBond,mode);
  }
  for (const marker of markers) { data.set(marker,index*8); index++; }
  for (const model of models) {
    const {atom,atomic}=model, nucleusSize=2.15+Math.min(.70,Math.cbrt(atomic)*.10);
    data.set([atom.x,atom.y,atom.z,-nucleusSize,1,.52,.12,.96],index*8); index++;
  }
  return data;
}

function fallback(canvas) {
  const ctx=canvas.getContext('2d');
  const particles=Array.from({length:3600},()=>({a:Math.random()*Math.PI*2,r:Math.abs(randomNormal()),s:Math.random()*1.7+.3,c:Math.random()}));
  const draw=()=>{const {width,height}=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,2),size=Math.min(width,height);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#061022';ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='lighter';for(const p of particles){const orbit=(.06+p.r*.12)*size,stretch=.8+Math.sin(p.a*2.0)*.45,x=width*.5+Math.cos(p.a)*orbit*stretch,y=height*.5+Math.sin(p.a)*orbit*.75;ctx.fillStyle=p.c>.86?'rgba(255,140,112,.42)':`rgba(75,${150+Math.floor(p.c*80)},255,${.08+p.c*.26})`;ctx.fillRect(x,y,p.s,p.s)}ctx.beginPath();ctx.arc(width*.5,height*.5,8,0,Math.PI*2);ctx.fillStyle='rgba(255,204,103,.9)';ctx.fill();ctx.globalCompositeOperation='source-over';};draw();window.addEventListener('resize',draw);return()=>window.removeEventListener('resize',draw);}

export async function createElectronCloud(canvas, atoms, {mode='orbital',molecule=false,moleculeId='',bonds}={}) {
  if (!navigator.gpu) return fallback(canvas);
  try {
    const adapter = await navigator.gpu.requestAdapter({powerPreference:'high-performance'}); const device = await adapter?.requestDevice(); if (!device) return fallback(canvas);
    const format=navigator.gpu.getPreferredCanvasFormat();
    const shaderModule=device.createShaderModule({code:shader});
    const compilation=await shaderModule.getCompilationInfo();
    const shaderErrors=compilation.messages.filter((message)=>message.type==='error');
    if (shaderErrors.length) throw new Error(shaderErrors.map((message)=>message.message).join('\n'));
    const data=createParticleData(atoms,mode,{molecule,moleculeId,bonds}); const buffer=device.createBuffer({size:data.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(buffer,0,data);
    const uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const pipeline=await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: {
        module: shaderModule, entryPoint: 'vs',
        buffers: [{ arrayStride: 32, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }, { shaderLocation: 1, offset: 16, format: 'float32x4' }] }]
      },
      fragment: {
        module: shaderModule, entryPoint: 'fs',
        targets: [{ format, blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }]
      },
      primitive: { topology: 'triangle-strip' }
    });
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
    const context = canvas.getContext('webgpu');
    const molecularExtent=Math.max(...atoms.map((atom)=>Math.hypot(atom.x,atom.y,atom.z)));
    const minimumScale=molecule?1.05:1.5;
    let rotation=[0.14,-.17,0,.975],scale=molecule?Math.min(2.7,Math.max(1.15,6.5/(molecularExtent+1.2))):2.7,active=true,hovered=false,dragging=false,dirty=true,px=0,py=0;
    function resize(){const box=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.5);canvas.width=Math.max(1,box.width*ratio);canvas.height=Math.max(1,box.height*ratio);context.configure({device,format,alphaMode:'premultiplied'});dirty=true;}
    resize();const observer=new ResizeObserver(resize);observer.observe(canvas);
    canvas.addEventListener('pointerenter',()=>hovered=true);
    canvas.addEventListener('pointerleave',()=>{hovered=false;dragging=false});
    canvas.addEventListener('pointerdown',e=>{dragging=true;dirty=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-px,dy=e.clientY-py;rotation=normalize(quatMultiply(trackballDelta(dx,dy),rotation));px=e.clientX;py=e.clientY;dirty=true;});
    canvas.addEventListener('pointerup',()=>{dragging=false;dirty=true});
    canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.min(4.2,Math.max(minimumScale,scale-e.deltaY*.002));dirty=true;},{passive:false});
    let last=performance.now(),lastRender=0;
    function frame(now){
      if(!active)return;
      requestAnimationFrame(frame);
      if(document.hidden)return;
      const autoRotate=!hovered;
      if(!autoRotate&&!dirty)return;
      const frameInterval=dragging?22:33;
      if(now-lastRender<frameInterval)return;
      const dt=Math.min(50,now-last);last=now;lastRender=now;
      if(autoRotate)rotation=normalize(quatMultiply(axisAngle([0,1,0],dt*.00026),rotation));
      dirty=false;
      const box=canvas.getBoundingClientRect();
      device.queue.writeBuffer(uniform,0,new Float32Array([...rotation,box.width,box.height,scale,now*.001]));
      const encoder=device.createCommandEncoder();
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:.014,g:.035,b:.078,a:1},loadOp:'clear',storeOp:'store'}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.setVertexBuffer(0,buffer);pass.draw(4,data.length/8);pass.end();
      device.queue.submit([encoder.finish()]);
    }
    requestAnimationFrame(frame);
    return()=>{active=false;observer.disconnect();buffer.destroy();uniform.destroy();};
  } catch (error) { console.warn('WebGPU unavailable',error); return fallback(canvas); }
}
