/**
 * books.ts — полка на кронштейнах, ряд книг и кружка.
 *
 * Начало координат - середина полки по длине, на уровне её верха; полка
 * прижата задней кромкой к стене (стена у −Z), книги стоят корешком в комнату
 * (+Z). Книга - коробка с шестью гранями по ролям: переплёт на крышках и
 * корешке, обрез страниц сверху, снизу и спереди. Цвет корешка даёт
 * подкраска одной и той же карты кожи.
 *
 * Последняя книга наклонена к ряду и касается соседки верхним углом, а
 * нижним стоит на полке: наклон вокруг центра коробки утопил бы угол в доску.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
export type ShelfOptions = {
    width?: number;
    depth?: number;
    /** Сколько книг. */
    n?: number;
    /** Цвета переплётов, по кругу. */
    colors?: number[];
    mats?: Mats;
};
export type Shelf = {
    group: THREE.Group;
    width: number;
    depth: number;
    height: number;
};
export declare function shelfWithBooks({ width, depth, n, colors, mats }?: ShelfOptions): Shelf;
