import * as THREE from 'three';
export declare const ss: (k: number) => number;
/** Кейфрейм: доля цикла, значение, кривая входа (необязательна - тогда 'io'). */
export type Keyframe = [number, number] | [number, number, string];
export interface Stroke {
    /** длительность цикла, с */
    dur: number;
    /** доля цикла, на которой происходит врезание */
    impact: number;
    /** импульс отдачи камеры в момент контакта */
    punch: {
        pitch: number;
        roll: number;
    };
    px: Keyframe[];
    py: Keyframe[];
    pz: Keyframe[];
    rx: Keyframe[];
    ry: Keyframe[];
    rz: Keyframe[];
}
export interface HeldToolOptions {
    /** Сборка модели: рабочая точка в начале координат, черенок вверх по +Y. */
    build(): THREE.Object3D;
    /** Покойный наклон в руках. */
    rest: THREE.Euler;
    /** Где на черенке лежит нижняя кисть - центр вращения. */
    pivotY: number;
    /** Рабочая точка в покое, камерное пространство. */
    tip: THREE.Vector3;
    /** Кейфреймы замахов по видам удара. */
    strokes: Record<string, Stroke>;
    /** Как модель стоит в мире, когда её оставили. */
    plantPose(world: THREE.Object3D, x: number, y: number, z: number, yaw: number): void;
}
export declare class HeldTool {
    strokes: Record<string, Stroke>;
    plantPose: HeldToolOptions['plantPose'];
    /** Инструмент в мире - оставлен там, где бросили. */
    world: THREE.Object3D;
    pos: THREE.Vector3;
    yaw: number;
    held: boolean;
    holder: THREE.Group;
    swing: THREE.Group;
    swingT: number;
    kind: string | null;
    dur: number;
    /** разброс амплитуды: цепочка замахов не должна быть метрономом */
    amp: number;
    /** разброс «диагонали» броска */
    cross: number;
    /**
     * Отдача камеры (viewpunch). Мир дёргается, viewmodel - нет: он привязан к
     * виду, своя отдача у него в кейфреймах. Мир накладывает punch на камеру
     * перед рендером и снимает сразу после - иначе viewmodel прочитал бы его как
     * угловую скорость взгляда (рывок sway).
     *
     * Живёт двумя пружинами, наружу отдаётся только угол: импульс удара кладётся
     * в СКОРОСТЬ, а не в угол - старт мягкий, спад упругий.
     */
    punch: {
        pitch: number;
        roll: number;
    };
    private stroke;
    private _n;
    private _impactFired;
    private _blendT;
    private _pose;
    private _from;
    private _pitchSpring;
    private _rollSpring;
    /** scene - мир (оставленный инструмент), view - слой viewmodel (в руках). */
    constructor(scene: THREE.Object3D, view: {
        add(o: THREE.Object3D): void;
    }, opts: HeldToolOptions);
    get busy(): boolean;
    /** Поставить инструмент в мире; позу мешей задаёт `plantPose` мира. */
    place(x: number, y: number, z: number, yaw: number): void;
    take(): void;
    plant(x: number, y: number, z: number, yaw: number): void;
    /**
     * Цепочка замахов: следующий принимается уже на исходе оседания (CANCEL) -
     * иначе зажатая кнопка ощущается залипшей. Стык поз сшивается блендом.
     */
    trySwing(kind: string): boolean;
    private _rest;
    private _kick;
    private _punchStep;
    /**
     * `onImpact(kind)` зовётся один раз в момент врезания и возвращает, был ли
     * контакт с материей: промах не должен отдавать в камеру.
     */
    update(dt: number, onImpact: (kind: string) => boolean): void;
}
