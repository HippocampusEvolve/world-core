/**
 * fixtures.ts — то, что висит на стене и под потолком: доска с крючками,
 * зеркало под простынёй, огнетушитель на кронштейне, кабельный лоток,
 * раковина со смесителем, часы, фоторамка; и ночник.
 *
 * Настенные предметы посажены тылом на плоскость стены: z = 0 - грань стены,
 * предмет выступает в +Z, x = 0 - середина. Начало по высоте названо у каждого.
 * Надписей, цифр и табличек на предметах нет: их кладёт мир, для этого у
 * некоторых предметов есть точки (`labels`) или отдельная плоскость с UV от 0
 * до 1 (циферблат, снимок).
 */
import * as THREE from 'three';
import {} from './look.js';
import { boxMesh, cylMesh } from './parts.js';
import { roleMats } from './roles.js';
import { fillet, frameOf, mesh, pipe, pivot, revolve, slab } from './shapes.js';
/**
 * Настенная доска-вешалка с крючками. Начало - середина доски на стене.
 * Крючок - стальной пруток: от доски вперёд с уклоном вниз, в колене петля,
 * конец загнут вверх; петля плаща садится в колено, а загиб выше плаща.
 * Роли: wood (доска), steel (крючки и их розетки).
 */
export function coatBoard({ hooks = 5, w = 1.3, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'coat-board';
    const m = roleMats(mats);
    const BH = 0.14;
    const BT = 0.025;
    g.add(boxMesh('coat-board-plank', w, BH, BT, m('wood'), 0, 0, BT / 2, 1, 'x'));
    const r = 0.005;
    const points = [];
    const labels = [];
    const step = hooks > 1 ? (w - 0.2) / (hooks - 1) : 0;
    for (let i = 0; i < hooks; i++) {
        const x = hooks > 1 ? -w / 2 + 0.1 + i * step : 0;
        // круглая розетка под крючком: лицо в 4 мм перед доской, но площадью с
        // монету - пять штук вместе меньше квадратного дециметра
        const ros = cylMesh('coat-board-rosette', 0.012, 0.012, 0.004, 8, m('steel'), x, -0.03, BT + 0.002, 4);
        ros.rotation.x = Math.PI / 2;
        g.add(ros);
        // первый отрезок - по нормали к розетке: торец прутка ложится на неё плашмя
        const path = [
            [x, -0.03, BT + 0.004],
            [x, -0.03, BT + 0.012],
            [x, -0.045, 0.068],
            [x, -0.015, 0.082],
        ];
        const bent = fillet(path, 0.012, 3, [2]);
        g.add(mesh('coat-board-hook', pipe(bent, r, 6), m('steel')));
        // петля ложится в колено - на верх прутка в самой низкой точке его оси
        const knee = bent.reduce((lo, p) => (p[1] < lo[1] ? p : lo));
        points.push(new THREE.Vector3(x, knee[1] + r, knee[2]));
        labels.push(new THREE.Vector3(x, 0.035, BT));
    }
    return { group: g, ...frameOf(g), hooks: points, labels };
}
/**
 * Настенное зеркало в раме, поверх него простыня: лежит на верхней планке
 * рамы, огибает её и свисает спереди на 0.2 ниже зеркала, по низу - мягкие
 * складки. Начало - центр зеркала на стене. Простыня - отдельный меш
 * (`mirror-sheet`): мир может её снять. От граней рамы простыня отстоит на
 * 5 мм и толщиной 7 мм, так что её лицо дальше сантиметра от лица рамы.
 * Роли: wood (рама), glass (зеркало), cloth (простыня).
 */
export function coveredMirror({ w = 0.5, h = 0.7, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'covered-mirror';
    const m = roleMats(mats);
    const F = 0.03; // ширина планки рамы
    const FD = 0.025; // глубина рамы
    for (const sy of [-1, 1])
        g.add(boxMesh('mirror-frame', w, F, FD, m('wood'), 0, sy * (h / 2 - F / 2), FD / 2, 2, 'x'));
    for (const sx of [-1, 1])
        g.add(boxMesh('mirror-frame', F, h - 2 * F, FD, m('wood'), sx * (w / 2 - F / 2), 0, FD / 2, 2, 'y'));
    const glass = boxMesh('mirror-glass', w - 2 * F, h - 2 * F, 0.008, m('glass'), 0, 0, 0.004, 2);
    g.add(glass);
    const t = 0.007;
    const c = 0.005;
    const mid = c + t / 2; // средняя линия простыни от граней рамы
    const sw = w + 0.04;
    const drop = h / 2 + 0.2;
    // путь простыни в разрезе (z, y): поверх рамы от стены, дуга вокруг угла, вниз
    const path = [];
    path.push([0.004, h / 2 + mid], [FD * 0.5, h / 2 + mid]);
    for (let k = 0; k <= 4; k++) {
        const a = (Math.PI / 2) * (1 - k / 4);
        path.push([FD + Math.cos(a) * mid, h / 2 + Math.sin(a) * mid]);
    }
    const N = 12;
    for (let k = 1; k <= N; k++)
        path.push([FD + mid, h / 2 - (k / N) * (h / 2 + drop)]);
    const top = 7; // точек до начала свеса
    const f = (u, v) => {
        const j = Math.round(v * (path.length - 1));
        const [z0, y] = path[j];
        const x = (u - 0.5) * sw;
        const fall = j < top ? 0 : (j - top) / (path.length - 1 - top);
        // складки только наружу, от нуля у верха до 1.2 см у подола
        const fold = 0.012 * fall * fall * (1 - Math.cos((2 * Math.PI * x) / 0.14)) * 0.5;
        // края, вышедшие за раму, чуть заворачивают к стене
        const out = Math.max(0, Math.abs(x) - w / 2) / 0.02;
        const wrap = j < top ? 0 : 0.006 * out * Math.min(1, fall * 4);
        return [x, y, z0 + fold - wrap];
    };
    const sheet = mesh('mirror-sheet', slab(8, path.length - 1, f, t), m('cloth'));
    g.add(sheet);
    return { group: g, ...frameOf(g), sheet, glass };
}
/**
 * Огнетушитель на настенном кронштейне. Начало - середина кронштейна на
 * стене: баллон висит в хомуте на стойке, запорная головка сверху, шланг
 * спускается по лицу баллона к раструбу. Баллон высотой 0.565 м.
 * Роли: paint (баллон, по умолчанию красный), steel (кронштейн, хомут,
 * головка, рычаг), rubber (шланг, раструб).
 */
export function extinguisher({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'extinguisher';
    const m = roleMats(mats, { paint: 0xb3261e });
    const za = 0.1; // ось баллона от стены
    const R = 0.075;
    // кронштейн: планка на стене и стойка к хомуту. Планка толщиной 12 мм:
    // лицо тоньше сантиметра спорило бы со стеной за глубину
    const PL = 0.012;
    g.add(boxMesh('extinguisher-plate', 0.05, 0.34, PL, m('steel'), 0, 0.07, PL / 2, 4));
    const bandIn = R + 0.0005;
    const bandOut = R + 0.0045;
    g.add(boxMesh('extinguisher-standoff', 0.03, 0.03, za - bandOut - PL, m('steel'), 0, -0.065, PL + (za - bandOut - PL) / 2, 4));
    const band = mesh('extinguisher-band', revolve([
        [[bandIn, -0.08], [bandOut, -0.08]],
        [[bandOut, -0.08], [bandOut, -0.05]],
        [[bandOut, -0.05], [bandIn, -0.05]],
        [[bandIn, -0.05], [bandIn, -0.08]],
    ], 16), m('steel'), 0, 0, za);
    g.add(band);
    // баллон с горловиной
    const body = mesh('extinguisher-body', revolve([
        [[0, -0.33], [0.068, -0.33]],
        [[0.068, -0.33], [R, -0.323], [R, 0.13], [0.071, 0.16], [0.058, 0.19], [0.035, 0.21], [0.02, 0.215]],
        [[0.02, 0.215], [0.02, 0.235]],
        [[0.02, 0.235], [0, 0.235]],
    ], 16), m('paint'), 0, 0, za);
    g.add(body);
    // запорная головка и рычаг
    g.add(boxMesh('extinguisher-head', 0.05, 0.045, 0.04, m('steel'), 0, 0.235 + 0.0225, za, 4));
    const lever = boxMesh('extinguisher-lever', 0.014, 0.01, 0.1, m('steel'), 0, 0.28 + 0.005, za + 0.03, 4);
    lever.geometry.translate(0, 0, -0.03);
    lever.position.z = za;
    lever.rotation.x = -0.2;
    lever.position.y = 0.28 + 0.005 + 0.005;
    g.add(lever);
    // шланг по лицу баллона и раструб
    const hz = za + 0.0892 * Math.cos(Math.atan2(0.03, 0.084));
    const hose = [
        [0.01, 0.255, za + 0.02],
        [0.02, 0.24, za + 0.05],
        [0.03, 0.17, hz],
        [0.03, -0.1, hz],
    ];
    g.add(mesh('extinguisher-hose', pipe(fillet(hose, 0.03, 3, [1, 2]), 0.009, 8), m('rubber')));
    g.add(cylMesh('extinguisher-nozzle', 0.012, 0.009, 0.07, 10, m('rubber'), 0.03, -0.1 - 0.035, hz, 4));
    return { group: g, ...frameOf(g), body };
}
/**
 * Лоток-швеллер шириной 0.2 с кабелями, на поперечных кронштейнах. Начало -
 * середина одного конца по низу: лоток идёт вдоль +X, ширина по Z, y = 0 -
 * опора кронштейнов (свод, стена), дно лотка на 2 см выше. Кабели лежат на
 * дне и чуть гуляют, концы заподлицо с торцами лотка: лотки ставятся встык.
 * Роли: steel (лоток, кронштейны), rubber (кабели).
 */
export function cableTray({ length = 2, cables = 4, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'cable-tray';
    const m = roleMats(mats);
    const W = 0.2;
    const BT = 0.004;
    const SH = 0.05;
    // лоток лежит на поперечных прутках высотой 2 см: дно в 4 мм, лёгшее
    // прямо на опору, спорило бы с ней за глубину всей своей площадью, а
    // плоская планка под дном - верхом с верхом дна. У прутка с нечётным
    // числом граней сверху и снизу рёбра. Прутки не у торцов: лотки встык не
    // делят один пруток на двоих
    const LEG = 0.02;
    const RAD5 = 5;
    const rr = LEG / 2 / Math.cos(Math.PI / (2 * RAD5));
    const nb = Math.max(2, Math.round(length / 0.6));
    for (let i = 0; i < nb; i++) {
        const x = ((i + 0.5) * length) / nb;
        g.add(mesh('tray-bracket', pipe([[x, LEG / 2, -W / 2], [x, LEG / 2, W / 2]], rr, RAD5), m('steel')));
    }
    // стенки на всю высоту швеллера, дно между ними: низ дна и низы стенок -
    // соседи в одной плоскости, а не наложение
    g.add(boxMesh('tray-bottom', length, BT, W - 2 * BT, m('steel'), length / 2, LEG + BT / 2, 0, 2, 'x'));
    for (const sz of [-1, 1])
        g.add(boxMesh('tray-side', length, BT + SH, BT, m('steel'), length / 2, LEG + (BT + SH) / 2, sz * (W / 2 - BT / 2), 2, 'x'));
    const n = Math.max(1, Math.min(5, cables));
    const radii = [0.012, 0.008, 0.015, 0.01, 0.009];
    const lane = (W - 2 * BT) / n;
    const list = [];
    // нечётное число граней у кабеля: внизу ребро, а не грань, и нижняя грань
    // кабеля не ложится параллельно низу лотка в пяти миллиметрах от него
    const RAD = 7;
    const low = Math.cos(Math.PI / (2 * RAD)); // нижнее ребро - на такой доле радиуса ниже оси
    for (let i = 0; i < n; i++) {
        const r = radii[i];
        const zc = -W / 2 + BT + lane * (i + 0.5);
        const amp = Math.max(0, lane / 2 - r - 0.002);
        const pts = [];
        const K = 6;
        const y = LEG + BT + r * low + 0.0005;
        // у торцов кабель идёт прямо: срез кабеля заподлицо с торцом лотка
        const END = 0.05;
        pts.push([0, y, zc]);
        for (let k = 1; k < K; k++) {
            const x = END + ((k - 1) / (K - 2)) * (length - 2 * END);
            const wave = k === 1 || k === K - 1 ? 0 : Math.sin(k * 1.7 + i * 2.3) * amp;
            pts.push([x, y, zc + wave]);
        }
        pts.push([length, y, zc]);
        const c = mesh('tray-cable', pipe(pts, r, RAD), m('rubber'));
        g.add(c);
        list.push(c);
    }
    return { group: g, ...frameOf(g), cables: list };
}
/**
 * Эмалированная раковина на двух кронштейнах, слив-сифон в стену, смеситель
 * на стене над ней. Начало - на стене, y = 0 - пол, край чаши на высоте `h`.
 * Чаша - прямоугольная со скруглёнными углами (суперэллипс), тыл касается
 * стены. `spout` - конец излива: откуда течёт вода.
 * Роли: enamel (чаша), steel (кронштейны, слив, смеситель).
 */
export function washbasin({ w = 0.55, d = 0.42, h = 0.85, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'washbasin';
    const m = roleMats(mats);
    const a = w / 2;
    const b = d / 2;
    const k = (x) => x; // доли под размеры по умолчанию
    const s = (x, y, z) => [k(x) * (a / 0.275), y, z * (b / 0.21)];
    const bowl = mesh('washbasin-bowl', revolve([
        [[0, -0.16], s(0.19, -0.16, 0.13)],
        [s(0.19, -0.16, 0.13), s(0.205, -0.15, 0.145), s(0.255, -0.06, 0.19), s(0.272, -0.015, 0.207), s(0.275, 0, 0.21)],
        [s(0.275, 0, 0.21), s(0.25, 0, 0.185)],
        [s(0.25, 0, 0.185), s(0.245, -0.02, 0.18), s(0.21, -0.1, 0.145), s(0.17, -0.14, 0.11), s(0.14, -0.148, 0.08)],
        [s(0.14, -0.148, 0.08), [0, -0.148]],
    ], 24, 4), m('enamel'), 0, h, b);
    g.add(bowl);
    const bottom = h - 0.16;
    // кронштейны: полка под плоским дном и планка на стене
    for (const sx of [-1, 1]) {
        const x = sx * 0.12 * (a / 0.275);
        g.add(boxMesh('washbasin-bracket', 0.03, 0.02, 0.3, m('steel'), x, bottom - 0.01, 0.15, 4));
        g.add(boxMesh('washbasin-bracket-plate', 0.03, 0.2, 0.012, m('steel'), x, bottom - 0.02 - 0.1, 0.006, 4));
    }
    // слив: вниз из дна, колено, в стену
    const drain = [
        [0, bottom, b],
        [0, 0.5, b],
        [0, 0.45, b - 0.05],
        [0, 0.45, 0],
    ];
    g.add(mesh('washbasin-drain', pipe(fillet(drain, 0.04, 3, [1, 2]), 0.02, 8), m('steel')));
    // смеситель: корпус поперёк, два ввода из стены, два вентиля, излив
    const my = h + 0.18;
    const MZ = 0.04;
    const body = cylMesh('washbasin-mixer', 0.015, 0.015, 0.2, 10, m('steel'), 0, my, MZ, 4);
    body.rotation.z = Math.PI / 2;
    g.add(body);
    for (const sx of [-1, 1]) {
        const inlet = cylMesh('washbasin-inlet', 0.012, 0.012, MZ - 0.015, 8, m('steel'), sx * 0.085, my, (MZ - 0.015) / 2, 4);
        inlet.rotation.x = Math.PI / 2;
        g.add(inlet);
        g.add(cylMesh('washbasin-valve', 0.011, 0.011, 0.04, 8, m('steel'), sx * 0.075, my + 0.015 + 0.02, MZ, 4));
        g.add(boxMesh('washbasin-tap', 0.06, 0.01, 0.012, m('steel'), sx * 0.075, my + 0.055 + 0.005, MZ, 4));
    }
    const spoutPts = [
        [0, my, MZ + 0.015],
        [0, my, MZ + 0.14],
        [0, my - 0.06, MZ + 0.17],
    ];
    g.add(mesh('washbasin-spout', pipe(fillet(spoutPts, 0.04, 3), 0.009, 8), m('steel')));
    return { group: g, ...frameOf(g), rim: h, bowl, spout: new THREE.Vector3(0, my - 0.06, MZ + 0.17) };
}
/**
 * Круглые настенные часы. Начало - центр на стене. Корпус с ободом, в
 * углублении циферблат (роль paper, UV от 0 до 1 на весь круг - мир кладёт
 * на него цифры), стекло, три стрелки. Стрелки - подвижные подгруппы
 * (`hands-hour`, `hands-minute`, `hands-second`), ось - их локальная Z через
 * центр; по часовой = `rotation.z` в минус. Роли: paint, paper, glass, steel.
 */
export function wallClock({ d = 0.3, time = 0, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'wall-clock';
    const m = roleMats(mats);
    const k = d / 0.3;
    const R = 0.15 * k;
    const Ri = 0.13 * k;
    const geo = revolve([
        { pts: [[0, 0], [R, 0]] },
        { pts: [[R, 0], [R, 0.035], [R - 0.003 * k, 0.043], [0.14 * k, 0.045], [Ri + 0.003 * k, 0.043], [Ri, 0.038]] },
        { pts: [[Ri, 0.038], [Ri, 0.025]] },
        { pts: [[Ri, 0.025], [0, 0.025]], mat: 1, disc: true },
    ], 24);
    geo.rotateX(Math.PI / 2);
    const face = mesh('clock-body', geo, [m('paint'), m('paper')]);
    g.add(face);
    const glass = cylMesh('clock-glass', Ri - 0.001, Ri - 0.001, 0.002, 24, m('glass'), 0, 0, 0.0385, 2);
    glass.rotation.x = Math.PI / 2;
    g.add(glass);
    const sec = time % 60;
    const min = (time / 60) % 60;
    const hr = (time / 3600) % 12;
    const hand = (name, moving, len, wid, z, t, angle) => {
        const p = pivot(name, 0, 0, z, moving);
        p.userData.motion = 'rotate';
        p.userData.axis = 'z';
        p.userData.sign = -1;
        p.add(boxMesh(`${name}-blade`, wid, len, t, m('steel'), 0, len / 2 - 0.012 * k, t / 2, 4));
        p.rotation.z = -angle;
        g.add(p);
        return p;
    };
    const hour = hand('clock-hand-hour', 'hands-hour', 0.075 * k, 0.012 * k, 0.0275, 0.002, (hr / 12) * Math.PI * 2);
    const minute = hand('clock-hand-minute', 'hands-minute', 0.11 * k, 0.008 * k, 0.0305, 0.002, (min / 60) * Math.PI * 2);
    const second = hand('clock-hand-second', 'hands-second', 0.118 * k, 0.003 * k, 0.0335, 0.001, (sec / 60) * Math.PI * 2);
    const cap = cylMesh('clock-cap', 0.006, 0.006, 0.002, 10, m('steel'), 0, 0, 0.0355, 4);
    cap.rotation.x = Math.PI / 2;
    g.add(cap);
    return { group: g, w: 2 * R, d: 0.045, h: 2 * R, hands: { hour, minute, second }, face };
}
/**
 * Рамка на стене и плоскость снимка в ней. Начало - центр на стене. Снимок -
 * плоскость из двух треугольников с UV от 0 до 1 (роль photo): мир рисует
 * на ней снимок сам. Роли: wood, photo.
 */
export function photoFrame({ w = 0.3, h = 0.2, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'photo-frame';
    const m = roleMats(mats);
    const F = 0.02;
    const FD = 0.015;
    for (const sy of [-1, 1])
        g.add(boxMesh('photo-frame-bar', w, F, FD, m('wood'), 0, sy * (h / 2 - F / 2), FD / 2, 4, 'x'));
    for (const sx of [-1, 1])
        g.add(boxMesh('photo-frame-bar', F, h - 2 * F, FD, m('wood'), sx * (w / 2 - F / 2), 0, FD / 2, 4, 'y'));
    // снимок утоплен в рамку, но от стены дальше сантиметра: ближе он спорил
    // бы со стеной за глубину
    const photo = mesh('photo-frame-photo', new THREE.PlaneGeometry(w - 2 * F, h - 2 * F), m('photo'), 0, 0, 0.011);
    g.add(photo);
    return { group: g, w, d: FD, h, photo };
}
/**
 * Ночник: подставка, стойка, патрон, лампочка и абажур-колпак над ней.
 * Начало - середина подставки на столе. Мёртвый или живой - решает мир
 * эмиссией ролей `bulb` и `shade`. Роли: plastic, steel, bulb, shade.
 */
export function nightLamp({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'night-lamp';
    const m = roleMats(mats);
    g.add(mesh('lamp-base', revolve([[[0, 0], [0.06, 0]], [[0.06, 0], [0.058, 0.012], [0.04, 0.026], [0.012, 0.03]], [[0.012, 0.03], [0, 0.03]]], 16), m('plastic')));
    g.add(cylMesh('lamp-stem', 0.006, 0.006, 0.12, 8, m('steel'), 0, 0.03 + 0.06, 0, 4));
    g.add(cylMesh('lamp-socket', 0.013, 0.013, 0.03, 12, m('plastic'), 0, 0.15 + 0.015, 0, 4));
    const bulb = mesh('lamp-bulb', revolve([[[0, 0.18], [0.01, 0.18]], [[0.01, 0.18], [0.011, 0.19], [0.025, 0.205], [0.026, 0.22], [0.018, 0.24], [0, 0.248]]], 14), m('bulb'));
    g.add(bulb);
    const shade = mesh('lamp-shade', revolve([
        [[0, 0.272], [0.04, 0.272]],
        [[0.04, 0.272], [0.07, 0.17]],
        [[0.07, 0.17], [0.067, 0.17]],
        [[0.067, 0.17], [0.037, 0.269]],
        [[0.037, 0.269], [0, 0.269]],
    ], 16), m('shade'));
    g.add(shade);
    return { group: g, ...frameOf(g), bulb, shade };
}
//# sourceMappingURL=fixtures.js.map