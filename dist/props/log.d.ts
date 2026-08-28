/**
 * log.ts — полено: круглое и колотое.
 *
 * Дрова в мирах были цилиндрами с корой по кругу, и глаз читал их как трубы:
 * у настоящей поленницы половина поверхности - светлые плоскости раскола, они
 * и делают дрова дровами. Здесь колотое полено строится честно: сектор
 * цилиндра с корой по дуге, торцами-секторами и плоскостями раскола.
 *
 * Группы геометрии - по ролям, в этом порядке:
 *
 *     0  кора        набор `bark`,   UV в метрах по обхвату и длине
 *     1  торцы       набор `logend`, весь круг торца на одну карту (см. discUV)
 *     2  раскол      набор `split`,  UV в метрах, волокно вдоль полена
 *
 * Ось полена - его собственная Y, как у `CylinderGeometry`: поворотом
 * `rotation.z = π/2` оно ложится вдоль X, и код мира, писанный под цилиндр, не
 * меняется. Сектор центрирован на +X: у половинки плоскость раскола лежит в
 * x = 0 и смотрит в −X, у четвертинки две плоскости расходятся от оси.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
/** Тайлов на метр у коры и у раскола. */
export type LogTiling = {
    bark?: number;
    split?: number;
};
/**
 * Геометрия колотого полена: сектор в `span` радиан (π - половинка, π/2 -
 * четвертинка), радиус `r`, длина `len`.
 */
export declare function splitLogGeometry(r: number, len: number, span?: number, segments?: number, s?: LogTiling): THREE.BufferGeometry;
/**
 * Круглое полено: цилиндр с корой по обхвату и картой торца на всю крышку.
 * Группы те же, что у three: 0 бок, 1 верх, 2 низ - материалы [кора, торец, торец].
 */
export declare function roundLogGeometry(r: number, len: number, segments?: number, s?: number): THREE.BufferGeometry;
/** Материалы полена по ролям: кора, торец, раскол. */
export declare function logMaterials(mats?: Mats): {
    bark: THREE.Material;
    end: THREE.Material;
    split: THREE.Material;
};
/** Массив материалов под группы колотого полена. */
export declare function splitLogMaterials(m: ReturnType<typeof logMaterials>): THREE.Material[];
/** Массив материалов под группы круглого полена. */
export declare function roundLogMaterials(m: ReturnType<typeof logMaterials>): THREE.Material[];
