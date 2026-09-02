import * as THREE from 'three';
import { type Spring } from './spring.js';
/**
 * Узкий FOV приближает предмет. Чтобы кадр остался прежним, камерное Z множим
 * на это число: экранное положение и размер сохраняются в точности, а
 * собственная перспектива предмета смягчается - ради этого всё и затевалось.
 */
export declare const viewZ: (worldFov: number, fov: number) => number;
/** То же число для мира с обзором 75° - им живут кейфреймы замахов. */
export declare const VIEW_Z: number;
/** Что ригу нужно знать о теле. */
export interface ViewBody {
    bobAmt: number;
    bobT: number;
    exertion: number;
}
export interface ViewModelOptions {
    /**
     * Направление ключевого света в МИРОВЫХ осях (луна, солнце). Перед каждым
     * кадром пересчитывается в камерное пространство рига: повернулся - блик
     * пополз по штыку, а не приклеен к нему намертво.
     */
    keyDir: THREE.Vector3;
    /** Ключ и заполняющий: те же, что в мире, но подобранные под свою сцену. */
    key?: {
        color: THREE.ColorRepresentation;
        intensity: number;
    };
    fill?: {
        sky: THREE.ColorRepresentation;
        ground: THREE.ColorRepresentation;
        intensity: number;
    };
    /** Окружение мира. Без него сталь инструмента отражает пустоту и чернеет. */
    environment?: THREE.Texture | null;
    fov?: number;
    worldFov?: number;
    near?: number;
    far?: number;
}
export declare class ViewModel {
    worldCamera: THREE.PerspectiveCamera;
    keyDir: THREE.Vector3;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    rig: THREE.Group;
    key: THREE.DirectionalLight;
    /** Компенсация узкого FOV для этой пары обзоров. */
    readonly viewZ: number;
    swayYaw: number;
    swayPitch: number;
    breathT: number;
    dip: Spring;
    private _euler;
    private _q;
    private _v;
    private _yaw;
    private _pitch;
    private _seeded;
    constructor(worldCamera: THREE.PerspectiveCamera, opts: ViewModelOptions);
    add(obj: THREE.Object3D): void;
    setSize(w: number, h: number): void;
    /** Приземление: короткий провал рига вниз (импульс в пружину просадки). */
    land(impact: number): void;
    update(dt: number, body: ViewBody): void;
    render(renderer: THREE.WebGLRenderer): void;
}
