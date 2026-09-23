/**
 * storage.ts — где что хранят: стальной шкафчик, настенная аптечка,
 * электрощит, канистра, ведро.
 *
 * Корпусные предметы стоят на общем корпусе из щитов (`cabinet.ts`): дверца
 * утоплена в проём и вращается вокруг своей петли. Настенные (аптечка, щит)
 * посажены тылом на плоскость стены: z = 0 - грань стены, предмет выступает в
 * +Z, начало - середина корпуса.
 */

import * as THREE from 'three'
import { type Mats } from './look.js'
import { boxMesh, cylMesh } from './parts.js'
import { roleMats } from './roles.js'
import { carcass, GAP, HANDLE_OUT } from './cabinet.js'
import { extrude, fillet, frameOf, mesh, merge, boxGeo, pipe, place, revolve, type P3 } from './shapes.js'

type Sized = { group: THREE.Group; w: number; d: number; h: number }
const OPEN = (100 * Math.PI) / 180

/* ------------------------------ стальной шкафчик ------------------------------ */

export type LockerOptions = {
  w?: number
  d?: number
  h?: number
  /** Дверца открыта на 100°. */
  open?: boolean
  /** Бумажная полоска-пломба поперёк щели дверцы. */
  sealed?: boolean
  /** Сколько пустых плечиков на штанге; по умолчанию два у открытого, ноль у закрытого. */
  hangers?: number
  mats?: Mats
}
export type Locker = Sized & { door: THREE.Group; seal: THREE.Mesh | null; inner: THREE.Box3 }

/**
 * Стальной шкафчик на цоколе: дверца на левой петле с жалюзи вверху и внизу,
 * внутри полка под шапку и штанга с плечиками. Роли: paint (корпус, дверца),
 * steel (штанга, плечики, ручка), paper (пломба).
 */
export function locker({ w = 0.5, d = 0.5, h = 1.8, open = false, sealed = false, hangers, mats }: LockerOptions = {}): Locker {
  const g = new THREE.Group()
  g.name = 'locker'
  const m = roleMats(mats)
  const T = 0.012
  const cd = d - HANDLE_OUT
  const c = carcass({
    name: 'locker-body',
    w,
    h,
    d: cd,
    T,
    base: 0.06,
    slots: [{ kind: 'door', hinge: 'left' }],
    body: m('paint'),
    front: m('paint'),
    handle: m('steel'),
    open: open ? OPEN : 0,
  })
  c.group.position.z = -HANDLE_OUT / 2
  g.add(c.group)
  const door = c.doors[0]
  const wi = w - 2 * T
  const dw = wi - 2 * GAP
  // жалюзи: козырьки на лице дверцы, отступ 2 мм. Козырёк наклонён: плоская
  // планка лицом параллельно дверце легла бы в 6 мм перед ней одной стороной,
  // а у пяти шкафчиков в ряд такие планки складываются в одну спорную полосу
  const doorH = h - T - (0.06 + T) - 2 * GAP
  const louvre: THREE.BufferGeometry[] = []
  const tilt = 0.5
  const reachZ = 0.002 * Math.cos(tilt) + 0.004 * Math.sin(tilt) // от середины планки до её дальнего угла по Z
  for (const y of [doorH / 2 - 0.12, -doorH / 2 + 0.1]) {
    for (let i = 0; i < 3; i++) louvre.push(place(boxGeo(0.14, 0.008, 0.004), GAP + dw / 2, y - i * 0.022, 0.002 + reachZ, -tilt))
  }
  door.add(mesh('locker-louvre', merge(louvre), m('paint')))

  // полка под шапку и штанга под ней, между боковинами
  const inner = c.inner.clone().translate(new THREE.Vector3(0, 0, -HANDLE_OUT / 2))
  const shelfY = h - T - 0.28
  const sd = cd - 2 * T - 0.006
  g.add(boxMesh('locker-shelf', wi, T, sd, m('paint'), 0, shelfY - T / 2, inner.min.z + sd / 2, 1, 'x'))
  const rodY = shelfY - 0.1
  const rodZ = inner.min.z + (cd - 2 * T) / 2
  const R = 0.011
  g.add(mesh('locker-rod', pipe([[-wi / 2, rodY, rodZ], [wi / 2, rodY, rodZ]], R, 8), m('steel')))
  const n = hangers ?? (open ? 2 : 0)
  for (let i = 0; i < n; i++) {
    g.add(mesh('locker-hanger', hanger(rodY, rodZ, R), m('steel'), -0.1 + i * 0.16))
  }

  let seal: THREE.Mesh | null = null
  if (sealed) {
    // полоска через щель у свободной кромки: по лицу дверцы и кромке боковины,
    // заворачивает за угол на бок; от поверхности 2 мм
    const front = cd / 2 - HANDLE_OUT / 2
    const y = (0.06 + T + h - T) / 2 + 0.18
    const PT = 0.0005
    const x0 = wi / 2 - 0.045
    const x1 = w / 2 + 0.002 + PT
    const strip = merge([
      boxGeo(x1 - x0, 0.1, PT, (x0 + x1) / 2, y, front + 0.002 + PT / 2),
      boxGeo(PT, 0.1, 0.035, w / 2 + 0.002 + PT / 2, y, front + 0.002 + PT - 0.035 / 2),
    ])
    seal = mesh('locker-seal', strip, m('paper'))
    g.add(seal)
  }
  return { group: g, w, d, h, door, seal, inner }
}

/** Проволочные плечики на штанге: крючок вокруг неё, треугольник вниз. Плоскость YZ. */
function hanger(rodY: number, rodZ: number, rodR: number): THREE.BufferGeometry {
  const r = 0.0025
  const a = rodR + r + 0.0008
  const hook: P3[] = []
  // дуга крючка поверх штанги: от переда через верх к заду
  for (const deg of [-35, 0, 45, 90, 135, 180]) {
    const t = (deg * Math.PI) / 180
    hook.push([0, rodY + Math.sin(t) * a, rodZ + Math.cos(t) * a])
  }
  const neck = rodY - 0.06
  const sh = rodY - 0.16
  const bar = rodY - 0.18
  const half = 0.19
  const pts: P3[] = [
    ...hook,
    [0, neck, rodZ],
    [0, sh, rodZ - half],
    [0, bar, rodZ - half + 0.01],
    [0, bar, rodZ + half - 0.01],
    [0, sh, rodZ + half],
    [0, neck - 0.012, rodZ + 0.008],
  ]
  return pipe(fillet(pts, 0.012, 2, [7, 8, 9, 10]), r, 5)
}

/* ------------------------------ настенная аптечка ----------------------------- */

export type MedCabinetOptions = { open?: boolean; mats?: Mats }
export type MedCabinet = Sized & { door: THREE.Group; vials: THREE.Mesh[] }

/**
 * Настенная аптечка 0.45 x 0.18 x 0.55: корпус с полкой, дверца на левой
 * петле (подвижная, `door`), по умолчанию открыта на 100°; на дверце крест
 * отдельной деталью (`paint2`), внутри три пузырька. Начало - середина
 * корпуса на стене. Роли: paint, paint2, steel, glass, rubber.
 */
export function medCabinet({ open = true, mats }: MedCabinetOptions = {}): MedCabinet {
  const g = new THREE.Group()
  g.name = 'med-cabinet'
  const m = roleMats(mats)
  const w = 0.45
  const h = 0.55
  const d = 0.18
  const T = 0.012
  const cd = d - HANDLE_OUT
  const c = carcass({
    name: 'medcab',
    w,
    h,
    d: cd,
    T,
    slots: [{ kind: 'door', hinge: 'left', shelf: true }],
    body: m('paint'),
    front: m('paint'),
    handle: m('steel'),
    open: open ? OPEN : 0,
  })
  c.group.position.set(0, -h / 2, cd / 2)
  g.add(c.group)
  const door = c.doors[0]
  const dw = w - 2 * T - 2 * GAP
  // крест: цельная деталь плюсом, 13 x 13 см, на 2 мм перед лицом дверцы
  const L = 0.065
  const A = 0.02
  const plus: [number, number][] = [
    [-A, -L], [A, -L], [A, -A], [L, -A], [L, A], [A, A], [A, L], [-A, L], [-A, A], [-L, A], [-L, -A], [-A, -A],
  ]
  const cross = mesh('medcab-cross', extrude(plus, 0.003), m('paint2'), GAP + dw / 2, 0.06, 0.002)
  door.add(cross)
  // пузырьки: два на дне, один на полке
  const vials: THREE.Mesh[] = []
  const floor = c.shelves[c.shelves.length - 1]
  const shelf = c.shelves[0]
  const zc = -cd / 2 + T + 0.05
  for (const [x, y] of [
    [-0.12, floor],
    [-0.06, floor],
    [0.08, shelf],
  ] as [number, number][]) {
    const v = vial()
    v.body.position.set(x, y, zc)
    v.stopper.position.set(x, y, zc)
    c.group.add(v.body, v.stopper)
    vials.push(v.body)
  }
  return { group: g, w, d, h, door, vials }

  function vial(): { body: THREE.Mesh; stopper: THREE.Mesh } {
    const body = mesh(
      'medcab-vial',
      revolve(
        [
          [[0, 0], [0.016, 0]],
          [[0.016, 0], [0.018, 0.004], [0.018, 0.05], [0.012, 0.062], [0.008, 0.066]],
          [[0.008, 0.066], [0.008, 0.074]],
          [[0.008, 0.074], [0, 0.074]],
        ],
        10,
      ),
      m('glass'),
    )
    const stopper = mesh('medcab-stopper', revolve([[[0, 0.074], [0.009, 0.074]], [[0.009, 0.074], [0.0095, 0.088]], [[0.0095, 0.088], [0, 0.088]]], 10), m('rubber'))
    return { body, stopper }
  }
}

/* --------------------------------- электрощит -------------------------------- */

export type PanelBoxOptions = { w?: number; h?: number; d?: number; open?: boolean; mats?: Mats }
export type PanelBox = Sized & { door: THREE.Group }

/**
 * Электрощит на стене: стальной ящик, дверца на левой петле (`door`),
 * внутри монтажная плита и два ряда автоматов. Начало - середина на стене.
 * Роли: paint (ящик, дверца), steel (плита, ручка), plastic (автоматы).
 */
export function panelBox({ w = 0.6, h = 0.8, d = 0.2, open = false, mats }: PanelBoxOptions = {}): PanelBox {
  const g = new THREE.Group()
  g.name = 'panel-box'
  const m = roleMats(mats)
  const T = 0.012
  const cd = d - HANDLE_OUT
  const c = carcass({
    name: 'panel',
    w,
    h,
    d: cd,
    T,
    slots: [{ kind: 'door', hinge: 'left' }],
    body: m('paint'),
    front: m('paint'),
    handle: m('steel'),
    open: open ? OPEN : 0,
  })
  c.group.position.set(0, -h / 2, cd / 2)
  g.add(c.group)
  // монтажная плита на заднике, автоматы на ней рядами
  const PT = 0.015
  const pz = -cd / 2 + T + PT / 2
  c.group.add(boxMesh('panel-plate', w - 2 * T - 0.08, h - 2 * T - 0.1, PT, m('steel'), 0, h / 2, pz, 2))
  const bw = 0.018
  const bh = 0.09
  const bd = 0.07
  const geos: THREE.BufferGeometry[] = []
  for (const row of [0.12, -0.08]) {
    for (let i = 0; i < 12; i++) geos.push(boxGeo(bw, bh, bd, (i - 5.5) * bw, h / 2 + row, pz + PT / 2 + bd / 2))
  }
  c.group.add(mesh('panel-breakers', merge(geos), m('plastic')))
  return { group: g, w, d, h, door: c.doors[0] }
}

/* ---------------------------------- канистра ---------------------------------- */

export type JerrycanOptions = { full?: boolean; mats?: Mats }
export type Jerrycan = Sized & { full: boolean }

/**
 * Канистра 0.35 x 0.17 x 0.47: корпус со скруглёнными рёбрами, тройная ручка
 * сверху на четырёх стойках, горловина у края. У полной на горловине крышка,
 * у пустой горловина открыта. Роли: paint, steel (крышка).
 */
export function jerrycan({ full = true, mats }: JerrycanOptions = {}): Jerrycan {
  const g = new THREE.Group()
  g.name = 'jerrycan'
  const m = roleMats(mats)
  const W = 0.35
  const D = 0.17
  const BODY = 0.4
  const bev = 0.012
  const wb = W - 2 * bev
  const hb = BODY - 2 * bev
  const rr = 0.03
  // контур корпуса спереди: скруглённый прямоугольник
  const outline: [number, number][] = []
  const corners: [number, number, number][] = [
    [wb / 2 - rr, bev + rr, -Math.PI / 2],
    [wb / 2 - rr, bev + hb - rr, 0],
    [-wb / 2 + rr, bev + hb - rr, Math.PI / 2],
    [-wb / 2 + rr, bev + rr, Math.PI],
  ]
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= 3; k++) {
      const a = a0 + (k / 3) * (Math.PI / 2)
      outline.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
    }
  }
  const body = mesh('jerrycan-body', extrude(outline, D - 2 * bev, bev, 3), m('paint'), 0, 0, -D / 2)
  g.add(body)
  // ручка: перекладина на четырёх стойках
  const top = BODY
  const barR = 0.012
  const barY = 0.47 - barR
  for (const x of [-0.12, -0.065, -0.01, 0.045]) {
    g.add(boxMesh('jerrycan-post', 0.016, barY - barR - top, 0.03, m('paint'), x, top + (barY - barR - top) / 2, 0, 4))
  }
  g.add(mesh('jerrycan-handle', pipe([[-0.14, barY, 0], [0.065, barY, 0]], barR, 8), m('paint')))
  // горловина у правого края, на ровной части крыши, и крышка на ней
  g.add(cylMesh('jerrycan-neck', 0.022, 0.024, 0.03, 12, m('paint'), 0.105, top + 0.015, 0, 4))
  if (full) g.add(cylMesh('jerrycan-cap', 0.027, 0.027, 0.022, 12, m('steel'), 0.105, top + 0.03 + 0.011, 0, 4))
  return { group: g, w: W, d: D, h: 0.47, full }
}

/* ------------------------------------ ведро ------------------------------------ */

export type BucketOptions = { water?: boolean; mats?: Mats }
export type Bucket = Sized & { water: THREE.Mesh | null; rim: number }

/**
 * Оцинкованное ведро: конус с закатанным бортом, дно утоплено на юбке, дужка
 * на ушках опущена набок и не касается стенки. Вода вровень с краем - слой
 * воды у самого верха, а не столб до дна: низ столба лёг бы на полсантиметра
 * над дном ведра одной с ним стороной. Роли: steel, water.
 */
export function bucket({ water = true, mats }: BucketOptions = {}): Bucket {
  const g = new THREE.Group()
  g.name = 'bucket'
  const m = roleMats(mats)
  const S = 14
  const wallAt = (y: number) => 0.1165 + (y - 0.018) * ((0.146 - 0.1165) / (0.3 - 0.018))
  g.add(
    mesh(
      'bucket-body',
      revolve(
        [
          [[0, 0.012], [0.114, 0.012]],
          [[0.114, 0.012], [0.114, 0]],
          [[0.114, 0], [0.12, 0]],
          [[0.12, 0], [0.15, 0.3]],
          [[0.15, 0.3], [0.154, 0.303], [0.154, 0.309], [0.15, 0.312], [0.146, 0.309]],
          [[0.146, 0.309], [0.146, 0.3]],
          [[0.146, 0.3], [0.1165, 0.018]],
          [[0.1165, 0.018], [0, 0.018]],
        ],
        S,
      ),
      m('steel'),
    ),
  )
  let w: THREE.Mesh | null = null
  if (water) {
    // слой воды у края: стенка ведра расширяется кверху, бок слоя отвесный и
    // берёт радиус стенки у своего низа
    const y0 = 0.296
    const r = wallAt(y0) - 0.0008
    w = mesh('bucket-water', revolve([[[0, y0], [r, y0]], [[r, y0], [r, 0.307]], [[r, 0.307], [0, 0.307]]], S), m('water'))
    g.add(w)
  }
  // ушки на стенке и дужка, опущенная набок к +Z
  const ye = 0.27
  const wall = 0.12 + ye * 0.1
  for (const sx of [-1, 1]) g.add(boxMesh('bucket-ear', 0.008, 0.035, 0.02, m('steel'), sx * (wall + 0.0018 + 0.004), ye, 0, 4))
  const Rb = wall + 0.0018 + 0.008 + 0.003
  const arc: P3[] = []
  for (let k = 0; k <= 10; k++) {
    const t = (k / 10) * Math.PI
    arc.push([Math.cos(t) * Rb, Math.sin(t) * Rb, 0])
  }
  const bail = mesh('bucket-bail', pipe(arc, 0.003, 5), m('steel'), 0, ye, 0)
  bail.rotation.x = (80 * Math.PI) / 180
  g.add(bail)
  return { group: g, ...frameOf(g), water: w, rim: 0.312 }
}
