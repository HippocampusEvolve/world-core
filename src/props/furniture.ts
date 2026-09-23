/**
 * furniture.ts — казённая мебель: скамья, стул и стопка стульев, письменный
 * стол с тумбой, тумбочка, сервант, верстак, дощатый ящик.
 *
 * Начало координат у всех - середина пятна на полу, лицо к +Z. Габариты
 * `w`, `d`, `h` - рамка предмета целиком; рабочие высоты (сиденье,
 * столешница) - отдельными полями.
 */

import * as THREE from 'three'
import { type Mats } from './look.js'
import { boxMesh, cylMesh } from './parts.js'
import { roleMats } from './roles.js'
import { carcass } from './cabinet.js'
import { fillet, mesh, pipe, pivot, type P3 } from './shapes.js'

export type Sized = { group: THREE.Group; w: number; d: number; h: number }

/* ---------------------------------- скамья ---------------------------------- */

export type BenchOptions = { w?: number; d?: number; h?: number; mats?: Mats }
export type Bench = Sized & { seat: number }

/** Скамья: две доски сиденья на двух козлах, внизу проножка. Роли: wood, paint. */
export function bench({ w = 1.2, d = 0.35, h = 0.45, mats }: BenchOptions = {}): Bench {
  const g = new THREE.Group()
  g.name = 'bench'
  const m = roleMats(mats)
  const PL = 0.035
  const BEAR = 0.05
  const LEG = 0.045
  const legH = h - PL - BEAR
  const lx = w / 2 - 0.12
  const lz = d / 2 - 0.05
  const pd = (d - 0.01) / 2
  for (const sz of [-1, 1]) {
    g.add(boxMesh('bench-plank', w, PL, pd, m('wood'), 0, h - PL / 2, sz * (0.005 + pd / 2), 1, 'x'))
  }
  for (const sx of [-1, 1]) {
    const x = sx * lx
    g.add(boxMesh('bench-bearer', LEG, BEAR, d - 0.02, m('paint'), x, legH + BEAR / 2, 0, 1, 'z'))
    for (const sz of [-1, 1]) g.add(boxMesh('bench-leg', LEG, legH, LEG, m('paint'), x, legH / 2, sz * lz, 1, 'y'))
    // низовая перемычка между ногами козла, встык
    g.add(boxMesh('bench-cross', 0.03, 0.04, 2 * lz - LEG, m('paint'), x, 0.12, 0, 1, 'z'))
  }
  // проножка вдоль скамьи между перемычками козел
  g.add(boxMesh('bench-stretcher', 2 * lx - 0.03, 0.04, 0.03, m('paint'), 0, 0.12, 0, 1, 'x'))
  return { group: g, w, d, h, seat: h }
}

/* ----------------------------------- стул ----------------------------------- */

export type ChairOptions = { mats?: Mats }
export type Chair = Sized & { seat: number }

/**
 * Размеры стула. Стопка (`chairStack`) выведена из них: стул ложится на стул
 * со сдвигом вверх на сиденье плюс трубку (царги верхнего лежат на сиденье
 * нижнего) и назад на трубку с зазором.
 */
const CH = {
  r: 0.01, // радиус трубки каркаса
  legX: 0.2, // ось ног по X
  railX: 0.17, // ось царг под сиденьем по X
  seatW: 0.38,
  seatD: 0.4,
  seatT: 0.02,
  seatH: 0.45,
  zf: 0.17,
  zb: -0.18,
  top: 0.85,
  lean: (8.5 * Math.PI) / 180,
}
/** Шаг стопки: вверх на сиденье и трубку, назад на две трубки с зазором. */
const STACK = { up: CH.seatT + 2 * CH.r, back: 0.03 }

/**
 * Советский стул на трубчатом каркасе: фанерные сиденье и спинка, четыре
 * ноги, 0.42 x 0.45 x 0.85. Роли: wood (сиденье, спинка), paint (каркас).
 *
 * Каркас устроен так, чтобы стулья вставлялись друг в друга: ноги стоят
 * СНАРУЖИ сиденья, царги - под ним и внутри линии ног. У плоской рамы
 * «нога-царга-нога» её копия со сдвигом обязательно пересечёт оригинал, а у
 * такой, разнесённой по X, - нет: царги верхнего стула проходят внутри ног
 * нижнего и ложатся на его сиденье.
 */
export function chair({ mats }: ChairOptions = {}): Chair {
  const g = new THREE.Group()
  g.name = 'chair'
  const m = roleMats(mats)
  const { r, legX, railX, seatW, seatD, seatT, seatH, zf, zb, top, lean } = CH
  const frame = m('paint')
  const railY = seatH - seatT - r
  const tan = Math.tan(lean)
  const postZ = (y: number) => zb - (y - seatH) * tan

  g.add(boxMesh('chair-seat', seatW, seatT, seatD, m('wood'), 0, seatH - seatT / 2, 0, 1, 'z'))
  // передние ноги - до верха сиденья, сбоку от него
  for (const sx of [-1, 1]) {
    g.add(mesh('chair-leg', pipe([[sx * legX, 0, zf], [sx * legX, seatH, zf]], r, 6), frame))
    // царга под сиденьем: от передней ноги внутрь, назад, к задней ноге
    const rail: P3[] = [
      [sx * (legX - r), railY, zf],
      [sx * railX, railY, zf],
      [sx * railX, railY, zb],
      [sx * (legX - r), railY, zb],
    ]
    g.add(mesh('chair-rail', pipe(rail, r, 6), frame))
  }
  // спинка: задние ноги и стойки одной трубкой с перекладиной поверху
  const yb = top - r
  const back: P3[] = [
    [-legX, 0, zb],
    [-legX, seatH, zb],
    [-legX, yb, postZ(yb)],
    [legX, yb, postZ(yb)],
    [legX, seatH, zb],
    [legX, 0, zb],
  ]
  g.add(mesh('chair-back-frame', pipe(fillet(back, 0.04, 2, [2, 3]), r, 6), frame))
  // проножки между ногами, встык к ним
  for (const z of [zf, zb]) {
    g.add(mesh('chair-stretcher', pipe([[-(legX - r), 0.15, z], [legX - r, 0.15, z]], r * 0.9, 6), frame))
  }
  // спинка-фанерка между стойками, наклонена вместе с ними
  const py = 0.7
  const panel = boxMesh('chair-backrest', seatW, 0.16, 0.012, m('wood'), 0, py, postZ(py), 1, 'x')
  panel.rotation.x = -lean
  g.add(panel)
  const zmin = postZ(yb) - r
  return { group: g, w: 2 * (legX + r), d: seatD / 2 - zmin, h: top, seat: seatH }
}

export type ChairStackOptions = { n?: number; mats?: Mats }
export type ChairStack = Sized & { chairs: THREE.Group[] }

/**
 * Стулья стопкой, вставленные друг в друга: каждый следующий выше на сиденье
 * с трубкой и сдвинут назад на 3 см. Детали соседей не пересекаются - это
 * выведено из устройства каркаса (см. `chair`), а не подобрано.
 */
export function chairStack({ n = 4, mats }: ChairStackOptions = {}): ChairStack {
  const g = new THREE.Group()
  g.name = 'chair-stack'
  const chairs: THREE.Group[] = []
  let one: Chair | null = null
  for (let i = 0; i < n; i++) {
    const c = chair({ mats })
    one = c
    c.group.name = `chair-${i + 1}`
    c.group.position.set(0, i * STACK.up, -i * STACK.back)
    g.add(c.group)
    chairs.push(c.group)
  }
  const c = one!
  return { group: g, w: c.w, d: c.d + (n - 1) * STACK.back, h: c.h + (n - 1) * STACK.up, chairs }
}

/* ------------------------------ письменный стол ------------------------------ */

export type DeskOptions = { w?: number; d?: number; h?: number; pull?: number; mats?: Mats }
export type Desk = Sized & { top: number; drawers: THREE.Group[] }

/**
 * Письменный стол: столешница, тумба справа с тремя ящиками, щит-опора слева
 * и царга-экран сзади. Ящики - подвижные подгруппы (`drawer`, `pull` - на
 * сколько выдвинуты). Роли: wood (столешница), paint (корпус, лица), steel
 * (ручки).
 */
export function desk({ w = 1.4, d = 0.7, h = 0.75, pull = 0, mats }: DeskOptions = {}): Desk {
  const g = new THREE.Group()
  g.name = 'desk'
  const m = roleMats(mats)
  const TOP = 0.03
  const O = 0.02 // свес столешницы
  const under = h - TOP
  g.add(boxMesh('desk-top', w, TOP, d, m('wood'), 0, h - TOP / 2, 0, 1, 'x'))
  const pw = 0.42
  const pd = d - O
  const ped = carcass({
    name: 'desk-pedestal',
    w: pw,
    h: under,
    d: pd,
    base: 0.06,
    top: false,
    slots: [{ h: 0.16, kind: 'drawer' }, { h: 0.2, kind: 'drawer' }, { kind: 'drawer' }],
    body: m('paint'),
    front: m('paint'),
    handle: m('steel'),
    pull,
  })
  ped.group.position.set(w / 2 - O - pw / 2, 0, -O / 2)
  g.add(ped.group)
  // щит-опора слева и экран сзади между ним и тумбой
  const LT = 0.025
  const lx = -w / 2 + O + LT / 2
  g.add(boxMesh('desk-leg-panel', LT, under, pd, m('paint'), lx, under / 2, -O / 2, 1, 'y'))
  const x0 = lx + LT / 2
  const x1 = w / 2 - O - pw
  const MT = 0.018
  g.add(boxMesh('desk-modesty', x1 - x0, under - 0.3, MT, m('paint'), (x0 + x1) / 2, 0.3 + (under - 0.3) / 2, -d / 2 + 0.04 + MT / 2, 1, 'x'))
  return { group: g, w, d, h, top: h, drawers: ped.drawers }
}

/* --------------------------------- тумбочка --------------------------------- */

export type NightstandOptions = { w?: number; d?: number; h?: number; pull?: number; mats?: Mats }
export type Nightstand = Sized & { top: number; drawers: THREE.Group[] }

/**
 * Тумбочка: ящик сверху, ниже открытая ниша с полкой, на цоколе. Ящик -
 * подвижная подгруппа (`drawer`), в `userData.inside` - где у него дно.
 * Роли: wood (крышка), paint (корпус), steel (ручка).
 */
export function nightstand({ w = 0.45, d = 0.4, h = 0.6, pull = 0, mats }: NightstandOptions = {}): Nightstand {
  const g = new THREE.Group()
  g.name = 'nightstand'
  const m = roleMats(mats)
  const TOP = 0.02
  const O = 0.015
  g.add(boxMesh('nightstand-top', w, TOP, d, m('wood'), 0, h - TOP / 2, 0, 1, 'x'))
  const c = carcass({
    name: 'nightstand-body',
    w: w - 2 * O,
    h: h - TOP,
    d: d - O,
    base: 0.05,
    top: false,
    slots: [{ h: 0.13, kind: 'drawer' }, { kind: 'open', shelf: true }],
    body: m('paint'),
    front: m('paint'),
    handle: m('steel'),
    pull,
  })
  c.group.position.set(0, 0, -O / 2)
  g.add(c.group)
  return { group: g, w, d, h, top: h, drawers: c.drawers }
}

/* ---------------------------------- сервант --------------------------------- */

export type SideboardOptions = { w?: number; d?: number; h?: number; open?: number; mats?: Mats }
export type Sideboard = Sized & { top: number; doors: THREE.Group[] }

/**
 * Сервант, нижняя часть: две дверцы на петлях по краям, внутри полка, на
 * четырёх точёных ножках. Крышка со свесом, ручки под свесом. Дверцы -
 * подвижные подгруппы (`door-left`, `door-right`), `open` - угол, рад.
 * Роли: wood (крышка, ножки), paint (корпус, дверцы), brass (ручки).
 */
export function sideboard({ w = 1.4, d = 0.45, h = 0.9, open = 0, mats }: SideboardOptions = {}): Sideboard {
  const g = new THREE.Group()
  g.name = 'sideboard'
  const m = roleMats(mats)
  const TOP = 0.025
  const O = 0.02
  const LEG = 0.1
  g.add(boxMesh('sideboard-top', w, TOP, d, m('wood'), 0, h - TOP / 2, 0, 1, 'x'))
  const cw = w - 2 * O
  const cd = d - O
  const c = carcass({
    name: 'sideboard-body',
    w: cw,
    h: h - TOP - LEG,
    d: cd,
    top: false,
    slots: [{ kind: 'doors', shelf: true }],
    body: m('paint'),
    front: m('paint'),
    handle: m('brass'),
    open,
  })
  c.group.position.set(0, LEG, -O / 2)
  g.add(c.group)
  // ножки под боковинами, чуть внутрь от углов
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(cylMesh('sideboard-leg', 0.02, 0.014, LEG, 8, m('wood'), sx * (cw / 2 - 0.03), LEG / 2, -O / 2 + sz * (cd / 2 - 0.04), 4))
    }
  }
  return { group: g, w, d, h, top: h, doors: c.doors }
}

/* ---------------------------------- верстак --------------------------------- */

export type WorkbenchOptions = { w?: number; d?: number; h?: number; mats?: Mats }
export type Workbench = Sized & { top: number }

/**
 * Верстак: толстая столешница на стальной раме, внизу полка, справа у кромки
 * тиски, на столешнице молоток и гаечный ключ. Тиски выходят за кромку вперёд
 * и над столешницей - рамка предмета больше столешницы на них.
 * Роли: wood (столешница, полка, рукоять молотка), paint (рама), steel.
 */
export function workbench({ w = 1.6, d = 0.6, h = 0.9, mats }: WorkbenchOptions = {}): Workbench {
  const g = new THREE.Group()
  g.name = 'workbench'
  const m = roleMats(mats)
  const TOP = 0.05
  const LEG = 0.06
  const lx = w / 2 - 0.08
  const lz = d / 2 - 0.08
  const under = h - TOP
  g.add(boxMesh('workbench-top', w, TOP, d, m('wood'), 0, h - TOP / 2, 0, 1, 'x'))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(boxMesh('workbench-leg', LEG, under, LEG, m('paint'), sx * lx, under / 2, sz * lz, 1, 'y'))
  const AP = 0.08
  const AT = 0.025
  const inX = 2 * lx - LEG
  const inZ = 2 * lz - LEG
  for (const sz of [-1, 1]) {
    g.add(boxMesh('workbench-apron', inX, AP, AT, m('paint'), 0, under - AP / 2, sz * lz, 1, 'x'))
    g.add(boxMesh('workbench-rail', inX, 0.05, AT, m('paint'), 0, 0.145, sz * lz, 1, 'x'))
  }
  for (const sx of [-1, 1]) g.add(boxMesh('workbench-apron', AT, AP, inZ, m('paint'), sx * lx, under - AP / 2, 0, 1, 'z'))
  // полка на нижних связях, между ногами
  g.add(boxMesh('workbench-shelf', inX, 0.02, 2 * lz, m('wood'), 0, 0.17 + 0.01, 0, 1, 'x'))

  // тиски: основание на столешнице с выносом за кромку, неподвижная губка у
  // кромки, подвижная перед ней, винт с воротком
  const vx = w / 2 - 0.25
  const steel = m('steel')
  const fz = d / 2
  g.add(boxMesh('vise-base', 0.12, 0.04, 0.24, steel, vx, h + 0.02, fz - 0.2 + 0.12, 2))
  g.add(boxMesh('vise-jaw', 0.14, 0.07, 0.03, steel, vx, h + 0.04 + 0.035, fz - 0.015, 2))
  g.add(boxMesh('vise-jaw-moving', 0.14, 0.07, 0.03, steel, vx, h + 0.04 + 0.035, fz + 0.01 + 0.015, 2))
  const screw = cylMesh('vise-screw', 0.009, 0.009, 0.06, 8, steel, vx, h + 0.075, fz + 0.04 + 0.03, 4)
  screw.rotation.x = Math.PI / 2
  g.add(screw)
  const bar = cylMesh('vise-handle', 0.006, 0.006, 0.16, 8, steel, vx, h + 0.075, fz + 0.1 + 0.006, 4)
  bar.rotation.z = Math.PI / 2
  g.add(bar)

  // молоток: боёк лежит на боку, рукоять висит на полтора миллиметра над доской
  const hx = -w / 2 + 0.35
  g.add(boxMesh('hammer-head', 0.025, 0.025, 0.1, steel, hx, h + 0.0125, 0.05, 4))
  const hh = cylMesh('hammer-handle', 0.011, 0.011, 0.28, 8, m('wood'), hx + 0.0125 + 0.14, h + 0.0125, 0.05, 4)
  hh.rotation.z = Math.PI / 2
  g.add(hh)
  // гаечный ключ: стержень и две головки, лежат на столешнице
  const kx = -w / 2 + 0.3
  const kz = d / 2 - 0.12
  g.add(boxMesh('wrench-shaft', 0.16, 0.007, 0.02, steel, kx + 0.1, h + 0.0035, kz, 4))
  for (const sx of [0, 1]) {
    // головки заходят на стержень на пару миллиметров: ключ цельный
    g.add(cylMesh('wrench-end', 0.018, 0.018, 0.008, 10, steel, kx + 0.004 + sx * 0.192, h + 0.004, kz, 4))
  }
  return { group: g, w, d: d / 2 + 0.106 + 0.006 + d / 2, h: h + 0.11, top: h }
}

/* ----------------------------------- ящик ----------------------------------- */

export type CrateOptions = { w?: number; d?: number; h?: number; open?: number; mats?: Mats }
export type Crate = Sized & { lid: THREE.Group }

/**
 * Дощатый ящик с крышкой: по три доски на стенку с зазорами, дно, крышка из
 * четырёх досок на двух планках сверху. Крышка - подвижная подгруппа (`lid`):
 * ось петли вдоль X у задней верхней кромки, открывается поворотом
 * `rotation.x` в минус. Роли: wood.
 */
export function crate({ w = 0.9, d = 0.6, h = 0.6, open = 0, mats }: CrateOptions = {}): Crate {
  const g = new THREE.Group()
  g.name = 'crate'
  const m = roleMats(mats)
  const wood = m('wood')
  const B = 0.02 // толщина доски
  const CL = 0.02 // планки на крышке
  const body = h - B - CL
  const rowGap = 0.01
  const rowH = (body - 2 * rowGap) / 3
  for (let i = 0; i < 3; i++) {
    const y = i * (rowH + rowGap) + rowH / 2
    for (const sz of [-1, 1]) g.add(boxMesh('crate-board', w, rowH, B, wood, 0, y, sz * (d / 2 - B / 2), 2, 'x'))
    for (const sx of [-1, 1]) g.add(boxMesh('crate-board', B, rowH, d - 2 * B, wood, sx * (w / 2 - B / 2), y, 0, 2, 'z'))
  }
  g.add(boxMesh('crate-bottom', w - 2 * B, B, d - 2 * B, wood, 0, B / 2, 0, 2, 'x'))
  const lid = pivot('crate-lid', 0, body, -d / 2, 'lid')
  lid.userData.motion = 'rotate'
  lid.userData.axis = 'x'
  lid.userData.sign = -1
  lid.userData.limit = (110 * Math.PI) / 180
  const lb = (d - 3 * 0.006) / 4
  for (let i = 0; i < 4; i++) {
    lid.add(boxMesh('crate-lid-board', w, B, lb, wood, 0, B / 2, i * (lb + 0.006) + lb / 2, 2, 'x'))
  }
  for (const sx of [-1, 1]) lid.add(boxMesh('crate-cleat', 0.07, CL, d - 0.04, wood, sx * (w / 2 - 0.1), B + CL / 2, d / 2, 2, 'z'))
  lid.rotation.x = -open
  g.add(lid)
  return { group: g, w, d, h, lid }
}
