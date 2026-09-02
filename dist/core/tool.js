import * as THREE from 'three';
import { VIEW_Z } from './viewmodel.js';
import { stepSpring } from './spring.js';
/**
 * Общий риг ручного инструмента (лопата, топор; дальше - фонарь, пила).
 * Инструмент живёт в мире (воткнут, лежит), берётся в руки и оставляется. В
 * руках замахи идут кейфреймами; правка мира, звук и брызги происходят в
 * момент ВРЕЗАНИЯ, не по клику.
 *
 * Сам инструмент ядру не принадлежит: что он делает при контакте и какие у
 * него позы, описывает мир. Ядро даёт риг.
 *
 * Анимация собрана по канону FPS-viewmodel, и три вещи в ней неслучайны:
 *   * ВРАЩЕНИЕ ИДЁТ ВОКРУГ КИСТЕЙ. Модель построена от рабочей точки (остриё,
 *     лезвие), поэтому наивный поворот группы гоняет по дуге рукоять, а
 *     рабочая точка стоит на месте - читается как «инструмент двигают», а не
 *     «человек машет». Пивот вынесен на черенок (pivotY), и лезвие описывает
 *     настоящую дугу рычага.
 *   * КРИВЫЕ РАЗНЫЕ ПО ФАЗАМ. Замах - 'io' (зависает в верхней точке), бросок -
 *     'in' (скорость МАКСИМАЛЬНА ровно в кадре контакта). Симметричный
 *     smoothstep на броске гасит скорость там, где нужен удар, и он «ватный».
 *   * КОНТАКТ - СОБЫТИЕ. За ним подряд: hitstop (поза заморожена), отдача
 *     камеры (см. punch) и жест выхода.
 */
const CANCEL = 0.82; // с какой доли цикла принимается следующий замах
const BLEND = 0.06; // с - сшивка поз на стыке цепочки
const PUNCH_W = 18; // 1/с - жёсткость пружины отдачи камеры (ζ=1, оседает ~180 мс)
const POSE = ['px', 'py', 'pz', 'rx', 'ry', 'rz'];
export const ss = (k) => {
    const t = THREE.MathUtils.clamp(k, 0, 1);
    return t * t * (3 - 2 * t);
};
/**
 * Кривая ВХОДА в кейфрейм:
 *   io   - приходим с нулевой скоростью (замах зависает в верхней точке)
 *   in   - разгон: скорость максимальна ровно в кадре контакта
 *   out  - торможение: передемпфированный возврат, без отскока
 *   hold - заморозка (hitstop): скорость обнуляется ударом
 */
const EASE = {
    io: ss,
    in: (k) => k * k * k,
    out: (k) => 1 - (1 - k) ** 3,
    hold: () => 0,
};
// кейфрейм: [u, значение, кривая входа]; u - доля цикла
function track(kf, u) {
    for (let i = 1; i < kf.length; i++) {
        const [t1, v1, e] = kf[i];
        if (u > t1)
            continue;
        const [t0, v0] = kf[i - 1];
        // кривая входа необязательна: без неё кейфрейм едет плавным `io`
        return v0 + (v1 - v0) * ((e ? EASE[e] : undefined) || EASE.io)((u - t0) / (t1 - t0));
    }
    return kf[kf.length - 1][1];
}
export class HeldTool {
    strokes;
    plantPose;
    /** Инструмент в мире - оставлен там, где бросили. */
    world;
    pos = new THREE.Vector3();
    yaw = 0;
    held = false;
    holder;
    swing;
    swingT = -1; // <0 - покой
    kind = null;
    dur = 1;
    /** разброс амплитуды: цепочка замахов не должна быть метрономом */
    amp = 1;
    /** разброс «диагонали» броска */
    cross = 1;
    /**
     * Отдача камеры (viewpunch). Мир дёргается, viewmodel - нет: он привязан к
     * виду, своя отдача у него в кейфреймах. Мир накладывает punch на камеру
     * перед рендером и снимает сразу после - иначе viewmodel прочитал бы его как
     * угловую скорость взгляда (рывок sway).
     *
     * Живёт двумя пружинами, наружу отдаётся только угол: импульс удара кладётся
     * в СКОРОСТЬ, а не в угол - старт мягкий, спад упругий.
     */
    punch = { pitch: 0, roll: 0 };
    stroke = null;
    _n = 0;
    _impactFired = true;
    _blendT = BLEND;
    _pose = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
    _from = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
    _pitchSpring = { x: 0, v: 0 };
    _rollSpring = { x: 0, v: 0 };
    /** scene - мир (оставленный инструмент), view - слой viewmodel (в руках). */
    constructor(scene, view, opts) {
        this.strokes = opts.strokes;
        this.plantPose = opts.plantPose;
        this.world = opts.build();
        this.world.visible = false;
        scene.add(this.world);
        // Инструмент в руках. holder - кисти, swing - поза замаха вокруг них,
        // carried - модель, сдвинутая так, чтобы точка (0, pivotY, 0) черенка
        // легла ровно в центр вращения.
        this.holder = new THREE.Group();
        this.holder.visible = false;
        this.swing = new THREE.Group();
        this.holder.add(this.swing);
        const carried = opts.build();
        carried.rotation.copy(opts.rest);
        const grip = new THREE.Vector3(0, opts.pivotY, 0).applyEuler(opts.rest);
        carried.position.copy(grip).negate();
        this.swing.add(carried);
        this.holder.position.copy(opts.tip).add(grip); // рабочая точка садится ровно в tip
        view.add(this.holder);
    }
    get busy() {
        return this.swingT >= 0;
    }
    /** Поставить инструмент в мире; позу мешей задаёт `plantPose` мира. */
    place(x, y, z, yaw) {
        this.pos.set(x, y, z);
        this.yaw = yaw;
        this.plantPose(this.world, x, y, z, yaw);
        this.world.visible = !this.held;
    }
    take() {
        this.held = true;
        this.world.visible = false;
        this.holder.visible = true;
    }
    plant(x, y, z, yaw) {
        this.held = false;
        this.holder.visible = false;
        this._rest();
        this.place(x, y, z, yaw);
    }
    /**
     * Цепочка замахов: следующий принимается уже на исходе оседания (CANCEL) -
     * иначе зажатая кнопка ощущается залипшей. Стык поз сшивается блендом.
     */
    trySwing(kind) {
        if (!this.held)
            return false;
        if (this.swingT >= 0 && this.swingT / this.dur < CANCEL)
            return false;
        for (const c of POSE)
            this._from[c] = this._pose[c];
        this._blendT = 0;
        this.kind = kind;
        this.stroke = this.strokes[kind];
        this.amp = 0.92 + Math.random() * 0.16;
        this.dur = this.stroke.dur / (0.94 + Math.random() * 0.12);
        this.cross = this._n++ % 2 ? 1 : 0.55; // диагональ броска гуляет от замаха к замаху
        this.swingT = 0;
        this._impactFired = false;
        return true;
    }
    _rest() {
        this.swingT = -1;
        this._blendT = BLEND;
        for (const c of POSE)
            this._pose[c] = 0;
        this.swing.position.set(0, 0, 0);
        this.swing.rotation.set(0, 0, 0);
    }
    // отдача камеры: импульс в скорость (не в угол) - старт мягкий, спад упругий
    _kick(p) {
        this._pitchSpring.v += p.pitch;
        this._rollSpring.v += p.roll * this.cross;
    }
    _punchStep(dt) {
        stepSpring(this._pitchSpring, PUNCH_W, dt);
        stepSpring(this._rollSpring, PUNCH_W, dt);
        this.punch.pitch = this._pitchSpring.x;
        this.punch.roll = this._rollSpring.x;
    }
    /**
     * `onImpact(kind)` зовётся один раз в момент врезания и возвращает, был ли
     * контакт с материей: промах не должен отдавать в камеру.
     */
    update(dt, onImpact) {
        this._punchStep(dt);
        if (this.swingT < 0)
            return;
        this.swingT += dt;
        const u = this.swingT / this.dur;
        const s = this.stroke;
        if (!this._impactFired && u >= s.impact) {
            this._impactFired = true;
            if (onImpact(this.kind))
                this._kick(s.punch);
        }
        const p = this._pose;
        const a = this.amp;
        p.px = track(s.px, u) * a * this.cross;
        p.py = track(s.py, u) * a;
        p.pz = track(s.pz, u) * a * VIEW_Z;
        p.rx = track(s.rx, u) * a;
        p.ry = track(s.ry, u) * a * this.cross;
        p.rz = track(s.rz, u) * a * this.cross;
        // сшивка со старой позой, если замах начат поверх недооседавшего
        if (this._blendT < BLEND) {
            this._blendT += dt;
            const k = ss(this._blendT / BLEND);
            for (const c of POSE)
                p[c] = this._from[c] + (p[c] - this._from[c]) * k;
        }
        this.swing.position.set(p.px, p.py, p.pz);
        this.swing.rotation.set(p.rx, p.ry, p.rz);
        if (u >= 1)
            this._rest();
    }
}
//# sourceMappingURL=tool.js.map