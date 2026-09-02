/**
 * Контроллер от первого лица: тело, взгляд, ввод, риг инструмента, руки.
 *
 * Правило разреза одно: ЯДРО ВЛАДЕЕТ ВСЕМ, ЧТО ПРО ТЕЛО И НАМЕРЕНИЕ ИГРОКА,
 * МИР ВЛАДЕЕТ ВСЕМ, ЧТО ПРО ГЕОМЕТРИЮ. Ни один файл здесь не знает, из чего
 * сложен мир: форма приходит через `Support` (три метода), а вид и звук
 * остаются снаружи - ядро только называет числа тела, по которым их считают.
 *
 * Порядок сборки (десять строк - в README):
 *
 *     const look  = new SmoothLook(camera, canvas)
 *     const input = new Input({ look, target: canvas })
 *     const body  = new Body({ camera, input, support, spawn, onStep, onLand })
 *     // в кадре: взгляд РАНЬШЕ тела - движение идёт по свежей камере
 *     look.update(dt, body)
 *     body.update(dt)
 */
export { stepSpring, type Spring } from './spring.js';
export { SmoothLook, type LookBody, type LookConfig, type LookEvents } from './look.js';
export { Input, TouchControls, touchSupported, touchForced, type Intent, type InputOptions, type TouchAxes, type TouchButton, type TouchClasses, type TouchOptions, } from './input.js';
export { Body, type Support, type BodyOptions, type StaminaOptions } from './body.js';
export { HeldTool, ss, type Keyframe, type Stroke, type HeldToolOptions, } from './tool.js';
export { ViewModel, VIEW_Z, viewZ, type ViewBody, type ViewModelOptions, } from './viewmodel.js';
