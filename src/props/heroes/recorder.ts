/**
 * heroes/recorder.ts — катушечный магнитофон с горизонтальной декой.
 *
 * Корпус, поверх него стальная дека. На деке две катушки на подкатушниках,
 * между ними спереди блок головок с двумя направляющими; лента идёт от
 * рулона левой катушки по касательной к направляющей, вдоль лица головок и
 * так же к правой. Спереди слева клавиши, справа окошко индикатора уровня
 * (`dial`) и ручка громкости.
 *
 * Катушка - одно тело вращения: борта и ступица пластмассовые, рулон ленты
 * между бортами - своя роль (`rubber`) на поясе того же тела. Отдельный
 * рулон под бортом дал бы спрятанную грань в трёх миллиметрах от верхней -
 * та же плоскость, та же сторона.
 *
 * Начало координат - середина пятна (низ корпуса), лицо на +Z. Катушки -
 * подвижные `reel-left`, `reel-right`: ось - локальная Y через ось
 * подкатушника, крутятся без упора. Лента неподвижна и касается рулонов: её
 * можно не трогать, пока катушки крутятся.
 */

import * as THREE from 'three'
import type { Mats } from '../look.js'
import { cylGeo, looks, merged, movingParts, part, pivot, revolveGeo, spanGeo } from './kit.js'

export type TapeRecorderOptions = {
  w?: number
  d?: number
  h?: number
  mats?: Mats
}

export type TapeRecorder = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Оси катушек на уровне деки. */
  reels: [THREE.Vector3, THREE.Vector3]
  /** Середина лица блока головок - отсюда звук. */
  head: THREE.Vector3
  moving: Record<string, THREE.Object3D>
}

const RR = 0.09 // радиус катушки
const PACK = 0.06 // радиус рулона
const HOLE = 0.012
const FL = 0.003 // толщина борта
const TAPE = 0.012 // ширина ленты с зазорами

export function tapeRecorder({ w = 0.45, d = 0.35, h = 0.2, mats }: TapeRecorderOptions = {}): TapeRecorder {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'tape-recorder'

  const DP = 0.013 // дека
  const PL = 0.012 // подкатушник: нижний борт катушки на 1.5 см над декой, а не в сантиметре
  const REEL = 2 * FL + TAPE
  const CH = h - DP - PL - REEL - 0.003 // корпус: сверху дека, подкатушник, катушка и 3 мм оси
  const deck = CH + DP
  const seat = deck + PL

  g.add(part('recorder-case', spanGeo(-w / 2, w / 2, 0, CH, -d / 2, d / 2), look('paint')))
  g.add(part('recorder-deck', spanGeo(-w / 2 + 0.01, w / 2 - 0.01, CH, deck, -d / 2 + 0.01, d / 2 - 0.01), look('steel')))

  // катушки: борт, рулон, борт одним телом; отметины на верхнем борту видны на ходу
  const RX = w / 2 - 0.025 - RR
  const RZ = -d / 2 + 0.01 + 0.035 + RR
  const reelProfile: [number, number][] = [
    [HOLE, 0],
    [RR, 0],
    [RR, FL],
    [PACK, FL],
    [PACK, FL + TAPE],
    [RR, FL + TAPE],
    [RR, REEL],
    [HOLE, REEL],
  ]
  const platters: THREE.BufferGeometry[] = []
  const spindles: THREE.BufferGeometry[] = []
  const reels: THREE.Vector3[] = []
  for (const [side, x] of [
    ['left', -RX],
    ['right', RX],
  ] as const) {
    platters.push(cylGeo(0.03, 0.03, PL, 16, 'y', x, deck + PL / 2, RZ))
    spindles.push(cylGeo(0.009, 0.009, h - seat, 8, 'y', x, (seat + h) / 2, RZ))
    const p = pivot(`reel-${side}`, x, seat, RZ, 'y', [0, Math.PI * 2], 0, true)
    const body = revolveGeo(reelProfile, 20, false, (k) => (k === 3 ? 1 : 0))
    p.add(new THREE.Mesh(body, [look('plastic'), look('rubber')]))
    p.children[0].name = `reel-${side}`
    const marks: THREE.BufferGeometry[] = []
    for (let i = 0; i < 3; i++) {
      const m = spanGeo(-0.006, 0.006, REEL, REEL + 0.002, -(PACK + 0.022), -(PACK - 0.012))
      m.rotateY((i / 3) * Math.PI * 2)
      marks.push(m)
    }
    p.add(merged(`reel-${side}-marks`, marks, look('paint2')))
    g.add(p)
    reels.push(new THREE.Vector3(x, deck, RZ))
  }
  g.add(merged('recorder-platters', platters, look('steel')))
  g.add(merged('recorder-spindles', spindles, look('steel')))

  // блок головок и направляющие у его лица
  const HZ = -d / 2 + 0.01 + 0.035 + 2 * RR + 0.015 // лицо головок
  const HH = Math.min(0.025, h - deck - 0.002)
  g.add(part('recorder-heads', spanGeo(-0.04, 0.04, deck, deck + HH, HZ - 0.03, HZ), look('paint2')))
  const GR = 0.004
  const GX = 0.065
  g.add(merged('recorder-guides', [-1, 1].map((s) => cylGeo(GR, GR, HH, 8, 'y', s * GX, deck + HH / 2, HZ - GR)), look('steel')))

  // лента: вдоль лица головок и по касательным к рулонам
  const TY = seat + FL + TAPE / 2 // середина ленты по высоте
  const TW = 0.0065
  const TT = 0.0006
  const tz = HZ + 0.0003 + TT / 2
  const tape: THREE.BufferGeometry[] = [spanGeo(-GX, GX, TY - TW / 2, TY + TW / 2, tz - TT / 2, tz + TT / 2)]
  for (const s of [-1, 1]) {
    // касательная из точки у направляющей к окружности рулона, с внешней стороны
    const gx = s * GX
    const cx = s * RX
    const dx = gx - cx
    const dz = tz - RZ
    const L = Math.hypot(dx, dz)
    const beta = Math.atan2(dz, dx) - s * Math.acos(PACK / L)
    const tx = cx + PACK * Math.cos(beta)
    const tzz = RZ + PACK * Math.sin(beta)
    const len = Math.hypot(gx - tx, tz - tzz)
    const seg = spanGeo(-len / 2, len / 2, TY - TW / 2, TY + TW / 2, -TT / 2, TT / 2)
    seg.rotateY(-Math.atan2(tz - tzz, gx - tx))
    seg.translate((gx + tx) / 2, 0, (tz + tzz) / 2)
    tape.push(seg)
  }
  g.add(merged('recorder-tape', tape, look('rubber')))

  // клавиши слева спереди, индикатор и ручка справа
  const keys: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 0.04 + i * 0.032
    keys.push(spanGeo(x, x + 0.028, deck, deck + 0.01, d / 2 - 0.06, d / 2 - 0.02))
  }
  g.add(merged('recorder-keys', keys, look('plastic')))
  g.add(part('recorder-meter', spanGeo(w / 2 - 0.125, w / 2 - 0.065, deck, deck + 0.012, d / 2 - 0.055, d / 2 - 0.025), look('dial')))
  g.add(part('recorder-knob', cylGeo(0.014, 0.014, 0.012, 12, 'y', w / 2 - 0.035, deck + 0.006, d / 2 - 0.04), look('plastic')))

  return {
    group: g,
    w,
    d,
    h,
    reels: [reels[0], reels[1]],
    head: new THREE.Vector3(0, deck + HH / 2, HZ),
    moving: movingParts(g),
  }
}
