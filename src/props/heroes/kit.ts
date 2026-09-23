/**
 * heroes/kit.ts — общее для предметов-героев: роли материалов, подвижные
 * части и детали, которых нет в `parts.ts`.
 *
 * Герой - это машина или прибор, у которого есть что крутить и что зажигать.
 * Отсюда три вещи, общие для всех.
 *
 * РОЛИ. Материал детали называется ролью из словаря (`ROLES`): краска, сталь,
 * стекло, свечение экрана. У каждой роли есть набор ядра по умолчанию, чтобы
 * предмет стоял в любом мире без единой строчки про материалы, но мир,
 * которому важен цвет, подменяет роли своими (`mats`). Новых наборов карт
 * здесь не заводится: краска - это подкрашенная сталь, лак - та же бумага с
 * другим блеском.
 *
 * ПОДВИЖНЫЕ ЧАСТИ. Всё, что мир двигает, - отдельная группа с опорной точкой
 * на оси вращения, и в `userData` у неё записано, как её двигать:
 *
 *     { moving: 'lever', axis: 'z', range: [-0.6, 0.6], spin: false }
 *
 * Мир ставит `rotation[axis]` в пределах `range` (радианы, в собственных осях
 * группы), остальные две составляющие поворота у группы нулевые. `spin` -
 * часть крутится без упора (маховик, катушка), `range` у неё условный. Ось
 * `xz` - маятник: качается вокруг X и вокруг Z одновременно. Где стоит часть,
 * когда предмет только собран, сказано у предмета. Проверка счётом ставит
 * каждую часть в оба края `range` и меряет рамку и тела там тоже.
 *
 * ДЕТАЛИ. Цилиндр вдоль X и Z, тело вращения, призма по профилю, тор, слияние
 * деталей одной роли в один меш. UV везде в метрах (1 тайл на метр), как у
 * `parts.ts`; исключения - циферблаты и экраны, им нужна вся карта на лицо
 * (`discUV`, штатная развёртка коробки), и они названы у предмета.
 */

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { boxUV, cylinderUV, type MaterialOptions } from '../../materials/index.js'
import { lookOf, type Mats } from '../look.js'

/* ------------------------------------------------------------------------ *
 * Роли
 * ------------------------------------------------------------------------ */

/** Словарь ролей. Других у героев нет, мир подменяет любые из этих. */
export const ROLES = [
  'paint',
  'paint2',
  'steel',
  'rust',
  'wood',
  'cloth',
  'rubber',
  'glass',
  'water',
  'enamel',
  'paper',
  'photo',
  'plastic',
  'brass',
  'soil',
  'leaf',
  'fruit',
  // светящиеся
  'tube',
  'bulb',
  'screen',
  'dial',
  'led',
  'shade',
] as const

export type Role = (typeof ROLES)[number]

type Default = { set: string; o: MaterialOptions; see?: number }

/**
 * Наборы ядра по умолчанию. Цвета нейтральные, казённые: это не палитра
 * какого-то мира, а «чтобы стояло». `see` - прозрачность (стекло, вода).
 */
const DEFAULTS: Record<Role, Default> = {
  paint: { set: 'surfaceMetal', o: { color: 0x6f7c6b, metalness: 0.1, normalScale: 0.5 } },
  paint2: { set: 'surfaceMetal', o: { color: 0x3d4146, metalness: 0.1, normalScale: 0.5 } },
  steel: { set: 'surfaceMetal', o: { color: 0xa7abae, normalScale: 0.6 } },
  rust: { set: 'surfaceRust', o: { color: 0x9a6a4a } },
  wood: { set: 'surfaceWood', o: { color: 0x8a5a36 } },
  cloth: { set: 'surfaceCloth', o: { color: 0x6f6a5c } },
  rubber: { set: 'leather', o: { color: 0x2a2a2c, normalScale: 0.5 } },
  glass: { set: 'surfaceIce', o: { color: 0xa9bcc0, roughness: 0.15, normalScale: 0.2 }, see: 0.25 },
  water: { set: 'surfaceIce', o: { color: 0x3b5560, roughness: 0.1, normalScale: 0.4 }, see: 0.6 },
  enamel: { set: 'surfacePaper', o: { color: 0xe8e6de, roughness: 0.35, normalScale: 0.2 } },
  paper: { set: 'surfacePaper', o: { color: 0xe6dfcc } },
  photo: { set: 'surfacePaper', o: { color: 0x8a8478, roughness: 0.5 } },
  plastic: { set: 'leather', o: { color: 0x2b2622, roughness: 0.55, normalScale: 0.3 } },
  brass: { set: 'surfaceMetal', o: { color: 0xc9a34a, normalScale: 0.4 } },
  soil: { set: 'surfaceGravel', o: { color: 0x4a3a2a } },
  leaf: { set: 'surfaceCloth', o: { color: 0x3f6a32 } },
  fruit: { set: 'surfacePaper', o: { color: 0xb2261c, roughness: 0.4, normalScale: 0.2 } },
  tube: { set: 'surfacePaper', o: { color: 0xe8f2ee, emissive: 0xdff5ec, emissiveIntensity: 1.5, normalScale: 0.1 } },
  bulb: { set: 'surfacePaper', o: { color: 0xfff1d0, emissive: 0xffc27a, emissiveIntensity: 2, normalScale: 0.1 } },
  screen: { set: 'surfaceIce', o: { color: 0x0c2a16, emissive: 0x3cff7a, emissiveIntensity: 0.6, roughness: 0.2 } },
  dial: { set: 'surfacePaper', o: { color: 0xe9dcc0, emissive: 0xffc47a, emissiveIntensity: 0.35 } },
  led: { set: 'surfaceIce', o: { color: 0x401010, emissive: 0xff2a1a, emissiveIntensity: 2, roughness: 0.2 } },
  shade: { set: 'surfaceIce', o: { color: 0x1f6b3a, emissive: 0x1f6b3a, emissiveIntensity: 0.25, roughness: 0.15 } },
}

/**
 * Материалы предмета по ролям: подмена мира, иначе набор ядра. Один материал
 * на роль на весь предмет - сколько бы деталей его ни просили.
 */
export function looks(mats: Mats | undefined): (role: Role) => THREE.Material {
  const made = new Map<Role, THREE.Material>()
  return (role) => {
    let m = made.get(role)
    if (!m) {
      const d = DEFAULTS[role]
      m = lookOf(mats, role, d.set, d.o)
      if (d.see !== undefined && !mats?.[role]) {
        m.transparent = true
        m.opacity = d.see
        m.depthWrite = false
      }
      made.set(role, m)
    }
    return m
  }
}

/* ------------------------------------------------------------------------ *
 * Подвижные части
 * ------------------------------------------------------------------------ */

/** Ось поворота подвижной части в её собственных осях. `xz` - маятник. */
export type Axis = 'x' | 'y' | 'z' | 'xz'

export type MovingInfo = {
  moving: string
  axis: Axis
  /**
   * Края хода, радианы: первое - положение покоя (закрыто, выключено, у
   * упора), второе - дальний край. Порядок не по величине, а по смыслу. У
   * `spin` условные: полный оборот.
   */
  range: [number, number]
  spin: boolean
}

/** Повернуть подвижную часть на `v` радиан вокруг её оси. */
export function turn(o: THREE.Object3D, v: number): void {
  const axis = (o.userData as MovingInfo).axis
  o.rotation.set(0, 0, 0)
  if (axis === 'x' || axis === 'xz') o.rotation.x = v
  if (axis === 'y') o.rotation.y = v
  if (axis === 'z' || axis === 'xz') o.rotation.z = v
}

/**
 * Опорная группа подвижной части: стоит на оси, `at` - положение при сборке.
 * Детали части кладутся в неё в координатах относительно оси.
 */
export function pivot(
  name: string,
  x: number,
  y: number,
  z: number,
  axis: Axis,
  range: [number, number],
  at = 0,
  spin = false,
): THREE.Group {
  const g = new THREE.Group()
  g.name = name
  g.position.set(x, y, z)
  const info: MovingInfo = { moving: name, axis, range, spin }
  g.userData = info
  turn(g, at)
  return g
}

/** Все подвижные части предмета по именам. */
export function movingParts(root: THREE.Object3D): Record<string, THREE.Object3D> {
  const out: Record<string, THREE.Object3D> = {}
  root.traverse((o) => {
    const name = (o.userData as Partial<MovingInfo>).moving
    if (name) out[name] = o
  })
  return out
}

/** Точка в координатах предмета: где окажется `local` детали `o` при собранном предмете. */
export function pointOf(root: THREE.Object3D, o: THREE.Object3D, local = new THREE.Vector3()): THREE.Vector3 {
  root.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  return o.localToWorld(local.clone()).applyMatrix4(inv)
}

/* ------------------------------------------------------------------------ *
 * Геометрия: всё с запечённым положением, чтобы детали одной роли сливались
 * ------------------------------------------------------------------------ */

/** Меш с именем. */
export function part(name: string, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.name = name
  return m
}

/** Коробка w×h×d с центром в (x, y, z), UV в метрах. */
export function boxGeo(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d)
  boxUV(g, w, h, d, 1)
  g.translate(x, y, z)
  return g
}

/** Коробка по границам. */
export function spanGeo(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
  return boxGeo(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
}

/**
 * Цилиндр с осью вдоль `axis`, центр в (x, y, z). Радиусы - у концов по
 * направлению оси: `r0` у меньшей координаты, `r1` у большей.
 */
export function cylGeo(
  r0: number,
  r1: number,
  len: number,
  seg: number,
  axis: 'x' | 'y' | 'z',
  x: number,
  y: number,
  z: number,
): THREE.BufferGeometry {
  // CylinderGeometry: radiusTop у +Y
  const g = new THREE.CylinderGeometry(r1, r0, len, seg)
  cylinderUV(g, (r0 + r1) / 2, len, 1)
  if (axis === 'x') g.rotateZ(-Math.PI / 2)
  if (axis === 'z') g.rotateX(Math.PI / 2)
  g.translate(x, y, z)
  return g
}

/** Тор радиуса `R` с трубкой `r` вокруг оси `axis`, центр в (x, y, z). `arc` - дуга. */
export function torusGeo(
  R: number,
  r: number,
  radial: number,
  tubular: number,
  axis: 'x' | 'y' | 'z',
  x: number,
  y: number,
  z: number,
  arc = Math.PI * 2,
): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(R, r, radial, tubular, arc)
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * arc * R, uv.getY(i) * Math.PI * 2 * r)
  // TorusGeometry лежит в плоскости XY, ось - Z
  if (axis === 'y') g.rotateX(Math.PI / 2)
  if (axis === 'x') g.rotateY(Math.PI / 2)
  g.translate(x, y, z)
  return g
}

/**
 * Тело вращения вокруг Y. Профиль `[r, y]` обходится ПРОТИВ часовой в
 * плоскости (r вправо, y вверх): тогда нормали смотрят наружу. Концы профиля
 * на оси (r = 0) закрываются веером к оси, без вырожденных треугольников
 * (у штатного `LatheGeometry` полюс даёт треугольники нулевой площади);
 * профиль без точек на оси считается замкнутым кольцом.
 *
 * `smooth` - общие вершины между звеньями профиля (лампа, колба); без него
 * каждое звено со своими нормалями, и рёбра профиля остаются острыми (обод,
 * фланец).
 *
 * `matOf` - номер материала звена (звено j идёт от точки j к следующей, у
 * кольца последнее - к первой): одно тело, разные роли по поясам, как борта
 * катушки и рулон ленты между ними. Крышки берут материал соседнего звена.
 */
export function revolveGeo(
  profile: [number, number][],
  seg: number,
  smooth = false,
  matOf: (link: number) => number = () => 0,
): THREE.BufferGeometry {
  const onAxis = (p: [number, number]) => Math.abs(p[0]) < 1e-9
  const startCap = onAxis(profile[0])
  const endCap = onAxis(profile[profile.length - 1])
  const pts = profile.filter((p) => !onAxis(p))
  const closed = !startCap && !endCap
  const rRef = Math.max(...pts.map((p) => p[0]))

  const pos: number[] = []
  const uvs: number[] = []
  const buckets = new Map<number, number[]>()
  let idx: number[] = []
  const use = (m: number) => {
    let b = buckets.get(m)
    if (!b) buckets.set(m, (b = []))
    idx = b
  }
  // звенья профиля: пары соседних точек (у кольца - и последняя с первой)
  const links: [number, number][] = []
  for (let j = 0; j + 1 < pts.length; j++) links.push([j, j + 1])
  if (closed) links.push([pts.length - 1, 0])
  // длина вдоль профиля - для V
  const along: number[] = [0]
  for (let j = 1; j < pts.length; j++) along.push(along[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]))

  const ring = (p: [number, number], v: number): number => {
    const base = pos.length / 3
    for (let i = 0; i <= seg; i++) {
      const phi = (i / seg) * Math.PI * 2
      pos.push(p[0] * Math.sin(phi), p[1], p[0] * Math.cos(phi))
      uvs.push(phi * rRef, v)
    }
    return base
  }
  const quad = (a0: number, a1: number) => {
    for (let i = 0; i < seg; i++) {
      const a = a0 + i
      const b = a0 + i + 1
      const d = a1 + i
      const c = a1 + i + 1
      idx.push(a, b, d, c, d, b)
    }
  }

  let shared: number[] = []
  if (smooth) {
    shared = pts.map((p, j) => ring(p, along[j]))
    links.forEach(([j0, j1], k) => {
      use(matOf(k))
      quad(shared[j0], shared[j1])
    })
  } else {
    links.forEach(([j0, j1], k) => {
      use(matOf(k))
      const v1 = j1 === 0 ? along[pts.length - 1] + Math.hypot(pts[0][0] - pts[j0][0], pts[0][1] - pts[j0][1]) : along[j1]
      quad(ring(pts[j0], along[j0]), ring(pts[j1], v1))
    })
  }

  // веер к оси: начало профиля снизу, конец сверху
  // у гладкого профиля веер берёт крайнее кольцо боковины: иначе на стыке складка
  const fan = (j: number, axisY: number, first: boolean) => {
    const r = smooth ? shared[j] : ring(pts[j], along[j])
    const c = pos.length / 3
    pos.push(0, axisY, 0)
    uvs.push(0, 0)
    for (let i = 0; i < seg; i++) {
      if (first) idx.push(r + i + 1, r + i, c)
      else idx.push(r + i, r + i + 1, c)
    }
  }
  if (startCap) {
    use(matOf(0))
    fan(0, profile[0][1], true)
  }
  if (endCap) {
    use(matOf(Math.max(0, links.length - 1)))
    fan(pts.length - 1, profile[profile.length - 1][1], false)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const all: number[] = []
  for (const m of [...buckets.keys()].sort((a, b) => a - b)) {
    const b = buckets.get(m)!
    g.addGroup(all.length, b.length, m)
    all.push(...b)
  }
  g.setIndex(all)
  if (buckets.size === 1) g.clearGroups()
  g.computeVertexNormals()
  return g
}

/** Кривая как точки: прямоугольник со скруглёнными углами, против часовой, центр в нуле. */
export function roundRect(w: number, h: number, r: number, seg = 4): [number, number][] {
  const out: [number, number][] = []
  const cx = w / 2 - r
  const cy = h / 2 - r
  const corners: [number, number, number][] = [
    [cx, -cy, -Math.PI / 2],
    [cx, cy, 0],
    [-cx, cy, Math.PI / 2],
    [-cx, -cy, Math.PI],
  ]
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2)
      out.push([x + r * Math.cos(a), y + r * Math.sin(a)])
    }
  }
  return out
}

function shapeOf(outline: [number, number][], holes: [number, number][][] = []): THREE.Shape {
  const s = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)))
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(a, b))))
  return s
}

/**
 * Призма: плоский профиль, выдавленный вдоль оси от `from` до `to`.
 *
 *   axis 'x': профиль в (z, y), выдавлен по X;
 *   axis 'y': профиль в (x, z), выдавлен по Y;
 *   axis 'z': профиль в (x, y), выдавлен по Z.
 *
 * Профиль - замкнутый многоугольник (последняя точка не повторяет первую),
 * `holes` - дыры в нём. UV `ExtrudeGeometry` уже в метрах: он берёт их из
 * координат.
 */
export function prismGeo(
  outline: [number, number][],
  axis: 'x' | 'y' | 'z',
  from: number,
  to: number,
  holes: [number, number][][] = [],
): THREE.BufferGeometry {
  const depth = to - from
  const g = new THREE.ExtrudeGeometry(shapeOf(outline, holes), { depth, bevelEnabled: false, steps: 1, curveSegments: 1 })
  if (axis === 'x') {
    // (a, b, e) -> (e, b, a): поворот на −90° вокруг Y даёт x = −e, z = a
    g.rotateY(-Math.PI / 2)
    g.translate(to, 0, 0)
  } else if (axis === 'y') {
    // поворот на +90° вокруг X: y = −e, z = b
    g.rotateX(Math.PI / 2)
    g.translate(0, to, 0)
  } else {
    g.translate(0, 0, from)
  }
  return g
}

/** Точки дуги окружности (центр cx, cy), от угла a0 до a1 включительно. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, seg: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return out
}

/**
 * Трубка по ломаной или сглаженной линии (провод, проволока). Концы открыты:
 * годится для того, что концами упирается в другие детали.
 */
export function wireGeo(points: THREE.Vector3[], r: number, segments: number, radial = 4, smooth = true): THREE.BufferGeometry {
  let curve: THREE.Curve<THREE.Vector3>
  if (smooth) curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  else {
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i + 1 < points.length; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]))
    curve = path
  }
  const g = new THREE.TubeGeometry(curve, segments, r, radial, false)
  const len = curve.getLength()
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * Math.PI * 2 * r)
  return g
}

/**
 * Слить детали одной роли в один меш: одна деталь - один вызов отрисовки
 * меньше. Индексированные и нет смешиваются через развёртку в треугольники.
 */
export function merged(name: string, geos: THREE.BufferGeometry[], mat: THREE.Material): THREE.Mesh {
  const mixed = geos.some((g) => !g.index) && geos.some((g) => g.index)
  const ready = mixed ? geos.map((g) => (g.index ? g.toNonIndexed() : g)) : geos
  for (const g of ready) {
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k)
  }
  const out = mergeGeometries(ready, false)
  if (!out) throw new Error(`merged(${name}): детали с разными атрибутами`)
  for (const g of geos) g.dispose()
  return part(name, out, mat)
}

/**
 * Развернуть треугольники наружу, если тело собрано навыворот: знак объёма
 * замкнутого тела говорит, куда смотрят его нормали. Нужно телам, которые
 * собираются сеткой колец (лофт, ткань), где обход легко перепутать.
 */
export function outward(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const index = geo.index!
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  let vol = 0
  for (let t = 0; t < index.count; t += 3) {
    a.fromBufferAttribute(pos, index.getX(t))
    b.fromBufferAttribute(pos, index.getX(t + 1))
    c.fromBufferAttribute(pos, index.getX(t + 2))
    vol += a.dot(b.clone().cross(c))
  }
  if (vol < 0) {
    const arr = index.array as Uint16Array | Uint32Array
    for (let t = 0; t < arr.length; t += 3) {
      const tmp = arr[t + 1]
      arr[t + 1] = arr[t + 2]
      arr[t + 2] = tmp
    }
    index.needsUpdate = true
  }
  geo.computeVertexNormals()
  return geo
}

/** Детерминированный генератор по семени: складки и разнобой без случайности между сборками. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
