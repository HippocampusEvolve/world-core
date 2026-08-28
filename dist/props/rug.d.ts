/**
 * rug.ts — круглый плетёный коврик.
 *
 * Тонкий диск на полу; весь рисунок - в карте `braid`, которая кладётся на
 * круг целиком (`discUV`): у колец шнура есть середина, тайлить их нечем.
 * Раньше коврик был двумя дисками разного цвета один на другом - кольца
 * изображались геометрией; теперь их даёт карта, а диск один.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
export type RugOptions = {
    r?: number;
    t?: number;
    mats?: Mats;
};
export type Rug = {
    group: THREE.Group;
    r: number;
};
export declare function rug({ r, t, mats }?: RugOptions): Rug;
