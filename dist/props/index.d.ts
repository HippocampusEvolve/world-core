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
export { lookOf, blankMats, type Mats } from './look.js';
export { boxMesh, cylMesh } from './parts.js';
export { splitLogGeometry, roundLogGeometry, logMaterials, splitLogMaterials, roundLogMaterials, type LogTiling, } from './log.js';
export { logStack, type LogStackOptions, type LogStack } from './logstack.js';
export { bed, type BedOptions, type Bed } from './bed.js';
export { table, stool, type TableOptions, type Table, type StoolOptions, type Stool } from './table.js';
export { rug, type RugOptions, type Rug } from './rug.js';
export { shelfWithBooks, type ShelfOptions, type Shelf } from './books.js';
export { shovel } from './shovel.js';
export { ROLES, ROLE_NAMES, roleMats, type Role, type RoleDefault } from './roles.js';
export { pipe, fillet, revolve, slab, extrude, merge, orient, frameOf, type P3, type Run, type ProfilePoint } from './shapes.js';
export { carcass, type SlotSpec, type CarcassOptions, type Carcass } from './cabinet.js';
export { bench, chair, chairStack, desk, nightstand, sideboard, workbench, crate, type Sized, type BenchOptions, type Bench, type ChairOptions, type Chair, type ChairStackOptions, type ChairStack, type DeskOptions, type Desk, type NightstandOptions, type Nightstand, type SideboardOptions, type Sideboard, type WorkbenchOptions, type Workbench, type CrateOptions, type Crate, } from './furniture.js';
export { locker, medCabinet, panelBox, jerrycan, bucket, type LockerOptions, type Locker, type MedCabinetOptions, type MedCabinet, type PanelBoxOptions, type PanelBox, type JerrycanOptions, type Jerrycan, type BucketOptions, type Bucket, } from './storage.js';
export { coatBoard, coveredMirror, extinguisher, cableTray, washbasin, wallClock, photoFrame, nightLamp, type CoatBoardOptions, type CoatBoard, type CoveredMirrorOptions, type CoveredMirror, type ExtinguisherOptions, type Extinguisher, type CableTrayOptions, type CableTray, type WashbasinOptions, type Washbasin, type WallClockOptions, type WallClock, type PhotoFrameOptions, type PhotoFrame, type NightLampOptions, type NightLamp, } from './fixtures.js';
export { bunk, cot, rolledMattress, foldedCot, type BunkOptions, type Bunk, type CotOptions, type Cot, type RolledMattressOptions, type RolledMattress, type FoldedCotOptions, type FoldedCot, } from './beds.js';
export { plantRack, tomatoPlant, jar, microscope, tagBox, scales, type PlantRackOptions, type PlantRack, type TomatoPlantOptions, type TomatoPlant, type JarOptions, type Jar, type MicroscopeOptions, type Microscope, type TagBoxOptions, type TagBox, type ScalesOptions, type Scales, } from './lab.js';
export { coat, boots, type CoatOptions, type Coat, type BootsOptions, type Boots } from './cloth.js';
export { bandage, scissors, type BandageOptions, type Bandage, type ScissorsOptions, type Scissors } from './lab.js';
export { mug, sugarBowl, cupShelf, type MugOptions, type Mug, type SugarBowlOptions, type SugarBowl, type CupShelfOptions, type CupShelf, } from './tableware.js';
export { openBook, pen, type OpenBookOptions, type OpenBook, type PenOptions, type Pen } from './stationery.js';
