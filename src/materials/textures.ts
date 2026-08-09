/**
 * textures.ts — единственное место, где библиотека знает про three и про DOM.
 *
 * Выше по течению (`bake.ts`) всё считается в байтовые массивы и проверяется
 * счётом. Здесь массивы кладутся на канву и отдаются видеокарте - больше ничего.
 *
 * ## Что изменилось при переезде с r128 на текущий three
 *
 * Эталон писал `texture.encoding = THREE.sRGBEncoding`. Этого свойства больше
 * НЕТ: с r152 цветом заведует `texture.colorSpace`, а константа `sRGBEncoding`
 * убрана совсем. Ловушка в том, что старая строчка не падает - она просто
 * заводит на объекте лишнее поле, которое никто не читает. Базовый цвет при
 * этом уезжает в линейное пространство, картинка выцветает, и это списывают на
 * тонмаппинг.
 *
 * Правило простое: КАРТИНКА - в sRGB, ДАННЫЕ - без цветового пространства.
 * Базовый цвет `map` - картинка. Нормаль, шероховатость и металл - данные:
 * это числа, которые шейдер читает как есть, и любая гамма их портит. Здесь
 * они получают `NoColorSpace` явно, чтобы это было видно глазами, а не
 * держалось на значении по умолчанию.
 *
 * ## Почему канва, а не DataTexture
 *
 * `DataTexture` избавила бы от канвы совсем, но у неё `flipY = false`, а весь
 * эталон построен на том, что канва переворачивается: у генераторов `v = 0` -
 * это ВЕРХ поверхности (сажа гуще к верху топки). Поднять `flipY` у
 * `DataTexture` мешает неоднозначность в самом WebGL: `UNPACK_FLIP_Y_WEBGL`
 * надёжно работает для картинок и канвы, а для сырого буфера ведёт себя
 * по-разному. Проверять это в каждом браузере дороже, чем оставить канву.
 *
 * ## Почему клон текстуры бесплатен
 *
 * Повтор (`repeat`) живёт на текстуре, а не на материале, поэтому один набор
 * карт на десяти поверхностях с разным метражом требует десяти текстур. Это
 * ничего не стоит: three держит объект видеокарты в кэше по `source` плюс
 * параметры сэмплера (обёртка, фильтры, анизотропия, цветовое пространство), а
 * `repeat` и `offset` в ключ кэша НЕ входят - они уезжают юниформой. Клон делит
 * с оригиналом и картинку, и загруженную текстуру; отдельным становится только
 * число повторов.
 */

import * as THREE from 'three'
import { bake, type Baked } from './bake.js'
import { recipe, type Recipe } from './generators.js'

/** Набор карт одного материала, готовый к раздаче по мешам. */
export type TextureSet = {
  name: string
  size: number
  /** Базовый цвет, sRGB. */
  map: THREE.Texture
  /** Карта нормалей, линейные данные. */
  normalMap: THREE.Texture
  /** Шероховатость, линейные данные. */
  roughnessMap: THREE.Texture
  /** Металличность, или `null`, если генератор про металл ничего не сказал. */
  metalnessMap: THREE.Texture | null
}

export type SetOptions = {
  /** Анизотропия. Три ограничивает по возможностям видеокарты сам. */
  anisotropy?: number
}

function canvasOf(rgba: Uint8ClampedArray, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('world-core/materials: нет 2d-контекста у канвы')
  // Через `createImageData` + `set`, а не `new ImageData(rgba, ...)`: второе
  // требует, чтобы буфер был ровно `ArrayBuffer`, и спотыкается о типы там,
  // где массив приехал из другого модуля.
  const img = ctx.createImageData(size, size)
  img.data.set(rgba)
  ctx.putImageData(img, 0, 0)
  return c
}

function textureOf(
  rgba: Uint8ClampedArray,
  size: number,
  srgb: boolean,
  anisotropy: number,
): THREE.Texture {
  const t = new THREE.CanvasTexture(canvasOf(rgba, size))
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = anisotropy
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  return t
}

/** Обернуть уже посчитанный набор в текстуры three. */
export function toTextures(baked: Baked, name: string, o: SetOptions = {}): TextureSet {
  const a = o.anisotropy ?? 8
  const s = baked.size
  return {
    name,
    size: s,
    map: textureOf(baked.albedo, s, true, a),
    normalMap: textureOf(baked.normal, s, false, a),
    roughnessMap: textureOf(baked.rough, s, false, a),
    metalnessMap: baked.metal ? textureOf(baked.metal, s, false, a) : null,
  }
}

/** Посчитать набор по рецепту и сразу обернуть в текстуры. */
export function makeSet(name: string, o: SetOptions = {}): TextureSet {
  const r: Recipe = recipe(name)
  return toTextures(bake(r.gen, r.size, r.normalStrength), r.name, o)
}

export type MaterialOptions = {
  /**
   * Сколько раз карта укладывается по поверхности. Работает вместе с UV в
   * метрах (`uv.ts`): там уже задан метраж, здесь - подгонка масштаба рисунка.
   */
  repeat?: [number, number]
  /** Крутизна рельефа поверх той, что вшита в карту. */
  normalScale?: number
  /** Подкраска базового цвета. Множитель, не замена. */
  color?: THREE.ColorRepresentation
  roughness?: number
  metalness?: number
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  /**
   * Сила отражения окружения. По умолчанию НЕ трогается.
   *
   * В эталоне здесь стоял жёсткий ноль - и правильно стоял: там окружения не
   * было вовсе. Перенести этот ноль в библиотеку значило бы молча погасить
   * отражения любому миру, у которого окружение есть, причём симптом выглядел
   * бы как «материал слишком матовый», а причина лежала бы за три файла.
   */
  envMapIntensity?: number
}

function cloneTex(t: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const c = t.clone()
  c.needsUpdate = true
  c.wrapS = c.wrapT = THREE.RepeatWrapping
  c.repeat.set(rx, ry)
  return c
}

/**
 * Собрать материал из набора карт.
 *
 * Если у набора есть карта металла, `metalness` по умолчанию поднимается до 1:
 * иначе карта домножается на ноль и не делает ничего. Ровно это и есть та
 * ошибка, которую у камина было видно наоборот - там металл, наоборот, приехал
 * из мусора в сжатом канале, и лечился множителем в ноль.
 */
export function material(set: TextureSet, o: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const rx = o.repeat ? o.repeat[0] : 1
  const ry = o.repeat ? o.repeat[1] : 1
  const ns = o.normalScale ?? 1

  const m = new THREE.MeshStandardMaterial({
    map: cloneTex(set.map, rx, ry),
    normalMap: cloneTex(set.normalMap, rx, ry),
    roughnessMap: cloneTex(set.roughnessMap, rx, ry),
    normalScale: new THREE.Vector2(ns, ns),
    color: o.color ?? 0xffffff,
    roughness: o.roughness ?? 1,
    metalness: o.metalness ?? 0,
  })

  if (set.metalnessMap) {
    m.metalnessMap = cloneTex(set.metalnessMap, rx, ry)
    if (o.metalness === undefined) m.metalness = 1
  }

  if (o.emissive !== undefined) {
    m.emissive = new THREE.Color(o.emissive)
    m.emissiveIntensity = o.emissiveIntensity ?? 1
  }

  if (o.envMapIntensity !== undefined) m.envMapIntensity = o.envMapIntensity

  return m
}

/** Освободить видеопамять набора. Карты живут дольше материалов - убирать вручную. */
export function disposeSet(set: TextureSet): void {
  set.map.dispose()
  set.normalMap.dispose()
  set.roughnessMap.dispose()
  set.metalnessMap?.dispose()
}
