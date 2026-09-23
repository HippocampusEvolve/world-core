/**
 * fixtures.ts — то, что висит на стене и под потолком: доска с крючками,
 * зеркало под простынёй, огнетушитель на кронштейне, кабельный лоток,
 * раковина со смесителем, часы, фоторамка; и ночник.
 *
 * Настенные предметы посажены тылом на плоскость стены: z = 0 - грань стены,
 * предмет выступает в +Z, x = 0 - середина. Начало по высоте названо у каждого.
 * Надписей, цифр и табличек на предметах нет: их кладёт мир, для этого у
 * некоторых предметов есть точки (`labels`) или отдельная плоскость с UV от 0
 * до 1 (циферблат, снимок).
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
type Sized = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export type CoatBoardOptions = {
    hooks?: number;
    w?: number;
    mats?: Mats;
};
export type CoatBoard = Sized & {
    /** Точки, где висит петля: на них ставят начало `coat`. В координатах доски. */
    hooks: THREE.Vector3[];
    /** Места для табличек над крючками, на лице доски. */
    labels: THREE.Vector3[];
};
/**
 * Настенная доска-вешалка с крючками. Начало - середина доски на стене.
 * Крючок - стальной пруток: от доски вперёд с уклоном вниз, в колене петля,
 * конец загнут вверх; петля плаща садится в колено, а загиб выше плаща.
 * Роли: wood (доска), steel (крючки и их розетки).
 */
export declare function coatBoard({ hooks, w, mats }?: CoatBoardOptions): CoatBoard;
export type CoveredMirrorOptions = {
    w?: number;
    h?: number;
    mats?: Mats;
};
export type CoveredMirror = Sized & {
    sheet: THREE.Mesh;
    glass: THREE.Mesh;
};
/**
 * Настенное зеркало в раме, поверх него простыня: лежит на верхней планке
 * рамы, огибает её и свисает спереди на 0.2 ниже зеркала, по низу - мягкие
 * складки. Начало - центр зеркала на стене. Простыня - отдельный меш
 * (`mirror-sheet`): мир может её снять. От граней рамы простыня отстоит на
 * 5 мм и толщиной 7 мм, так что её лицо дальше сантиметра от лица рамы.
 * Роли: wood (рама), glass (зеркало), cloth (простыня).
 */
export declare function coveredMirror({ w, h, mats }?: CoveredMirrorOptions): CoveredMirror;
export type ExtinguisherOptions = {
    mats?: Mats;
};
export type Extinguisher = Sized & {
    body: THREE.Mesh;
};
/**
 * Огнетушитель на настенном кронштейне. Начало - середина кронштейна на
 * стене: баллон висит в хомуте на стойке, запорная головка сверху, шланг
 * спускается по лицу баллона к раструбу. Баллон высотой 0.565 м.
 * Роли: paint (баллон, по умолчанию красный), steel (кронштейн, хомут,
 * головка, рычаг), rubber (шланг, раструб).
 */
export declare function extinguisher({ mats }?: ExtinguisherOptions): Extinguisher;
export type CableTrayOptions = {
    length?: number;
    cables?: number;
    mats?: Mats;
};
export type CableTray = Sized & {
    cables: THREE.Mesh[];
};
/**
 * Лоток-швеллер шириной 0.2 с кабелями. Начало - середина одного конца по
 * низу лотка: лоток идёт вдоль +X, ширина по Z, y = 0 - низ дна. Кабели
 * лежат на дне и чуть гуляют, концы заподлицо с торцами лотка: лотки
 * ставятся встык. Роли: steel (лоток), rubber (кабели).
 */
export declare function cableTray({ length, cables, mats }?: CableTrayOptions): CableTray;
export type WashbasinOptions = {
    w?: number;
    d?: number;
    h?: number;
    mats?: Mats;
};
export type Washbasin = Sized & {
    rim: number;
    bowl: THREE.Mesh;
    spout: THREE.Vector3;
};
/**
 * Эмалированная раковина на двух кронштейнах, слив-сифон в стену, смеситель
 * на стене над ней. Начало - на стене, y = 0 - пол, край чаши на высоте `h`.
 * Чаша - прямоугольная со скруглёнными углами (суперэллипс), тыл касается
 * стены. `spout` - конец излива: откуда течёт вода.
 * Роли: enamel (чаша), steel (кронштейны, слив, смеситель).
 */
export declare function washbasin({ w, d, h, mats }?: WashbasinOptions): Washbasin;
export type WallClockOptions = {
    /** Диаметр, м. */
    d?: number;
    /** Время на стрелках: секунды от полудня. */
    time?: number;
    mats?: Mats;
};
export type WallClock = Sized & {
    hands: {
        hour: THREE.Group;
        minute: THREE.Group;
        second: THREE.Group;
    };
    face: THREE.Mesh;
};
/**
 * Круглые настенные часы. Начало - центр на стене. Корпус с ободом, в
 * углублении циферблат (роль paper, UV от 0 до 1 на весь круг - мир кладёт
 * на него цифры), стекло, три стрелки. Стрелки - подвижные подгруппы
 * (`hands-hour`, `hands-minute`, `hands-second`), ось - их локальная Z через
 * центр; по часовой = `rotation.z` в минус. Роли: paint, paper, glass, steel.
 */
export declare function wallClock({ d, time, mats }?: WallClockOptions): WallClock;
export type PhotoFrameOptions = {
    w?: number;
    h?: number;
    mats?: Mats;
};
export type PhotoFrame = Sized & {
    photo: THREE.Mesh;
};
/**
 * Рамка на стене и плоскость снимка в ней. Начало - центр на стене. Снимок -
 * плоскость из двух треугольников с UV от 0 до 1 (роль photo): мир рисует
 * на ней снимок сам. Роли: wood, photo.
 */
export declare function photoFrame({ w, h, mats }?: PhotoFrameOptions): PhotoFrame;
export type NightLampOptions = {
    mats?: Mats;
};
export type NightLamp = Sized & {
    bulb: THREE.Mesh;
    shade: THREE.Mesh;
};
/**
 * Ночник: подставка, стойка, патрон, лампочка и абажур-колпак над ней.
 * Начало - середина подставки на столе. Мёртвый или живой - решает мир
 * эмиссией ролей `bulb` и `shade`. Роли: plastic, steel, bulb, shade.
 */
export declare function nightLamp({ mats }?: NightLampOptions): NightLamp;
export {};
