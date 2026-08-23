const shader = /* wgsl */`
struct Uniforms { rotation: vec4f, scale: f32, aspect: f32, time: f32, _pad: f32 }
@group(0) @binding(0) var<uniform> uni: Uniforms;
struct VertexInput { @location(0) position: vec4f, @location(1) color: vec4f }
struct Output { @builtin(position) position: vec4f, @location(0) color: vec4f, @location(1) pointCoord: vec2f }
fn rotate(v: vec3f, q: vec4f) -> vec3f { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
@vertex fn vs(input: VertexInput, @builtin(vertex_index) id: u32) -> Output {
  var o: Output;
  let p = rotate(input.position.xyz, uni.rotation);
  let depth = p.z + 9.0;
  o.position = vec4f(p.x / (depth * uni.aspect) * uni.scale, p.y / depth * uni.scale, 0.5 + p.z / 30.0, 1.0);
  let size = clamp(input.position.w * uni.scale * 10.0 / depth, 1.0, 22.0);
  o.position.xy += vec2f(f32((id % 4u) == 1u || (id % 4u) == 2u) * 2.0 - 1.0, f32(id > 1u) * 2.0 - 1.0) * size / vec2f(700.0, 500.0);
  o.color = input.color;
  o.pointCoord = vec2f(f32((id % 4u) == 1u || (id % 4u) == 2u), f32(id > 1u));
  return o;
}
@fragment fn fs(input: Output) -> @location(0) vec4f {
  let d = distance(input.pointCoord, vec2f(.5));
  let a = smoothstep(.5, .05, d) * input.color.a;
  return vec4f(input.color.rgb * a, a);
}`;

function quatMultiply(a, b) { return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1], a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0], a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3], a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]; }
function normalize(q) { const d=Math.hypot(...q); return q.map(v=>v/d); }
function randomNormal() { let a=0,b=0; while(!a)a=Math.random(); while(!b)b=Math.random(); return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b); }

function createParticleData(atoms) {
  const count = Math.min(15000, 6200 + atoms.length * 900);
  const data = new Float32Array(count * 8);
  for (let i=0; i<count; i++) {
    const atom = atoms[i % atoms.length];
    const ring = i % 7;
    const r = 0.42 + ring * .34 + Math.abs(randomNormal()) * .18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2*Math.random()-1);
    const lobe = ring % 3 === 0 ? (Math.random() > .5 ? 1 : -1) : 1;
    const x = atom.x + r*Math.sin(phi)*Math.cos(theta) * (ring % 3 === 0 ? 1.85 : 1);
    const y = atom.y + r*Math.cos(phi) * (ring % 2 ? .75 : 1.35) * lobe;
    const z = atom.z + r*Math.sin(phi)*Math.sin(theta);
    const offset=i*8, warm=.55 + Math.random()*.45;
    data.set([x,y,z,.45+Math.random()*1.4, .15+.2*warm,.32+.5*warm,.68+.3*warm,.08+Math.random()*.3],offset);
  }
  return data;
}

function fallback(canvas) {
  const ctx=canvas.getContext('2d'); const draw=()=>{const {width,height}=canvas.getBoundingClientRect(); canvas.width=width*devicePixelRatio; canvas.height=height*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);ctx.fillStyle='#061022';ctx.fillRect(0,0,width,height);for(let i=0;i<2600;i++){const a=Math.random()*Math.PI*2,r=Math.abs(randomNormal())*Math.min(width,height)*.15,x=width/2+Math.cos(a)*r*1.8,y=height/2+Math.sin(a)*r;ctx.fillStyle=`rgba(88,180,255,${Math.random()*.25})`;ctx.fillRect(x,y,2,2)}};draw();window.addEventListener('resize',draw);return()=>window.removeEventListener('resize',draw);}

export async function createElectronCloud(canvas, atoms) {
  if (!navigator.gpu) return fallback(canvas);
  try {
    const adapter = await navigator.gpu.requestAdapter(); const device = await adapter?.requestDevice(); if (!device) return fallback(canvas);
    const context = canvas.getContext('webgpu'); const format=navigator.gpu.getPreferredCanvasFormat();
    const data=createParticleData(atoms); const buffer=device.createBuffer({size:data.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(buffer,0,data);
    const uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const pipeline=device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: device.createShaderModule({ code: shader }), entryPoint: 'vs',
        buffers: [{ arrayStride: 32, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }, { shaderLocation: 1, offset: 16, format: 'float32x4' }] }]
      },
      fragment: {
        module: device.createShaderModule({ code: shader }), entryPoint: 'fs',
        targets: [{ format, blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } } }]
      },
      primitive: { topology: 'triangle-strip' }
    });
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
    let rotation=[0.14,-.17,0, .975], scale=2.7, active=true, hovered=false, dragging=false, px=0,py=0;
    function resize(){const box=canvas.getBoundingClientRect(), ratio=Math.min(devicePixelRatio,2);canvas.width=Math.max(1,box.width*ratio);canvas.height=Math.max(1,box.height*ratio);context.configure({device,format,alphaMode:'premultiplied'});} resize();const observer=new ResizeObserver(resize);observer.observe(canvas);
    canvas.addEventListener('pointerenter',()=>hovered=true);canvas.addEventListener('pointerleave',()=>{hovered=false;dragging=false});
    canvas.addEventListener('pointerdown',e=>{dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=(e.clientX-px)*.008,dy=(e.clientY-py)*.008;rotation=normalize(quatMultiply([dy,dx,0,1],rotation));px=e.clientX;py=e.clientY;});
    canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.min(4.2,Math.max(1.5,scale-e.deltaY*.002));},{passive:false});
    let last=performance.now();function frame(now){if(!active)return;const dt=Math.min(32,now-last);last=now;if(!hovered)rotation=normalize(quatMultiply([0,dt*.00013,0,1],rotation));const box=canvas.getBoundingClientRect();device.queue.writeBuffer(uniform,0,new Float32Array([...rotation,scale,box.width/Math.max(box.height,1),now*.001,0]));const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:.014,g:.035,b:.078,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.setVertexBuffer(0,buffer);pass.draw(4,data.length/8);pass.end();device.queue.submit([encoder.finish()]);requestAnimationFrame(frame)}requestAnimationFrame(frame);
    return()=>{active=false;observer.disconnect();buffer.destroy();uniform.destroy();};
  } catch (error) { console.warn('WebGPU unavailable',error); return fallback(canvas); }
}
