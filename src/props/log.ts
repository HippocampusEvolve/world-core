/**
 * log.ts — полено: круглое и колотое.
 *
 * Дрова в мирах были цилиндрами с корой по кругу, и глаз читал их как трубы:
 * у настоящей поленницы половина поверхности - светлые плоскости раскола, они
 * и делают дрова дровами. Здесь колотое полено строится честно: сектор
 * цилиндра с корой по дуге, торцами-секторами и плоскостями раскола.
 *
 * Группы геометрии - по ролям, в этом порядке:
 *
 *     0  кора        набор `bark`,   UV в метрах по обхвату и длине
 *     1  торцы       набор `logend`, весь круг торца на одну карту (см. discUV)
 *     2  раскол      набор `split`,  UV в метрах, волокно вдоль полена
 *
 * Ось полена - его собственная Y, как у `CylinderGeometry`: поворотом
 * `rotation.z = π/2` оно ложится вдоль X, и код мира, писанный под цилиндр, не
 * меняется. Сектор центрирован на +X: у половинки плоскость раскола лежит в
 * x = 0 и смотрит в −X, у четвертинки две плоскости расходятся от оси.
 */

import * as THREE from 'three'
import { cylinderUV, discUV } from '../materials/index.js'
import { lookOf, type Mats } from './look.js'

/** Тайлов на метр у коры и у раскола. */
export type LogTiling = { bark?: number; split?: number }

/**
 * Геометрия колотого полена: сектор в `span` радиан (π - половинка, π/2 -
 * четвертинка), радиус `r`, длина `len`.
 */
export function splitLogGeometry(
  r: number,
  len: number,
  span = Math.PI,
  segments = 8,
  s: LogTiling = {},
): THREE.BufferGeometry {
  const sb = s.bark ?? 2.6
  const sp = s.split ?? 3.3
  const h = len / 2
  const a0 = -span / 2
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const groups: [number, number, number][] = []
  let start = 0
  const group = (mat: number) => {
    groups.push([start, idx.length - start, mat])
    start = idx.length
  }
  const vert = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number) => {
    pos.push(x, y, z)
    nor.push(nx, ny, nz)
    uv.push(u, v)
    return pos.length / 3 - 1
  }
  const at = (t: number): [number, number] => [r * Math.cos(t), r * Math.sin(t)]

  // ---- кора: полоса за полосой, нормаль радиальная, гладкая ----
  for (let i = 0; i <= segments; i++) {
    const t = a0 + (span * i) / segments
    const [x, z] = at(t)
    const u = r * span * (i / segments) * sb
    vert(x, -h, z, Math.cos(t), 0, Math.sin(t), u, 0)
    vert(x, h, z, Math.cos(t), 0, Math.sin(t), u, len * sb)
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2 // (θ, −h)
    const b = a + 1 // (θ, +h)
    const c = a + 2 // (θ+dθ, −h)
    const d = a + 3 // (θ+dθ, +h)
    idx.push(a, d, c, a, b, d) // обход наружу: проверено векторным произведением
  }
  group(0)

  // ---- торцы: веер от оси, вся карта торца на круг радиуса r ----
  for (const side of [1, -1]) {
    const y = side * h
    const center = vert(0, y, 0, 0, side, 0, 0.5, 0.5)
    const ring: number[] = []
    for (let i = 0; i <= segments; i++) {
      const t = a0 + (span * i) / segments
      const [x, z] = at(t)
      ring.push(vert(x, y, z, 0, side, 0, 0.5 + x / (2 * r), 0.5 + z / (2 * r)))
    }
    for (let i = 0; i < segments; i++) {
      if (side > 0) idx.push(center, ring[i + 1], ring[i])
      else idx.push(center, ring[i], ring[i + 1])
    }
  }
  group(1)

  // ---- раскол: одна плоскость у половинки, две от оси у четвертинки ----
  // Обход подбирается по месту: нормаль обязана смотреть прочь от тела
  // сектора, а тело лежит у +X. Считать это в уме для двух углов сразу - верный
  // способ получить одну грань изнанкой; проверка знаком проще.
  const inside: [number, number] = [r * 0.5, 0]
  const flats: [[number, number], [number, number]][] =
    span >= Math.PI - 1e-6 ? [[at(a0), at(a0 + span)]] : [[[0, 0], at(a0)], [at(a0 + span), [0, 0]]]
  for (const [P, Q] of flats) {
    const dx = Q[0] - P[0]
    const dz = Q[1] - P[1]
    const w = Math.hypot(dx, dz)
    // нормаль обхода (A, B, C) при A = P(−h), B = Q(−h), C = Q(+h): (−dz, 0, dx)
    let nx = -dz / w
    let nz = dx / w
    const mx = (P[0] + Q[0]) / 2 - inside[0]
    const mz = (P[1] + Q[1]) / 2 - inside[1]
    const flip = nx * mx + nz * mz < 0
    if (flip) {
      nx = -nx
      nz = -nz
    }
    const A = vert(P[0], -h, P[1], nx, 0, nz, 0, 0)
    const B = vert(Q[0], -h, Q[1], nx, 0, nz, w * sp, 0)
    const C = vert(Q[0], h, Q[1], nx, 0, nz, w * sp, len * sp)
    const D = vert(P[0], h, P[1], nx, 0, nz, 0, len * sp)
    if (flip) idx.push(A, C, B, A, D, C)
    else idx.push(A, B, C, A, C, D)
  }
  group(2)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  for (const [st, count, mat] of groups) g.addGroup(st, count, mat)
  return g
}

/**
 * Круглое полено: цилиндр с корой по обхвату и картой торца на всю крышку.
 * Группы те же, что у three: 0 бок, 1 верх, 2 низ - материалы [кора, торец, торец].
 */
export function roundLogGeometry(r: number, len: number, segments = 8, s = 2.6): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r * 1.06, len, segments)
  cylinderUV(g, r, len, s)
  discUV(g, r)
  return g
}

/** Материалы полена по ролям: кора, торец, раскол. */
export function logMaterials(mats?: Mats): { bark: THREE.Material; end: THREE.Material; split: THREE.Material } {
  return {
    bark: lookOf(mats, 'bark', 'bark', { normalScale: 1.6 }),
    end: lookOf(mats, 'end', 'logend', { normalScale: 1.2 }),
    split: lookOf(mats, 'split', 'split', { normalScale: 1.3 }),
  }
}

/** Массив материалов под группы колотого полена. */
export function splitLogMaterials(m: ReturnType<typeof logMaterials>): THREE.Material[] {
  return [m.bark, m.end, m.split]
}

/** Массив материалов под группы круглого полена. */
export function roundLogMaterials(m: ReturnType<typeof logMaterials>): THREE.Material[] {
  return [m.bark, m.end, m.end]
}
