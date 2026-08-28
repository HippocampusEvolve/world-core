/**
 * Процедурные материалы: карты считаются кодом, файлов не грузим.
 *
 * Два входа, по назначению:
 *
 *   * `bake` и генераторы - чистая арифметика, работают и на Node. Отсюда
 *     берёт числа проверка;
 *   * `makeSet`, `material`, помощники UV - three и браузер.
 *
 * Порядок работы в мире обычно такой:
 *
 *     const set = makeSet('rubble')
 *     const mat = material(set, { normalScale: 1.2 })
 *     const g = new THREE.BoxGeometry(w, h, d); boxUV(g, w, h, d, 0.5)
 */
export { hash2, wrapi, vnoise, fbm, ridge, worley } from './noise.js';
export { cl, cl01, ss, mix, add } from './shape.js';
export { bake, normalFromHeight } from './bake.js';
export { log, rubble, ashlar, hearth, firebrick, floor, beam, bark, logEnd, cloth, iron, wool, braid, leather, paper, split, RECIPES, recipe, } from './generators.js';
export { makeSet, toTextures, material, disposeSet, } from './textures.js';
export { boxUV, planeUV, cylinderUV, discUV, quadGeometry } from './uv.js';
export { cachedSet, cachedSets, disposeCachedSets } from './sets.js';
//# sourceMappingURL=index.js.map