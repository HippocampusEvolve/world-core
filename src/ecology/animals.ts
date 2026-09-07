import * as THREE from 'three'
import { Surface, color, randomOf, type Point } from './geometry.js'

export type AnimalKind = 'fox' | 'deer' | 'raven'
export const ANIMAL_KINDS: AnimalKind[] = ['fox', 'deer', 'raven']
export interface AnimalPose { speed?: number; alert?: number; graze?: number; flying?: number }

/** Procedural interpretation of Quaternius CC0 silhouettes; see PROVENANCE.md.
 * Feet at Y=0, nose along +Z. Proportions are in metres, not arbitrary mesh units. */
export function createAnimal(kind: AnimalKind, seed = 1) {
  const rand = randomOf(seed), root = new THREE.Group()
  root.name = `wildlife-${kind}`
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.91, metalness: 0, side: THREE.DoubleSide })
  const parts: THREE.Mesh[] = []
  const mesh = (s: Surface, name: string, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(s.geometry(), mat); m.name = name; m.castShadow = true
    parent.add(m); parts.push(m); return m
  }
  const coat = color(kind === 'fox' ? 0xaa6540 : kind === 'deer' ? 0x968171 : 0x323c48)
    .multiplyScalar(0.94 + rand() * 0.12)
  const cream = color(kind === 'fox' ? 0xe4d7bf : 0xc1b6a1), dark = color(0x292b30)
  const paint = (x: number, y: number, z: number) => {
    const shade = 0.94 + 0.05 * Math.sin(x * 18 + z * 12) * Math.cos(y * 21) + 0.06 * y
    return coat.clone().multiplyScalar(shade)
  }
  let phase = 0
  if (kind === 'raven') {
    const torso = new Surface()
    torso.loft([[-0.28,0.25,0.025,0.04],[-0.18,0.27,0.10,0.11],[0.02,0.3,0.125,0.145],
      [0.17,0.36,0.075,0.09],[0.22,0.43,0.078,0.083],[0.27,0.44,0.04,0.04]], paint)
    // Tail is a fan, not a cone. Beak slopes to a distinct narrow point.
    for (let i = -2; i <= 2; i++) torso.leaf([i*0.015,0.25,-0.16],[i*0.034,0.22,-0.41],0.023,coat)
    torso.loft([[0.245,0.435,0.049,0.032],[0.33,0.423,0.032,0.024],[0.40,0.41,0.004,0.003]], () => dark, 6)
    for (const side of [-1, 1]) {
      torso.ellipsoid([side*0.065,0.46,0.235],[0.012,0.012,0.013],color(0x090f18))
      torso.ellipsoid([side*0.071,0.464,0.238],[0.003,0.003,0.004],cream,6,3)
      torso.branch([side*0.056,0.19,0.015],[side*0.055,0.038,0.035],0.014,0.01,dark)
      for (let toe=-1;toe<=1;toe++) torso.branch([side*0.055,0.038,0.035],
        [side*0.055+toe*0.032,0.012,0.12-Math.abs(toe)*0.02],0.008,0.003,dark,4)
    }
    const body = mesh(torso,'raven-body')
    const wings = [-1,1].map(side => {
      const pivot = new THREE.Group(); pivot.position.set(side*0.09,0.33,0); root.add(pivot)
      const wing = new Surface()
      wing.leaf([0,0,0.09],[side*0.43,0,-0.08],0.15,coat,0.028)
      for(let i=0;i<7;i++) wing.leaf([side*(0.14+i*0.045),0,-0.04-i*0.012],
        [side*(0.23+i*0.057),-0.015,-0.31+i*0.025],0.031,coat.clone().multiplyScalar(0.8+i*0.025))
      mesh(wing,'raven-wing',pivot)
      return pivot
    })
    return { root, kind, update(dt: number, pose: AnimalPose = {}) {
      phase += Math.max(0,Math.min(dt,0.1))
      const fly = pose.flying ?? 0
      wings.forEach((w,i)=> { w.scale.set(fly?1:0.43,1,fly?1:0.8)
        w.rotation.z = (i===0?1:-1)*(fly ? Math.sin(phase*8)*0.48 : 1.20)
        w.rotation.y = (i===0?-1:1)*(fly?0:0.38) })
      body.rotation.x = fly ? -0.22 : Math.sin(phase*1.6)*0.022
    }, dispose() { for(const m of parts)m.geometry.dispose(); mat.dispose(); root.removeFromParent() } }
  }
  const deer = kind === 'deer', legHeight = deer ? 0.92 : 0.36
  const torso = new Surface()
  const bodyY = deer ? 1.12 : 0.49
  const half = deer ? 0.62 : 0.36
  const belly = (x: number,y: number,z: number) => y < bodyY-0.085 && z > -half*0.7
    ? cream.clone().multiplyScalar(0.89) : paint(x,y,z)
  torso.loft(deer ? [[-0.73,1.15,0.09,0.14],[-0.55,1.16,0.245,0.30],[-0.20,1.13,0.255,0.32],
    [0.20,1.18,0.22,0.34],[0.47,1.27,0.205,0.31],[0.59,1.38,0.15,0.22]]
    : [[-0.45,0.50,0.04,0.08],[-0.32,0.50,0.135,0.18],[-0.07,0.47,0.15,0.18],
      [0.20,0.50,0.14,0.21],[0.34,0.58,0.12,0.19]], belly,12)
  mesh(torso,`${kind}-body`)
  const neck = new THREE.Group(); neck.position.set(0,deer?1.35:0.59,deer?0.46:0.27); root.add(neck)
  const head = new Surface()
  head.loft(deer ? [[-0.12,-0.11,0.15,0.24],[-0.02,0.20,0.13,0.29],[0.10,0.39,0.145,0.18],
    [0.25,0.35,0.11,0.12],[0.46,0.25,0.075,0.077],[0.50,0.25,0.055,0.056]]
    : [[-0.08,-0.03,0.125,0.18],[0.035,0.12,0.14,0.13],[0.14,0.095,0.12,0.095],
      [0.25,0.035,0.065,0.056],[0.32,0.025,0.02,0.023]], (x,y,z)=> y<0.06 ? cream : paint(x,y,z),10)
  head.ellipsoid(deer?[0,0.258,0.506]:[0,0.03,0.323],deer?[0.054,0.043,0.025]:[0.026,0.021,0.018],dark)
  for (const side of [-1,1]) {
    const ey: Point = deer ? [side*0.113,0.419,0.174] : [side*0.112,0.135,0.130]
    head.ellipsoid(ey,deer?[0.018,0.024,0.024]:[0.013,0.015,0.017],dark)
    head.ellipsoid([ey[0]+side*0.008,ey[1]+0.005,ey[2]+0.007],[0.003,0.004,0.003],cream,6,3)
    // Ears have thickness and a recessed warm centre, all in a single mesh.
    const ear = new THREE.ConeGeometry(deer?0.11:0.073,deer?0.32:0.20,4,1)
    ear.scale(1,1,0.42); ear.rotateZ(-side*(deer?0.75:0.25))
    ear.translate(side*(deer?0.19:0.10),deer?0.61:0.28,deer?0.085:0.01)
    head.append(ear,(x,y,z)=>z>0.04?cream:paint(x,y,z)); ear.dispose()
    if (deer && (seed & 1)) {
      const start:Point=[side*0.105,0.52,-0.015], mid:Point=[side*0.24,0.86,-0.14], end:Point=[side*0.39,1.10,-0.04]
      head.branch(start,mid,0.028,0.018,color(0x8d816b)); head.branch(mid,end,0.018,0.004,color(0xa5967d))
      for(let i=0;i<3;i++) {
        const t=i/3, a:Point=[side*(0.20+t*0.15),0.80+t*0.24,-0.12]
        head.branch(a,[a[0]+side*0.06,a[1]+0.19,-0.01],0.012,0.003,color(0x9d8d73))
      }
    }
  }
  mesh(head,`${kind}-head`,neck)
  const tailPivot = new THREE.Group(); tailPivot.position.set(0,deer?1.28:0.54,-half); root.add(tailPivot)
  const tail = new Surface()
  tail.loft(deer ? [[-0.22,-0.12,0.025,0.022],[-0.14,-0.03,0.07,0.08],[0,0,0.045,0.05]]
    : [[-0.59,-0.15,0.008,0.013],[-0.48,-0.14,0.10,0.095],[-0.28,-0.05,0.12,0.13],[-0.10,0.025,0.10,0.10],[0,0,0.05,0.065]],
    (x,y,z)=>z<(deer?-0.10:-0.43)?cream:paint(x,y,z),10)
  mesh(tail,`${kind}-tail`,tailPivot)
  const legs: { hip: THREE.Group; shin: THREE.Group; length: number; phase: number; rest: number }[]=[]
  for(const front of [false,true])for(const side of [-1,1]) {
    const hip=new THREE.Group(), shin=new THREE.Group()
    const upper=legHeight*0.50, lower=legHeight-upper
    hip.position.set(side*(deer?0.158:0.09),legHeight,front?half*0.68:-half*0.72)
    root.add(hip); shin.position.y=-upper; hip.add(shin)
    const up = new Surface(), low = new Surface(), radius=deer?0.070:0.038
    up.branch([0,0.05,0],[0,-upper,0],radius*(front?0.8:1.45),radius*0.47,coat,7)
    low.branch([0,0.015,0],[0,-lower+0.035,0.018],radius*0.49,radius*0.35,deer?coat:dark,6)
    low.ellipsoid([0,-lower+0.033,0.032],[radius*0.70,0.035,radius*1.25],dark,8,4)
    mesh(up,`${kind}-upper-leg`,hip); mesh(low,`${kind}-foot`,shin)
    legs.push({hip,shin,length:legHeight,phase:(front?0:Math.PI)+(side===1?Math.PI:0),rest:hip.position.y})
  }
  return {root,kind,update(dt:number,pose:AnimalPose={}) {
    const step=Math.max(0,Math.min(dt,0.1)), speed=Math.max(0,pose.speed??0)
    phase += step*(speed>0.02?Math.min(14, speed/(deer?0.8:0.35)*Math.PI):1)
    const stride=Math.min(1,speed/(deer?1.6:1)), graze=pose.graze??0, alert=pose.alert??0
    for(const leg of legs) {
      const p=phase+leg.phase
      leg.hip.rotation.x=Math.sin(p)*0.47*stride
      leg.shin.rotation.x=Math.max(0,-Math.sin(p))*0.52*stride
      leg.hip.position.y=leg.rest+Math.abs(Math.sin(phase*2))*0.012*stride
    }
    neck.rotation.x=graze*(deer?0.92:0.64)-alert*0.10+Math.sin(phase*0.31)*0.026
    neck.rotation.y=Math.sin(phase*0.21)*0.12*(1-stride)
    tailPivot.rotation.y=Math.sin(phase*0.60)*(deer?0.12:0.20)
    tailPivot.rotation.x=alert*(deer?0.30:-0.12)
  },dispose(){for(const m of parts)m.geometry.dispose();mat.dispose();root.removeFromParent()}}
}
