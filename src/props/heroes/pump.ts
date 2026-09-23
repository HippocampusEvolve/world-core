/**
 * heroes/pump.ts — насосный агрегат: электромотор и консольный насос на
 * общей раме.
 *
 * Вдоль X, слева направо: кожух вентилятора, ребристый мотор с клеммной
 * коробкой сверху, передний щит, муфта, кронштейн подшипников с фланцем и
 * улитка насоса. Всасывающий патрубок выходит из улитки по оси вправо (+X),
 * напорный - вверх из шеи улитки; на обоих фланцы с гайками, на напорном
 * патрубке манометр лицом к оператору. Всё на раме из двух швеллеров с
 * поперечинами: мотор стоит на двух ложементах, насос - на одной стойке под
 * кронштейном, улитка висит консолью.
 *
 * Ложементы и стойка сверху повторяют дугу того, что на них лежит: плоская
 * опора касалась бы цилиндра одной линией, а поднятая до касания по ширине -
 * сидела бы в нём.
 *
 * Начало координат - середина пятна на полу, лицо на +Z. Раскладка задана для
 * 1.2 × 0.6 × 0.8 и растягивается по осям, радиусы - по самой тесной.
 *
 * Подвижная часть: `coupling` - муфта, ось X через ось вала, крутится без
 * упора. Мир крутит её, когда агрегат работает.
 */

import * as THREE from 'three'
import { discUV } from '../../materials/index.js'
import type { Mats } from '../look.js'
import { cylGeo, looks, merged, movingParts, part, pivot, prismGeo, revolveGeo, spanGeo } from './kit.js'

export type PumpOptions = {
  w?: number
  d?: number
  h?: number
  mats?: Mats
}

export type Pump = {
  group: THREE.Group
  w: number
  d: number
  h: number
  /** Лицо всасывающего фланца, середина: сюда мир подводит трубу. */
  suction: THREE.Vector3
  /** Лицо напорного фланца, середина (верх агрегата). */
  discharge: THREE.Vector3
  /** Середина циферблата манометра. */
  gauge: THREE.Vector3
  /** Середина мотора - отсюда гул. */
  motor: THREE.Vector3
  moving: Record<string, THREE.Object3D>
}

/** Опора под круглым телом: плоский низ на `y0`, верх - дуга окружности (ось z = 0, y = `yc`) шириной 2·`hw`. Профиль в (z, y). */
function cradle(hw: number, y0: number, r: number, yc: number, seg: number): [number, number][] {
  const a = Math.asin(hw / r)
  const pts: [number, number][] = [
    [-hw, y0],
    [hw, y0],
  ]
  for (let i = 0; i <= seg; i++) {
    const t = a - (2 * a * i) / seg
    pts.push([r * Math.sin(t), yc - r * Math.cos(t)])
  }
  return pts
}

/** Коробка на круглом теле: низ - дуга по его верху, плоский верх на `y1`. Профиль в (z, y). */
function saddleTop(hw: number, y1: number, r: number, yc: number, seg: number): [number, number][] {
  const a = Math.asin(hw / r)
  const pts: [number, number][] = []
  for (let i = 0; i <= seg; i++) {
    const t = -a + (2 * a * i) / seg
    pts.push([r * Math.sin(t), yc + r * Math.cos(t)])
  }
  pts.push([hw, y1], [-hw, y1])
  return pts
}

/** Тело вращения с осью вдоль +X: профиль [r, x] от `x0`. */
function revolveX(profile: [number, number][], seg: number, x0: number, y: number, z: number): THREE.BufferGeometry {
  const g = revolveGeo(profile, seg)
  g.rotateZ(-Math.PI / 2) // локальная +Y уходит в +X
  g.translate(x0, y, z)
  return g
}

export function pump({ w = 1.2, d = 0.6, h = 0.8, mats }: PumpOptions = {}): Pump {
  const look = looks(mats)
  const g = new THREE.Group()
  g.name = 'pump'

  const sx = w / 1.2
  const sy = h / 0.8
  const sz = d / 0.6
  const k = Math.min(sx, sy, sz)
  const X = (v: number) => v * sx

  // --- рама: два швеллера полками наружу, поперечины между стенками ---------
  // Стенка толще полок: в неё изнутри упираются торцы поперечин, и её
  // наружная грань смотрит туда же, куда торец, - ближе сантиметра это
  // полосы в кадре.
  const FH = 0.1 * sy
  const RW = 0.05 * sz // ширина полки
  const T = 0.008 // полка
  const WEB = 0.014 // стенка
  const zi = d / 2 - RW // стенка швеллера изнутри
  const channel = (s: number): [number, number][] => {
    // профиль в (z, y), стенка у zi, полки к краю d/2
    const a = s * zi
    const b = s * (d / 2)
    const c = s * (zi + WEB)
    const pts: [number, number][] = [
      [a, 0],
      [b, 0],
      [b, T],
      [c, T],
      [c, FH - T],
      [b, FH - T],
      [b, FH],
      [a, FH],
    ]
    return s > 0 ? pts : pts.reverse()
  }
  g.add(merged('pump-rails', [1, -1].map((s) => prismGeo(channel(s), 'x', -w / 2, w / 2)), look('paint2')))

  // --- мотор -----------------------------------------------------------------
  const yc = 0.4 * sy // ось вала
  const RC = 0.14 * k // тело мотора
  const FIN = 0.02 * k
  const FT = 0.008 * k
  const MX0 = X(-0.45)
  const MX1 = X(-0.05)
  // профиль: круг с рёбрами по бокам; сверху и снизу по 60° без рёбер -
  // под клеммную коробку и ложементы
  const deg = Math.PI / 180
  const circ = (a: number): [number, number] => [RC * Math.cos(a), yc + RC * Math.sin(a)]
  const fins: number[] = []
  for (let i = 0; i < 9; i++) fins.push((-60 + i * 15) * deg)
  for (let i = 0; i < 9; i++) fins.push((120 + i * 15) * deg)
  const dl = Math.asin(FT / 2 / RC)
  const motor: [number, number][] = []
  const arcTo = (a0: number, a1: number) => {
    const n = Math.max(1, Math.round((a1 - a0) / (10 * deg)))
    for (let i = 1; i < n; i++) motor.push(circ(a0 + ((a1 - a0) * i) / n))
  }
  let at = -90 * deg
  motor.push(circ(at))
  for (const a of fins) {
    arcTo(at, a - dl)
    const u = [Math.cos(a), Math.sin(a)]
    const v = [-Math.sin(a), Math.cos(a)]
    const tip = (s: number): [number, number] => [(RC + FIN) * u[0] + s * (FT / 2) * v[0], yc + (RC + FIN) * u[1] + s * (FT / 2) * v[1]]
    motor.push(circ(a - dl), tip(-1), tip(1), circ(a + dl))
    at = a + dl
  }
  arcTo(at, 270 * deg)
  g.add(part('pump-motor', prismGeo(motor, 'x', MX0, MX1), look('paint')))

  // ложементы мотора на поперечинах
  const CX = [X(-0.39), X(-0.11)]
  const PX = X(0.23) // стойка насоса
  // поперечины: по торцам рамы и под каждой опорой, опора уже поперечины
  const bars: [number, number][] = [
    [-w / 2, X(-0.56)],
    ...[...CX, PX].map((x): [number, number] => [x - X(0.04), x + X(0.04)]),
    [X(0.56), w / 2],
  ]
  g.add(merged('pump-crossbars', bars.map(([x0, x1]) => spanGeo(x0, x1, 0, FH, -zi, zi)), look('paint2')))
  g.add(merged('pump-cradles', CX.map((x) => prismGeo(cradle(0.05 * k, FH, RC, yc, 8), 'x', x - X(0.03), x + X(0.03))), look('paint')))

  // клеммная коробка сверху и сальник ввода на её лице
  const TX0 = X(-0.32)
  const TX1 = X(-0.2)
  const TW = 0.055 * k
  const TY = yc + RC + 0.07 * k
  g.add(part('pump-terminal', prismGeo(saddleTop(TW, TY, RC, yc, 6), 'x', TX0, TX1), look('paint')))
  g.add(part('pump-gland', cylGeo(0.012 * k, 0.012 * k, 0.02 * k, 10, 'z', (TX0 + TX1) / 2, yc + RC + 0.035 * k, TW + 0.01 * k), look('steel')))

  // кожух вентилятора сзади и щит спереди
  const RF = RC + FIN + 0.005 * k
  const CL = X(0.12)
  g.add(
    part(
      'pump-cowl',
      revolveX(
        [
          [0, 0],
          [RF - 0.035 * k, 0],
          [RF - 0.015 * k, 0.015 * sx],
          [RF, 0.04 * sx],
          [RF, CL],
          [0, CL],
        ],
        24,
        MX0 - CL,
        yc,
        0,
      ),
      look('paint'),
    ),
  )
  const SH = 0.035 * sx
  g.add(
    part(
      'pump-shield',
      revolveX(
        [
          [0, 0],
          [RC - 0.01 * k, 0],
          [RC - 0.01 * k, 0.012 * sx],
          [0.09 * k, 0.028 * sx],
          [0.04 * k, SH],
          [0, SH],
        ],
        20,
        MX1,
        yc,
        0,
      ),
      look('paint'),
    ),
  )

  // валы и муфта
  const SR = 0.022 * k
  const KX0 = X(0.02)
  const KX1 = X(0.106)
  const BX0 = X(0.14) // кронштейн
  g.add(merged('pump-shafts', [cylGeo(SR, SR, KX0 - MX1 - SH, 12, 'x', (MX1 + SH + KX0) / 2, yc, 0), cylGeo(SR, SR, BX0 - KX1, 12, 'x', (KX1 + BX0) / 2, yc, 0)], look('steel')))
  const KC = (KX0 + KX1) / 2
  const coupling = pivot('coupling', KC, yc, 0, 'x', [0, Math.PI * 2], 0, true)
  const KG = 0.006 * sx // зазор между полумуфтами
  const KH = (KX1 - KX0 - KG) / 2
  const KR = 0.065 * k
  coupling.add(merged('coupling', [-1, 1].map((s) => cylGeo(KR, KR, KH, 20, 'x', (s * (KG + KH)) / 2, 0, 0)), look('steel')))
  const pins: THREE.BufferGeometry[] = []
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    pins.push(cylGeo(0.007 * k, 0.007 * k, KG, 6, 'x', 0, 0.045 * k * Math.sin(a), 0.045 * k * Math.cos(a)))
  }
  coupling.add(merged('coupling-pins', pins, look('rubber')))
  g.add(coupling)

  // кронштейн подшипников с фланцем к улитке
  const VX0 = X(0.32)
  const BR = 0.065 * k
  const bracket: [number, number][] = [
    [0, 0],
    [0.035 * k, 0],
    [BR, 0.025 * sx],
    [BR, VX0 - BX0 - 0.05 * sx],
    [0.11 * k, VX0 - BX0 - 0.03 * sx],
    [0.11 * k, VX0 - BX0],
    [0, VX0 - BX0],
  ]
  g.add(part('pump-bracket', revolveX(bracket, 20, BX0, yc, 0), look('paint')))
  g.add(part('pump-stand', prismGeo(cradle(0.04 * k, FH, BR, yc, 8), 'x', PX - X(0.03), PX + X(0.03)), look('paint')))

  // улитка: спираль от языка (R0) до выхода (R1) по часовой, шея вверх
  const VX1 = X(0.44)
  const R0 = 0.085 * k
  const R1 = 0.16 * k
  const NY = yc + R1 + 0.06 * k // верх шеи
  const volute: [number, number][] = []
  const N = 28
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = Math.PI - 2 * Math.PI * t
    const r = R0 + (R1 - R0) * t
    volute.push([r * Math.cos(a), yc + r * Math.sin(a)])
  }
  volute.push([-R1, NY], [-R0, NY])
  g.add(part('pump-volute', prismGeo(volute, 'x', VX0, VX1), look('paint')))

  // всасывающий патрубок по оси и фланец с гайками
  const SX1 = X(0.56)
  const FL = 0.02 * sx
  const FR = 0.09 * k
  g.add(part('pump-suction', cylGeo(0.05 * k, 0.05 * k, SX1 - VX1, 20, 'x', (VX1 + SX1) / 2, yc, 0), look('paint')))
  const flanges: THREE.BufferGeometry[] = [cylGeo(FR, FR, FL, 24, 'x', SX1 + FL / 2, yc, 0)]
  const nuts: THREE.BufferGeometry[] = []
  const NUT = 0.01 * k
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    nuts.push(cylGeo(0.009 * k, 0.009 * k, NUT, 6, 'x', SX1 + FL + NUT / 2, yc + 0.07 * k * Math.sin(a), 0.07 * k * Math.cos(a)))
  }

  // напорный патрубок из шеи, фланец сверху, гайки под ним
  const DX = (VX0 + VX1) / 2
  const DZ = -(R0 + R1) / 2
  const DR = 0.035 * k
  const DF = 0.07 * k
  const DFL = 0.02 * k
  g.add(part('pump-discharge', cylGeo(DR, DR, h - DFL - NY, 20, 'y', DX, (NY + h - DFL) / 2, DZ), look('paint')))
  flanges.push(cylGeo(DF, DF, DFL, 24, 'y', DX, h - DFL / 2, DZ))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    nuts.push(cylGeo(0.008 * k, 0.008 * k, NUT, 6, 'y', DX + 0.055 * k * Math.cos(a), h - DFL - NUT / 2, DZ + 0.055 * k * Math.sin(a)))
  }
  g.add(merged('pump-flanges', flanges, look('paint2')))
  g.add(merged('pump-nuts', nuts, look('steel')))

  // манометр на напорном патрубке лицом к оператору
  const GY = (NY + h - DFL) / 2
  const GZ0 = DZ + DR - 0.002 * k // отвод чуть заходит в трубу: торец плоский, труба круглая
  const GZ1 = GZ0 + 0.045 * k
  const GC = 0.025 * k
  const GR = 0.035 * k
  g.add(part('pump-gauge-stem', cylGeo(0.005 * k, 0.005 * k, GZ1 - GZ0, 6, 'z', DX, GY, (GZ0 + GZ1) / 2), look('brass')))
  g.add(part('pump-gauge-case', cylGeo(GR, GR, GC, 16, 'z', DX, GY, GZ1 + GC / 2), look('paint2')))
  const face = new THREE.CylinderGeometry(GR - 0.005 * k, GR - 0.005 * k, 0.003 * k, 16)
  discUV(face, GR - 0.005 * k)
  face.rotateX(Math.PI / 2)
  face.translate(DX, GY, GZ1 + GC + 0.0015 * k)
  g.add(part('pump-gauge-face', face, look('dial')))

  return {
    group: g,
    w,
    d,
    h,
    suction: new THREE.Vector3(SX1 + FL, yc, 0),
    discharge: new THREE.Vector3(DX, h, DZ),
    gauge: new THREE.Vector3(DX, GY, GZ1 + GC + 0.003 * k),
    motor: new THREE.Vector3((MX0 + MX1) / 2, yc, 0),
    moving: movingParts(g),
  }
}
