import * as THREE from 'three'
import { stepSpring, type Spring } from './spring.js'

/**
 * Взгляд от первого лица с ТЕЛОМ - замена PointerLockControls (API совместим:
 * lock()/unlock(), isLocked, события 'lock'/'unlock').
 *
 * Мышь двигает ЦЕЛЬ (tYaw/tPitch), камера догоняет её экспоненциальной
 * пружиной - взгляд «тяжёлый», с мягким доездом после остановки руки
 * (референс - RDR2 от первого лица, Kingdom Come; в соревновательных шутерах
 * такое сглаживание ненавидят, в созерцательной игре это и есть характер).
 * Поверх - аддитивные слои веса, все в долях градуса:
 *   * крен в вираж по угловой скорости взгляда (Dishonored/Thief);
 *   * крен на стрейфе - классика Quake cl_rollangle;
 *   * клевок тангажа при приземлении (пружина, ζ=1 - без отскока);
 *   * микронаклон при разгоне/торможении тела (Cyberpunk);
 *   * дыхание в покое - в том же ритме, что руки (viewmodel) и звук.
 *
 * Ротация камеры собирается заново КАЖДЫЙ кадр из yaw/pitch/roll (YXZ):
 * эффекты не копятся в кватернионе и не утекают в прицел - проблема, из-за
 * которой отдачу лопаты снимали сразу после рендера, здесь исключена.
 *
 * ?rawlook - сырой 1:1 взгляд без сглаживания и эффектов (если укачивает).
 */

// Тангаж зажимаем НЕ ДОХОДЯ до зенита. Ровно в ±90° разложение YXZ вырождается:
// поворот вокруг вертикали и крен становятся одной осью, и при малейшем крене
// взгляд рвёт по рысканью. Хуже того, ровно там горизонтальная составляющая
// направления обнуляется, и тело уходило в запасной вектор - движение прыгало
// на фиксированный курс независимо от того, куда игрок смотрел.
const PI_2 = Math.PI / 2 - 0.02
const clamp = THREE.MathUtils.clamp

/** Что взгляду нужно знать о теле. Ровно это отдаёт `Body`. */
export interface LookBody {
  vel: THREE.Vector3
  /** Амплитуда качки: по ней взгляд понимает, идём мы или стоим. */
  bobAmt: number
  /** Запыхавшесть 0..1: от неё частота и глубина дыхания. */
  exertion: number
}

export interface LookConfig {
  raw: boolean
  sens: number
  smooth: number
  turnRoll: number
  turnRollMax: number
  strafeRoll: number
  strafeAt: number
  rollRate: number
  accelPitch: number
  accelPitchMax: number
  breath: number
}

export interface LookEvents {
  lock: object
  unlock: object
}

export class SmoothLook extends THREE.EventDispatcher<LookEvents> {
  camera: THREE.PerspectiveCamera
  domElement: HTMLElement
  isLocked = false
  cfg: LookConfig
  yaw: number
  pitch: number
  tYaw: number
  tPitch: number

  private _roll = 0
  private _kick: Spring = { x: 0, v: 0 } // клевок приземления, рад (см. spring.ts)
  private _accSm = 0 // сглаженное продольное ускорение тела
  private _prevFwd = 0
  private _breathT = 0
  private _euler = new THREE.Euler(0, 0, 0, 'YXZ')

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    cfg: Partial<LookConfig> = {},
  ) {
    super()
    this.camera = camera
    this.domElement = domElement

    // все ручки крутятся на живую: __snow.look.cfg.smooth = 24 и т.п.
    this.cfg = {
      raw: new URLSearchParams(location.search).has('rawlook'),
      sens: 0.002, // рад/пиксель - как у PointerLockControls
      smooth: 14, // 1/с - жёсткость догона взгляда (полудогон ~50 мс)
      turnRoll: 0.005, // рад крена на 1 рад/с поворота взгляда
      turnRollMax: 0.021, // потолок крена в вираж, ~1.2°
      strafeRoll: 0.023, // крен на полном боковом шаге, ~1.3°
      strafeAt: 1.5, // м/с боковой скорости, на которой крен стрейфа полный
      rollRate: 8, // 1/с - пружина входа/выхода крена
      accelPitch: 0.0011, // рад наклона на 1 м/с² продольного разгона
      accelPitchMax: 0.008, // потолок наклона, ~0.45°
      breath: 1, // множитель дыхания камеры (0 - выключить)
      ...cfg,
    }

    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    this.yaw = this.tYaw = e.y
    this.pitch = this.tPitch = e.x

    const doc = domElement.ownerDocument
    doc.addEventListener('mousemove', (ev) => {
      if (!this.isLocked) return
      const s = this.cfg.sens
      this.tYaw -= (ev.movementX || 0) * s
      this.tPitch = clamp(this.tPitch - (ev.movementY || 0) * s, -PI_2, PI_2)
    })
    doc.addEventListener('pointerlockchange', () => {
      const locked = doc.pointerLockElement === domElement
      if (locked === this.isLocked) return
      this.isLocked = locked
      this.dispatchEvent({ type: locked ? 'lock' : 'unlock' })
    })
  }

  lock(): void {
    // Браузер держит защитную задержку около секунды после выхода по Esc и
    // отказывает в повторном захвате. Отказ не роняем: экран паузы остаётся
    // открытым, второе нажатие кнопки сработает.
    const p = this.domElement.requestPointerLock() as unknown as Promise<void> | undefined
    if (p && p.catch) p.catch(() => {})
  }

  unlock(): void {
    this.domElement.ownerDocument.exitPointerLock()
  }

  /**
   * Повернуть взгляд ЦЕЛЬЮ, а не камерой.
   *
   * Через это входит всё, что не мышь: палец на правой половине экрана, стрелки
   * в debug, дальше сюда же встанет геймпад. Сглаживание и крены при этом общие
   * с мышью - разного взгляда для разных устройств быть не должно.
   */
  rotateBy(dYaw: number, dPitch = 0): void {
    this.tYaw += dYaw
    this.tPitch = clamp(this.tPitch + dPitch, -PI_2, PI_2)
  }

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
  setYaw(yaw: number, pitch = 0): void {
    this.yaw = this.tYaw = yaw
    this.pitch = this.tPitch = pitch
    this._euler.set(pitch, yaw, 0, 'YXZ')
    this.camera.quaternion.setFromEuler(this._euler)
  }

  /** Приземление: клевок взгляда вниз, сила - по скорости касания. */
  land(impact: number): void {
    if (this.cfg.raw) return
    this._kick.v -= clamp(Math.abs(impact) * 0.12, 0.15, 0.9)
  }

  /** Звать РАНЬШЕ физики тела: движение должно идти по свежему взгляду. */
  update(dt: number, body: LookBody): void {
    const c = this.cfg
    const prevYaw = this.yaw

    if (c.raw) {
      this.yaw = this.tYaw
      this.pitch = this.tPitch
      this._euler.set(this.pitch, this.yaw, 0, 'YXZ')
      this.camera.quaternion.setFromEuler(this._euler)
      return
    }

    // догон цели: экспоненциальная пружина - доезд без перерегулирования
    const k = 1 - Math.exp(-c.smooth * dt)
    this.yaw += (this.tYaw - this.yaw) * k
    this.pitch += (this.tPitch - this.pitch) * k

    // скорость тела в осях взгляда (горизонталь): right=(cosY,0,-sinY), fwd=(-sinY,0,-cosY)
    const sinY = Math.sin(this.yaw)
    const cosY = Math.cos(this.yaw)
    const lat = body.vel.x * cosY - body.vel.z * sinY // вправо +
    const fwd = -body.vel.x * sinY - body.vel.z * cosY // вперёд +

    // крен: в вираж (по угловой скорости уже сглаженного взгляда) + в сторону стрейфа
    const vYaw = dt > 1e-4 ? (this.yaw - prevYaw) / dt : 0
    const rollT =
      clamp(vYaw * c.turnRoll, -c.turnRollMax, c.turnRollMax) -
      c.strafeRoll * clamp(lat / c.strafeAt, -1, 1)
    this._roll += (rollT - this._roll) * (1 - Math.exp(-c.rollRate * dt))

    // клевок приземления: критически задемпфированная пружина (см. spring.ts)
    stepSpring(this._kick, 14, dt)

    // микронаклон при разгоне/торможении
    const acc = dt > 1e-4 ? (fwd - this._prevFwd) / dt : 0
    this._prevFwd = fwd
    this._accSm += (acc - this._accSm) * (1 - Math.exp(-10 * dt))
    const accP = clamp(-this._accSm * c.accelPitch, -c.accelPitchMax, c.accelPitchMax)

    // дыхание в покое: ритм общий с руками и звуком (0.22 + 0.35·exertion Гц);
    // на ходу тонет в качке шага
    const idle = 1 - clamp(body.bobAmt / 0.05, 0, 1)
    this._breathT += dt * Math.PI * 2 * (0.22 + 0.35 * body.exertion)
    const breath = Math.sin(this._breathT) * (0.0012 + 0.0035 * body.exertion) * idle * c.breath

    this._euler.set(this.pitch + this._kick.x + accP + breath, this.yaw, this._roll, 'YXZ')
    this.camera.quaternion.setFromEuler(this._euler)
  }
}
