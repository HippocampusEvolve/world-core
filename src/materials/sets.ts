/**
 * sets.ts — наборы карт по имени, один раз на игру.
 *
 * Набор считается ОДИН раз и раздаётся всем, кому нужен: `material()`
 * клонирует текстуры ради своего числа повторов, и клон ничего не стоит -
 * three держит объект видеокарты в кэше по картинке плюс параметрам сэмплера,
 * а `repeat` в ключ кэша не входит.
 *
 * Кэш появился в Snowfall (`matsets.js`), когда за одними наборами пришли
 * двое: нутро топки и сам камин. Два собственных кэша означали бы две выпечки
 * одного кирпича - по полсекунды и по три карты 512x512 в видеопамяти каждая.
 * Сюда он переехал вместе с предметами (`props/`): предмет берёт набор по
 * имени, и мир не должен знать, кто ещё его просил.
 */

import { makeSet, disposeSet, type SetOptions, type TextureSet } from './textures.js'

const cache = new Map<string, TextureSet>()

/** Набор карт по имени рецепта. Считается при первом спросе. */
export function cachedSet(name: string, o?: SetOptions): TextureSet {
  let s = cache.get(name)
  if (!s) {
    s = makeSet(name, o)
    cache.set(name, s)
  }
  return s
}

/** Посчитать сразу несколько и отдать объектом: `cachedSets('brick', 'beam').brick`. */
export function cachedSets(...names: string[]): Record<string, TextureSet> {
  const out: Record<string, TextureSet> = {}
  for (const n of names) out[n] = cachedSet(n)
  return out
}

/** Освободить видеопамять всех посчитанных наборов. Материалы, что их держат, станут пустыми. */
export function disposeCachedSets(): void {
  for (const s of cache.values()) disposeSet(s)
  cache.clear()
}
