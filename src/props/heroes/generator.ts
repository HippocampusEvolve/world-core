/**
 * heroes/generator.ts — дизель-генератор старого образца.
 *
 * Вдоль X, слева направо: маховик на торце, блок двигателя (картер,
 * цилиндровый блок, головка, клапанная крышка, воздушный фильтр), справа
 * кожух генератора с жалюзи на торце и бак на двух опорах поверх кожуха. Всё
 * на салазках, салазки на постаменте. Спереди (+Z) - пусковой рычаг на
 * картере и топливный насос с трубкой к головке, сзади - патрубок выхлопа
 * вверх.
 *
 * Начало координат - середина пятна на полу, лицо на +Z. Габарит `l`×`d`×`h`
 * держится при любых параметрах: раскладка задана для 1.5×0.8×1.1 и
 * растягивается по осям, радиусы - по самой тесной из них.
 *
 * Подвижные части:
 *   `flywheel` - маховик, ось X через его середину, крутится без упора;
 *   `lever` - пусковой рычаг, ось Z (перпендикулярно лицу картера), от 0
 *     (рукоять вверх) до 0.9 рад (рукоять к маховику). Собран в 0.
 *
 * Бак пустой: смотровое стекло - окно в пустоту, что за ним, решает мир.
 */

import * as THREE from 'three'
import type { Mats } from '../look.js'
import { arc, cylGeo, looks, merged, movingParts, part, pivot, prismGeo, spanGeo, wireGeo } from './kit.js'

export type GeneratorOptions = {
  /** Длина вдоль X, м. */
  l?: number
  /** Глубина вдоль Z, м. */
  d?: number
  /** Высота до верха крышки бака, м. */
  h?: number
  /** Высота постамента, м. */
  plinth?: number
  mats?: Mats
}

export type Generator = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Выход патрубка выхлопа - отсюда дым и звук. */
  exhaust: THREE.Vector3
  /** Рукоять пускового рычага при сборке. */
  lever: THREE.Vector3
  /** Горловина бака: верх крышки. */
  filler: THREE.Vector3
  /** Середина лица кожуха - ровное место под записку или табличку. */
  hood: THREE.Vector3
  moving: Record<string, THREE.Object3D>
}

export function generator({ l = 1.5, d = 0.8, h = 1.1, plinth = 0.1, mats }: GeneratorOptions = {}): Generator {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'generator'

  // раскладка задана для 1.5 × 0.8 × 1.1 с постаментом 0.1
  const sx = l / 1.5
  const sz = d / 0.8
  const sy = (h - plinth) / 1.0
  const k = Math.min(sx, sy, sz)
  const X = (v: number) => v * sx
  const Z = (v: number) => v * sz
  const Y = (v: number) => plinth + (v - 0.1) * sy
  const span = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    spanGeo(X(x0), X(x1), Y(y0), Y(y1), Z(z0), Z(z1))
  const add = (name: string, geo: THREE.BufferGeometry, role: Parameters<typeof look>[0]) => g.add(part(`generator-${name}`, geo, look(role)))

  // постамент и салазки
  add('plinth', spanGeo(-l / 2, l / 2, 0, plinth, -d / 2, d / 2), 'paint2')
  g.add(
    merged(
      'generator-skids',
      [-1, 1].map((s) => span(-0.66, 0.74, 0.1, 0.16, s * 0.26 - 0.04, s * 0.26 + 0.04)),
      look('paint2'),
    ),
  )

  // двигатель: картер, блок, головка, клапанная крышка, фильтр
  add('crankcase', span(-0.64, 0.1, 0.16, 0.5, -0.26, 0.26), 'paint')
  add('block', span(-0.54, 0.02, 0.5, 0.78, -0.2, 0.2), 'paint')
  add('head', span(-0.56, 0.04, 0.78, 0.84, -0.22, 0.22), 'paint')
  add('valve-cover', span(-0.52, 0.0, 0.84, 0.9, -0.16, 0.16), 'paint2')
  add('filter', cylGeo(0.07 * k, 0.07 * k, Y(1.0) - Y(0.9), 16, 'y', X(-0.12), (Y(0.9) + Y(1.0)) / 2, Z(0.02)), 'paint2')
  add('filter-cap', cylGeo(0.075 * k, 0.075 * k, Y(1.015) - Y(1.0), 16, 'y', X(-0.12), (Y(1.0) + Y(1.015)) / 2, Z(0.02)), 'steel')

  // топливный насос на лице картера и трубка от него к головке
  add('pump', span(-0.5, -0.32, 0.34, 0.46, 0.26, 0.33), 'paint2')
  const line = [
    [-0.41, 0.458, 0.3],
    [-0.41, 0.56, 0.305],
    [-0.41, 0.7, 0.285],
    [-0.41, 0.79, 0.24],
    [-0.41, 0.81, 0.218],
  ].map(([x, y, z]) => new THREE.Vector3(X(x), Y(y), Z(z)))
  add('fuel-line', wireGeo(line, 0.005 * k, 16, 6), 'brass')

  // маховик: обод, пять спиц, ступица; опора - прилив на торце картера
  const fy = Y(0.43)
  add('bearing', cylGeo(0.09 * k, 0.09 * k, X(0.02), 20, 'x', X(-0.65), fy, 0), 'paint2')
  const fx = X(-0.71)
  const flywheel = pivot('flywheel', fx, fy, 0, 'x', [0, Math.PI * 2], 0, true)
  const RO = 0.25 * k
  const RI = 0.2 * k
  const HUB = 0.07 * k
  const TH = X(0.04) // полутолщина обода по X
  const rim = prismGeo(arc(0, 0, RO, 0, Math.PI * 2, 40).slice(0, 40), 'x', -TH, TH, [arc(0, 0, RI, 0, Math.PI * 2, 40).slice(0, 40)])
  flywheel.add(part('flywheel-rim', rim, look('steel')))
  const inner: THREE.BufferGeometry[] = [cylGeo(HUB, HUB, X(0.083), 16, 'x', X(-0.745) - fx + X(0.083) / 2, 0, 0)]
  for (let i = 0; i < 5; i++) {
    const s = spanGeo(-X(0.02), X(0.02), HUB, RI, -0.0175 * k, 0.0175 * k)
    s.rotateX((i / 5) * Math.PI * 2)
    inner.push(s)
  }
  flywheel.add(merged('flywheel-spokes', inner, look('paint')))
  g.add(flywheel)

  // пусковой рычаг: прилив на картере, полоса, рукоять к оператору
  const bz = Z(0.26)
  const BOSS = 0.025 * k
  add('lever-boss', cylGeo(0.03 * k, 0.03 * k, BOSS, 14, 'z', X(-0.05), Y(0.44), bz + BOSS / 2), 'paint2')
  const lever = pivot('lever', X(-0.05), Y(0.44), bz + BOSS, 'z', [0, 0.9])
  const BAR = 0.012 * k
  const ARM = 0.36 * k
  const KNOB = 0.06 * k
  lever.add(part('lever-arm', spanGeo(-0.015 * k, 0.015 * k, -0.03 * k, ARM - 0.03 * k, 0, BAR), look('steel')))
  const ky = ARM - 0.05 * k
  lever.add(part('lever-knob', cylGeo(0.018 * k, 0.018 * k, KNOB, 12, 'z', 0, ky, BAR + KNOB / 2), look('rubber')))
  g.add(lever)

  // кожух генератора: скруглённый верх, жалюзи на торце
  const hood: [number, number][] = [
    [Z(-0.3), Y(0.16)],
    [Z(0.3), Y(0.16)],
    ...arc(Z(0.3) - 0.06 * k, Y(0.74) - 0.06 * k, 0.06 * k, 0, Math.PI / 2, 5),
    ...arc(Z(-0.3) + 0.06 * k, Y(0.74) - 0.06 * k, 0.06 * k, Math.PI / 2, Math.PI, 5),
  ]
  add('hood', prismGeo(hood, 'x', X(0.12), X(0.738)), 'paint')
  const slats: THREE.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) {
    const y = 0.3 + i * 0.06
    slats.push(spanGeo(X(0.738), l / 2, Y(y), Y(y + 0.02), Z(-0.2), Z(0.2)))
  }
  g.add(merged('generator-louvers', slats, look('paint2')))

  // бак на двух опорах поверх кожуха, смотровое стекло спереди, горловина сверху
  g.add(merged('generator-saddles', [0.26, 0.6].map((x) => span(x - 0.02, x + 0.02, 0.74, 0.78, -0.17, 0.17)), look('paint2')))
  add('tank', span(0.2, 0.66, 0.78, 1.02, -0.16, 0.16), 'paint')
  const gz = Z(0.16)
  add('sight-ring', cylGeo(0.04 * k, 0.04 * k, 0.015 * k, 18, 'z', X(0.43), Y(0.9), gz + 0.0075 * k), 'steel')
  add('sight-glass', cylGeo(0.03 * k, 0.03 * k, 0.005 * k, 18, 'z', X(0.43), Y(0.9), gz + 0.015 * k + 0.0025 * k), 'glass')
  add('filler', cylGeo(0.035 * k, 0.035 * k, Y(1.075) - Y(1.02), 14, 'y', X(0.56), (Y(1.02) + Y(1.075)) / 2, Z(-0.05)), 'paint')
  add('filler-cap', cylGeo(0.045 * k, 0.045 * k, h - Y(1.075), 14, 'y', X(0.56), (Y(1.075) + h) / 2, Z(-0.05)), 'paint2')

  // выхлоп: отвод от блока назад и труба вверх с раструбом
  const ex = X(-0.3)
  const ez = Z(-0.335)
  const ER = 0.035 * k
  add('exhaust-stub', cylGeo(0.03 * k, 0.03 * k, Z(-0.2) - (ez + ER - 0.005), 12, 'z', ex, Y(0.7), (Z(-0.2) + ez + ER - 0.005) / 2), 'rust')
  add('exhaust-pipe', cylGeo(ER, ER, Y(1.06) - Y(0.665), 14, 'y', ex, (Y(0.665) + Y(1.06)) / 2, ez), 'rust')
  add('exhaust-mouth', cylGeo(0.045 * k, 0.045 * k, Y(1.08) - Y(1.06), 14, 'y', ex, (Y(1.06) + Y(1.08)) / 2, ez), 'rust')

  return {
    group: g,
    w: l,
    d,
    h,
    exhaust: new THREE.Vector3(ex, Y(1.08), ez),
    lever: new THREE.Vector3(X(-0.05), Y(0.44) + ky, bz + BOSS + BAR + KNOB / 2),
    filler: new THREE.Vector3(X(0.56), h, Z(-0.05)),
    hood: new THREE.Vector3(X(0.43), Y(0.45), Z(0.3)),
    moving: movingParts(g),
  }
}
