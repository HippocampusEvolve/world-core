/**
 * cloth.ts — одежда: плащ с капюшоном на крючке (он же плащ-палатка на
 * гвозде) и пара резиновых сапог.
 *
 * Плащ - одно замкнутое тело по сечениям (`loft`), а не набор деталей:
 * рукава, складки и неровный подол - сдвиг вершин того же тела. Рукав,
 * пришитый отдельной трубой, ушёл бы плечом в корпус на пять сантиметров, и
 * проверка тел назвала бы это первым; вздутие по бокам читается рукавом так
 * же, а тело остаётся одно.
 */
import * as THREE from 'three';
import {} from './look.js';
import { roleMats } from './roles.js';
import { extrude, frameOf, loft, mesh } from './shapes.js';
const ss = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
/** Значение по таблице [аргумент, значение], линейно между точками. */
function table(rows, x) {
    if (x <= rows[0][0])
        return rows[0][1];
    for (let i = 1; i < rows.length; i++) {
        if (x <= rows[i][0])
            return lerp(rows[i - 1][1], rows[i][1], (x - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]));
    }
    return rows[rows.length - 1][1];
}
/**
 * Длинный плащ, висящий на крючке. Начало - точка подвеса: верх петли там,
 * где она лежит на крючке (у `coatBoard` это `hooks[i]`). Плащ висит вниз,
 * верх - под крючком, спина от плеч и ниже лежит на стене (`reach` позади
 * начала), толщина 0.12-0.18 уходит в +Z.
 *
 * С капюшоном петля пришита к его макушке, и капюшон стоит над плечами
 * головой; без капюшона петля на вороте. `cape` - плащ-палатка: без рукавов,
 * конусом от шеи, подол шире. Складки идут только по переду и бокам, спина
 * ровная - ей лежать на стене. Роль: cloth (и петля).
 */
export function coat({ length = 1.25, hood = true, cape = false, width, reach = 0.064, seed = 1, mats } = {}) {
    const g = new THREE.Group();
    g.name = cape ? 'cape' : 'coat';
    const m = roleMats(mats);
    const L = length;
    // петля: кольцо в плоскости XY вокруг крючка, верх её отверстия - в начале
    const RL = 0.012;
    const TL = 0.003;
    const loopGeo = new THREE.TorusGeometry(RL, TL, 5, 12);
    const loop = mesh('coat-loop', loopGeo, m('cloth'), 0, -(RL - TL), 0);
    g.add(loop);
    const d0 = 2 * RL; // низ петли: отсюда начинается ткань
    // верх: капюшон головой или ворот; ds - линия плеч
    const top = hood
        ? [
            // [глубина от d0, полуширина, полуглубина]
            [0.008, 0.03, 0.025],
            [0.025, 0.065, 0.045],
            [0.06, 0.1, 0.06],
            [0.11, 0.12, 0.068],
            [0.17, 0.124, 0.068],
            [0.23, 0.115, 0.064],
            [0.28, 0.108, 0.06],
        ]
        : [
            [0.008, 0.035, 0.025],
            [0.025, 0.06, 0.04],
            [0.05, 0.085, 0.05],
            [0.08, 0.1, 0.055],
        ];
    const ds = d0 + top[top.length - 1][0] + 0.03;
    // корпус: [от плеч, полуширина]; у плащ-палатки конус от шеи
    const widthRows = cape
        ? [
            [0, 0.15],
            [0.06, 0.21],
            [0.14, 0.25],
            [0.4, 0.28],
            [L, 0.36],
        ]
        : [
            // плечи покатые: висящий плащ опускает их, а не держит
            [0, 0.12],
            [0.05, 0.175],
            [0.12, 0.215],
            [0.3, 0.232],
            [0.55, 0.245],
            [L, 0.27],
        ];
    // ширина по рукавам: сжать корпус и рукава, но не уже шеи под капюшоном
    const SLEEVE0 = cape ? 0 : 0.034;
    const full = 2 * (Math.max(...widthRows.map((r) => r[1])) + SLEEVE0);
    const k = width ? width / full : 1;
    for (const row of widthRows)
        row[1] = Math.max(Math.min(row[1], 0.11), row[1] * k);
    const FRONT = cape ? 0.105 : 0.1;
    const BACK = 0.045;
    const wall = -reach + 0.001; // спина на миллиметр перед стеной
    // центр сечения: у верха под крючком, ниже - спиной к стене
    const zAt = (d, back) => Math.max(wall + back, lerp(0, wall + back, ss(d0, d0 + 0.35, d)));
    const sections = [{ y: -d0, z: 0, a: 0, b: 0 }];
    for (const [dd, a, b] of top) {
        const d = d0 + dd;
        const back = b * 0.8;
        sections.push({ y: -d, z: zAt(d, back), a, b, back });
    }
    // рукав кончается манжетой: три сечения вокруг неё дают ступеньку
    const cuff = ds + 0.58;
    const span = L - ds;
    const base = [0, 0.03, 0.07, 0.12, 0.2, 0.3, 0.4, 0.5, 0.56, 0.58, 0.6, 0.75, 0.9, 1.05].filter((x) => x < span - 0.15);
    const depths = [...base, span - 0.1, span].map((x) => ds + x);
    for (const d of depths) {
        const a = table(widthRows, d - ds);
        const b = lerp(0.07, FRONT, ss(ds, ds + 0.15, d));
        const back = lerp(0.055, BACK, ss(ds, ds + 0.15, d));
        sections.push({ y: -d, z: zAt(d, back), a, b, back });
    }
    const ys = sections.map((s) => -s.y);
    const dAt = (t) => {
        // доля пути по сечениям обратно в глубину: warp получает долю, а не метры
        const f = t * (ys.length - 1);
        const i = Math.min(ys.length - 2, Math.floor(f));
        return lerp(ys[i], ys[i + 1], f - i);
    };
    const ph = seed * 1.7;
    const FOLD = cape ? 0.016 : 0.011;
    const SLEEVE = SLEEVE0 * k;
    const body = mesh('coat-body', loft(sections, 24, (t, a) => {
        const d = dAt(t);
        const s = Math.sin(a);
        // спина не двигается: ей лежать на стене
        const front = ss(-0.12, 0.2, s);
        if (front <= 0)
            return [0, 0];
        // рукава: вздутие по бокам, чуть к переду, от плеча до манжеты
        const side = Math.min(Math.abs(Math.atan2(s, Math.cos(a)) - 0.25), Math.abs(Math.atan2(s, Math.cos(a)) - (Math.PI - 0.25)));
        const arm = SLEEVE * Math.exp(-((side / 0.38) ** 2)) * ss(ds + 0.02, ds + 0.12, d) * (1 - ss(cuff - 0.004, cuff + 0.012, d));
        // складки: только наружу, от нуля у груди до полной у подола
        const nf = cape ? 5 : 7;
        const fold = FOLD * ss(ds + 0.12, L, d) ** 1.3 * (0.5 - 0.5 * Math.cos(nf * a + ph + d * 2.1));
        // подол неровный, только вверх: низ плаща ровно на `length`
        const hem = t > 0.999 ? 0.012 * (0.5 + 0.5 * Math.sin(3 * a + ph)) : 0;
        return [(arm + fold) * front, hem];
    }), m('cloth'));
    g.add(body);
    return { group: g, ...frameOf(g), body, loop, reach };
}
/**
 * Пара резиновых сапог, 0.3 x 0.3 x 0.4: каждый - профиль сапога сбоку,
 * выдавленный на ширину со скруглённой фаской. Подошва - часть того же тела:
 * отдельная пластина под сапогом легла бы низом в сантиметре от его низа
 * одной стороной. Начало - середина пары на полу, носки к +Z. Роль: rubber.
 */
export function boots({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'boots';
    const m = roleMats(mats);
    const BEV = 0.015;
    const DEPTH = 0.08;
    // профиль сбоку: вперёд (+Z) и вверх, пятка сзади; фаска добавит по BEV
    const side = [
        [-0.12, 0],
        [0.13, 0],
        [0.145, 0.015],
        [0.15, 0.04],
        [0.14, 0.068],
        [0.115, 0.088],
        [0.07, 0.108],
        [0.03, 0.145],
        [0.005, 0.2],
        [-0.005, 0.3],
        [0, 0.37],
        [-0.12, 0.37],
        [-0.126, 0.3],
        [-0.12, 0.16],
        [-0.13, 0.07],
        [-0.128, 0.025],
    ];
    // длина с фаской - ровно 0.3
    const u0 = Math.min(...side.map((p) => p[0]));
    const u1 = Math.max(...side.map((p) => p[0]));
    const ku = (0.3 - 2 * BEV) / (u1 - u0);
    const prof = side.map(([u, v]) => [u * ku, v]);
    const one = (name, x) => {
        const geo = extrude(prof, DEPTH, BEV);
        // выдавлено по +Z: развернуть так, чтобы профиль встал в плоскость YZ
        geo.rotateY(-Math.PI / 2);
        geo.translate(x + (DEPTH + 2 * BEV) / 2, BEV, 0.0);
        return mesh(name, geo, m('rubber'));
    };
    const left = one('boot-left', -0.095);
    const right = one('boot-right', 0.095);
    g.add(left, right);
    // середина пятна: сапог длиной 0.3 от пятки до носка
    const f = frameOf(g);
    const box = new THREE.Box3().setFromObject(g);
    for (const b of [left, right])
        b.position.z -= (box.min.z + box.max.z) / 2;
    return { group: g, ...f, left, right };
}
//# sourceMappingURL=cloth.js.map