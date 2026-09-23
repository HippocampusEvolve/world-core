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
export { ROLES, turn, movingParts } from './heroes/kit.js';
export { tubeFixture } from './heroes/tube.js';
export { cageLamp } from './heroes/cage.js';
export { generator } from './heroes/generator.js';
export { listeningConsole } from './heroes/console.js';
export { tapeRecorder } from './heroes/recorder.js';
export { deskLamp } from './heroes/desklamp.js';
export { hatchLid } from './heroes/hatch.js';
export { porthole } from './heroes/porthole.js';
export { pod } from './heroes/pod.js';
export { climateConsole, tarp } from './heroes/climate.js';
//# sourceMappingURL=heroes.js.map