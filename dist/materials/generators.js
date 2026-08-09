/**
 * generators.ts — сами материалы.
 *
 * Перенесены из эталона `demo/cabin-fireplace.html` один в один по замыслу, но
 * не буква в букву по числам: почти каждый второй вызов шума в эталоне нарушал
 * договор о периоде (см. `noise.ts`), и карта не стыковалась сама с собой. В
 * тёмной хижине это не читалось - шов на стене выглядел ещё одним пятном
 * копоти. Здесь множители приведены к целым (для `|sin|` - к кратным половине,
 * у него период π, а не 2π), индексы ячеек заведены через `wrapi`, а
 * доказывает починку не глаз, а замер шва в `test/check.mjs`.
 *
 * Правки, которые изменили картинку, перечислены поимённо в README - молча
 * подкрученных чисел здесь нет.
 *
 * Все генераторы пишут в один и тот же `Px` (см. `bake.ts`): ни одного нового
 * объекта на пиксель.
 */
import { fbm, hash2, ridge, worley, wrapi } from './noise.js';
import { add, cl01, mix, ss } from './shape.js';
const TAU = Math.PI * 2;
/* ------------------------------------------------------------------ *
 * 1. Бревно сруба - продольная свиль, трещины усушки, потемневшее дерево
 * ------------------------------------------------------------------ */
export const log = (x, y, S, p) => {
    const u = x / S;
    const v = y / S; // v - вдоль бревна
    const swirl = fbm(u * 5, v * 1, 5, 1, 3, 71);
    // 3.5, а не 3.4: у |sin| период π, поэтому целым должно быть удвоенное число оборотов.
    const grain = Math.abs(Math.sin((u * 3.5 + swirl * 2.6) * TAU));
    const fine = fbm(u * 26, v * 4, 26, 4, 4, 131);
    let c = mix([38, 28, 20], [96, 70, 46], cl01(grain * 0.5 + fine * 0.5));
    // трещины усушки вдоль волокна
    const crack = ss(0.955, 1, ridge(u * 22, v * 2, 22, 2, 3, 191));
    c = mix(c, [16, 11, 8], crack * 0.9);
    // сучки
    const w = worley(u * 4, v * 3, 4, 3, 233);
    const knot = ss(0.22, 0.04, w.f1) * ss(0.72, 0.95, w.id);
    c = mix(c, [30, 20, 13], knot * 0.85);
    c = add(c, (fine - 0.5) * 16);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = 0.5 + (grain - 0.5) * 0.25 + (fine - 0.5) * 0.35 - crack * 0.55 - knot * 0.2;
    p.rough = 0.86 + (fine - 0.5) * 0.1 - knot * 0.12;
};
/* ------------------------------------------------------------------ *
 * 2. Бутовый камень - Worley с искажением домена
 *
 * Разность `f2 - f1` даёт шов между ячейками, из него и растёт кладка. Тон
 * каждого камня берётся из `id` ячейки: без этого соседние блоки выходят
 * одного цвета, и стена читается как штукатурка с прожилками.
 * ------------------------------------------------------------------ */
export function rubble(warm) {
    const A = warm ? [72, 68, 62] : [56, 57, 55];
    const B = warm ? [140, 134, 122] : [116, 118, 114];
    return (x, y, S, p) => {
        const u = x / S;
        const v = y / S;
        const wx = fbm(u * 6, v * 6, 6, 6, 3, 311) - 0.5;
        const wy = fbm(u * 6, v * 6, 6, 6, 3, 317) - 0.5;
        // камни вытянуты по горизонтали: пять ячеек поперёк, три вдоль
        const w = worley(u * 5 + wx * 0.55, v * 3 + wy * 0.55, 5, 3, 353);
        const edge = w.f2 - w.f1;
        const stone = ss(0.02, 0.13, edge);
        const rock = fbm(u * 70, v * 70, 70, 70, 4, 401);
        let c = mix(A, B, cl01(w.id * 0.8 + 0.1));
        c = add(c, (rock - 0.5) * 30);
        // сколы и вкрапления
        const pit = ss(0.68, 0.92, fbm(u * 26, v * 26, 26, 26, 3, 433));
        c = mix(c, mix(A, B, 0.15), pit * 0.4);
        const spar = ss(0.86, 1, fbm(u * 120, v * 120, 120, 120, 2, 461));
        c = mix(c, [186, 182, 172], spar * 0.5);
        // раствор
        const mortar = 1 - stone;
        c = mix(c, [46, 44, 41], mortar * 0.88);
        p.r = c[0];
        p.g = c[1];
        p.b = c[2];
        p.h = stone * 0.72 + 0.12 + (rock - 0.5) * 0.2 - pit * 0.1;
        p.rough = 0.9 - stone * 0.06 + pit * 0.05;
    };
}
/* ------------------------------------------------------------------ *
 * 3. Плиты пода - крупная неровная брусчатка, светлее и теплее бута
 * ------------------------------------------------------------------ */
export const hearth = (x, y, S, p) => {
    const u = x / S;
    const v = y / S;
    const wx = (fbm(u * 8, v * 8, 8, 8, 3, 503) - 0.5) * 0.35;
    const w = worley(u * 3 + wx, v * 3 - wx, 3, 3, 541);
    const edge = ss(0.015, 0.1, w.f2 - w.f1);
    const rock = fbm(u * 60, v * 60, 60, 60, 4, 577);
    let c = mix([104, 96, 84], [172, 160, 140], cl01(w.id * 0.85 + 0.08));
    c = add(c, (rock - 0.5) * 26);
    const soot = ss(0.55, 0.9, fbm(u * 5, v * 5, 5, 5, 4, 601));
    c = mix(c, [48, 42, 38], soot * 0.45);
    c = mix(c, [62, 57, 50], (1 - edge) * 0.85);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = edge * 0.68 + 0.14 + (rock - 0.5) * 0.22;
    p.rough = 0.86 - edge * 0.08 + soot * 0.06;
};
/* ------------------------------------------------------------------ *
 * 4. Огнеупорный кирпич топки
 *
 * `sootRise` - насколько сажа густеет кверху. В эталоне градиент был вшит
 * намертво (значение 1), и карта из-за него не стыковалась по вертикали: у
 * монотонного градиента верх с низом не сходится по определению. Для топки
 * высотой в один тайл это правильно, для стены в два - уже нет, поэтому
 * градиент стал ручкой. На нуле кирпич тайлится в обе стороны; это проверено
 * счётом, а не обещано.
 *
 * Рядов ЧЁТНОЕ число, и это не вкусовщина: перевязка сдвигает каждый второй ряд
 * на полкирпича, и при нечётном числе на стыке тайлов встают два ряда с
 * одинаковым сдвигом - швы выстраиваются в столбик ровно там, где кладка должна
 * выглядеть непрерывной. В эталоне рядов было девять.
 * ------------------------------------------------------------------ */
export function firebrick(sootRise = 1) {
    const cols = 4;
    const rows = 8;
    return (x, y, S, p) => {
        const u = x / S;
        const v = y / S;
        const row = wrapi(Math.floor(v * rows), rows);
        const cu = u * cols + (row % 2) * 0.5;
        const col = wrapi(Math.floor(cu), cols);
        const fx = cu - Math.floor(cu);
        const fy = v * rows - Math.floor(v * rows);
        const mx = 3.4 / (S / cols);
        const my = 3.4 / (S / rows);
        const inside = Math.min(ss(0, mx, Math.min(fx, 1 - fx)), ss(0, my, Math.min(fy, 1 - fy)));
        const rnd = hash2(col, row, 653);
        let c = mix([104, 52, 32], [166, 92, 52], rnd);
        const gr = fbm(u * 80, v * 80, 80, 80, 3, 691);
        c = add(c, (gr - 0.5) * 26);
        c = mix(c, [96, 78, 66], (1 - inside) * 0.8);
        // сажа: пятнами всегда, кверху гуще - по желанию
        const blotch = ss(0.35, 0.8, fbm(u * 7, v * 7, 7, 7, 4, 719));
        const rise = sootRise > 0 ? ss(0.1, 0.75, 1 - v) * sootRise + (1 - sootRise) : 1;
        c = mix(c, [26, 21, 19], blotch * rise * 0.85);
        p.r = c[0];
        p.g = c[1];
        p.b = c[2];
        p.h = inside * 0.7 + 0.15 + (gr - 0.5) * 0.2;
        p.rough = 0.9 + (gr - 0.5) * 0.08;
    };
}
/* ------------------------------------------------------------------ *
 * 5. Половая доска - широкая, тёмная, истёртая
 * ------------------------------------------------------------------ */
export const floor = (x, y, S, p) => {
    const u = x / S;
    const v = y / S;
    const planks = 4;
    const pu = u * planks;
    const pi = wrapi(Math.floor(pu), planks);
    const f = pu - Math.floor(pu);
    const rnd = hash2(pi, 0, 733);
    const gap = 3.6 / (S / planks);
    const edge = ss(0, gap, Math.min(f, 1 - f));
    const warp = fbm(u * 5, v * 2, 5, 2, 3, 761);
    const rings = Math.abs(Math.sin((f * 5 + warp * 3 + rnd * 5) * TAU));
    const t = cl01(rings * 0.5 + fbm(u * 34, v * 6, 34, 6, 3, 787) * 0.5);
    let c = mix([44, 33, 24], [104, 80, 55], cl01(t * 0.8 + (rnd - 0.5) * 0.45));
    c = add(c, (fbm(u * 90, v * 9, 90, 9, 3, 809) - 0.5) * 20);
    // вытертые дорожки
    const worn = ss(0.55, 0.95, fbm(u * 3, v * 3, 3, 3, 3, 821));
    c = mix(c, [128, 102, 72], worn * 0.3);
    // поперечные стыки досок: у |sin| период π, три оборота укладываются ровно
    const seg = ss(0.985, 1, Math.abs(Math.sin(v * Math.PI * 3 + rnd * 6)));
    c = mix(c, [22, 16, 11], seg * 0.8);
    c = mix(c, [18, 13, 9], (1 - edge) * 0.92);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = edge * 0.62 + 0.18 + (t - 0.5) * 0.2 - seg * 0.4;
    p.rough = 0.84 + (1 - edge) * 0.12 - worn * 0.18;
};
/* ------------------------------------------------------------------ *
 * 6. Тёсаный брус - следы топора
 * ------------------------------------------------------------------ */
export const beam = (x, y, S, p) => {
    const u = x / S;
    const v = y / S;
    const warp = fbm(u * 3, v * 1, 3, 1, 3, 853);
    const grain = Math.abs(Math.sin((v * 3 + warp * 2.4) * TAU));
    const fine = fbm(u * 8, v * 30, 8, 30, 4, 877);
    let c = mix([74, 52, 32], [166, 128, 84], cl01(grain * 0.42 + fine * 0.58));
    // затёсы топором - широкие плавные фаски вдоль бруса
    const chop = Math.abs(Math.sin(u * Math.PI * 7 + fbm(u * 4, v * 4, 4, 4, 2, 883) * 4));
    c = add(c, (chop - 0.5) * 22);
    const crack = ss(0.965, 1, ridge(u * 3, v * 16, 3, 16, 3, 907));
    c = mix(c, [26, 18, 12], crack * 0.85);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = 0.45 + (chop - 0.5) * 0.4 + (fine - 0.5) * 0.25 - crack * 0.5;
    p.rough = 0.85 + (fine - 0.5) * 0.1;
};
/* ------------------------------------------------------------------ *
 * 7. Кора поленницы
 * ------------------------------------------------------------------ */
export const bark = (x, y, S, p) => {
    const u = x / S;
    const v = y / S;
    const rid = ridge(u * 16, v * 2, 16, 2, 4, 941);
    const fine = fbm(u * 60, v * 12, 60, 12, 3, 967);
    let c = mix([32, 26, 20], [96, 84, 62], cl01(rid * 0.72 + fine * 0.38));
    const deep = ss(0.55, 0.95, rid);
    c = mix(c, [18, 14, 10], (1 - deep) * 0.45);
    const moss = ss(0.72, 0.95, fbm(u * 6, v * 6, 6, 6, 3, 983));
    c = mix(c, [72, 82, 48], moss * 0.3);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = rid * 0.8 + (fine - 0.5) * 0.25;
    p.rough = 0.93 + (fine - 0.5) * 0.06;
};
/* ------------------------------------------------------------------ *
 * 8. Торец полена - годовые кольца и радиальные трещины
 *
 * Единственный набор, который не тайлится и не должен: рисунок радиальный, у
 * него есть середина. Он кладётся на торцевую грань цилиндра целиком, одним
 * куском, и повторять его по кромке нечем.
 * ------------------------------------------------------------------ */
export const logEnd = (x, y, S, p) => {
    const u = x / S - 0.5;
    const v = y / S - 0.5;
    const r = Math.sqrt(u * u + v * v) * 2; // 0..1 к краю
    const a = Math.atan2(v, u);
    const wob = (fbm(u * 6 + 3, v * 6 + 3, 12, 12, 3, 1009) - 0.5) * 0.1;
    const rings = Math.abs(Math.sin((r * 1.0 + wob) * Math.PI * 26));
    let c = mix([150, 118, 80], [196, 166, 122], cl01(rings * 0.55 + 0.25));
    // сердцевина темнее, заболонь светлее
    c = mix(c, [118, 88, 58], ss(0.34, 0.02, r) * 0.6);
    c = mix(c, [206, 182, 142], ss(0.72, 0.94, r) * 0.5);
    // радиальные трещины
    const spokes = Math.abs(Math.sin(a * 3.5 + fbm(u * 4 + 5, v * 4 + 5, 8, 8, 2, 1031) * 7));
    const crack = ss(0.985, 1, 1 - spokes) * ss(0.06, 0.5, r) * ss(0.98, 0.7, r);
    c = mix(c, [58, 40, 26], crack * 0.9);
    // кора по кромке
    const barkRim = ss(0.9, 0.99, r);
    c = mix(c, [44, 34, 24], barkRim);
    c = add(c, (fbm(u * 40, v * 40, 40, 40, 3, 1049) - 0.5) * 16);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = 0.55 + (rings - 0.5) * 0.22 - crack * 0.6 - barkRim * 0.25;
    p.rough = 0.82 + barkRim * 0.12;
};
/* ------------------------------------------------------------------ *
 * 9. Ткань
 *
 * Переплетение задано числом нитей НА ТАЙЛ, а не шагом в пикселях: в эталоне
 * стояло `sin(u * S * 0.35)`, то есть 14.26 периода на карту 256 - четверть
 * периода не сходилась на стыке. Заодно рисунок перестал зависеть от размера
 * карты: та же ткань на 512 больше не становится вдвое мельче.
 * ------------------------------------------------------------------ */
export const cloth = (x, y, S, p) => {
    const u = x / S;
    const v = y / S;
    const threads = 14;
    const weave = (Math.sin(u * TAU * threads) * Math.sin(v * TAU * threads) + 1) * 0.5;
    const folds = fbm(u * 4, v * 1, 4, 1, 3, 1093);
    let c = mix([120, 116, 106], [206, 202, 190], cl01(folds * 0.8 + 0.15));
    c = add(c, (weave - 0.5) * 14);
    const dirt = ss(0.62, 0.95, fbm(u * 7, v * 7, 7, 7, 3, 1103));
    c = mix(c, [116, 104, 86], dirt * 0.35);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = folds * 0.7 + weave * 0.3;
    p.rough = 0.95;
};
/* ------------------------------------------------------------------ *
 * 10. Чугун - единственный, у кого есть карта металла
 *
 * Раковины (`pit`) снимают и металличность, и блеск сразу: ржавая точка не
 * отражает. Ровно поэтому металл здесь картой, а не одним числом на материал.
 * ------------------------------------------------------------------ */
export const iron = (x, y, S, p) => {
    const u = x / S;
    const v = y / S;
    const micro = fbm(u * 130, v * 130, 130, 130, 3, 1129);
    let c = mix([22, 21, 20], [58, 55, 52], cl01(micro));
    const pit = ss(0.7, 0.95, fbm(u * 22, v * 22, 22, 22, 3, 1151));
    c = mix(c, [74, 48, 32], pit * 0.55);
    const hi = ss(0.93, 1, ridge(u * 40, v * 8, 40, 8, 3, 1163));
    c = mix(c, [122, 118, 112], hi * 0.5);
    p.r = c[0];
    p.g = c[1];
    p.b = c[2];
    p.h = 0.5 + (micro - 0.5) * 0.5 - pit * 0.3;
    p.rough = 0.52 + pit * 0.35 - hi * 0.2;
    p.metal = 0.92 - pit * 0.35;
};
export const RECIPES = [
    { name: 'log', title: 'брёвна сруба', size: 512, normalStrength: 2.6, tiles: 'both', gen: log },
    {
        name: 'rubble',
        title: 'бутовый камень',
        size: 512,
        normalStrength: 3.0,
        tiles: 'both',
        gen: rubble(false),
    },
    {
        name: 'rubbleWarm',
        title: 'бутовый камень, тёплый',
        size: 512,
        normalStrength: 3.0,
        tiles: 'both',
        gen: rubble(true),
    },
    { name: 'hearth', title: 'плиты очага', size: 512, normalStrength: 2.6, tiles: 'both', gen: hearth },
    {
        name: 'brick',
        title: 'кирпич топки',
        size: 512,
        normalStrength: 2.2,
        tiles: 'u',
        why: 'сажа густеет кверху - монотонный градиент по вертикали не сходится сам с собой. Нужен тайл в обе стороны - берите firebrick(0)',
        gen: firebrick(1),
    },
    {
        name: 'brickPlain',
        title: 'кирпич топки без градиента',
        size: 512,
        normalStrength: 2.2,
        tiles: 'both',
        gen: firebrick(0),
    },
    { name: 'floor', title: 'половая доска', size: 512, normalStrength: 2.2, tiles: 'both', gen: floor },
    { name: 'beam', title: 'тёсаный брус', size: 512, normalStrength: 2.4, tiles: 'both', gen: beam },
    { name: 'bark', title: 'кора дров', size: 256, normalStrength: 3.2, tiles: 'both', gen: bark },
    {
        name: 'logend',
        title: 'торцы поленьев',
        size: 256,
        normalStrength: 2.0,
        tiles: 'none',
        why: 'рисунок радиальный, у него есть середина: кладётся на торец целиком и не повторяется',
        gen: logEnd,
    },
    { name: 'cloth', title: 'ткань', size: 256, normalStrength: 1.6, tiles: 'both', gen: cloth },
    { name: 'iron', title: 'чугун', size: 256, normalStrength: 1.8, tiles: 'both', gen: iron },
];
/** Найти рецепт по имени. */
export function recipe(name) {
    const r = RECIPES.find((x) => x.name === name);
    if (!r)
        throw new Error(`world-core/materials: нет рецепта «${name}»`);
    return r;
}
//# sourceMappingURL=generators.js.map