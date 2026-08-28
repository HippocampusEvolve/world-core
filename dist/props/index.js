/**
 * Предметы каталога: геометрия из примитивов, поверхность из наборов ядра.
 *
 * Каждый предмет - функция с параметрами, возвращающая группу three и свои
 * габариты. Мир ставит группу куда нужно, заводит коллайдер по габаритам и
 * при желании подменяет материалы по ролям (`mats`). Про мир предмет не знает
 * ничего.
 *
 *     import { bed, rug } from 'world-core/props'
 *
 *     const b = bed({ w: 1.02, l: 2.1 })
 *     b.group.position.set(x, floorY, z)
 *     scene.add(b.group)
 *
 * Геометрия проверяется счётом без канвы: `blankMats()` подставляет пустые
 * материалы, и предмет собирается на Node - см. `worlds/props.ts` в наборе
 * проверки витрины.
 */
export { lookOf, blankMats } from './look.js';
export { boxMesh, cylMesh } from './parts.js';
export { splitLogGeometry, roundLogGeometry, logMaterials, splitLogMaterials, roundLogMaterials, } from './log.js';
export { logStack } from './logstack.js';
export { bed } from './bed.js';
export { table, stool } from './table.js';
export { rug } from './rug.js';
export { shelfWithBooks } from './books.js';
//# sourceMappingURL=index.js.map