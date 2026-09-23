/**
 * heroes/radio.ts — ламповый приёмник в деревянном корпусе.
 *
 * Корпус со скруглённым верхом: короб и на нём спереди лицевая доска 3 см
 * с двумя окнами. В верхнем окне - решётка динамика: доска, обтянутая тканью
 * (`cloth`), утоплена на 1.7 см, поверх неё пять деревянных планок. В нижнем
 * - шкала (`dial`, светится тёплым) под стеклом, по шкале стрелка. Под
 * шкалой в ряд три ручки.
 *
 * Глубины не случайны: всё, что смотрит на +Z за лицевой доской (ткань,
 * шкала), отстоит от лица короба под ней больше чем на сантиметр, а стекло -
 * от шкалы: иначе накрывающие друг друга лица одной стороны дают полосы.
 *
 * Начало координат - середина пятна (низ корпуса), лицо на +Z. Габарит `d`
 * включает ручки: корпус на их вылет мельче. Подвижные части - ручки, ось Z
 * через середину ручки, 0 - метка вверх, так собраны; поворот по часовой,
 * если смотреть в лицо, - отрицательный:
 *   `knob-1` - левая, громкость: 0 .. −4.4 рад;
 *   `knob-2` - средняя, настройка: крутится без упора;
 *   `knob-3` - правая, диапазоны: 0 .. −1.6 рад.
 *
 * UV шкалы - штатная развёртка коробки, вся карта на лицо: шкалу рисует мир.
 */

import * as THREE from 'three'
import type { Mats } from '../look.js'
import { arc, cylGeo, looks, merged, movingParts, part, pivot, prismGeo, roundRect, spanGeo } from './kit.js'

export type RadioOptions = {
  w?: number
  d?: number
  h?: number
  mats?: Mats
}

export type Radio = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Середина лица шкалы - отсюда тёплый свет. */
  dial: THREE.Vector3
  /** Середина решётки - отсюда звук. */
  speaker: THREE.Vector3
  /** Середины лиц ручек слева направо. */
  knobs: THREE.Vector3[]
  moving: Record<string, THREE.Object3D>
}

const FRONT = 0.03 // лицевая доска
const CLOTH = 0.013 // доска решётки с тканью
const SLAT = 0.026 // планки решётки: лицо на 4 мм глубже лица доски
const SCALE = 0.012 // шкала
const KNOB = 0.024 // вылет ручки с меткой

export function radio({ w = 0.5, d = 0.25, h = 0.3, mats }: RadioOptions = {}): Radio {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'radio'
  const sy = h / 0.3

  const zf = d / 2 - KNOB // лицо доски
  const zb = zf - FRONT // лицо короба

  // контур корпуса: верх скруглён крупно, низ - на полсантиметра
  const RT = Math.min(0.045, w / 4, h / 4)
  const RB = 0.006
  const outline: [number, number][] = [
    ...arc(w / 2 - RB, RB, RB, -Math.PI / 2, 0, 2),
    ...arc(w / 2 - RT, h - RT, RT, 0, Math.PI / 2, 6),
    ...arc(-w / 2 + RT, h - RT, RT, Math.PI / 2, Math.PI, 6),
    ...arc(-w / 2 + RB, RB, RB, Math.PI, (3 * Math.PI) / 2, 2),
  ]

  // окна: решётка сверху, шкала под ней
  const GX = w / 2 - 0.06
  const GY0 = 0.14 * sy
  const GY1 = h - 0.035
  const grille = roundRect(2 * GX, GY1 - GY0, 0.02, 3).map(([x, y]): [number, number] => [x, y + (GY0 + GY1) / 2])
  const DX = w / 2 - 0.08
  const DY0 = 0.085 * sy
  const DY1 = 0.12 * sy
  const win: [number, number][] = [
    [-DX, DY0],
    [DX, DY0],
    [DX, DY1],
    [-DX, DY1],
  ]

  g.add(part('radio-case', prismGeo(outline, 'z', -d / 2, zb), look('wood')))
  g.add(part('radio-front', prismGeo(outline, 'z', zb, zf, [grille, win]), look('wood')))

  // решётка: доска с тканью в окне и планки поверх
  g.add(part('radio-cloth', prismGeo(grille, 'z', zb, zb + CLOTH), look('cloth')))
  const slats: THREE.BufferGeometry[] = []
  for (let i = -2; i <= 2; i++) {
    const x = (i * GX) / 3
    slats.push(spanGeo(x - 0.006, x + 0.006, GY0, GY1, zb + CLOTH, zb + SLAT))
  }
  g.add(merged('radio-slats', slats, look('wood')))

  // шкала, стрелка на ней, стекло на 1 см впереди стрелки
  const scale = new THREE.BoxGeometry(2 * DX, DY1 - DY0, SCALE) // штатная UV: вся карта на лицо
  scale.translate(0, (DY0 + DY1) / 2, zb + SCALE / 2)
  g.add(part('radio-scale', scale, look('dial')))
  const PX = 0.3 * DX
  g.add(part('radio-pointer', spanGeo(PX - 0.0012, PX + 0.0012, DY0 + 0.004, DY1 - 0.004, zb + SCALE, zb + SCALE + 0.003), look('plastic')))
  g.add(part('radio-glass', spanGeo(-DX, DX, DY0, DY1, zb + 0.022, zb + 0.026), look('glass')))

  // ручки: юбка, колпачок, метка
  const KY = 0.047 * sy
  const KX = w / 2 - 0.1
  const ranges: [[number, number], boolean][] = [
    [[0, -4.4], false],
    [[0, Math.PI * 2], true],
    [[0, -1.6], false],
  ]
  const knobs: THREE.Vector3[] = []
  ;[-KX, 0, KX].forEach((x, i) => {
    const [range, spin] = ranges[i]
    const k = pivot(`knob-${i + 1}`, x, KY, zf, 'z', range, 0, spin)
    k.add(
      merged(
        `knob-${i + 1}`,
        [cylGeo(0.021, 0.021, 0.008, 18, 'z', 0, 0, 0.004), cylGeo(0.017, 0.015, 0.014, 18, 'z', 0, 0, 0.015)],
        look('plastic'),
      ),
    )
    k.add(part(`knob-${i + 1}-mark`, spanGeo(-0.0015, 0.0015, 0.003, 0.0135, 0.022, KNOB), look('enamel')))
    g.add(k)
    knobs.push(new THREE.Vector3(x, KY, zf + 0.022))
  })

  return {
    group: g,
    w,
    d,
    h,
    dial: new THREE.Vector3(0, (DY0 + DY1) / 2, zb + SCALE),
    speaker: new THREE.Vector3(0, (GY0 + GY1) / 2, zb + CLOTH),
    knobs,
    moving: movingParts(g),
  }
}
