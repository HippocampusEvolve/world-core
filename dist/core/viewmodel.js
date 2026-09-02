import * as THREE from 'three';
import { stepSpring } from './spring.js';
/**
 * Слой viewmodel: то, что игрок держит в руках, живёт в СВОЕЙ сцене со своей
 * камерой. Так устроен любой FPS, и ровно по двум причинам:
 *   1) свой FOV (55° против мировых 75) - предмет у края кадра не растянут и не
 *      «дышит» вместе с раскачкой обзора на бегу;
 *   2) свой depth-буфер (clearDepth перед проходом) - инструмент не протыкает
 *      стену и забой, к которому подошли вплотную.
 * Плата: предмет в руках не отбрасывает тень в мир и не попадает в bloom.
 *
 * Поверх позы предмета риг накладывает четыре аддитивных слоя - именно они
 * отличают «предмет прибит к лицу» от «предмет в руках»: отставание от взгляда
 * (sway), собственная качка при ходьбе, дыхание в покое и просадка при
 * приземлении. Риг общий: любой новый предмет получает их даром.
 *
 * Свет и окружение приходят снаружи: ядро не знает, что за небо у мира.
 */
const VIEW_FOV = 55;
const WORLD_FOV = 75; // базовый, без раскачки на бегу - от него считаем компенсацию
/**
 * Узкий FOV приближает предмет. Чтобы кадр остался прежним, камерное Z множим
 * на это число: экранное положение и размер сохраняются в точности, а
 * собственная перспектива предмета смягчается - ради этого всё и затевалось.
 */
export const viewZ = (worldFov, fov) => Math.tan(THREE.MathUtils.degToRad(worldFov / 2)) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
/** То же число для мира с обзором 75° - им живут кейфреймы замахов. */
export const VIEW_Z = viewZ(WORLD_FOV, VIEW_FOV);
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
// sway: сколько радиан отставания даёт единица угловой скорости взгляда, и потолок
const SWAY_YAW = 0.02;
const SWAY_PITCH = 0.018;
const SWAY_MAX = 0.1;
const SWAY_SPRING = 9; // 1/с - с какой охотой риг догоняет взгляд
export class ViewModel {
    worldCamera;
    keyDir;
    scene;
    camera;
    rig;
    key;
    /** Компенсация узкого FOV для этой пары обзоров. */
    viewZ;
    swayYaw = 0;
    swayPitch = 0;
    breathT = 0;
    dip = { x: 0, v: 0 }; // просадка при приземлении (см. spring.ts)
    _euler = new THREE.Euler(0, 0, 0, 'YXZ');
    _q = new THREE.Quaternion();
    _v = new THREE.Vector3();
    _yaw = 0;
    _pitch = 0;
    _seeded = false;
    constructor(worldCamera, opts) {
        this.worldCamera = worldCamera;
        this.keyDir = opts.keyDir;
        const fov = opts.fov ?? VIEW_FOV;
        this.viewZ = viewZ(opts.worldFov ?? WORLD_FOV, fov);
        this.scene = new THREE.Scene(); // без тумана: руки в метре от глаза
        this.scene.environment = opts.environment ?? null;
        this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, opts.near ?? 0.01, opts.far ?? 12);
        this.rig = new THREE.Group();
        this.scene.add(this.rig);
        const k = opts.key ?? { color: 0xbfd2ff, intensity: 1.5 };
        this.key = new THREE.DirectionalLight(k.color, k.intensity);
        this.key.castShadow = false;
        this.scene.add(this.key, this.key.target);
        const f = opts.fill ?? { sky: 0x223560, ground: 0x33517e, intensity: 0.9 };
        this.scene.add(new THREE.HemisphereLight(f.sky, f.ground, f.intensity));
    }
    add(obj) {
        this.rig.add(obj);
        obj.traverse((o) => {
            o.castShadow = false; // своя сцена - теней всё равно нет, не гоняем впустую
            o.receiveShadow = false;
        });
    }
    setSize(w, h) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }
    /** Приземление: короткий провал рига вниз (импульс в пружину просадки). */
    land(impact) {
        this.dip.v -= clamp(Math.abs(impact) * 0.05, 0.05, 0.4);
    }
    update(dt, body) {
        // --- sway: риг отстаёт от поворота взгляда и пружиной догоняет ---
        this._euler.setFromQuaternion(this.worldCamera.quaternion, 'YXZ');
        if (!this._seeded) {
            this._yaw = this._euler.y;
            this._pitch = this._euler.x;
            this._seeded = true;
        }
        let dy = this._euler.y - this._yaw;
        if (dy > Math.PI)
            dy -= TAU;
        else if (dy < -Math.PI)
            dy += TAU;
        const dp = this._euler.x - this._pitch;
        this._yaw = this._euler.y;
        this._pitch = this._euler.x;
        // цель - угловая скорость взгляда со знаком минус: предмет остаётся позади
        const inv = dt > 1e-4 ? 1 / dt : 0;
        const tYaw = clamp(-dy * inv * SWAY_YAW, -SWAY_MAX, SWAY_MAX);
        const tPitch = clamp(-dp * inv * SWAY_PITCH, -SWAY_MAX, SWAY_MAX);
        const k = 1 - Math.exp(-SWAY_SPRING * dt);
        this.swayYaw += (tYaw - this.swayYaw) * k;
        this.swayPitch += (tPitch - this.swayPitch) * k;
        // --- качка: своя, при ходьбе. Риг вне камеры, головную качку он не
        // наследует, поэтому рисуем сами - с фазовым отставанием от шага
        const amt = body.bobAmt;
        const bt = body.bobT - 0.35;
        const bobX = Math.cos(bt) * amt * 0.85;
        const bobY = Math.sin(bt * 2) * amt * 0.6;
        const bobZ = Math.cos(bt * 2) * amt * 0.25;
        const bobRoll = Math.cos(bt) * amt * 0.3;
        // --- дыхание в покое: тем заметнее, чем сильнее запыхался; на ходу тонет в качке
        const idle = 1 - clamp(amt / 0.05, 0, 1);
        this.breathT += dt * TAU * (0.22 + 0.35 * body.exertion);
        const bAmp = (0.004 + 0.012 * body.exertion) * idle;
        const breathY = Math.sin(this.breathT) * bAmp;
        const breathZ = Math.sin(this.breathT * 0.5) * bAmp * 0.5;
        // --- просадка при приземлении: критически задемпфированная пружина
        stepSpring(this.dip, 16, dt);
        this.rig.position.set(bobX - this.swayYaw * 0.18, bobY + breathY + this.dip.x + this.swayPitch * 0.18, (bobZ + breathZ) * this.viewZ);
        this.rig.rotation.set(this.swayPitch + breathY * 1.2, this.swayYaw, bobRoll - this.swayYaw * 0.35);
    }
    render(renderer) {
        // ключевой вектор из мира - в камерное пространство рига
        this._q.copy(this.worldCamera.quaternion).invert();
        this._v.copy(this.keyDir).applyQuaternion(this._q).multiplyScalar(5);
        this.key.position.copy(this._v);
        const auto = renderer.autoClear;
        renderer.autoClear = false;
        renderer.clearDepth(); // свой depth: инструмент не протыкает стены и забой
        renderer.render(this.scene, this.camera);
        renderer.autoClear = auto;
    }
}
//# sourceMappingURL=viewmodel.js.map