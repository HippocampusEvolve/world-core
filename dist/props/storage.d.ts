/**
 * storage.ts — где что хранят: стальной шкафчик, настенная аптечка,
 * электрощит, канистра, ведро.
 *
 * Корпусные предметы стоят на общем корпусе из щитов (`cabinet.ts`): дверца
 * утоплена в проём и вращается вокруг своей петли. Настенные (аптечка, щит)
 * посажены тылом на плоскость стены: z = 0 - грань стены, предмет выступает в
 * +Z, начало - середина корпуса.
 */
import * as THREE from 'three';
import { type Mats } from './look.js';
type Sized = {
    group: THREE.Group;
    w: number;
    d: number;
    h: number;
};
export type LockerOptions = {
    w?: number;
    d?: number;
    h?: number;
    /** Дверца открыта на 100°. */
    open?: boolean;
    /** Бумажная полоска-пломба поперёк щели дверцы. */
    sealed?: boolean;
    /** Сколько пустых плечиков на штанге; по умолчанию два у открытого, ноль у закрытого. */
    hangers?: number;
    mats?: Mats;
};
export type Locker = Sized & {
    door: THREE.Group;
    seal: THREE.Mesh | null;
    inner: THREE.Box3;
};
/**
 * Стальной шкафчик на цоколе: дверца на левой петле с жалюзи вверху и внизу,
 * внутри полка под шапку и штанга с плечиками. Роли: paint (корпус, дверца),
 * steel (штанга, плечики, ручка), paper (пломба).
 */
export declare function locker({ w, d, h, open, sealed, hangers, mats }?: LockerOptions): Locker;
export type MedCabinetOptions = {
    open?: boolean;
    mats?: Mats;
};
export type MedCabinet = Sized & {
    door: THREE.Group;
    vials: THREE.Mesh[];
};
/**
 * Настенная аптечка 0.45 x 0.18 x 0.55: корпус с полкой, дверца на левой
 * петле (подвижная, `door`), по умолчанию открыта на 100°; на дверце крест
 * отдельной деталью (`paint2`), внутри три пузырька. Начало - середина
 * корпуса на стене. Роли: paint, paint2, steel, glass, rubber.
 */
export declare function medCabinet({ open, mats }?: MedCabinetOptions): MedCabinet;
export type PanelBoxOptions = {
    w?: number;
    h?: number;
    d?: number;
    open?: boolean;
    mats?: Mats;
};
export type PanelBox = Sized & {
    door: THREE.Group;
};
/**
 * Электрощит на стене: стальной ящик, дверца на левой петле (`door`),
 * внутри монтажная плита и два ряда автоматов. Начало - середина на стене.
 * Роли: paint (ящик, дверца), steel (плита, ручка), plastic (автоматы).
 */
export declare function panelBox({ w, h, d, open, mats }?: PanelBoxOptions): PanelBox;
export type JerrycanOptions = {
    full?: boolean;
    mats?: Mats;
};
export type Jerrycan = Sized & {
    full: boolean;
};
/**
 * Канистра 0.35 x 0.17 x 0.47: корпус со скруглёнными рёбрами, тройная ручка
 * сверху на четырёх стойках, горловина у края. У полной на горловине крышка,
 * у пустой горловина открыта. Роли: paint, steel (крышка).
 */
export declare function jerrycan({ full, mats }?: JerrycanOptions): Jerrycan;
export type BucketOptions = {
    water?: boolean;
    mats?: Mats;
};
export type Bucket = Sized & {
    water: THREE.Mesh | null;
    rim: number;
};
/**
 * Оцинкованное ведро: конус с закатанным бортом, дно утоплено на юбке, дужка
 * на ушках опущена набок и не касается стенки. Вода вровень с краем - слой
 * воды у самого верха, а не столб до дна: низ столба лёг бы на полсантиметра
 * над дном ведра одной с ним стороной. Роли: steel, water.
 */
export declare function bucket({ water, mats }?: BucketOptions): Bucket;
export {};
