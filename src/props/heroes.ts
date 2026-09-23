/**
 * Предметы-герои каталога: машины, пульты, светильники, люки.
 *
 * Как у всего каталога, предмет - функция с параметрами: группа three,
 * габариты `w` (X), `d` (Z), `h` (Y) и полезные точки (где лампа, где экран,
 * где рычаг). Сверх этого у героя есть подвижные части - группы с опорой на
 * оси и записью в `userData`, как их вращать (см. `heroes/kit.ts`), - и
 * `moving`: те же части по именам, чтобы миру не искать их обходом.
 *
 * Материалы - по ролям из словаря `ROLES`; мир подменяет любые через `mats`.
 */

export { ROLES, turn, movingParts, type Role, type Axis, type MovingInfo } from './heroes/kit.js'
export { tubeFixture, type TubeFixtureOptions, type TubeFixture } from './heroes/tube.js'
export { cageLamp, type CageLampOptions, type CageLamp } from './heroes/cage.js'
export { generator, type GeneratorOptions, type Generator } from './heroes/generator.js'
export { listeningConsole, type ConsoleOptions, type ListeningConsole } from './heroes/console.js'
export { tapeRecorder, type TapeRecorderOptions, type TapeRecorder } from './heroes/recorder.js'
export { deskLamp, type DeskLampOptions, type DeskLamp } from './heroes/desklamp.js'
export { hatchLid, type HatchOptions, type Hatch } from './heroes/hatch.js'
export { porthole, type PortholeOptions, type Porthole } from './heroes/porthole.js'
export { pod, type PodOptions, type Pod } from './heroes/pod.js'
export { climateConsole, tarp, type ClimateConsoleOptions, type ClimateConsole, type TarpOptions, type Tarp } from './heroes/climate.js'
