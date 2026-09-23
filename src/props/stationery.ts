/**
 * stationery.ts — на столе: раскрытая толстая тетрадь-журнал и ручка.
 *
 * Начало координат - середина пятна на столе, y = 0 - столешница.
 */

import * as THREE from 'three'
import { type Mats } from './look.js'
import { roleMats } from './roles.js'
import { boxGeo, extrude, frameOf, merge, mesh, revolve } from './shapes.js'

type Sized = { group: THREE.Group; w: number; d: number; h: number }

/* ------------------------------ раскрытый журнал ------------------------------ */

export type OpenBookOptions = {
  /** Ширина раскрытого журнала по обложке, м. */
  w?: number
  /** Высота страницы (глубина по Z), м. */
  d?: number
  /** Толщина блока страниц у обреза, каждой половины, м. */
  thick?: number
  mats?: Mats
}
export type OpenBook = Sized & {
  /** Блоки страниц: левый и правый. Верх блока - изогнутая к корешку страница. */
  pages: [THREE.Mesh, THREE.Mesh]
  cover: THREE.Mesh
}

/**
 * Раскрытая толстая тетрадь-журнал: обложка плашмя, на ней два блока страниц,
 * у корешка страницы уходят вниз. Корешок вдоль Z посередине.
 *
 * Обложка - РАМКА вокруг блоков (корешок, обрезы, головка и хвост), а не
 * доска под ними: низ блока, стоящего на доске в 3 мм, лёг бы в трёх
 * миллиметрах над низом доски одной с ним стороной, и проверка назвала бы
 * это спором за глубину. Так блоки стоят на столе в проёмах рамки, низы
 * всего журнала - в одной плоскости встык, без наложения.
 * Роли: cloth (обложка), paper (страницы).
 */
export function openBook({ w = 0.42, d = 0.3, thick = 0.012, mats }: OpenBookOptions = {}): OpenBook {
  const g = new THREE.Group()
  g.name = 'open-book'
  const m = roleMats(mats)
  const TC = 0.003 // толщина обложки
  const OV = 0.004 // выступ обложки за страницы
  const XS = 0.006 // полуширина корешка
  const xf = w / 2 - OV
  const dp = d - 2 * OV
  // верх блока: у корешка низко, к трети ширины - полная толщина, у обреза
  // чуть проседает
  const top = (u: number) => thick * (0.3 + 0.7 * Math.sin(Math.min(1, u / 0.4) * (Math.PI / 2))) - thick * 0.06 * Math.max(0, u - 0.8) / 0.2
  const outline: [number, number][] = [[XS, 0], [xf, 0]]
  const K = 10
  for (let k = K; k >= 0; k--) {
    const u = k / K
    outline.push([XS + u * (xf - XS), top(u)])
  }
  const block = (name: string, side: number) => {
    const pts = side > 0 ? outline : outline.map(([x, y]) => [-x, y] as [number, number]).reverse()
    return mesh(name, extrude(pts, dp), m('paper'), 0, 0, -dp / 2)
  }
  const left = block('book-pages-left', -1)
  const right = block('book-pages-right', 1)
  // обложка: корешок, два обреза, головка и хвост у каждой половины - встык
  const parts: THREE.BufferGeometry[] = [boxGeo(2 * XS, TC, d, 0, TC / 2, 0)]
  for (const s of [-1, 1]) {
    parts.push(boxGeo(OV, TC, d, s * (xf + OV / 2), TC / 2, 0))
    for (const e of [-1, 1]) parts.push(boxGeo(xf - XS, TC, OV, s * (XS + xf) / 2, TC / 2, e * (dp / 2 + OV / 2)))
  }
  const cover = mesh('book-cover', merge(parts), m('cloth'))
  g.add(cover, left, right)
  return { group: g, ...frameOf(g), pages: [left, right], cover }
}

/* ------------------------------------ ручка ------------------------------------ */

export type PenOptions = { mats?: Mats }
export type Pen = Sized

/**
 * Ручка: пишущий узел, корпус, колпачок с клипом. Лежит на столе клипом
 * вверх, ось вдоль X, пером к +X. Колпачок чуть толще корпуса и лежит на
 * столе, корпус висит над ним на полмиллиметра. Роли: plastic (корпус,
 * колпачок), steel (перо, клип).
 */
export function pen({ mats }: PenOptions = {}): Pen {
  const g = new THREE.Group()
  g.name = 'pen'
  const m = roleMats(mats)
  const L = 0.141
  const RC = 0.006
  const geo = revolve(
    [
      { pts: [[0, 0], [0.0015, 0.004], [0.003, 0.012]], mat: 1 },
      { pts: [[0.003, 0.012], [0.0045, 0.018], [0.0055, 0.03], [0.0055, 0.085]] },
      { pts: [[0.0055, 0.085], [RC, 0.086], [RC, 0.135], [0.004, 0.14], [0, L]] },
    ],
    10,
  )
  // ось Y профиля - вдоль X, перо к +X; вершина сечения смотрит вниз
  geo.rotateZ(Math.PI / 2)
  geo.translate(L / 2, RC, 0)
  const body = mesh('pen-body', geo, [m('plastic'), m('steel')])
  g.add(body)
  // клип вдоль колпачка, поверх него
  // колпачок - от 0.086 до 0.135 по оси профиля, то есть от L/2 - 0.086 до L/2 - 0.135 по X
  const clip = mesh('pen-clip', boxGeo(0.04, 0.0012, 0.003), m('steel'), L / 2 - 0.1125, 2 * RC + 0.0003 + 0.0006, 0)
  g.add(clip)
  return { group: g, ...frameOf(g) }
}
