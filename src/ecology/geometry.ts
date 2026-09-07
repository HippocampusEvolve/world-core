import * as THREE from 'three'

export type Point = [number, number, number]
export type Paint = (x: number, y: number, z: number) => THREE.Color
export const randomOf = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ seed >>> 15, seed | 1)
  t ^= t + Math.imul(t ^ t >>> 7, t | 61)
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}
export const color = (hex: number) => new THREE.Color(hex)

/** Small indexed surface builder. No DOM, textures, model loaders or global caches. */
export class Surface {
  positions: number[] = []
  colors: number[] = []
  indices: number[] = []
  vertex(p: Point, c: THREE.Color) {
    const n = this.positions.length / 3
    this.positions.push(...p); this.colors.push(c.r, c.g, c.b)
    return n
  }
  tri(a: number, b: number, c: number) { this.indices.push(a, b, c) }
  /** Elliptic cross-sections along Z: [z, centreY, halfWidth, halfHeight]. */
  loft(rings: [number, number, number, number][], paint: Paint, sides = 10) {
    const base = this.positions.length / 3
    for (const [z, y, rx, ry] of rings) {
      for (let j = 0; j < sides; j++) {
        const a = j / sides * Math.PI * 2
        const p: Point = [Math.cos(a) * rx, y + Math.sin(a) * ry, z]
        this.vertex(p, paint(...p))
      }
    }
    for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < sides; j++) {
      const a = base + k * sides + j, b = base + k * sides + (j + 1) % sides
      this.tri(a, b, a + sides); this.tri(b, b + sides, a + sides)
    }
    for (const k of [0, rings.length - 1]) {
      const [z, y] = rings[k], c = this.vertex([0, y, z], paint(0, y, z))
      for (let j = 0; j < sides; j++) {
        const a = base + k * sides + j, b = base + k * sides + (j + 1) % sides
        if (k === 0) this.tri(c, b, a); else this.tri(c, a, b)
      }
    }
  }
  ellipsoid(p: Point, radii: Point, c: THREE.Color, sides = 8, rings = 5) {
    const g = new THREE.SphereGeometry(1, sides, rings)
    g.scale(...radii); g.translate(...p); this.append(g, () => c); g.dispose()
  }
  branch(a: Point, b: Point, r0: number, r1: number, c: THREE.Color, sides = 6) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b)
    const d = bv.clone().sub(av), length = d.length()
    if (length < 0.0001) return
    const g = new THREE.CylinderGeometry(r1, r0, length, sides, 1)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()))
    g.translate(...av.add(bv).multiplyScalar(0.5).toArray() as Point)
    this.append(g, () => c); g.dispose()
  }
  leaf(a: Point, b: Point, width: number, c: THREE.Color, lift = 0.025) {
    const d = new THREE.Vector3(...b).sub(new THREE.Vector3(...a))
    const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(width)
    const m = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), 0.48)
    const i = this.vertex(a, c.clone().multiplyScalar(0.75))
    const j = this.vertex(m.clone().add(side).toArray() as Point, c)
    const k = this.vertex(b, c.clone().multiplyScalar(1.08))
    const l = this.vertex(m.clone().sub(side).toArray() as Point, c.clone().multiplyScalar(0.85))
    const ridge = this.vertex([m.x, m.y + lift, m.z], c.clone().multiplyScalar(1.04))
    this.tri(i, j, ridge); this.tri(j, k, ridge); this.tri(k, l, ridge); this.tri(l, i, ridge)
  }
  append(g: THREE.BufferGeometry, paint: Paint) {
    const base = this.positions.length / 3, p = g.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const v: Point = [p.getX(i), p.getY(i), p.getZ(i)]
      this.vertex(v, paint(...v))
    }
    if (g.index) for (const n of g.index.array) this.indices.push(n + base)
    else for (let n = 0; n < p.count; n++) this.indices.push(n + base)
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    g.setIndex(this.indices); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere()
    return g
  }
}
