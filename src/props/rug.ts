/**
 * rug.ts — круглый плетёный коврик.
 *
 * Тонкий диск на полу; весь рисунок - в карте `braid`, которая кладётся на
 * круг целиком (`discUV`): у колец шнура есть середина, тайлить их нечем.
 * Раньше коврик был двумя дисками разного цвета один на другом - кольца
 * изображались геометрией; теперь их даёт карта, а диск один.
 */

import * as THREE from 'three'
import { discUV } from '../materials/index.js'
import { lookOf, type Mats } from './look.js'

export type RugOptions = { r?: number; t?: number; mats?: Mats }
export type Rug = { group: THREE.Group; r: number }

export function rug({ r = 0.85, t = 0.012, mats }: RugOptions = {}): Rug {
  const g = new THREE.Group()
  g.name = 'rug'
  const m = lookOf(mats, 'braid', 'braid', { normalScale: 0.7 })
  const geo = new THREE.CylinderGeometry(r, r, t, 48)
  discUV(geo, r)
  const mesh = new THREE.Mesh(geo, m)
  mesh.name = 'rug'
  mesh.position.y = t / 2
  g.add(mesh)
  return { group: g, r }
}
