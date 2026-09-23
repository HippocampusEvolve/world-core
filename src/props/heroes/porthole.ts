/**
 * heroes/porthole.ts — круглый иллюминатор в полу под поворотной крышкой.
 *
 * Обод - одно тело вращения: плоский фланец вровень с полом, гильза вниз и
 * опорный поясок, на котором лежит стекло. Верх стекла на 4 см ниже верха
 * фланца. Под стеклом ничего нет: что видно сквозь него, рисует мир (стекло -
 * отдельный меш роли `glass`, его верх - `glass` в ответе).
 *
 * Крышка - стальной диск на фланце, поворачивается вбок вокруг вертикальной
 * оси у края обода (прилив на крышке над осью) и за пол-оборота целиком
 * уходит с проёма. На ней штурвал: ступица, четыре спицы, обод-тор; он
 * вращается вокруг вертикали через середину крышки и едет вместе с ней.
 *
 * Начало координат - середина иллюминатора на уровне пола. Подвижные части:
 *   `lid` - крышка, ось Y через (d/2 − 0.03, 0, 0), 0 (закрыта) .. π
 *     (отведена на +X, проём открыт);
 *   `wheel` - штурвал, ось Y крышки, крутится без упора.
 *
 * UV обода - по окружности в метрах (U) и по профилю (V): надпись по фланцу
 * мир кладёт картой вдоль U.
 */

import * as THREE from 'three'
import type { Mats } from '../look.js'
import { cylGeo, looks, merged, movingParts, part, pivot, revolveGeo, spanGeo, torusGeo } from './kit.js'

export type PortholeOptions = {
  /** Внешний диаметр обода, м. */
  d?: number
  mats?: Mats
}

export type Porthole = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Середина верха стекла. */
  glass: THREE.Vector3
  /** Радиус видимого стекла. */
  glassRadius: number
  /** Верх штурвала закрытой крышки - на него ляжет то, что поставят на крышку. */
  top: THREE.Vector3
  /** Ось поворота крышки на уровне пола. */
  hinge: THREE.Vector3
  moving: Record<string, THREE.Object3D>
}

const SEG = 40

export function porthole({ d = 1.3, mats }: PortholeOptions = {}): Porthole {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'porthole'

  const R = d / 2 // внешний край фланца
  const RG = R - 0.1 // стекло и внутренняя кромка фланца
  const RS = RG + 0.02 // гильза снаружи
  const RB = RG - 0.04 // поясок под стеклом
  const FL = 0.02 // толщина фланца
  const GT = -0.04 // верх стекла
  const GB = -0.06 // низ стекла, он же верх пояска
  const BOT = -0.1

  // обод: сечение против часовой в (r, y)
  g.add(
    part(
      'porthole-rim',
      revolveGeo(
        [
          [RB, BOT],
          [RS, BOT],
          [RS, -FL],
          [R, -FL],
          [R, 0],
          [RG, 0],
          [RG, GB],
          [RB, GB],
        ],
        SEG,
      ),
      look('steel'),
    ),
  )
  g.add(part('porthole-glass', cylGeo(RG, RG, GT - GB, SEG, 'y', 0, (GT + GB) / 2, 0), look('glass')))

  // крышка на фланце, прилив над осью у края
  const LID = 0.025
  const PIV = R - 0.03
  const lid = pivot('lid', PIV, 0, 0, 'y', [0, Math.PI])
  lid.add(part('lid-plate', cylGeo(R, R, LID, SEG, 'y', -PIV, LID / 2, 0), look('steel')))
  lid.add(part('lid-boss', cylGeo(0.03, 0.03, 0.02, 12, 'y', 0, LID + 0.01, 0), look('steel')))

  // штурвал на середине крышки
  const wheel = pivot('wheel', -PIV, LID, 0, 'y', [0, Math.PI * 2], 0, true)
  const HUB = 0.045
  const WR = 0.22
  const WT = 0.014
  const WY = 0.018
  const parts: THREE.BufferGeometry[] = [cylGeo(HUB, HUB, 0.03, 16, 'y', 0, 0.015, 0), torusGeo(WR, WT, 8, 32, 'y', 0, WY, 0)]
  for (let i = 0; i < 4; i++) {
    const s = spanGeo(HUB, WR - WT, WY - 0.008, WY + 0.008, -0.008, 0.008)
    s.rotateY((i / 4) * Math.PI * 2)
    parts.push(s)
  }
  wheel.add(merged('wheel', parts, look('steel')))
  lid.add(wheel)
  g.add(lid)

  const top = LID + WY + WT
  return {
    group: g,
    w: d,
    d,
    h: top - BOT,
    glass: new THREE.Vector3(0, GT, 0),
    glassRadius: RG,
    top: new THREE.Vector3(0, top, 0),
    hinge: new THREE.Vector3(PIV, 0, 0),
    moving: movingParts(g),
  }
}
