/**
 * tableware.ts — посуда: эмалированная кружка, сахарница с крышкой, настенная
 * полка с чашками.
 *
 * Посуда - тела вращения (`revolve`): профиль от середины дна наружу, вверх
 * по стенке, через край и внутрь обратно к середине, так что тело замкнуто
 * и стенка имеет толщину. Кант по краю - свой прогон профиля с ролью
 * `paint2`: у эмалированной посуды край тёмный. Начало - середина дна на
 * столе, ручка к +X.
 */

import * as THREE from 'three'
import { type Mats } from './look.js'
import { boxMesh } from './parts.js'
import { roleMats } from './roles.js'
import { fillet, frameOf, merge, mesh, pipe, revolve, type P3 } from './shapes.js'

type Sized = { group: THREE.Group; w: number; d: number; h: number }

/* ------------------------------------ кружка ------------------------------------ */

export type MugOptions = {
  /** Налито: доля высоты, 0 - пустая. */
  fill?: number
  mats?: Mats
}
export type Mug = Sized & { body: THREE.Mesh; handle: THREE.Mesh; liquid: THREE.Mesh | null; rim: number }

/**
 * Эмалированная кружка 0.08 x 0.1: стенка в 3 мм, дно вогнуто и стоит на
 * кольце, по краю закатанный кант, ручка-скоба сбоку. Налитое (`fill`) -
 * столб от дна до уровня, отдельным мешем (`mug-liquid`): мир даст ему пар.
 * Роли: enamel (кружка, ручка), paint2 (кант), water (налитое).
 */
export function mug({ fill = 0, mats }: MugOptions = {}): Mug {
  const g = new THREE.Group()
  g.name = 'mug'
  const m = roleMats(mats)
  const R = 0.04
  const RI = 0.037
  const H = 0.1
  const FLOOR = 0.004
  const body = mesh(
    'mug-body',
    revolve(
      [
        { pts: [[0, 0.0015], [0.036, 0.0015], [0.038, 0], [R, 0.003], [R, 0.094]] },
        { pts: [[R, 0.094], [0.0415, 0.096], [0.0415, 0.099], [0.04, H], [0.038, H], [RI, 0.098]], mat: 1 },
        { pts: [[RI, 0.098], [RI, 0.006], [0.035, FLOOR], [0, FLOOR]] },
      ],
      14,
    ),
    [m('enamel'), m('paint2')],
  )
  g.add(body)
  // ручка: скоба от стенки у края к стенке у дна; концы на стенке
  const hp: P3[] = [
    [R - 0.0005, 0.085, 0],
    [0.058, 0.084, 0],
    [0.066, 0.07, 0],
    [0.066, 0.05, 0],
    [0.058, 0.036, 0],
    [R - 0.0005, 0.034, 0],
  ]
  const handle = mesh('mug-handle', pipe(fillet(hp, 0.01, 2, [1, 4]), 0.004, 6), m('enamel'))
  g.add(handle)
  let liquid: THREE.Mesh | null = null
  if (fill > 0) {
    const r = RI - 0.0005
    const y0 = FLOOR + 0.0005
    const y1 = FLOOR + Math.min(0.95, fill) * (0.098 - FLOOR)
    liquid = mesh('mug-liquid', revolve([[[0, y0], [r, y0]], [[r, y0], [r, y1]], [[r, y1], [0, y1]]], 14), m('water'))
    g.add(liquid)
  }
  return { group: g, ...frameOf(g), body, handle, liquid, rim: H }
}

/* ---------------------------------- сахарница ---------------------------------- */

export type SugarBowlOptions = { mats?: Mats }
export type SugarBowl = Sized & { body: THREE.Mesh; lid: THREE.Mesh }

/**
 * Эмалированная сахарница: пузатая чаша на кольце с кантом по краю и крышка
 * с шишечкой, которая лежит на кромке чаши. Крышка - отдельный меш
 * (`sugar-lid`): мир может её снять. Роли: enamel, paint2 (кант, шишечка).
 */
export function sugarBowl({ mats }: SugarBowlOptions = {}): SugarBowl {
  const g = new THREE.Group()
  g.name = 'sugar-bowl'
  const m = roleMats(mats)
  const RIM = 0.078
  const body = mesh(
    'sugar-body',
    revolve(
      [
        { pts: [[0, 0.0015], [0.036, 0.0015], [0.038, 0], [0.052, 0.02], [0.056, 0.045], [0.052, 0.072]] },
        { pts: [[0.052, 0.072], [0.054, 0.075], [0.052, RIM], [0.048, RIM]], mat: 1 },
        { pts: [[0.048, RIM], [0.05, 0.045], [0.045, 0.018], [0.03, 0.007], [0, 0.006]] },
      ],
      12,
    ),
    [m('enamel'), m('paint2')],
  )
  g.add(body)
  const lid = mesh(
    'sugar-lid',
    revolve(
      [
        { pts: [[0, RIM], [0.051, RIM]] },
        { pts: [[0.051, RIM], [0.051, 0.082], [0.04, 0.093], [0.015, 0.1]] },
        { pts: [[0.015, 0.1], [0.009, 0.103], [0.012, 0.11], [0, 0.113]], mat: 1 },
      ],
      12,
    ),
    [m('enamel'), m('paint2')],
  )
  g.add(lid)
  return { group: g, ...frameOf(g), body, lid }
}

/* ------------------------------- полка с чашками ------------------------------- */

export type CupShelfOptions = { cups?: number; w?: number; mats?: Mats }
export type CupShelf = Sized & {
  /** Чашки слева направо, меши `cup-1`...`cup-N`: мир красит каждую сам. */
  cups: THREE.Mesh[]
}

/**
 * Настенная полка с чашками: доска на двух кронштейнах, спереди бортик, на
 * ней в ряд чашки ручками вправо. Каждая чашка - отдельный меш (`cup-1`...),
 * чтобы мир мог одну отмыть, а остальные запылить. Начало - середина полки
 * на стене, y = 0 - верх доски: на нём стоят чашки.
 * Роли: wood (доска, кронштейны, бортик), enamel (чашки).
 */
export function cupShelf({ cups = 5, w = 0.7, mats }: CupShelfOptions = {}): CupShelf {
  const g = new THREE.Group()
  g.name = 'cup-shelf'
  const m = roleMats(mats)
  const D = 0.16
  const T = 0.022
  g.add(boxMesh('cup-shelf-board', w, T, D, m('wood'), 0, -T / 2, D / 2, 2, 'x'))
  // кронштейн: стойка по стене и плечо под доской, встык
  const BW = 0.02
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.1)
    g.add(boxMesh('cup-shelf-post', BW, 0.12, 0.02, m('wood'), x, -T - 0.06, 0.01, 2, 'y'))
    g.add(boxMesh('cup-shelf-arm', BW, 0.02, D - 0.03, m('wood'), x, -T - 0.01, 0.02 + (D - 0.03) / 2, 2, 'z'))
  }
  g.add(boxMesh('cup-shelf-lip', w, 0.02, 0.012, m('wood'), 0, 0.01, D - 0.006, 2, 'x'))
  const n = Math.max(1, Math.min(cups, Math.floor((w - 0.04) / 0.11)))
  const step = (w - 0.12) / Math.max(1, n - 1)
  const list: THREE.Mesh[] = []
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? -w / 2 + 0.06 + i * step - 0.01 : 0
    const c = mesh(`cup-${i + 1}`, cup(), m('enamel'), x, 0, D / 2 - 0.01)
    g.add(c)
    list.push(c)
  }
  return { group: g, ...frameOf(g), cups: list }
}

/** Чашка: тело вращения на кольце и ручка-скоба, одним куском. */
function cup(): THREE.BufferGeometry {
  const body = revolve(
    [
      [[0, 0.002], [0.022, 0.002], [0.024, 0], [0.034, 0.015], [0.041, 0.065]],
      [[0.041, 0.065], [0.038, 0.065]],
      [[0.038, 0.065], [0.031, 0.015], [0.022, 0.007], [0, 0.006]],
    ],
    10,
  )
  // концы ручки на полмиллиметра в стенке: чашка и ручка - один кусок
  const at = (y: number) => 0.034 + ((y - 0.015) / 0.05) * 0.007 - 0.0005
  const handle = pipe(
    [
      [at(0.055), 0.055, 0],
      [0.056, 0.054, 0],
      [0.058, 0.035, 0],
      [at(0.025), 0.024, 0],
    ],
    0.0035,
    4,
  )
  return merge([body, handle])
}
