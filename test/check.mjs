/**
 * check.mjs — проверка материалов счётом. Без браузера, без видеокарты.
 *
 * Порядок тот же, что во всём проекте: сперва числа, кадр последним. Здесь
 * считаются сами карты - так у камина нашлись почти чёрная занятость и мусор в
 * канале металла, которых не было видно ни в одной проверке и ни в одном кадре.
 *
 * Меряется три вещи.
 *
 * 1. ШОВ НА СТЫКЕ ТАЙЛА. Карта укладывается по стене много раз подряд, поэтому
 *    последний столбец обязан сходиться с первым. Резкость шва сравнивается не
 *    с нулём, а с ОБЫЧНЫМ перепадом между соседними столбцами той же карты:
 *    у материала со швами раствора перепад велик сам по себе, и абсолютное
 *    число ничего не сказало бы. Берётся медиана по внутренним парам - она не
 *    сдвигается от десятка резких линий кладки.
 *
 *    Отношение около 1 значит «шов неотличим от любого другого стыка». Порог
 *    один на все материалы и под материал НЕ подкручивается: набор, которому
 *    стыковаться незачем, объявляется таким в рецепте, поимённо и с причиной.
 *
 * 2. РЕЛЬЕФ. Средний наклон нормали в градусах. Ловит материал, приехавший
 *    плоским при полностью зелёных остальных числах.
 *
 * 3. УТВЕРЖДЕНИЯ. У каждого генератора в комментарии написано, каким он должен
 *    получиться словами («раствор темнее камня», «в камне металла нет вовсе»).
 *    Здесь те же слова записаны неравенством и проверяются вместе с картой.
 */

import { bake } from '../dist/materials/bake.js'
import { RECIPES, firebrick } from '../dist/materials/generators.js'
import { hash2 } from '../dist/materials/noise.js'

/* ------------------------------- замеры ------------------------------- */

/** Байтовая яркость по Rec.709. Карты лежат в sRGB, так что она же и на глаз. */
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

function luminance(baked) {
  const S = baked.size
  const L = new Float32Array(S * S)
  for (let i = 0; i < S * S; i++) {
    const o = i * 4
    L[i] = lum(baked.albedo[o], baked.albedo[o + 1], baked.albedo[o + 2])
  }
  return L
}

function percentile(A, q) {
  const s = Float32Array.from(A).sort()
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]
}

const mean = (A) => {
  let s = 0
  for (let i = 0; i < A.length; i++) s += A[i]
  return s / A.length
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Шов на стыке тайла - ТОЧНО, без порога и без статистики.
 *
 * Первый заход был статистическим: резкость кромки сравнивалась с медианным
 * перепадом между соседними столбцами. Он врал, и врал предсказуемо. У кладки
 * кромка тайла попадает ровно на шов раствора - на линию, резкую ПО ЗАМЫСЛУ, -
 * а медиана считается по сотням гладких столбцов внутри камня. Кирпич и
 * половая доска получали 2-4 «раза» при совершенно исправной периодичности.
 *
 * Здесь вопрос задан прямо. Генератор - это функция от u = x/S, и карта
 * стыкуется сама с собой ровно тогда, когда функция периодична: f(1) = f(0).
 * Значит её можно просто ВЫЧИСЛИТЬ при u = 1 (за краем карты) и сравнить с
 * u = 0. Совпало - шва нет, и это не оценка, а тождество.
 *
 * Меряются обе карты, которые из этой функции растут: цвет и высота. Разрыв в
 * высоте не виден в цвете вовсе, но карта нормалей строится из неё, и на стыке
 * получается полоса чужого освещения - её потом ищут в материале.
 *
 * Возвращаются наибольшие расхождения в байтах яркости (0..255), чтобы число
 * было понятным: «на стыке цвет прыгает на 37 из 255».
 */
function seamExact(recipe) {
  const S = recipe.size
  const p = { r: 0, g: 0, b: 0, h: 0.5, rough: 0.85, metal: -1 }
  const at = (x, y) => {
    // Сброс зеркалит bake(): пиксель начинается с нулевого цвета. Разойдись
    // эти два места - замер шва мерил бы не ту функцию, которую печёт выпечка.
    p.r = p.g = p.b = 0
    p.h = 0.5
    p.rough = 0.85
    p.metal = -1
    recipe.gen(x, y, S, p)
    return { L: lum(p.r, p.g, p.b), h: p.h }
  }

  const scan = (axis) => {
    let dL = 0
    let dH = 0
    for (let k = 0; k < S; k++) {
      const a = axis === 'u' ? at(S, k) : at(k, S)
      const b = axis === 'u' ? at(0, k) : at(k, 0)
      dL = Math.max(dL, Math.abs(a.L - b.L))
      dH = Math.max(dH, Math.abs(a.h - b.h) * 255)
    }
    return Math.max(dL, dH)
  }

  return { u: scan('u'), v: scan('v') }
}

/** Теплота: красный минус синий, в среднем по карте. */
function warmth(m) {
  let s = 0
  const n = m.baked.size * m.baked.size
  for (let i = 0; i < n; i++) s += m.baked.albedo[i * 4] - m.baked.albedo[i * 4 + 2]
  return s / n
}

/** Средний наклон нормали от вертикали, в градусах. */
function tilt(baked) {
  const S = baked.size
  let sum = 0
  for (let i = 0; i < S * S; i++) {
    const nz = (baked.normal[i * 4 + 2] / 255) * 2 - 1
    sum += Math.acos(Math.min(1, Math.max(-1, nz)))
  }
  return (sum / (S * S)) * (180 / Math.PI)
}

/**
 * Ряды кладки: лежат ли горизонтальные швы там, где рецепт обещал.
 *
 * Два замера до этого пришлось выбросить, и оба поучительны.
 *
 * Поиск локальных минимумов в профиле яркости насчитал 66 провалов при четырёх
 * рядах: зерно камня даёт свои, и отделяются они только сглаживанием, шаг
 * которого и становится тем самым порогом, который подкручивать нельзя.
 *
 * Спектр казался честнее - но у него нашлась своя ловушка. Шов это УЗКИЙ
 * импульс, шириной меньше сотой доли карты, а спектр узкого импульса почти
 * плоский: гармоники 4, 8, 12, 16 выходят одной высоты, и какая из них
 * окажется сильнейшей, решает зерно. Замер показывал то 2-ю, то 16-ю при
 * совершенно исправной кладке.
 *
 * Здесь спрашивается ровно то, что обещано рецептом: в каждой доле карты самая
 * тёмная строка обязана стоять НА РАЗДЕЛЕ рядов и быть заметно темнее обычной.
 * Усреднять по полосе не нужно вовсе - а значит, нечего и подбирать: ширина
 * полосы была бы прибором, а прибор, подогнанный под материал, ничего не мерит.
 *
 * Ищется строка, сильнее всего отличающаяся от медианной, - В ЛЮБУЮ СТОРОНУ, а
 * не только тёмная. Это не придирка к общности: у кирпича топки раствор
 * СВЕТЛЕЕ кирпича, и замер, настроенный на провал, объявил бы, что рядов у
 * кирпича нет. Направление - это уже свойство материала, и спрашивается оно
 * отдельно.
 *
 * Возвращается, насколько далеко эта строка стоит от раздела (в долях высоты,
 * худший случай) и её яркость в долях медианной строки.
 */
function rowJoints(L, S, rows) {
  const prof = new Float32Array(S)
  for (let y = 0; y < S; y++) {
    let s = 0
    for (let x = 0; x < S; x++) s += L[y * S + x]
    prof[y] = s / S
  }
  const mid = median(prof)
  let off = 0
  let depth = 0 // худший (ближайший к единице) случай из всех разделов
  for (let k = 0; k < rows; k++) {
    const c = (k / rows) * S
    const half = S / (2 * rows) // окно в полряда: дальше уже чужой шов
    let bestY = c
    let bestV = mid
    for (let d = -half; d <= half; d++) {
      const y = Math.round(((c + d) % S + S) % S)
      if (Math.abs(prof[y] - mid) > Math.abs(bestV - mid)) {
        bestV = prof[y]
        bestY = c + d
      }
    }
    off = Math.max(off, Math.abs(bestY - c) / S)
    const r = bestV / mid
    if (k === 0 || Math.abs(r - 1) < Math.abs(depth - 1)) depth = r
  }
  return { off, depth }
}

/** Средняя яркость горизонтальной полосы. `y0`, `y1` - доли высоты карты. */
function bandLum(L, S, y0, y1) {
  let s = 0
  let n = 0
  for (let y = Math.floor(y0 * S); y < Math.floor(y1 * S); y++) {
    for (let x = 0; x < S; x++, n++) s += L[y * S + x]
  }
  return s / n
}

function measure(recipe) {
  const baked = bake(recipe.gen, recipe.size, recipe.normalStrength)
  const s = seamExact(recipe)
  const L = luminance(baked)
  const S = baked.size
  const rough = new Float32Array(S * S)
  for (let i = 0; i < S * S; i++) rough[i] = baked.rough[i * 4] / 255

  let metalMean = null
  if (baked.metal) {
    const m = new Float32Array(S * S)
    for (let i = 0; i < S * S; i++) m[i] = baked.metal[i * 4] / 255
    metalMean = mean(m)
  }

  let hMin = Infinity
  let hMax = -Infinity
  for (let i = 0; i < baked.height.length; i++) {
    if (baked.height[i] < hMin) hMin = baked.height[i]
    if (baked.height[i] > hMax) hMax = baked.height[i]
  }

  return {
    recipe,
    baked,
    L,
    p05: percentile(L, 0.05),
    p50: percentile(L, 0.5),
    p95: percentile(L, 0.95),
    lumMean: mean(L),
    roughMean: mean(rough),
    metalMean,
    hasMetal: baked.metal !== null,
    heightSpan: hMax - hMin,
    tilt: tilt(baked),
    // швы кладки: четыре ряда по замыслу, три - заведомо мимо (см. утверждения)
    rows4: rowJoints(L, S, 4),
    rows3: rowJoints(L, S, 3),
    seamU: s.u,
    seamV: s.v,
    // верх карты - это верх поверхности: канва переворачивается при загрузке
    topLum: bandLum(L, S, 0, 0.25),
    bottomLum: bandLum(L, S, 0.75, 1),
  }
}

/* ------------------------------ утверждения ------------------------------ */

/**
 * Допуск шва. Это не порог «сколько шва терпимо», а запас на арифметику с
 * плавающей точкой: у периодичной функции f(1) и f(0) должны совпасть точно, и
 * полбайта из 255 - это заведомо меньше любого различимого расхождения.
 * Материал либо периодичен, либо нет; середины тут не бывает, и подкручивать
 * здесь нечего. Набор, которому стыковаться незачем, объявляется таким в
 * рецепте - это и есть «явный список разрешённого по замыслу».
 */
const SEAM_MAX = 0.5

/** Рельеф ниже этого - материал приехал плоским, как бы ни выглядели остальные числа. */
const TILT_MIN = 3.0

const fmt = (v) => (v === Infinity ? '∞' : v < 0.005 ? '0' : v.toFixed(1))

function assertions(m, all) {
  const out = []
  const say = (ok, text, got) => out.push({ ok, text, got })
  const r = m.recipe

  // шов по замыслу рецепта
  const wantU = r.tiles === 'both' || r.tiles === 'u'
  const wantV = r.tiles === 'both' || r.tiles === 'v'
  if (wantU) say(m.seamU <= SEAM_MAX, 'стыкуется по горизонтали: f(u=1) = f(u=0)', `прыжок ${fmt(m.seamU)} из 255`)
  if (wantV) say(m.seamV <= SEAM_MAX, 'стыкуется по вертикали: f(v=1) = f(v=0)', `прыжок ${fmt(m.seamV)} из 255`)

  // рельеф есть у всех
  say(m.tilt >= TILT_MIN, `рельеф читается (наклон ≥ ${TILT_MIN}°)`, `${m.tilt.toFixed(1)}°`)

  // металл: только у чугуна
  if (r.name === 'iron') {
    say(m.hasMetal, 'чугун - металл: карта металла есть', m.hasMetal ? 'есть' : 'нет')
    say(m.metalMean > 0.5, 'и он не бутафорский (среднее > 0.5)', m.metalMean?.toFixed(2) ?? '-')
    say(m.roughMean < 0.75, 'чугун блестит (шероховатость < 0.75)', m.roughMean.toFixed(2))
  } else {
    say(!m.hasMetal, 'металла нет вовсе: карты металла не выпечено', m.hasMetal ? 'есть' : 'нет')
  }

  // словами из комментариев генераторов
  if (r.name === 'rubble' || r.name === 'rubbleWarm') {
    say(m.p05 < m.p95 * 0.55, 'раствор темнее камня (p05 < 0.55·p95)', `${m.p05.toFixed(0)} против ${m.p95.toFixed(0)}`)
  }
  if (r.name === 'brick') {
    say(m.topLum < m.bottomLum * 0.9, 'сажа гуще к верху топки (верх темнее низа на 10%)', `${m.topLum.toFixed(0)} против ${m.bottomLum.toFixed(0)}`)
  }
  if (r.name === 'brickPlain') {
    // Мерить уклон одного кирпича бессмысленно, и это стоило одной ложной
    // претензии. У кладки восемь рядов и четыре столбца, то есть в верхней
    // четверти карты всего восемь кирпичей со случайным тоном каждый - разница
    // верх-низ в десяток процентов набегает раскладкой, а не градиентом. У
    // кирпича БЕЗ сажи она оказалась −13%, у кирпича С сажей +13%, и по
    // отдельности оба числа выглядят одинаково подозрительно.
    //
    // Случайность у них при этом ОДНА И ТА ЖЕ: тон кирпичей не зависит от
    // ручки. Поэтому спрашиваем не «ровный ли», а «что делает ручка» - разницу
    // уклонов. Она чистая, в ней раскладка сокращается.
    //
    // Что кирпич без градиента и правда ровный, доказывает не эта строчка, а
    // точный замер шва выше: у монотонного градиента верх с низом сойтись не
    // может по определению, и нулевой шов сам по себе означает его отсутствие.
    const soot = all.find((x) => x.recipe.name === 'brick')
    const trend = (x) => (x.bottomLum - x.topLum) / x.bottomLum
    const effect = trend(soot) - trend(m)
    say(effect > 0.2, 'сажу кверху добавляет именно ручка sootRise (уклон +20 пунктов)', `+${(effect * 100).toFixed(1)} пунктов`)
  }
  if (r.name === 'cloth') {
    say(m.roughMean > 0.9, 'у ткани блеска нет (шероховатость > 0.9)', m.roughMean.toFixed(2))
  }
  if (r.name === 'logend') {
    const bark = all.find((x) => x.recipe.name === 'bark')
    say(m.lumMean > bark.lumMean, 'торец полена светлее коры', `${m.lumMean.toFixed(0)} против ${bark.lumMean.toFixed(0)}`)
  }
  if (r.name === 'floor') {
    const beam = all.find((x) => x.recipe.name === 'beam')
    say(m.lumMean < beam.lumMean, 'половая доска темнее тёсаного бруса', `${m.lumMean.toFixed(0)} против ${beam.lumMean.toFixed(0)}`)
  }
  if (r.name === 'rubbleWarm') {
    const cold = all.find((x) => x.recipe.name === 'rubble')
    say(warmth(m) > warmth(cold), 'тёплый бут теплее холодного (красный минус синий)', `${warmth(m).toFixed(1)} против ${warmth(cold).toFixed(1)}`)
  }

  // Тёсаная кладка снята с референса, и проверяется она по нему же: числа в
  // скобках - замер центральных 60% того кадра (см. комментарий генератора).
  if (r.name === 'ashlar' || r.name === 'ashlarCold') {
    say(m.rows4.off < 0.02, 'швы стоят на разделах четырёх рядов', `сдвиг до ${(m.rows4.off * 100).toFixed(1)}% высоты`)
    say(m.rows4.depth < 0.8, 'и шов темнее камня на пятую часть', `${(m.rows4.depth * 100).toFixed(0)}% от медианной строки`)
    say(m.p05 < m.p50 * 0.72, 'шов темнее камня (p05 < 0.72·p50)', `${m.p05.toFixed(0)} против ${m.p50.toFixed(0)}`)
    say(m.tilt > 25, 'весь объём в рельефе, а не в цвете (наклон > 25°)', `${m.tilt.toFixed(1)}°`)
    // У референса p95 − p05 = 44 байта. Кладка, у которой блоки расходятся по
    // яркости сильнее, читается крашеной фанерой - это и есть та черта, за
    // которой процедурный камень перестаёт быть камнем.
    say(m.p95 - m.p05 < 70, 'разброс яркости узкий, как у камня (p95 − p05 < 70; у референса 44)', `${(m.p95 - m.p05).toFixed(0)}`)
  }
  if (r.name === 'ashlar') {
    const cold = all.find((x) => x.recipe.name === 'ashlarCold')
    say(warmth(m) > 15, 'тёплая кладка и правда тёплая (R − B > 15; у референса 24.6)', warmth(m).toFixed(1))
    say(warmth(m) > warmth(cold), 'тёплая кладка теплее холодной', `${warmth(m).toFixed(1)} против ${warmth(cold).toFixed(1)}`)
    // Проверка проверки, дважды: замер обязан молчать там, где рядов нет.
    //
    // Сперва на чужом материале - бут это валуны клеточным шумом, разделов у
    // них не бывает. Потом на ЭТОЙ ЖЕ карте, но с неверным числом рядов: три
    // вместо четырёх. Второе важнее первого. Прибор, который в любой стене
    // находит ровно столько рядов, сколько его попросили, не доказывает ничего.
    //
    // Кирпич топки на эту роль не подошёл, и это стоит записать: у него шов по
    // ЯРКОСТИ неотличим от кирпича (95% медианы), потому что светлый раствор и
    // тёмная глина сошлись в одно число. Отличается он цветом, а не светом -
    // замер по яркости на нём молчит совершенно законно.
    const rub = all.find((x) => x.recipe.name === 'rubble')
    say(rub.rows4.depth > 0.9, 'у бута рядов нет, и замер их не выдумывает', `${(rub.rows4.depth * 100).toFixed(0)}% - провала нет`)
    say(m.rows3.off > 0.02, 'и трёх рядов в этой же кладке замер не находит', `сдвиг ${(m.rows3.off * 100).toFixed(1)}% высоты`)
  }

  return out
}

/* -------------------------------- прогон -------------------------------- */

console.log('\nworld-core / материалы: проверка счётом\n')

// Основание всего - хеш шума. Если он поедет, поедут все карты сразу и молча.
const HASH_GOLD = hash2(1, 2, 3)
console.log(`  хеш шума: hash2(1,2,3) = ${HASH_GOLD.toFixed(9)}`)

const t0 = Date.now()
const all = RECIPES.map(measure)
const secs = ((Date.now() - t0) / 1000).toFixed(1)

const pad = (s, n) => String(s).padEnd(n)
const num = (s, n) => String(s).padStart(n)

console.log(
  `\n  ${pad('набор', 30)}${num('px', 4)}${num('ярк.', 6)}${num('накл.', 7)}${num('шерох.', 8)}${num('металл', 8)}${num('шов u', 8)}${num('шов v', 8)}`,
)
console.log('  ' + '-'.repeat(79))
for (const m of all) {
  console.log(
    `  ${pad(m.recipe.title, 30)}${num(m.recipe.size, 4)}${num(m.lumMean.toFixed(0), 6)}${num(m.tilt.toFixed(1) + '°', 7)}${num(m.roughMean.toFixed(2), 8)}${num(m.metalMean === null ? '-' : m.metalMean.toFixed(2), 8)}${num(fmt(m.seamU), 8)}${num(fmt(m.seamV), 8)}`,
  )
}

console.log('\n  утверждения:\n')
let failed = 0
let total = 0
for (const m of all) {
  const list = assertions(m, all)
  const bad = list.filter((a) => !a.ok)
  total += list.length
  failed += bad.length
  const head = `${m.recipe.title}`
  const note = m.recipe.tiles !== 'both' ? `  [не тайлится: ${m.recipe.why}]` : ''
  console.log(`  ${bad.length ? '✗' : '✓'} ${head}${note}`)
  for (const a of list) {
    if (!a.ok) console.log(`      ✗ ${a.text} - ${a.got}`)
  }
}

// Ручка sootRise обязана чинить ровно то, из-за чего кирпич с градиентом не
// тайлится. Иначе ручка есть, а толку от неё нет.
const brickSeam = (rise) =>
  seamExact({ size: 512, normalStrength: 2.2, gen: firebrick(rise) }).v
const sootV = brickSeam(1)
const plainV = brickSeam(0)
const okKnob = plainV <= SEAM_MAX && sootV > SEAM_MAX
total += 1
if (!okKnob) failed += 1
console.log(
  `  ${okKnob ? '✓' : '✗'} ручка sootRise отвечает за вертикальный шов: прыжок ${fmt(sootV)} при 1, ${fmt(plainV)} при 0`,
)

// Проверка проверки. Новый замер шва точный и без порога, поэтому его легко
// заподозрить в том, что он просто мягче прежнего. Здесь ему подсовывают ровно
// ту ошибку, которая была в эталоне: индекс доски берётся без заворота, и на
// самом краю карты вместо доски 0 оказывается несуществующая доска 4.
// Не поймает - грош ему цена.
const brokenFloor = (x, y, S, p) => {
  const u = x / S
  const planks = 4
  const pi = Math.floor(u * planks) // <- без wrapi, как было в эталоне
  const rnd = hash2(pi, 0, 733)
  const c = 44 + rnd * 60
  p.r = p.g = p.b = c
  p.h = 0.5
}
const caught = seamExact({ size: 512, normalStrength: 2.2, gen: brokenFloor }).u
total += 1
if (!(caught > SEAM_MAX)) failed += 1
console.log(
  `  ${caught > SEAM_MAX ? '✓' : '✗'} замер ловит подсунутую ошибку эталона (индекс доски без заворота): прыжок ${fmt(caught)}`,
)

console.log(
  `\n  ${failed ? `ПРЕТЕНЗИЙ: ${failed} из ${total}` : `всё зелёное: ${total} утверждений`}, ${all.length} наборов, ${secs} с\n`,
)
process.exit(failed ? 1 : 0)
