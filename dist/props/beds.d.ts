/**
 * beds.ts — железные койки: двухъярусная с голыми досками, одинарная
 * застеленная, скатанный матрас, сложенная раскладушка.
 *
 * Начало координат - середина пятна на полу, длина вдоль Z, изголовье у −Z.
 * Рама из трубы (`pipe`): стойки, продольные и поперечные царги встык к
 * стойкам. Поперечные царги подняты над продольными на 4 см, иначе их концы у
 * стойки сошлись бы ближе толщины трубы. Кровать ядра `bed` деревянная и сюда
 * не годится.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
type Sized = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export type BunkOptions = {
    w?: number;
    l?: number;
    h?: number;
    mats?: Mats;
};
export type Bunk = Sized & {
    /** Высоты верха лежаков: нижний, верхний. */
    levels: number[];
};
/**
 * Двухъярусная металлическая койка: четыре стойки, на двух уровнях рама из
 * царг и голые доски поперёк, у торцов перекладины, у верхнего яруса бортик.
 * Роли: paint (рама), wood (доски).
 */
export declare function bunk({ w, l, h, mats }?: BunkOptions): Bunk;
export type CotOptions = {
    w?: number;
    l?: number;
    mats?: Mats;
};
export type Cot = Sized & {
    top: number;
    mattress: THREE.Mesh;
    blanket: THREE.Mesh;
    pillow: THREE.Mesh;
};
/**
 * Одинарная металлическая койка, застеленная ровно: изголовье и изножье -
 * гнутые трубы с перекладиной, царги, стальные прутья поперёк, на них матрас,
 * одеяло с отворотом простыни и полами по бокам, подушка у изголовья.
 * Одеяло лежит на матрасе с зазором 2 мм и толщиной 1.6 см, полы - снаружи
 * матраса, отворот - поверх одеяла. Роли: paint (рама), steel (прутья),
 * cloth (матрас, одеяло, простыня, подушка).
 */
export declare function cot({ w, l, mats }?: CotOptions): Cot;
export type RolledMattressOptions = {
    l?: number;
    d?: number;
    mats?: Mats;
};
export type RolledMattress = Sized;
/**
 * Скатанный матрас, перевязанный двумя шнурами. Ось рулона вдоль X, `l` -
 * длина рулона (ширина матраса), `d` - диаметр вместе со шнурами. В разрезе
 * - виток спирали: у пола ступенька там, где кончается внешний слой. Рулон
 * лежит на шнурах, шнуры - на полу. Роли: cloth (матрас и шнуры).
 */
export declare function rolledMattress({ l, d, mats }?: RolledMattressOptions): RolledMattress;
export type FoldedCotOptions = {
    mats?: Mats;
};
export type FoldedCot = Sized;
/**
 * Сложенная раскладушка, стоит на торце: две рамы из трубы кольцом,
 * между ними брезент, поверх передней рамы - сложенные опоры.
 * Роли: steel (рамы, опоры), cloth (брезент).
 */
export declare function foldedCot({ mats }?: FoldedCotOptions): FoldedCot;
export {};
