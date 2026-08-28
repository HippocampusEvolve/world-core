/**
 * logstack.ts — стопка колотых поленьев у очага.
 *
 * Половинки лежат вдоль X рядами пирамидой, кто корой кверху, кто расколом:
 * у стопки одной корой кверху в кадре не было ни одной светлой плоскости, и
 * она сливалась со стеной тёмным бугром. Высота ряда честная: верх любого
 * полена ряда - на радиус выше пола ряда, будь то макушка коры или плоскость
 * раскола, поэтому следующий ряд ложится на оба одинаково. Касание по линии
 * или по плоскости, тел друг в друге нет. Торцы сдвинуты на пару сантиметров
 * вразнобой - сложено руками.
 *
 * Прежняя стопка в Snowfall была шестью цилиндрами одного цвета, из которых
 * три нижних лежали друг в друге по оси: положены были «по x», а лежали
 * вдоль x. Здесь ряд раскладывается поперёк полена, по Z.
 */

import * as THREE from 'three'
import { type Mats } from './look.js'
import { logMaterials, splitLogGeometry, splitLogMaterials } from './log.js'

export type LogStackOptions = {
  r?: number
  len?: number
  /** Поленьев в ряду, снизу вверх. */
  rows?: number[]
  mats?: Mats
}

export type LogStack = { group: THREE.Group; w: number; d: number; h: number }

export function logStack({ r = 0.055, len = 0.52, rows = [3, 2, 1], mats }: LogStackOptions = {}): LogStack {
  const g = new THREE.Group()
  g.name = 'logstack'
  const m = splitLogMaterials(logMaterials(mats))
  const geo = splitLogGeometry(r, len, Math.PI, 8)
  const STEP = 2 * r + 0.012
  // π - расколом кверху (кора внизу), 0 - корой кверху (раскол на полу ряда)
  const ROLLS = [Math.PI, 0, Math.PI, Math.PI, 0, Math.PI, 0]
  let n = 0
  for (let row = 0; row < rows.length; row++) {
    const count = rows[row]
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, m)
      mesh.name = 'log'
      const roll = ROLLS[n % ROLLS.length]
      // порядок ZYX: сперва поворот вокруг своей оси (Y), потом укладка вдоль X
      mesh.rotation.set(0, roll, Math.PI / 2, 'ZYX')
      // ось полена лежит в плоскости раскола: у лежащего расколом кверху она
      // на радиус выше пола ряда, у лежащего корой кверху - на самом полу
      mesh.position.set(
        Math.sin(n * 7.3) * 0.02,
        row * r + (roll === Math.PI ? r : 0),
        (i - (count - 1) / 2) * STEP,
      )
      g.add(mesh)
      n++
    }
  }
  const d = (rows[0] - 1) * STEP + 2 * r
  return { group: g, w: len + 0.04, d, h: rows.length * r }
}
