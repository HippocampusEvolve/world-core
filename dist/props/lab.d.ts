/**
 * lab.ts — лаборатория и медпункт: стеллаж рассады с лампами, куст помидора
 * в горшке, банка с землёй, микроскоп, ящичек с жестяными бирками,
 * медицинские весы.
 *
 * Начало координат - середина пятна на полу (или на столе), лицо к +Z.
 * Живое (куст) собирается от семени (`seed`): тот же номер - тот же куст.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
type Sized = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export type PlantRackOptions = {
    w?: number;
    d?: number;
    h?: number;
    shelves?: number;
    mats?: Mats;
};
export type PlantRack = Sized & {
    /** Высоты верха полок: куда ставить горшки. */
    shelves: number[];
    /** Лампы-планки над полками: светящиеся трубки (роль `tube`). */
    lamps: THREE.Mesh[];
};
/**
 * Стальной стеллаж: четыре уголка-стойки, полки на продольных связях, крыша;
 * под каждой вышележащей полкой (и под крышей) - лампа-планка: корпус и
 * трубка. Роли: paint (стойки, связи), steel (полки, корпуса ламп), tube.
 */
export declare function plantRack({ w, d, h, shelves, mats }?: PlantRackOptions): PlantRack;
export type TomatoPlantOptions = {
    fruits?: number;
    seed?: number;
    mats?: Mats;
};
export type TomatoPlant = Sized & {
    fruits: THREE.Mesh;
    leaves: THREE.Mesh;
};
/**
 * Куст помидора в пластиковом горшке, подвязан к колышку: стебель, четыре
 * ветки с листьями, мелкие красные плоды под ветками. Высота 0.4-0.47 м.
 * Плоды одним мешем (`tomato-fruits`), листья одним (`tomato-leaves`).
 * Роли: plastic (горшок), soil, wood (колышек), leaf, fruit.
 */
export declare function tomatoPlant({ fruits, seed, mats }?: TomatoPlantOptions): TomatoPlant;
export type JarOptions = {
    h?: number;
    fill?: number;
    lid?: boolean;
    mats?: Mats;
};
export type Jar = Sized;
/**
 * Стеклянная банка с землёй: стенка, плечики, горло, металлическая крышка;
 * земля насыпана на `fill` высоты. Роли: glass, soil, steel.
 */
export declare function jar({ h, fill, lid, mats }?: JarOptions): Jar;
export type MicroscopeOptions = {
    mats?: Mats;
};
export type Microscope = Sized;
/**
 * Микроскоп: основание, колонна с винтами фокуса, предметный столик, дуга
 * тубусодержателя, наклонный тубус с окуляром и объективом.
 * Роли: paint (корпус), steel (тубус, винты), glass (линза окуляра).
 */
export declare function microscope({ mats }?: MicroscopeOptions): Microscope;
export type TagBoxOptions = {
    tags?: number;
    seed?: number;
    mats?: Mats;
};
export type TagBox = Sized & {
    tags: THREE.Mesh;
};
/**
 * Деревянный ящичек без крышки, в нём рядом стоят на ребре жестяные бирки -
 * как карточки в картотеке, каждая чуть наклонена. Бирки через 1.2 см:
 * ближе их лица сошлись бы за сантиметр. Роли: wood, steel.
 */
export declare function tagBox({ tags, seed, mats }?: TagBoxOptions): TagBox;
export type ScalesOptions = {
    mats?: Mats;
};
export type Scales = Sized & {
    weight: THREE.Group;
};
/**
 * Медицинские весы с гирями на коромысле: площадка с резиновым ковриком,
 * колонна сзади, коробка коромысла наверху, коромысло с двумя гирями.
 * Большая гиря - подвижная подгруппа (`weight`), едет вдоль X.
 * Роли: paint, rubber, steel.
 */
export declare function scales({ mats }?: ScalesOptions): Scales;
export type BandageOptions = {
    mats?: Mats;
};
export type Bandage = Sized & {
    roll: THREE.Mesh;
    tail: THREE.Mesh;
};
/**
 * Скатанный бинт диаметром 0.1 лежит на боку, с отпущенным концом. Рулон -
 * кольцо с дыркой по оси, ось вдоль X; хвост - полоса, которая выходит
 * из-под рулона вперёд (+Z) и лежит на столе, конец чуть загнут. Рулон
 * стоит на собственном хвосте: низ рулона - на верху полосы. Отпущенный
 * хвост короче 13 см: полоса площадью больше квадратного дециметра легла бы
 * в двух миллиметрах над столом одной с ним стороной. Начало - под осью
 * рулона на столе. Роль: cloth.
 */
export declare function bandage({ mats }?: BandageOptions): Bandage;
export type ScissorsOptions = {
    mats?: Mats;
};
export type Scissors = Sized;
/**
 * Ножницы, закрытые, лежат плашмя: две половины - лезвие с хвостовиком и
 * кольцо, одним куском каждая. Нижняя лежит на столе, верхняя лезвием на
 * нижней, её кольцо - на столе рядом; винт сверху на оси. Длина 0.15, лезвия
 * к +X. Начало - середина рамки на столе. Роль: steel.
 */
export declare function scissors({ mats }?: ScissorsOptions): Scissors;
export {};
