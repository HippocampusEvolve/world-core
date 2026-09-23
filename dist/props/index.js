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
export { shovel } from './shovel.js';
// казённые предметы: роли из словаря, формы, корпус из щитов
export { ROLES, ROLE_NAMES, roleMats } from './roles.js';
export { pipe, fillet, revolve, slab, extrude, merge, orient, frameOf } from './shapes.js';
export { carcass } from './cabinet.js';
export { bench, chair, chairStack, desk, nightstand, sideboard, workbench, crate, } from './furniture.js';
export { locker, medCabinet, panelBox, jerrycan, bucket, } from './storage.js';
export { coatBoard, coveredMirror, extinguisher, cableTray, washbasin, wallClock, photoFrame, nightLamp, } from './fixtures.js';
export { bunk, cot, rolledMattress, foldedCot, } from './beds.js';
export { plantRack, tomatoPlant, jar, microscope, tagBox, scales, } from './lab.js';
export { coat, boots } from './cloth.js';
export { bandage, scissors } from './lab.js';
export { mug, sugarBowl, cupShelf, } from './tableware.js';
export { openBook, pen } from './stationery.js';
//# sourceMappingURL=index.js.map