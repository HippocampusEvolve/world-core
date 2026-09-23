/**
 * furniture.ts — казённая мебель: скамья, стул и стопка стульев, письменный
 * стол с тумбой, тумбочка, сервант, верстак, дощатый ящик.
 *
 * Начало координат у всех - середина пятна на полу, лицо к +Z. Габариты
 * `w`, `d`, `h` - рамка предмета целиком; рабочие высоты (сиденье,
 * столешница) - отдельными полями.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
export type Sized = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export type BenchOptions = {
    w?: number;
    d?: number;
    h?: number;
    mats?: Mats;
};
export type Bench = Sized & {
    seat: number;
};
/** Скамья: две доски сиденья на двух козлах, внизу проножка. Роли: wood, paint. */
export declare function bench({ w, d, h, mats }?: BenchOptions): Bench;
export type ChairOptions = {
    mats?: Mats;
};
export type Chair = Sized & {
    seat: number;
};
/**
 * Советский стул на трубчатом каркасе: фанерные сиденье и спинка, четыре
 * ноги, 0.42 x 0.45 x 0.85. Роли: wood (сиденье, спинка), paint (каркас).
 *
 * Каркас устроен так, чтобы стулья вставлялись друг в друга: ноги стоят
 * СНАРУЖИ сиденья, царги - под ним и внутри линии ног. У плоской рамы
 * «нога-царга-нога» её копия со сдвигом обязательно пересечёт оригинал, а у
 * такой, разнесённой по X, - нет: царги верхнего стула проходят внутри ног
 * нижнего и ложатся на его сиденье.
 */
export declare function chair({ mats }?: ChairOptions): Chair;
export type ChairStackOptions = {
    n?: number;
    mats?: Mats;
};
export type ChairStack = Sized & {
    chairs: THREE.Group[];
};
/**
 * Стулья стопкой, вставленные друг в друга: каждый следующий выше на сиденье
 * с трубкой и сдвинут назад на 3 см. Детали соседей не пересекаются - это
 * выведено из устройства каркаса (см. `chair`), а не подобрано.
 */
export declare function chairStack({ n, mats }?: ChairStackOptions): ChairStack;
export type DeskOptions = {
    w?: number;
    d?: number;
    h?: number;
    pull?: number;
    mats?: Mats;
};
export type Desk = Sized & {
    top: number;
    drawers: THREE.Group[];
};
/**
 * Письменный стол: столешница, тумба справа с тремя ящиками, щит-опора слева
 * и царга-экран сзади. Ящики - подвижные подгруппы (`drawer`, `pull` - на
 * сколько выдвинуты). Роли: wood (столешница), paint (корпус, лица), steel
 * (ручки).
 */
export declare function desk({ w, d, h, pull, mats }?: DeskOptions): Desk;
export type NightstandOptions = {
    w?: number;
    d?: number;
    h?: number;
    pull?: number;
    mats?: Mats;
};
export type Nightstand = Sized & {
    top: number;
    drawers: THREE.Group[];
};
/**
 * Тумбочка: ящик сверху, ниже открытая ниша с полкой, на цоколе. Ящик -
 * подвижная подгруппа (`drawer`), в `userData.inside` - где у него дно.
 * Роли: wood (крышка), paint (корпус), steel (ручка).
 */
export declare function nightstand({ w, d, h, pull, mats }?: NightstandOptions): Nightstand;
export type SideboardOptions = {
    w?: number;
    d?: number;
    h?: number;
    open?: number;
    mats?: Mats;
};
export type Sideboard = Sized & {
    top: number;
    doors: THREE.Group[];
};
/**
 * Сервант, нижняя часть: две дверцы на петлях по краям, внутри полка, на
 * четырёх точёных ножках. Крышка со свесом, ручки под свесом. Дверцы -
 * подвижные подгруппы (`door-left`, `door-right`), `open` - угол, рад.
 * Роли: wood (крышка, ножки), paint (корпус, дверцы), brass (ручки).
 */
export declare function sideboard({ w, d, h, open, mats }?: SideboardOptions): Sideboard;
export type WorkbenchOptions = {
    w?: number;
    d?: number;
    h?: number;
    mats?: Mats;
};
export type Workbench = Sized & {
    top: number;
};
/**
 * Верстак: толстая столешница на стальной раме, внизу полка, справа у кромки
 * тиски, на столешнице молоток и гаечный ключ. Тиски выходят за кромку вперёд
 * и над столешницей - рамка предмета больше столешницы на них.
 * Роли: wood (столешница, полка, рукоять молотка), paint (рама), steel.
 */
export declare function workbench({ w, d, h, mats }?: WorkbenchOptions): Workbench;
export type CrateOptions = {
    w?: number;
    d?: number;
    h?: number;
    open?: number;
    mats?: Mats;
};
export type Crate = Sized & {
    lid: THREE.Group;
};
/**
 * Дощатый ящик с крышкой: по три доски на стенку с зазорами, дно, крышка из
 * четырёх досок на двух планках сверху. Крышка - подвижная подгруппа (`lid`):
 * ось петли вдоль X у задней верхней кромки, открывается поворотом
 * `rotation.x` в минус. Роли: wood.
 */
export declare function crate({ w, d, h, open, mats }?: CrateOptions): Crate;
