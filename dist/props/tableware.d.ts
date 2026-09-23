/**
 * tableware.ts — посуда: эмалированная кружка, сахарница с крышкой, настенная
 * полка с чашками.
 *
 * Посуда - тела вращения (`revolve`): профиль от середины дна наружу, вверх
 * по стенке, через край и внутрь обратно к середине, так что тело замкнуто
 * и стенка имеет толщину. Кант по краю - свой прогон профиля с ролью
 * `paint2`: у эмалированной посуды край тёмный. Начало - середина дна на
 * столе, ручка к +X.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
type Sized = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export type MugOptions = {
    /** Налито: доля высоты, 0 - пустая. */
    fill?: number;
    mats?: Mats;
};
export type Mug = Sized & {
    body: THREE.Mesh;
    handle: THREE.Mesh;
    liquid: THREE.Mesh | null;
    rim: number;
};
/**
 * Эмалированная кружка 0.08 x 0.1: стенка в 3 мм, дно вогнуто и стоит на
 * кольце, по краю закатанный кант, ручка-скоба сбоку. Налитое (`fill`) -
 * столб от дна до уровня, отдельным мешем (`mug-liquid`): мир даст ему пар.
 * Роли: enamel (кружка, ручка), paint2 (кант), water (налитое).
 */
export declare function mug({ fill, mats }?: MugOptions): Mug;
export type SugarBowlOptions = {
    mats?: Mats;
};
export type SugarBowl = Sized & {
    body: THREE.Mesh;
    lid: THREE.Mesh;
};
/**
 * Эмалированная сахарница: пузатая чаша на кольце с кантом по краю и крышка
 * с шишечкой, которая лежит на кромке чаши. Крышка - отдельный меш
 * (`sugar-lid`): мир может её снять. Роли: enamel, paint2 (кант, шишечка).
 */
export declare function sugarBowl({ mats }?: SugarBowlOptions): SugarBowl;
export type CupShelfOptions = {
    cups?: number;
    w?: number;
    mats?: Mats;
};
export type CupShelf = Sized & {
    /** Чашки слева направо, меши `cup-1`...`cup-N`: мир красит каждую сам. */
    cups: THREE.Mesh[];
};
/**
 * Настенная полка с чашками: доска на двух кронштейнах, спереди бортик, на
 * ней в ряд чашки ручками вправо. Каждая чашка - отдельный меш (`cup-1`...),
 * чтобы мир мог одну отмыть, а остальные запылить. Начало - середина полки
 * на стене, y = 0 - верх доски: на нём стоят чашки.
 * Роли: wood (доска, кронштейны, бортик), enamel (чашки).
 */
export declare function cupShelf({ cups, w, mats }?: CupShelfOptions): CupShelf;
export {};
