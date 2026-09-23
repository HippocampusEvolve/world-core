/**
 * heroes/console.ts — пульт вдоль стены: столешница спереди, наклонная
 * приборная панель к стене.
 *
 * Стена - у −Z, оператор - у +Z. Внизу две тумбы с ящиками и щит между ними,
 * на них столешница во всю глубину на высоте 0.75. На задней части
 * столешницы - корпус-призма: невысокий бортик у края столешницы и панель
 * под 45°, поднимающаяся к стене до `h`. На панели в два ряда шесть
 * тумблеров и шесть круглых стрелочных индикаторов, правее - галетный
 * переключатель и экран-осциллограф в рамке. На правом боку крючок с
 * наушниками. Левый край столешницы свободен под магнитофон (`recorder`).
 *
 * Начало координат - середина пятна на полу. Габарит `w` включает крючок с
 * наушниками: корпус на 0.09 уже, крючок в этой полосе. Раскладка приборов
 * задана от середины пульта и держится при `w` от 2.4.
 *
 * Приборы стоят на панели в её собственных осях (группа `console-panel`):
 * X - вдоль пульта, Y - нормаль панели, −Z - вверх по скату.
 *
 * Подвижные части (все в осях панели, кроме наушников), первое число
 * `range` - положение при сборке:
 *   `toggle-1..6` - рычажки тумблеров, ось X: 0.45 - вниз по скату, к
 *     оператору (выключен), −0.45 - вверх;
 *   `needle-1..6` - стрелки, ось Y (нормаль панели): 0.8 - левый упор,
 *     −0.8 - правый, 0 - стрелка смотрит вверх по скату;
 *   `selector` - ручка галетного переключателя, ось Y: от 1.2 (указатель
 *     влево) до −1.2 (вправо);
 *   `headphones` - наушники на крючке, ось X (вдоль крючка), ±0.3, висят
 *     отвесно (0).
 *
 * UV циферблатов - вся карта на круг (`discUV`), экрана - вся карта на
 * грань: мир рисует шкалу и след луча картой, не трогая геометрию.
 */

import * as THREE from 'three'
import { discUV } from '../../materials/index.js'
import type { Mats } from '../look.js'
import { cylGeo, looks, merged, movingParts, part, pivot, pointOf, prismGeo, revolveGeo, spanGeo, torusGeo } from './kit.js'

export type ConsoleOptions = {
  w?: number
  d?: number
  h?: number
  mats?: Mats
}

export type ListeningConsole = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Середина лица экрана. */
  screen: THREE.Vector3
  /** Середины циферблатов слева направо. */
  dials: THREE.Vector3[]
  /** Основания тумблеров слева направо - под таблички мира. */
  toggles: THREE.Vector3[]
  /** Середина ручки переключателя. */
  selector: THREE.Vector3
  /** Ось крючка с наушниками, у его конца. */
  hook: THREE.Vector3
  /** Место под магнитофон: середина его пятна на столешнице у левого края. */
  recorder: THREE.Vector3
  /** Высота столешницы. */
  top: number
  moving: Record<string, THREE.Object3D>
}

const TOP = 0.75
const SLAB = 0.03
const HOOK = 0.09

export function listeningConsole({ w = 2.8, d = 0.7, h = 1.1, mats }: ConsoleOptions = {}): ListeningConsole {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'listening-console'

  const xl = -w / 2
  const xr = w / 2 - HOOK
  const zb = -d / 2
  const zf = d / 2

  // --- низ: тумбы, цоколи, ящики, щит, столешница ---------------------------
  const PED = 0.45
  const KICK = 0.06
  const peds: [number, number][] = [
    [xl, xl + PED],
    [xr - PED, xr],
  ]
  const fronts: THREE.BufferGeometry[] = []
  const handles: THREE.BufferGeometry[] = []
  peds.forEach(([x0, x1], i) => {
    g.add(part(`console-pedestal-${i + 1}`, spanGeo(x0, x1, KICK, TOP - SLAB, zb + 0.02, zf - 0.035), look('paint')))
    g.add(part(`console-kick-${i + 1}`, spanGeo(x0 + 0.02, x1 - 0.02, 0, KICK, zb + 0.02, zf - 0.06), look('paint2')))
    for (const [y0, y1] of [
      [0.08, 0.28],
      [0.3, 0.5],
      [0.52, 0.7],
    ]) {
      // фасад на 1.5 см от тумбы, скоба ручки ещё на 2 см: лица не в одной плоскости
      fronts.push(spanGeo(x0 + 0.02, x1 - 0.02, y0, y1, zf - 0.035, zf - 0.02))
      const xc = (x0 + x1) / 2
      handles.push(spanGeo(xc - 0.06, xc + 0.06, y1 - 0.045, y1 - 0.03, zf - 0.02, zf))
    }
  })
  g.add(merged('console-drawers', fronts, look('paint')))
  g.add(merged('console-handles', handles, look('steel')))
  g.add(part('console-modesty', spanGeo(xl + PED, xr - PED, KICK, TOP - SLAB, zb + 0.02, zb + 0.04), look('paint')))
  g.add(part('console-worktop', spanGeo(xl, xr, TOP - SLAB, TOP, zb, zf), look('paint2')))

  // --- корпус: бортик и скат к стене ----------------------------------------
  const ZF = -0.01 // лицо бортика
  const LIP = 0.04 // высота бортика
  const ZT = zb + 0.03 // верх ската, за ним узкая полка у стены
  const profile: [number, number][] = [
    [zb, TOP],
    [ZF, TOP],
    [ZF, TOP + LIP],
    [ZT, h],
    [zb, h],
  ]
  g.add(part('console-housing', prismGeo(profile, 'x', xl, xr), look('paint')))

  // панель: начало у нижней кромки ската, Y - нормаль, −Z - вверх по скату
  const alpha = Math.atan2(h - TOP - LIP, ZF - ZT)
  const panel = new THREE.Group()
  panel.name = 'console-panel'
  panel.position.set(0, TOP + LIP, ZF)
  panel.rotation.x = alpha
  g.add(panel)

  const XS = [-0.75, -0.55, -0.35, -0.15, 0.05, 0.25]
  const S_DIAL = 0.3
  const S_TOGGLE = 0.13

  // индикаторы: обечайка-кольцо и циферблат в ней на 6 мм ниже кромки;
  // лицо и кромка не накрывают друг друга, поэтому и не спорят. Циферблат
  // стоит на 16 мм над скатом: его лицо смотрит туда же, куда скат, и
  // накрывает его - ближе сантиметра это полосы в кадре
  const DR = 0.055
  const DH = 0.022
  const FR = 0.046
  const FH = 0.016
  const bezels: THREE.BufferGeometry[] = []
  const faces: THREE.BufferGeometry[] = []
  const needles: THREE.Object3D[] = []
  XS.forEach((x, i) => {
    const ring = revolveGeo(
      [
        [FR, 0],
        [DR, 0],
        [DR, DH],
        [FR, DH],
      ],
      14,
    )
    ring.translate(x, 0, -S_DIAL)
    bezels.push(ring)
    const face = new THREE.CylinderGeometry(FR, FR, FH, 14)
    discUV(face, FR)
    face.translate(x, FH / 2, -S_DIAL)
    faces.push(face)
    const n = pivot(`needle-${i + 1}`, x, FH, -S_DIAL, 'y', [0.8, -0.8], 0.8)
    n.add(
      merged(
        `needle-${i + 1}`,
        [spanGeo(-0.001, 0.001, 0.0005, 0.002, -0.036, 0.006), cylGeo(0.004, 0.004, 0.003, 6, 'y', 0, 0.002, 0)],
        look('plastic'),
      ),
    )
    panel.add(n)
    needles.push(n)
  })
  panel.add(merged('console-dial-bezels', bezels, look('paint2')))
  panel.add(merged('console-dial-faces', faces, look('dial')))

  // тумблеры: гайка на панели и рычажок с наконечником
  const NUT = 0.008
  const nuts: THREE.BufferGeometry[] = []
  XS.forEach((x, i) => {
    nuts.push(cylGeo(0.011, 0.011, NUT, 6, 'y', x, NUT / 2, -S_TOGGLE))
    const t = pivot(`toggle-${i + 1}`, x, NUT, -S_TOGGLE, 'x', [0.45, -0.45], 0.45)
    t.add(part(`toggle-${i + 1}-lever`, cylGeo(0.0028, 0.0028, 0.0285, 6, 'y', 0, 0.0015 + 0.0285 / 2, 0), look('steel')))
    t.add(part(`toggle-${i + 1}-tip`, cylGeo(0.0045, 0.0045, 0.008, 8, 'y', 0, 0.03 + 0.004, 0), look('plastic')))
    panel.add(t)
  })
  panel.add(merged('console-toggle-nuts', nuts, look('steel')))

  // галетный переключатель: шкала-шайба и ручка с указателем
  const SEL_X = 0.5
  const SEL_S = 0.2
  const PLATE = 0.004
  panel.add(part('console-selector-plate', cylGeo(0.035, 0.035, PLATE, 16, 'y', SEL_X, PLATE / 2, -SEL_S), look('steel')))
  const sel = pivot('selector', SEL_X, PLATE, -SEL_S, 'y', [1.2, -1.2], 1.2)
  sel.add(
    merged('selector', [cylGeo(0.02, 0.02, 0.018, 12, 'y', 0, 0.009, 0), spanGeo(-0.003, 0.003, 0.018, 0.024, -0.028, 0)], look('plastic')),
  )
  panel.add(sel)

  // экран в рамке: середина на x = 0.95
  const SX = 0.95
  const SS = 0.24
  const SW = 0.2
  const SH = 0.15
  const FB = 0.025 // ширина планки рамки
  const screen = new THREE.BoxGeometry(SW, 0.025, SH) // штатная UV: вся карта на грань
  screen.translate(SX, 0.0125, -SS)
  panel.add(part('console-screen', screen, look('screen')))
  const s0 = SS - SH / 2
  const s1 = SS + SH / 2
  panel.add(
    merged(
      'console-screen-frame',
      [
        spanGeo(SX - SW / 2 - FB, SX - SW / 2, 0, 0.04, -(s1 + FB), -(s0 - FB)),
        spanGeo(SX + SW / 2, SX + SW / 2 + FB, 0, 0.04, -(s1 + FB), -(s0 - FB)),
        spanGeo(SX - SW / 2, SX + SW / 2, 0, 0.04, -(s1 + FB), -s1),
        spanGeo(SX - SW / 2, SX + SW / 2, 0, 0.04, -s0, -(s0 - FB)),
      ],
      look('paint2'),
    ),
  )

  // --- крючок на правом боку и наушники -------------------------------------
  const HY = 0.62
  const HZ = 0.1
  const HR = 0.006
  g.add(
    merged(
      'console-hook',
      [cylGeo(HR, HR, 0.085, 8, 'x', xr + 0.0425, HY, HZ), cylGeo(0.005, 0.005, 0.019, 8, 'y', xr + 0.08, HY + HR + 0.0095, HZ)],
      look('steel'),
    ),
  )
  const phones = pivot('headphones', xr + 0.04, HY, HZ, 'x', [-0.3, 0.3])
  const BR = 0.075 // радиус дужки
  const BT = 0.007 // толщина дужки
  const yc = HR + BT - BR // середина дуги относительно крючка
  phones.add(part('headphones-band', torusGeo(BR, BT, 5, 16, 'x', 0, yc, 0, Math.PI), look('steel')))
  const cups: THREE.BufferGeometry[] = []
  const pads: THREE.BufferGeometry[] = []
  for (const s of [-1, 1]) {
    cups.push(cylGeo(0.035, 0.035, 0.03, 12, 'z', 0, yc - 0.035, s * 0.06))
    pads.push(cylGeo(0.03, 0.03, 0.012, 12, 'z', 0, yc - 0.035, s * (0.045 - 0.006)))
  }
  phones.add(merged('headphones-cups', cups, look('plastic')))
  phones.add(merged('headphones-pads', pads, look('rubber')))
  g.add(phones)

  g.updateMatrixWorld(true)
  const at = (x: number, y: number, s: number) => pointOf(g, panel, new THREE.Vector3(x, y, -s))
  return {
    group: g,
    w,
    d,
    h,
    screen: at(SX, 0.025, SS),
    dials: XS.map((x) => at(x, FH, S_DIAL)),
    toggles: XS.map((x) => at(x, NUT, S_TOGGLE)),
    selector: at(SEL_X, 0.018, SEL_S),
    hook: new THREE.Vector3(xr + 0.04, HY, HZ),
    recorder: new THREE.Vector3(xl + 0.03 + 0.225, TOP, (ZF + zf) / 2),
    top: TOP,
    moving: movingParts(g),
  }
}
