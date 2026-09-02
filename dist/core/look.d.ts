import * as THREE from 'three';
/** Что взгляду нужно знать о теле. Ровно это отдаёт `Body`. */
export interface LookBody {
    vel: THREE.Vector3;
    /** Амплитуда качки: по ней взгляд понимает, идём мы или стоим. */
    bobAmt: number;
    /** Запыхавшесть 0..1: от неё частота и глубина дыхания. */
    exertion: number;
}
export interface LookConfig {
    raw: boolean;
    sens: number;
    smooth: number;
    turnRoll: number;
    turnRollMax: number;
    strafeRoll: number;
    strafeAt: number;
    rollRate: number;
    accelPitch: number;
    accelPitchMax: number;
    breath: number;
}
export interface LookEvents {
    lock: object;
    unlock: object;
}
export declare class SmoothLook extends THREE.EventDispatcher<LookEvents> {
    camera: THREE.PerspectiveCamera;
    domElement: HTMLElement;
    isLocked: boolean;
    cfg: LookConfig;
    yaw: number;
    pitch: number;
    tYaw: number;
    tPitch: number;
    private _roll;
    private _kick;
    private _accSm;
    private _prevFwd;
    private _breathT;
    private _euler;
    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, cfg?: Partial<LookConfig>);
    lock(): void;
    unlock(): void;
    /**
     * Повернуть взгляд ЦЕЛЬЮ, а не камерой.
     *
     * Через это входит всё, что не мышь: палец на правой половине экрана, стрелки
     * в debug, дальше сюда же встанет геймпад. Сглаживание и крены при этом общие
     * с мышью - разного взгляда для разных устройств быть не должно.
     */
    rotateBy(dYaw: number, dPitch?: number): void;
    /**
     * Поставить взгляд без доезда.
     *
     * Нужен там, где камеру ведёт не игрок: спавн, телепорт и появление мира.
     * Присвоить `yaw`/`pitch` снаружи недостаточно - кватернион камеры
     * пересобирается в `update`, а во время появления он не зовётся вовсе, и
     * взгляд остался бы стоять.
     *
     * Ставится и текущее, и целевое: иначе сглаживание потянет камеру само и
     * подерётся за неё с тем, кто её ведёт.
     */
    setYaw(yaw: number, pitch?: number): void;
    /** Приземление: клевок взгляда вниз, сила - по скорости касания. */
    land(impact: number): void;
    /** Звать РАНЬШЕ физики тела: движение должно идти по свежему взгляду. */
    update(dt: number, body: LookBody): void;
}
