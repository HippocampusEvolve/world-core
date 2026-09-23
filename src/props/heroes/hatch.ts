/**
 * heroes/hatch.ts — двустворчатая стальная крышка люка в полу.
 *
 * Проём `w` × `l`, длина вдоль Z. По краю проёма стальной уголок: стенка
 * прижата к стенке проёма, полка смотрит внутрь и держит створки. Уголок -
 * два кольца-призмы одно на другом (стенка, на ней полка), а не восемь
 * брусков встык: у брусков спрятанные грани стыков лежали бы в пяти
 * миллиметрах от лицевых той же стороны.
 *
 * Створка - лист 16 мм и под ним рамка из полос 26 мм с двумя рёбрами
 * поперёк: закрытая, она стоит рамкой на полке уголка, и лист вровень с
 * полом (верх при y = 0). Толщины не случайны: всё, что смотрит вверх под
 * листом (рамка), и всё, что смотрит вниз под рамкой (полка), отстоит от
 * лица той же стороны больше чем на сантиметр - иначе это полосы в кадре.
 * Лист толще сантиметра с запасом: при 12 мм верх рамки под откинутой
 * створкой проверка на удалении в десятки метров от начала мерила в 8.5 мм
 * (узкая грань, повёрнутая, во float32), а запас в 6 мм шум перекрывает.
 *
 * Петли - по три бугорка ⌀16 мм на оси вдоль длинных кромок, на уровне пола:
 * над полом они видны на 8 мм, а наполовину уходят в кромку пола (мир под
 * них ничего не вырезает - это зазор, а не тело). У торца проёма на полу
 * стоит коробка электромагнитного замка с огоньком (`led`): красный или
 * зелёный - решает мир.
 *
 * Начало координат - середина проёма на уровне пола. Подвижные части:
 *   `leaf-left` - створка у −X, ось Z по её внешней кромке, 0 (закрыта) ..
 *     1.75 рад (за вертикаль, наружу);
 *   `leaf-right` - то же зеркально, 0 .. −1.75.
 */

import * as THREE from 'three'
import type { Mats } from '../look.js'
import { cylGeo, looks, merged, movingParts, part, pivot, prismGeo, spanGeo } from './kit.js'

export type HatchOptions = {
  /** Ширина проёма поперёк створок (X), м. */
  w?: number
  /** Длина проёма вдоль петель (Z), м. */
  l?: number
  mats?: Mats
}

export type Hatch = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Проём, который крышка закрывает. */
  opening: { w: number; l: number }
  /** Огонёк замка. */
  led: THREE.Vector3
  /** Середина коробки замка. */
  lock: THREE.Vector3
  moving: Record<string, THREE.Object3D>
}

const PLATE = 0.016 // лист створки
const RIM = 0.026 // рамка под листом
const LEG = 0.005 // толщина стенки уголка
const LEDGE = 0.012 // толщина полки уголка
const SEAT = 0.04 // вылет полки внутрь от стенки
const COLLAR = 0.036 // высота стенки под полкой
const KNUCKLE = 0.008
const OPEN = 1.75

export function hatchLid({ w = 1.1, l = 2.4, mats }: HatchOptions = {}): Hatch {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'hatch'

  const seatTop = -PLATE - RIM // на этом уровне рамка створки ложится на уголок
  const X = w / 2
  const Z = l / 2

  // уголок: кольцо-стенка по стенкам проёма, на нём кольцо-полка внутрь
  const rect = (hx: number, hz: number): [number, number][] => [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ]
  const yl = seatTop - LEDGE
  const y0 = yl - COLLAR
  g.add(
    merged(
      'hatch-frame',
      [
        prismGeo(rect(X, Z), 'y', y0, yl, [rect(X - LEG, Z - LEG)]),
        prismGeo(rect(X, Z), 'y', yl, seatTop, [rect(X - LEG - SEAT, Z - LEG - SEAT)]),
      ],
      look('steel'),
    ),
  )

  // створки: лист, рамка под ним, рёбра, петли на оси
  const GAP = 0.0015 // полщели между створками
  const inner = X - GAP // от оси до внутренней кромки
  const BAR = 0.01
  const ends = Z - 0.02 // рамка короче листа: торцы ложатся на короткие полки
  for (const [side, s] of [
    ['left', 1],
    ['right', -1],
  ] as const) {
    const leaf = pivot(`leaf-${side}`, -s * X, 0, 0, 'z', [0, s * OPEN])
    // в осях створки: +s·x - от петли внутрь проёма
    const sx = (a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a])
    leaf.add(part(`leaf-${side}-plate`, spanGeo(...sx(KNUCKLE, inner), -PLATE, 0, -Z + 0.002, Z - 0.002), look('steel')))
    const rim: THREE.BufferGeometry[] = [
      spanGeo(...sx(0.02, 0.02 + BAR), seatTop, -PLATE, -ends, ends),
      spanGeo(...sx(inner - BAR, inner), seatTop, -PLATE, -ends, ends),
    ]
    for (const e of [-1, 1]) {
      rim.push(spanGeo(...sx(0.02 + BAR, inner - BAR), seatTop, -PLATE, e < 0 ? -ends : ends - BAR, e < 0 ? -ends + BAR : ends))
      rim.push(spanGeo(...sx(0.02 + BAR, inner - BAR), -PLATE - 0.02, -PLATE, e * (l / 6) - BAR / 2, e * (l / 6) + BAR / 2))
    }
    leaf.add(merged(`leaf-${side}-rim`, rim, look('paint2')))
    leaf.add(merged(`leaf-${side}-hinges`, [-1, 0, 1].map((k) => cylGeo(KNUCKLE, KNUCKLE, 0.12, 10, 'z', 0, 0, (k * l) / 3)), look('steel')))
    g.add(leaf)
  }

  // замок на полу у торца проёма
  const LZ0 = -Z - 0.1
  const LZ1 = -Z - 0.01
  const LH = 0.06
  g.add(part('hatch-lock', spanGeo(-0.07, 0.07, 0, LH, LZ0, LZ1), look('paint2')))
  const ledZ = LZ0 + 0.03
  const LED = 0.006
  g.add(part('hatch-led', cylGeo(0.007, 0.007, LED, 10, 'y', 0, LH + LED / 2, ledZ), look('led')))

  return {
    group: g,
    w: w + 2 * KNUCKLE,
    d: Z - LZ0,
    h: LH + LED - y0,
    opening: { w, l },
    led: new THREE.Vector3(0, LH + LED, ledZ),
    lock: new THREE.Vector3(0, LH / 2, (LZ0 + LZ1) / 2),
    moving: movingParts(g),
  }
}
