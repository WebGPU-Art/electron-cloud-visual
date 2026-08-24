import { keyboardCommand, normalize, quatMultiply, rendererSupportsAutoRotation, trackballDelta } from '../src/webgpu-cloud.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function quaternionLength(quaternion) {
  return Math.hypot(...quaternion);
}

const identity=trackballDelta(0,0);
assert(identity.every((value,index)=>value===[0,0,0,1][index]),'zero drag must preserve identity');

const right=trackballDelta(80,0), down=trackballDelta(0,80);
assert(right[1]<0&&Math.abs(right[0])<1e-12,'right drag must rotate around negative screen Y');
assert(down[0]<0&&Math.abs(down[1])<1e-12,'down drag must rotate around negative screen X');
assert(Math.abs(quaternionLength(right)-1)<1e-12,'trackball delta must be a unit quaternion');

const clamped=trackballDelta(10000,10000);
const clampedAngle=2*Math.acos(Math.min(1,Math.abs(clamped[3])));
assert(clampedAngle<=.3200000001,'single drag update must be capped at 0.32 radians');

let accumulated=[0,0,0,1];
for (let index=0; index<4000; index++) {
  const dx=Math.sin(index*.31)*17,dy=Math.cos(index*.23)*13;
  accumulated=normalize(quatMultiply(trackballDelta(dx,dy),accumulated));
}
assert(Math.abs(quaternionLength(accumulated)-1)<1e-12,'accumulated trackball rotation must remain normalized');
assert(accumulated.every(Number.isFinite),'accumulated rotation must remain finite');

assert(keyboardCommand({key:' ',code:'Space',repeat:false})==='toggle-auto','Space must toggle auto rotation');
assert(keyboardCommand({key:'r',code:'KeyR',repeat:false})==='reset','R must reset the view');
assert(keyboardCommand({key:' ',code:'Space',repeat:true})===null,'repeated Space must not toggle auto rotation');
assert(keyboardCommand({key:'r',code:'KeyR',repeat:true})===null,'repeated R must not reset the view');
assert(rendererSupportsAutoRotation('WEBGPU'),'WebGPU must expose auto rotation');
assert(!rendererSupportsAutoRotation('CANVAS 2D'),'Canvas 2D fallback must disable auto rotation');

console.log(`PASS interaction trackball=${quaternionLength(accumulated).toFixed(12)} clamp=${clampedAngle.toFixed(3)}rad keyboard=no-repeat`);
