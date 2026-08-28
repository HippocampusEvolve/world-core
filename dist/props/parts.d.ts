/**
 * parts.ts — коробка и цилиндр с UV в метрах, одной строкой.
 *
 * Предметы каталога собираются из примитивов, и у каждого примитива три
 * обязательных шага: геометрия, развёртка в метрах, посадка. Здесь они
 * сложены вместе, чтобы модуль предмета читался как список деталей, а не как
 * повторяющийся ритуал.
 */
import * as THREE from 'three';
import { type Along } from '../materials/index.js';
/** Коробка w×h×d с центром в (x, y, z). `s` - тайлов на метр, `along` - ось волокна. */
export declare function boxMesh(name: string, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, s?: number, along?: Along): THREE.Mesh;
/** Цилиндр по оси Y: радиусы верха и низа, высота, центр в (x, y, z). */
export declare function cylMesh(name: string, rTop: number, rBottom: number, h: number, segments: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, s?: number): THREE.Mesh;
