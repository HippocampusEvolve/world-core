import type { SmoothLook } from './look.js';
/** Намерение игрока: всё, что тело должно знать о том, чего от него хотят. */
export interface Intent {
    /** x - вправо, y - вперёд; каждая от -1 до 1, длина вектора не нормируется. */
    move: {
        x: number;
        y: number;
    };
    run: boolean;
    jump: boolean;
    /** Контекстное действие по месту (клавиша F, тач-кнопка «рука»). */
    action: boolean;
    /** Кнопки инструмента: [основная, вторая] - ЛКМ и ПКМ. */
    tool: [boolean, boolean];
}
/** Оси и кнопки, приходящие с пальца. Сюда пишет `TouchControls`. */
export interface TouchAxes {
    x: number;
    y: number;
    run: boolean;
    jump: boolean;
    action: boolean;
    tool: [boolean, boolean];
    /** Играем пальцем: pointer lock на таче не берётся, «мы в мире» решает это. */
    active: boolean;
}
export interface InputOptions {
    look: SmoothLook;
    /** Элемент, на котором ловятся кнопки инструмента (канвас мира). */
    target: HTMLElement;
    /** Нажата кнопка действия. Зовётся на каждое нажатие, автоповтор включая. */
    onAction?: () => void;
    /** Кнопка инструмента нажата или отпущена: слот 1 - ЛКМ, слот 2 - ПКМ. */
    onTool?: (slot: 1 | 2, down: boolean) => void;
    /** Стрелки поворачивают взгляд. Нужно там, где pointer lock не берётся. */
    arrowTurn?: boolean;
    /** рад/с поворота стрелками */
    arrowRate?: number;
}
export declare class Input {
    look: SmoothLook;
    intent: Intent;
    touch: TouchAxes;
    /**
     * «Мы в мире» без захвата курсора. Так живёт debug-режим: pointer lock там не
     * берётся вовсе, а тело двигаться обязано.
     */
    free: boolean;
    arrowTurn: boolean;
    arrowRate: number;
    private keys;
    private mouse;
    private onAction?;
    private onTool?;
    constructor(opts: InputOptions);
    /** В мире ли мы: курсор захвачен, играем пальцем или взят режим без захвата. */
    get locked(): boolean;
    /** Кнопка тача «рука»: то же нажатие, что клавиша F. */
    pressAction(): void;
    /** Кнопка тача инструмента: то же нажатие, что ЛКМ и ПКМ. */
    pressTool(slot: 1 | 2, down: boolean): void;
    /**
     * Отпустить всё насовсем. На мыши это делает сам браузер, отпуская курсор, а
     * на таче держаться нечему: там «мы в мире» стоит на активности пальцев, и с
     * зажатым пальцем тело продолжало идти за чёрным экраном смерти, а автосейв
     * записывал этот дрейф.
     */
    halt(): void;
    /** Собрать намерение этого кадра. Зовёт `Body.update` первым делом. */
    update(dt: number): Intent;
}
/**
 * `?touch` - приказ, а не признак: раскладку кнопок смотрят мышью на десктопе,
 * и выбор режима по нажатию обязан пропустить этот случай вперёд.
 */
export declare function touchForced(): boolean;
/** Есть ли смысл заводить тач вообще. */
export declare function touchSupported(): boolean;
/** Кнопка на экране. Иконку и место в кадре даёт мир, поведение - ядро. */
export interface TouchButton {
    /** id элемента: по нему мир ставит кнопку своим CSS. */
    id: string;
    label: string;
    /** Содержимое `<svg viewBox="0 0 24 24">`: только штрихи, без заливок. */
    icon: string;
    press(down: boolean): void;
    /** Видна сразу (прыжок) или ждёт `show()` (контекстные). */
    shown?: boolean;
}
/** Имена в разметке. Они живут в CSS мира; ядро их только проставляет. */
export interface TouchClasses {
    container: string;
    button: string;
    hidden: string;
    on: string;
    body: string;
}
export interface TouchOptions {
    input: Input;
    look: SmoothLook;
    buttons: TouchButton[];
    classes?: Partial<TouchClasses>;
    /** Селектор того, что глушить нельзя: экраны оболочки живут как страница. */
    passThrough?: string;
    /** px полного хода пальца от точки касания до максимума скорости */
    radius?: number;
    /** во сколько radius надо увести палец, чтобы перейти на бег */
    runAt?: number;
    /** px мёртвой зоны - дрожь пальца не шевелит тело */
    dead?: number;
    /** рад/px взгляда (палец грубее мыши - чувствительность выше) */
    sens?: number;
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
export declare class TouchControls {
    active: boolean;
    ui: HTMLDivElement;
    private input;
    private look;
    private classes;
    private passThrough;
    private R;
    private runAt;
    private dead;
    private sens;
    private els;
    private always;
    private _moveId;
    private _lookId;
    private _ox;
    private _oy;
    private _lx;
    private _ly;
    constructor(opts: TouchOptions);
    private _press;
    /** Войти в мир: pointer lock на таче нет - просто включаемся. */
    activate(): void;
    /** Показать или спрятать контекстную кнопку. Решает это мир, кадр за кадром. */
    show(id: string, on: boolean): void;
    /** Сменить иконку и подпись: одна кнопка обслуживает разные инструменты. */
    setIcon(id: string, icon: string, label: string): void;
    get(id: string): HTMLButtonElement | undefined;
    private _skip;
    private _start;
    private _move;
    private _end;
    /**
     * Отпустить всё: пальцы забыты, оси в ноль. Нужно там, где `touchend` до нас
     * не дойдёт: системный жест увёл палец за пределы страницы (шторка,
     * сворачивание), игрок замёрз и смотрит на экран смерти.
     */
    resetInput(): void;
}
