/**
 * table.ts — стол на четырёх ногах с царгами и табурет на трёх.
 *
 * Начало координат - середина пятна на полу. Столешница из половой доски
 * (планки вдоль длины), ноги и царги из бруса. Царги идут между ногами
 * встык, а не сквозь них: у стола, собранного «в глаз», царга проходила бы
 * через ногу, и проверка тел назвала бы это пересечением.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
export type TableOptions = {
    w?: number;
    d?: number;
    /** Высота верха столешницы. */
    h?: number;
    mats?: Mats;
};
export type Table = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export declare function table({ w, d, h, mats }?: TableOptions): Table;
export type StoolOptions = {
    r?: number;
    h?: number;
    mats?: Mats;
};
export type Stool = {
    group: THREE.Group;
    r: number;
    h: number;
};
export declare function stool({ r, h, mats }?: StoolOptions): Stool;
