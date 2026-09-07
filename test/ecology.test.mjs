import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createAnimal, ANIMAL_KINDS, plantGeometry, PLANT_KINDS, createVegetation,
  createWildlife, natureSamples, NATURE_VOICES } from '../dist/ecology/index.js'

function inspect(g) {
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),c=g.getAttribute('color')
  assert.ok(p.count>0);assert.equal(p.count,n.count);assert.equal(p.count,c.count)
  for(const attr of [p,n,c])for(const v of attr.array)assert.ok(Number.isFinite(v))
  for(const i of g.index.array)assert.ok(i<p.count)
  return g.index.count/3
}
test('all species have finite bounded geometry, grounded feet and deterministic colours',()=>{
  for(const kind of ANIMAL_KINDS) {
    const a=createAnimal(kind,719),b=createAnimal(kind,719);let triangles=0,meshes=0
    a.root.traverse(o=>{if(o.isMesh){triangles+=inspect(o.geometry);meshes++}})
    const box=new THREE.Box3().setFromObject(a.root)
    assert.ok(box.min.y>=-0.04,`${kind} below ground: ${box.min.y}`)
    assert.ok(box.max.y<3&&box.max.z-box.min.z<3)
    assert.ok(triangles<6500,`${kind}: ${triangles} triangles`);assert.ok(meshes<=12)
    assert.deepEqual(a.root.children[0].geometry.attributes.position.array,b.root.children[0].geometry.attributes.position.array)
    for(let i=0;i<900;i++)a.update(1/60,{speed:i<300?0:i<600?0.7:3,graze:i<300?1:0,flying:1})
    a.root.updateMatrixWorld(true)
    a.root.traverse(o=>{for(const v of o.matrixWorld.elements)assert.ok(Number.isFinite(v))})
    console.log(`${kind}: ${triangles} triangles, ${meshes} meshes`);a.dispose();b.dispose()
  }
})
test('plant recipes stay inside the budget and change with their seed',()=>{
  for(const kind of PLANT_KINDS) {
    const a=plantGeometry(kind,1),b=plantGeometry(kind,1),c=plantGeometry(kind,2)
    const tris=inspect(a)
    assert.ok(tris<5000,`${kind}: ${tris}`)
    assert.deepEqual(a.attributes.position.array,b.attributes.position.array)
    assert.notDeepEqual(a.attributes.position.array,c.attributes.position.array)
    assert.ok(a.boundingBox.min.y>=-0.02)
    console.log(`${kind}: ${tris} triangles`);a.dispose();b.dispose();c.dispose()
  }
})
test('many plants share meshes, culled plants do not allocate geometry',()=>{
  const sites=Array.from({length:120},(_,i)=>({kind:'grass',x:i%12,y:0,z:Math.floor(i/12),seed:i}))
  const v=createVegetation(sites)
  assert.equal(v.meshes.length,2)
  const a=new THREE.Matrix4(),b=new THREE.Matrix4()
  v.meshes[0].getMatrixAt(0,a);v.setVisible(sites[0],false);v.meshes[0].getMatrixAt(0,b)
  assert.equal(b.determinant(),0);v.setVisible(sites[0],true);v.meshes[0].getMatrixAt(0,b)
  assert.deepEqual(a.elements,b.elements);v.dispose()
})
const player={x:0,y:0,z:0},direction={x:0,y:0,z:-1}
test('encounters respect obstacles, remain bounded, pause and agree at 30 / 120 FPS',()=>{
  const run=fps=>{
    const w=createWildlife({seed:81,surfaceAt:(x,z)=>Math.abs(x)<60&&Math.abs(z)<60?0:null,
      canStand:(x,z)=>!(x>3&&x<6&&z>0&&z<40)})
    for(let i=0;i<fps*75;i++)w.update(1/fps,player,{direction})
    assert.ok(w.animals.some(a=>a.active))
    for(const a of w.animals)if(a.active){assert.ok(Math.abs(a.x)<60&&Math.abs(a.z)<60);assert.ok(!(a.x>3&&a.x<6&&a.z>0&&a.z<40))}
    const snapshot=w.animals.map(a=>[a.x,a.y,a.z,a.yaw,a.active])
    w.update(30,player,{active:false});assert.deepEqual(w.animals.map(a=>[a.x,a.y,a.z,a.yaw,a.active]),snapshot)
    w.dispose();return snapshot
  }
  const a=run(30),b=run(120)
  for(let i=0;i<a.length;i++)for(let j=0;j<4;j++)assert.ok(Math.abs(a[i][j]-b[i][j])<1e-7)
})
test('unsupported terrain never spawns animals, reduced motion can still show resting animals',()=>{
  const a=createWildlife({surfaceAt:()=>null});for(let i=0;i<1500;i++)a.update(1/30,player,{direction})
  assert.ok(a.animals.every(a=>!a.active));a.dispose()
  const b=createWildlife({surfaceAt:()=>0});b.update(1/60,player,{direction,reducedMotion:true})
  assert.ok(b.animals.some(a=>a.active));const before=b.animals.map(a=>[a.x,a.z])
  b.update(1/60,player,{direction,reducedMotion:true});assert.deepEqual(b.animals.map(a=>[a.x,a.z]),before);b.dispose()
})
test('nature audio has no clipping, DC offset or click at the endpoints',()=>{
  for(const voice of NATURE_VOICES) {
    const {data}=natureSamples(voice,17)
    const again=natureSamples(voice,17).data;assert.deepEqual(data,again)
    let peak=0,sum=0,energy=0,maxJump=0
    for(let i=0;i<data.length;i++){const v=data[i];assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v;energy+=v*v;if(i)maxJump=Math.max(maxJump,Math.abs(v-data[i-1]))}
    assert.ok(peak>0.015&&peak<=0.32001,`${voice} peak ${peak}`)
    assert.ok(Math.abs(sum/data.length)<1e-7);assert.equal(data[0],0);assert.equal(data.at(-1),0)
    assert.ok(Math.sqrt(energy/data.length)<0.13)
    console.log(`${voice}: peak ${peak.toFixed(3)}, rms ${Math.sqrt(energy/data.length).toFixed(3)}`)
  }
})
