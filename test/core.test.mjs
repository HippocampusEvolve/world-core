/**
 * core.test.mjs - контроллер счётом. Без браузера, без видеокарты.
 *
 * Порядок тот же, что во всём проекте: сперва числа, кадр последним. Тело
 * специально ничего не знает ни о документе, ни о геометрии: намерение
 * приходит присваиванием в `Input`, опора - плоской заглушкой `Support`. Ровно
 * поэтому походку можно прогнать здесь, а браузеру оставить один вопрос -
 * приятно ли.
 *
 * Один тест - одно утверждение.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'

// Ядру нужен документ: `Input` вешает слушатели окна, а мира тут нет. Гасим их
// заглушкой ДО импорта - иначе конструктор упадёт на первом addEventListener.
globalThis.addEventListener ??= () => {}
globalThis.location ??= { search: '' }

const { Body, Input } = await import('../dist/core/index.js')

const DT = 1 / 60

/** Пол на нуле, ничего не толкает, стен нет. */
const FLAT = {
  floorAt: () => ({ y: 0, surface: 'flat' }),
  resolve: () => {},
}

/** Пол, который можно убрать из-под ног: так проверяется coyote. */
function ledge() {
  const s = { solid: true, floorAt: () => (s.solid ? { y: 0, surface: 'flat' } : null), resolve: () => {} }
  return s
}

/**
 * Собранное тело со всем, что ему нужно, и ничем сверх того. Взгляд подменён:
 * `Input` спрашивает у него только захват курсора и поворот, `Body` - рыскание
 * на вырожденном взгляде.
 */
function makeBody(support = FLAT, opts = {}) {
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 2000)
  const look = { isLocked: true, yaw: 0, rotateBy() {} }
  const input = new Input({ look, target: { addEventListener() {} } })
  const body = new Body({
    camera,
    input,
    support,
    spawn: new THREE.Vector3(0, 0, 0),
    ...opts,
  })
  return { body, input, camera }
}

/** Прогнать N секунд ровными кадрами. */
function run(body, seconds) {
  const steps = Math.round(seconds / DT)
  for (let i = 0; i < steps; i++) body.update(DT)
  return steps * DT
}

test('идя вперёд три секунды, тело проходит путь ходьбы за вычетом разгона', () => {
  const { body, input } = makeBody()
  input.touch.y = 1 // намерение «вперёд» на полную ось
  const t = run(body, 3)

  // Камера по умолчанию смотрит в −Z, значит вперёд - это уменьшение z.
  const gone = Math.hypot(body.pos.x, body.pos.z)
  // Разгон - первого порядка с постоянной 1/accel: за t секунд тело проходит
  // не walk·t, а на один «хвост» разгона меньше.
  const ideal = body.walk * (t - (1 - Math.exp(-body.accel * t)) / body.accel)
  assert.ok(
    Math.abs(gone - ideal) < 0.12,
    `прошло ${gone.toFixed(3)} м, ожидалось около ${ideal.toFixed(3)} м`,
  )
})

test('прыжок поднимает тело на расчётную высоту и возвращает на пол', () => {
  const { body, input } = makeBody()
  input.touch.jump = true
  body.update(DT)
  input.touch.jump = false

  let top = 0
  const airborne = Math.ceil((2 * body.jumpSpeed) / body.gravity / DT) + 2
  for (let i = 0; i < airborne; i++) {
    body.update(DT)
    top = Math.max(top, body.pos.y)
  }

  const ideal = (body.jumpSpeed * body.jumpSpeed) / (2 * body.gravity)
  // Пик считается кадрами, и кадр всегда чуть-чуть срезает вершину: гравитация
  // отнимается целым шагом, а вершина приходится на середину кадра. При 60 к/с
  // это около пяти сантиметров, и это не ошибка прыжка.
  assert.ok(
    Math.abs(top - ideal) < 0.07 && body.grounded && Math.abs(body.pos.y) < 1e-9,
    `пик ${top.toFixed(3)} м против ${ideal.toFixed(3)}, на полу: ${body.grounded}`,
  )
})

test('в окне coyote прыжок ещё возможен после схода с опоры', () => {
  const s = ledge()
  const { body, input } = makeBody(s)
  run(body, 0.2) // встали на пол
  s.solid = false
  run(body, 0.06) // половина окна грации
  assert.equal(body.grounded, false)

  input.touch.jump = true
  body.update(DT)
  assert.ok(body.vy > 0, `после ${body.airT.toFixed(3)} с без опоры прыжок не сработал`)
})

test('за окном coyote прыжка уже нет', () => {
  const s = ledge()
  const { body, input } = makeBody(s)
  run(body, 0.2)
  s.solid = false
  run(body, 0.2) // окно 0.12 с давно прошло

  const before = body.vy
  input.touch.jump = true
  body.update(DT)
  assert.ok(body.vy < before, `прыжок сработал спустя ${body.airT.toFixed(3)} с без опоры`)
})

test('выносливость обрывает бег в срок, назначенный расходом', () => {
  const drain = 1 / 2 // полный запас на два бега-секунды: тест не должен идти минуту
  const { body, input } = makeBody(FLAT, { stamina: { drain } })
  input.touch.y = 1
  input.touch.run = true

  // Меряем ПЕРВЫЙ отрезок бега: дальше запас восстанавливается на ходу и бег
  // возвращается урывками - это верно, но говорит уже о другом.
  let ran = 0
  for (let i = 0; i < Math.round(6 / DT); i++) {
    body.update(DT)
    if (body.running) ran += DT
    else if (ran > 0) break
  }
  // Расход идёт, пока запас выше порога начала бега: (1 − runAt) / drain.
  const ideal = (1 - body.st.runAt) / drain
  assert.ok(
    Math.abs(ran - ideal) < 0.05,
    `бежали ${ran.toFixed(2)} с, запаса хватало на ${ideal.toFixed(2)} с`,
  )
})
