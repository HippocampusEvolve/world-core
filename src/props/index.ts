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

export { lookOf, blankMats, type Mats } from './look.js'
export { boxMesh, cylMesh } from './parts.js'
export {
  splitLogGeometry,
  roundLogGeometry,
  logMaterials,
  splitLogMaterials,
  roundLogMaterials,
  type LogTiling,
} from './log.js'
export { logStack, type LogStackOptions, type LogStack } from './logstack.js'
export { bed, type BedOptions, type Bed } from './bed.js'
export { table, stool, type TableOptions, type Table, type StoolOptions, type Stool } from './table.js'
export { rug, type RugOptions, type Rug } from './rug.js'
export { shelfWithBooks, type ShelfOptions, type Shelf } from './books.js'
