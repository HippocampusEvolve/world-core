import * as THREE from 'three'
import type { SmoothLook } from './look.js'

/**
 * Слой ввода: клавиатура, мышь и палец сводятся в ОДНО намерение.
 *
 * Тело (`body.ts`) читает только `Intent` и про документ не знает ничего. Это
 * не вежливость к архитектуре, а условие проверки счётом: чтобы прогнать
 * ходьбу и прыжок на Node, намерение должно ставиться присваиванием, а не
 * синтетическим событием клавиатуры.
 *
 * Оси аналоговые. Клавиша даёт ровно ±1, палец - сколько увёл, и они
 * СКЛАДЫВАЮТСЯ, а не выбираются: на планшете с клавиатурой оба способа
 * работают разом и не спорят.
 *
 * Кнопки действия и инструмента живут здесь же, но мир получает их дважды:
 * состоянием в `Intent` (кто держит) и колбэком на нажатии (что делать).
 * Разделение нужно, потому что «взять предмет» - это событие, а «копать» -
 * удержание, и оба приходят с трёх устройств сразу.
 */

const clamp = THREE.MathUtils.clamp

/** Намерение игрока: всё, что тело должно знать о том, чего от него хотят. */
export interface Intent {
  /** x - вправо, y - вперёд; каждая от -1 до 1, длина вектора не нормируется. */
  move: { x: number; y: number }
  run: boolean
  jump: boolean
  /** Контекстное действие по месту (клавиша F, тач-кнопка «рука»). */
  action: boolean
  /** Кнопки инструмента: [основная, вторая] - ЛКМ и ПКМ. */
  tool: [boolean, boolean]
}

/** Оси и кнопки, приходящие с пальца. Сюда пишет `TouchControls`. */
export interface TouchAxes {
  x: number
  y: number
  run: boolean
  jump: boolean
  action: boolean
  tool: [boolean, boolean]
  /** Играем пальцем: pointer lock на таче не берётся, «мы в мире» решает это. */
  active: boolean
}

export interface InputOptions {
  look: SmoothLook
  /** Элемент, на котором ловятся кнопки инструмента (канвас мира). */
  target: HTMLElement
  /** Нажата кнопка действия. Зовётся на каждое нажатие, автоповтор включая. */
  onAction?: () => void
  /** Кнопка инструмента нажата или отпущена: слот 1 - ЛКМ, слот 2 - ПКМ. */
  onTool?: (slot: 1 | 2, down: boolean) => void
  /** Стрелки поворачивают взгляд. Нужно там, где pointer lock не берётся. */
  arrowTurn?: boolean
  /** рад/с поворота стрелками */
  arrowRate?: number
}

export class Input {
  look: SmoothLook
  intent: Intent = {
    move: { x: 0, y: 0 },
    run: false,
    jump: false,
    action: false,
    tool: [false, false],
  }
  touch: TouchAxes = {
    x: 0,
    y: 0,
    run: false,
    jump: false,
    action: false,
    tool: [false, false],
    active: false,
  }
  /**
   * «Мы в мире» без захвата курсора. Так живёт debug-режим: pointer lock там не
   * берётся вовсе, а тело двигаться обязано.
   */
  free = false
  arrowTurn: boolean
  arrowRate: number

  private keys = new Set<string>()
  private mouse: [boolean, boolean] = [false, false]
  private onAction?: () => void
  private onTool?: (slot: 1 | 2, down: boolean) => void

  constructor(opts: InputOptions) {
    this.look = opts.look
    this.onAction = opts.onAction
    this.onTool = opts.onTool
    this.arrowTurn = opts.arrowTurn ?? false
    this.arrowRate = opts.arrowRate ?? 2.2

    addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault() // пробел не скроллит страницу
      this.keys.add(e.code)
      if (e.code === 'KeyF' && this.locked) this.onAction?.()
    })
    addEventListener('keyup', (e) => this.keys.delete(e.code))
    addEventListener('blur', () => {
      this.keys.clear()
      this.mouse[0] = this.mouse[1] = false
    })

    // Нажатие ловим на канвасе и только в мире, отпускание - на окне и всегда:
    // кнопку отпускают где угодно, и потерянное отпускание залипает замахом.
    const slotOf = (button: number): 1 | 2 | 0 => (button === 0 ? 1 : button === 2 ? 2 : 0)
    opts.target.addEventListener('mousedown', (e) => {
      if (!this.locked) return
      const slot = slotOf(e.button)
      if (!slot) return
      this.mouse[slot - 1] = true
      this.onTool?.(slot, true)
    })
    addEventListener('mouseup', (e) => {
      const slot = slotOf(e.button)
      if (!slot) return
      this.mouse[slot - 1] = false
      this.onTool?.(slot, false)
    })
    addEventListener('blur', () => {
      this.onTool?.(1, false)
      this.onTool?.(2, false)
    })
    opts.target.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  /** В мире ли мы: курсор захвачен, играем пальцем или взят режим без захвата. */
  get locked(): boolean {
    return this.look.isLocked || this.free || this.touch.active
  }

  /** Кнопка тача «рука»: то же нажатие, что клавиша F. */
  pressAction(): void {
    this.onAction?.()
  }

  /** Кнопка тача инструмента: то же нажатие, что ЛКМ и ПКМ. */
  pressTool(slot: 1 | 2, down: boolean): void {
    this.touch.tool[slot - 1] = down
    this.onTool?.(slot, down)
  }

  /**
   * Отпустить всё насовсем. На мыши это делает сам браузер, отпуская курсор, а
   * на таче держаться нечему: там «мы в мире» стоит на активности пальцев, и с
   * зажатым пальцем тело продолжало идти за чёрным экраном смерти, а автосейв
   * записывал этот дрейф.
   */
  halt(): void {
    this.keys.clear()
    this.mouse[0] = this.mouse[1] = false
    this.touch.x = this.touch.y = 0
    this.touch.run = false
    this.touch.jump = false
    this.touch.action = false
    this.touch.tool[0] = this.touch.tool[1] = false
    this.touch.active = false
  }

  /** Собрать намерение этого кадра. Зовёт `Body.update` первым делом. */
  update(dt: number): Intent {
    if (this.arrowTurn) {
      const yaw =
        ((this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('ArrowRight') ? 1 : 0)) *
        this.arrowRate *
        dt
      if (yaw) this.look.rotateBy(yaw) // через цель взгляда - сглаживание общее с мышью
    }

    const k = this.keys
    const t = this.touch
    const i = this.intent
    i.move.y = clamp((k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) + t.y, -1, 1)
    i.move.x = clamp((k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + t.x, -1, 1)
    i.run = k.has('ShiftLeft') || k.has('ShiftRight') || t.run
    i.jump = k.has('Space') || t.jump
    i.action = k.has('KeyF') || t.action
    i.tool[0] = this.mouse[0] || t.tool[0]
    i.tool[1] = this.mouse[1] || t.tool[1]
    return i
  }
}

/* --------------------------- управление пальцем --------------------------- */

/**
 * `?touch` - приказ, а не признак: раскладку кнопок смотрят мышью на десктопе,
 * и выбор режима по нажатию обязан пропустить этот случай вперёд.
 */
export function touchForced(): boolean {
  return new URLSearchParams(location.search).has('touch')
}

/** Есть ли смысл заводить тач вообще. */
export function touchSupported(): boolean {
  return touchForced() || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
}

/** Кнопка на экране. Иконку и место в кадре даёт мир, поведение - ядро. */
export interface TouchButton {
  /** id элемента: по нему мир ставит кнопку своим CSS. */
  id: string
  label: string
  /** Содержимое `<svg viewBox="0 0 24 24">`: только штрихи, без заливок. */
  icon: string
  press(down: boolean): void
  /** Видна сразу (прыжок) или ждёт `show()` (контекстные). */
  shown?: boolean
}

/** Имена в разметке. Они живут в CSS мира; ядро их только проставляет. */
export interface TouchClasses {
  container: string
  button: string
  hidden: string
  on: string
  body: string
}

export interface TouchOptions {
  input: Input
  look: SmoothLook
  buttons: TouchButton[]
  classes?: Partial<TouchClasses>
  /** Селектор того, что глушить нельзя: экраны оболочки живут как страница. */
  passThrough?: string
  /** px полного хода пальца от точки касания до максимума скорости */
  radius?: number
  /** во сколько radius надо увести палец, чтобы перейти на бег */
  runAt?: number
  /** px мёртвой зоны - дрожь пальца не шевелит тело */
  dead?: number
  /** рад/px взгляда (палец грубее мыши - чувствительность выше) */
  sens?: number
}

/**
 * Тач-управление: телефон и планшет. Никаких видимых джойстиков - палец на
 * ЛЕВОЙ половине экрана ведёт тело (аналоговый вектор от точки касания, дальше
 * повёл - бег), палец на ПРАВОЙ поворачивает взгляд (через `look.rotateBy`:
 * сглаживание и крены общие с мышью).
 *
 * Разметку кнопок ядро создаёт само, но НЕ знает ни их места в кадре, ни вида:
 * id, иконка, подпись и стили приходят от мира. Так один и тот же слой
 * обслуживает миры с разным набором кнопок и разной вёрсткой.
 */
export class TouchControls {
  active = false
  ui: HTMLDivElement
  private input: Input
  private look: SmoothLook
  private classes: TouchClasses
  private passThrough: string
  private R: number
  private runAt: number
  private dead: number
  private sens: number
  private els = new Map<string, HTMLButtonElement>()
  private always: string[] = []

  private _moveId: number | null = null // id пальца движения (левая половина)
  private _lookId: number | null = null // id пальца взгляда (правая половина)
  private _ox = 0
  private _oy = 0
  private _lx = 0
  private _ly = 0

  constructor(opts: TouchOptions) {
    this.input = opts.input
    this.look = opts.look
    this.classes = {
      container: 'touchUI',
      button: 'tbtn',
      hidden: 'hide',
      on: 'on',
      body: 'touch-mode',
      ...opts.classes,
    }
    this.passThrough = opts.passThrough ?? 'button, a'
    this.R = opts.radius ?? 52
    this.runAt = opts.runAt ?? 1.45
    this.dead = opts.dead ?? 7
    this.sens = opts.sens ?? 0.0042

    const ui = document.createElement('div')
    ui.id = this.classes.container
    document.body.appendChild(ui)
    this.ui = ui

    for (const spec of opts.buttons) {
      const b = document.createElement('button')
      b.id = spec.id
      b.type = 'button'
      b.className = this.classes.button
      if (!spec.shown) b.classList.add(this.classes.hidden)
      else this.always.push(spec.id)
      b.setAttribute('aria-label', spec.label)
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${spec.icon}</svg>`
      ui.appendChild(b)
      this.els.set(spec.id, b)
      this._press(b, spec.press)
    }

    const listen = { passive: false }
    addEventListener('touchstart', (e) => this._start(e), listen)
    addEventListener('touchmove', (e) => this._move(e), listen)
    addEventListener('touchend', (e) => this._end(e), listen)
    addEventListener('touchcancel', (e) => this._end(e), listen)
    // Уход со страницы забирает пальцы вместе с событиями: `touchend` придёт не
    // всегда, а оси останутся ненулевыми.
    addEventListener('blur', () => this.resetInput())
  }

  // Pointer Events покрывают палец, стилус и мышь; click с detail=0 оставляет
  // ту же кнопку доступной клавиатуре, switch control и экранному диктору.
  private _press(btn: HTMLButtonElement, fn: (down: boolean) => void): void {
    let pressed = false
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      pressed = true
      try {
        btn.setPointerCapture(e.pointerId)
      } catch {
        /* capture необязателен */
      }
      fn(true)
    })
    const up = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      if (!pressed) return
      pressed = false
      fn(false)
    }
    btn.addEventListener('pointerup', up)
    btn.addEventListener('pointercancel', up)
    btn.addEventListener('lostpointercapture', up)
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.detail === 0) {
        fn(true)
        fn(false)
      }
    })
  }

  /** Войти в мир: pointer lock на таче нет - просто включаемся. */
  activate(): void {
    if (this.active) return
    this.active = true
    this.input.touch.active = true
    this.ui.classList.add(this.classes.on)
    for (const id of this.always) this.els.get(id)?.classList.remove(this.classes.hidden)
    document.body.classList.add(this.classes.body)
    this.look.dispatchEvent({ type: 'lock' })
  }

  /** Показать или спрятать контекстную кнопку. Решает это мир, кадр за кадром. */
  show(id: string, on: boolean): void {
    this.els.get(id)?.classList.toggle(this.classes.hidden, !on)
  }

  /** Сменить иконку и подпись: одна кнопка обслуживает разные инструменты. */
  setIcon(id: string, icon: string, label: string): void {
    const b = this.els.get(id)
    if (!b) return
    const svg = b.querySelector('svg')
    if (svg) svg.innerHTML = icon
    b.setAttribute('aria-label', label)
  }

  get(id: string): HTMLButtonElement | undefined {
    return this.els.get(id)
  }

  // касание кнопок оболочки не глушим - иначе не будет click
  private _skip(e: Event): boolean {
    const t = e.target as Element | null
    return !this.active || !!(t && t.closest && t.closest(this.passThrough))
  }

  private _start(e: TouchEvent): void {
    if (this._skip(e)) return // на экранах оболочки страница живёт как обычная
    e.preventDefault()
    // индексом, а не for-of: TouchList в стандартных типах DOM не итератор
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.clientX < innerWidth * 0.5) {
        if (this._moveId !== null) continue
        this._moveId = t.identifier
        this._ox = t.clientX
        this._oy = t.clientY
      } else {
        if (this._lookId !== null) continue
        this._lookId = t.identifier
        this._lx = t.clientX
        this._ly = t.clientY
      }
    }
  }

  private _move(e: TouchEvent): void {
    if (this._skip(e)) return
    e.preventDefault()
    const p = this.input.touch
    // индексом, а не for-of: TouchList в стандартных типах DOM не итератор
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.identifier === this._moveId) {
        const dx = t.clientX - this._ox
        const dy = t.clientY - this._oy
        const len = Math.hypot(dx, dy)
        if (len < this.dead) {
          p.x = p.y = 0
          p.run = false
          continue
        }
        p.x = clamp(dx / this.R, -1, 1)
        p.y = clamp(-dy / this.R, -1, 1)
        p.run = len > this.R * this.runAt && p.y > 0.5 // бег - только уверенно вперёд
      } else if (t.identifier === this._lookId) {
        this.look.rotateBy(
          -(t.clientX - this._lx) * this.sens,
          -(t.clientY - this._ly) * this.sens,
        )
        this._lx = t.clientX
        this._ly = t.clientY
      }
    }
  }

  private _end(e: TouchEvent): void {
    if (this._skip(e)) return
    e.preventDefault()
    const p = this.input.touch
    // индексом, а не for-of: TouchList в стандартных типах DOM не итератор
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.identifier === this._moveId) {
        this._moveId = null
        p.x = p.y = 0
        p.run = false
      } else if (t.identifier === this._lookId) {
        this._lookId = null
      }
    }
  }

  /**
   * Отпустить всё: пальцы забыты, оси в ноль. Нужно там, где `touchend` до нас
   * не дойдёт: системный жест увёл палец за пределы страницы (шторка,
   * сворачивание), игрок замёрз и смотрит на экран смерти.
   */
  resetInput(): void {
    this._moveId = this._lookId = null
    const p = this.input.touch
    p.x = p.y = 0
    p.run = false
    p.jump = false
  }
}
