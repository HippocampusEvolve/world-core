/**
 * parts.ts — коробка и цилиндр с UV в метрах, одной строкой.
 *
 * Предметы каталога собираются из примитивов, и у каждого примитива три
 * обязательных шага: геометрия, развёртка в метрах, посадка. Здесь они
 * сложены вместе, чтобы модуль предмета читался как список деталей, а не как
 * повторяющийся ритуал.
 */
import * as THREE from 'three';
import { boxUV, cylinderUV } from '../materials/index.js';
/** Коробка w×h×d с центром в (x, y, z). `s` - тайлов на метр, `along` - ось волокна. */
export function boxMesh(name, w, h, d, mat, x, y, z, s = 1, along) {
    const g = new THREE.BoxGeometry(w, h, d);
    boxUV(g, w, h, d, s, along);
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    m.position.set(x, y, z);
    return m;
}
/** Цилиндр по оси Y: радиусы верха и низа, высота, центр в (x, y, z). */
export function cylMesh(name, rTop, rBottom, h, segments, mat, x, y, z, s = 1) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
    cylinderUV(g, (rTop + rBottom) / 2, h, s);
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    m.position.set(x, y, z);
    return m;
}
//# sourceMappingURL=parts.js.map