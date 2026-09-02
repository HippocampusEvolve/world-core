import * as THREE from 'three';
import type { Input } from './input.js';
/** Что мир обязан рассказать телу о своей форме. Больше ему знать не о чем. */
export interface Support {
    /**
     * Пол под точкой: высота и имя поверхности - или null, если пола в окне нет.
     *
     * Ищется в окне высот [yFrom - probe, yFrom]; `yFrom` уже поднят на шаг
     * вверх, то есть это же число - потолок досягаемости шагом. Имя поверхности
     * мир выбирает сам ('snow', 'wood', 'deck'): тело им не пользуется, а только
     * передаёт в шаги и приземление.
     */
    floorAt(x: number, z: number, yFrom: number, probe: number): {
        y: number;
        surface: string;
    } | null;
    /**
     * Вытолкнуть тело из твёрдого. Правит `pos` НА МЕСТЕ; `vel` можно погасить,
     * но необязательно - тело само отнимет ту часть скорости, что смотрит в
     * поверхность, по суммарному смещению за кадр.
     *
     * Тело здесь - вертикальная капсула: круг радиуса `radius` на отрезке высот
     * [pos.y, pos.y + height].
     */
    resolve(pos: THREE.Vector3, radius: number, height: number, vel: THREE.Vector3, dt: number): void;
    /**
     * Защита вида у стены: знаковое расстояние от глаза до ближайшей поверхности
     * (в воздухе положительное, внутри твёрдого отрицательное) и единичная
     * нормаль НАРУЖУ. null - мир этого не умеет или в этом месте считать нечего.
     *
     * Метод необязательный: без него тело камеру не двигает и near не трогает.
     */
    clearance?(eye: THREE.Vector3): {
        dist: number;
        normal: THREE.Vector3;
    } | null;
}
export interface BodyOptions {
    camera: THREE.PerspectiveCamera;
    input: Input;
    support: Support;
    /** Мировая позиция СТУПНЕЙ на старте. */
    spawn: THREE.Vector3;
    /** Шаг: точка подошвы, направление, сторона (±1), бег, поверхность. */
    onStep?: (x: number, z: number, dir: THREE.Vector3, side: number, running: boolean, surface: string) => void;
    /** Приземление: `impact` - вертикальная скорость касания (< 0). */
    onLand?: (x: number, z: number, surface: string, impact: number) => void;
    /** высота глаза над ступнёй, м */
    eye?: number;
    /** высота капсулы тела - вертикальный диапазон коллайдеров, м */
    height?: number;
    /** радиус капсулы тела, м */
    radius?: number;
    /** темп ходьбы, м/с */
    walk?: number;
    /** темп бега, м/с */
    run?: number;
    /** квадрат мира, ±м; null - без границ */
    bounds?: number | null;
    /** гравитация, м/с² */
    gravity?: number;
    /** начальная скорость прыжка, м/с */
    jump?: number;
    /** высота шага вверх (ступеньки, склон), м */
    stepUp?: number;
    /** прилипание к полу при спуске, м - иначе прыжки на бугорках */
    stepDown?: number;
    /** как глубоко ищем пол под ногами (дно ямы), м */
    fallProbe?: number;
    /** грация после схода с опоры: прыжок ещё возможен, с */
    coyote?: number;
    /** 1/с - разгон и торможение (снег вязкий, инерция мягкая) */
    accel?: number;
    /** 1/с - скорость догона вида за ступенькой: halflife ≈ 50 мс */
    viewSmooth?: number;
    /** м/с, ниже которых считаем, что стоим */
    moveAt?: number;
    /** амплитуда качки головы шагом и бегом, м */
    bobWalk?: number;
    bobRun?: number;
    /** темп качки на 1 м/с и скорость выхода амплитуды */
    bobRate?: number;
    bobEase?: number;
    /** длина шага, м */
    strideWalk?: number;
    strideRun?: number;
    /** куда ставится след: вперёд по движению и вбок от оси, м */
    stepAhead?: number;
    stepSide?: number;
    /** мягче этой скорости касания приземление не звучит, м/с */
    landAt?: number;
    /** обзор в покое и на бегу, градусы, и скорость перехода */
    fov?: number;
    fovRun?: number;
    fovRate?: number;
    /**
     * Выносливость. Числа Snowfall: полный запас сгорает за 11 с бега,
     * восстанавливается за 9 с стоя и за 20 с на ходу. Чтобы её выключить
     * совсем, довольно `drain: 0`.
     */
    stamina?: Partial<StaminaOptions>;
    /**
     * Защита вида у стены (анти-просвет). near-плоскость камеры - не точка, а
     * прямоугольник перед глазом: её угол, качка головы и верхняя кромка стены
     * выступают за грунт, и «чуть-чуть видно за стеной». Камера трактуется как
     * сфера радиуса «дальний угол near-плоскости» и выталкивается наружу, а у
     * стены near сужается - сфера меньше, к забою подходим вплотную.
     */
    near?: number;
    nearHug?: number;
    nearEngage?: number;
    nearRate?: number;
    clearEps?: number;
    /** потолок сдвига защитной сферы за кадр, м */
    clearStep?: number;
}
export interface StaminaOptions {
    /** доля запаса в секунду на бегу */
    drain: number;
    /** восстановление стоя и на ходу, доля в секунду */
    gainIdle: number;
    gainWalk: number;
    /** ниже этого запаса бег заблокирован до восстановления */
    recover: number;
    /** запас, ниже которого бег не начать */
    runAt: number;
    /** цена прыжка, доля запаса */
    jumpCost: number;
}
export declare class Body {
    camera: THREE.PerspectiveCamera;
    input: Input;
    support: Support;
    onStep?: BodyOptions['onStep'];
    onLand?: BodyOptions['onLand'];
    /** Мировая позиция СТУПНЕЙ. */
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    vy: number;
    grounded: boolean;
    /** На чём стоим. Липкое: в воздухе не мигает. */
    surface: string;
    /** сколько секунд без опоры (coyote-прыжок, устойчивость состояний) */
    airT: number;
    /** затухающий сдвиг вида для сглаживания ступенек */
    viewOffsetY: number;
    /**
     * Высота, на которой тело держится, пока настоящей опоры под ним ещё нет.
     * null - держать не надо.
     */
    holdY: number | null;
    bobT: number;
    bobAmt: number;
    stride: number;
    side: number;
    stamina: number;
    exhausted: boolean;
    exertion: number;
    running: boolean;
    moving: boolean;
    /** Груз в руках: медленнее, бег недоступен, прыжок тяжелее. */
    carrying: boolean;
    /** Множители под груз - мир решает, чем именно заняты руки. */
    carrySpeed: number;
    carryJump: number;
    carryJumpCost: number;
    readonly eye: number;
    readonly height: number;
    readonly radius: number;
    readonly walk: number;
    readonly runSpeed: number;
    readonly bounds: number | null;
    readonly gravity: number;
    readonly jumpSpeed: number;
    readonly stepUp: number;
    readonly stepDown: number;
    readonly fallProbe: number;
    readonly coyote: number;
    readonly accel: number;
    readonly viewSmooth: number;
    readonly moveAt: number;
    readonly bobWalk: number;
    readonly bobRun: number;
    readonly bobRate: number;
    readonly bobEase: number;
    readonly strideWalk: number;
    readonly strideRun: number;
    readonly stepAhead: number;
    readonly stepSide: number;
    readonly landAt: number;
    readonly fov: number;
    readonly fovRun: number;
    readonly fovRate: number;
    readonly st: StaminaOptions;
    readonly nearFar: number;
    readonly nearHug: number;
    readonly nearEngage: number;
    readonly nearRate: number;
    readonly clearEps: number;
    readonly clearStep: number;
    private _fwd;
    private _right;
    private _wish;
    private _dir;
    private _eye;
    private _jumpHeld;
    constructor(o: BodyOptions);
    /** В мире ли мы: курсор захвачен, играем пальцем или взят режим без захвата. */
    get locked(): boolean;
    /** Остановить тело насовсем: игрок замёрз, упал, вышел. */
    halt(): void;
    /**
     * Поставить камеру туда, где стоит тело, не трогая физику.
     *
     * Нужен там, где мир переносит тело сам (сейв вернул игрока на прежнее
     * место), а `update` в этот момент не зовётся: без этой строки вернувшийся
     * весь вход смотрел бы из точки старта, а на последнем кадре появления его
     * переносило бы к сейву - это и ощущается телепортом.
     */
    syncCamera(): void;
    /**
     * Анти-просвет за стену. Тело держит лишь ГОРИЗОНТАЛЬНЫЙ зазор, а near-угол,
     * качка и верхние кромки выступают за грунт. Камеру трактуем как сферу
     * радиуса R (дальний угол near-плоскости) и держим в воздухе; у стены
     * дополнительно сужаем near, чтобы сфера была меньше и к забою можно было
     * подойти вплотную. Работает поверх физики - на движение не влияет.
     */
    private _shieldView;
    update(dt: number): void;
}
