/**
 * beds.ts — железные койки: двухъярусная с голыми досками, одинарная
 * застеленная, скатанный матрас, сложенная раскладушка.
 *
 * Начало координат - середина пятна на полу, длина вдоль Z, изголовье у −Z.
 * Рама из трубы (`pipe`): стойки, продольные и поперечные царги встык к
 * стойкам. Поперечные царги подняты над продольными на 4 см, иначе их концы у
 * стойки сошлись бы ближе толщины трубы. Кровать ядра `bed` деревянная и сюда
 * не годится.
 */
import * as THREE from 'three';
import {} from './look.js';
import { boxMesh } from './parts.js';
import { roleMats } from './roles.js';
import { extrude, fillet, frameOf, mesh, pipe, slab } from './shapes.js';
/**
 * Двухъярусная металлическая койка: четыре стойки, на двух уровнях рама из
 * царг и голые доски поперёк, у торцов перекладины, у верхнего яруса бортик.
 * Роли: paint (рама), wood (доски).
 */
export function bunk({ w = 0.9, l = 2.0, h = 1.8, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'bunk';
    const m = roleMats(mats);
    const P = 0.02; // радиус стойки
    const Rr = 0.016; // радиус царги
    const x0 = w / 2 - P;
    const z0 = l / 2 - P;
    for (const sx of [-1, 1])
        for (const sz of [-1, 1])
            g.add(mesh('bunk-post', pipe([[sx * x0, 0, sz * z0], [sx * x0, h, sz * z0]], P, 8), m('paint')));
    const levels = [];
    const BT = 0.02;
    for (const y of [0.33, 1.23]) {
        // продольные царги по стойкам, поперечные на 4 см выше
        for (const sx of [-1, 1])
            g.add(mesh('bunk-rail', pipe([[sx * x0, y, -(z0 - P)], [sx * x0, y, z0 - P]], Rr, 8), m('paint')));
        for (const sz of [-1, 1])
            g.add(mesh('bunk-end-rail', pipe([[-(x0 - P), y + 0.04, sz * z0], [x0 - P, y + 0.04, sz * z0]], Rr, 8), m('paint')));
        // доски поперёк на продольных царгах
        const n = 8;
        const bw = 0.1;
        const span = l - 0.24;
        for (let i = 0; i < n; i++) {
            const z = -span / 2 + bw / 2 + (i * (span - bw)) / (n - 1);
            g.add(boxMesh('bunk-board', 2 * x0, BT, bw, m('wood'), 0, y + Rr + BT / 2, z, 1, 'x'));
        }
        levels.push(y + Rr + BT);
    }
    // перекладины в торцах и бортик верхнего яруса
    for (const sz of [-1, 1]) {
        for (const y of [0.66, h - 0.06])
            g.add(mesh('bunk-end-bar', pipe([[-(x0 - P), y, sz * z0], [x0 - P, y, sz * z0]], Rr, 8), m('paint')));
    }
    g.add(mesh('bunk-guard', pipe([[x0, 1.5, -(z0 - P)], [x0, 1.5, z0 - P]], Rr, 8), m('paint')));
    return { group: g, w, d: l, h, levels };
}
/**
 * Одинарная металлическая койка, застеленная ровно: изголовье и изножье -
 * гнутые трубы с перекладиной, царги, стальные прутья поперёк, на них матрас,
 * одеяло с отворотом простыни и полами по бокам, подушка у изголовья.
 * Одеяло лежит на матрасе с зазором 2 мм и толщиной 1.6 см, полы - снаружи
 * матраса, отворот - поверх одеяла. Роли: paint (рама), steel (прутья),
 * cloth (матрас, одеяло, простыня, подушка).
 */
export function cot({ w = 0.9, l = 2.0, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'cot';
    const m = roleMats(mats);
    const P = 0.02;
    const Rr = 0.016;
    const x0 = w / 2 - P;
    const z0 = l / 2 - P;
    const HEAD = 0.8;
    const FOOT = 0.6;
    for (const [sz, top] of [
        [-1, HEAD],
        [1, FOOT],
    ]) {
        const U = [
            [-x0, 0, sz * z0],
            [-x0, top - P, sz * z0],
            [x0, top - P, sz * z0],
            [x0, 0, sz * z0],
        ];
        g.add(mesh(sz < 0 ? 'cot-head' : 'cot-foot', pipe(fillet(U, 0.08, 3), P, 8), m('paint')));
        g.add(mesh('cot-end-bar', pipe([[-(x0 - P), top - 0.25, sz * z0], [x0 - P, top - 0.25, sz * z0]], Rr, 8), m('paint')));
    }
    const ry = 0.38;
    for (const sx of [-1, 1])
        g.add(mesh('cot-rail', pipe([[sx * x0, ry, -(z0 - P)], [sx * x0, ry, z0 - P]], Rr, 8), m('paint')));
    // поперечные прутья на царгах. Пруток, а не плоская лента: низ ленты лёг бы
    // параллельно низу матраса в полусантиметре от него, и они спорили бы за
    // глубину. У прутка с нечётным числом граней внизу и вверху рёбра.
    const RR = 0.006;
    const RAD = 5;
    const lift = RR * Math.cos(Math.PI / (2 * RAD)); // от оси прутка до его крайнего ребра
    for (let i = 0; i < 7; i++) {
        const z = -0.75 + i * 0.25;
        g.add(mesh('cot-rod', pipe([[-x0, ry + Rr + lift, z], [x0, ry + Rr + lift, z]], RR, RAD), m('steel')));
    }
    // матрас: скруглённый в разрезе, по всей длине между стойками
    const y0 = ry + Rr + 2 * lift;
    const MW = w - 0.06;
    const MH = 0.13;
    const ML = l - 2 * (P * 2) - 0.02;
    const rc = 0.03;
    const sec = [];
    const corner = (cx, cy, a0) => {
        for (let k = 0; k <= 3; k++) {
            const a = a0 + (k / 3) * (Math.PI / 2);
            sec.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]);
        }
    };
    corner(MW / 2 - rc, rc, -Math.PI / 2);
    corner(MW / 2 - rc, MH - rc, 0);
    corner(-MW / 2 + rc, MH - rc, Math.PI / 2);
    corner(-MW / 2 + rc, rc, Math.PI);
    const mattress = mesh('cot-mattress', extrude(sec, ML), m('cloth'), 0, y0, -ML / 2);
    g.add(mattress);
    const top = y0 + MH;
    // одеяло: разрез - пола слева, верх, пола справа; огибает скругления матраса
    const t = 0.016;
    const off = 0.002 + t / 2;
    const FLAP = 0.1;
    const cross = [];
    cross.push([-(MW / 2 + off), top - FLAP]);
    for (let k = 0; k <= 4; k++) {
        const a = Math.PI - (k / 4) * (Math.PI / 2);
        cross.push([-MW / 2 + rc + Math.cos(a) * (rc + off), top - rc + Math.sin(a) * (rc + off)]);
    }
    for (let k = 0; k <= 4; k++) {
        const a = Math.PI / 2 - (k / 4) * (Math.PI / 2);
        cross.push([MW / 2 - rc + Math.cos(a) * (rc + off), top - rc + Math.sin(a) * (rc + off)]);
    }
    cross.push([MW / 2 + off, top - FLAP]);
    const bz0 = -ML / 2 + 0.45;
    const bz1 = ML / 2 + 0.005;
    const blanket = mesh('cot-blanket', slab(cross.length - 1, 4, (u, v) => {
        const [x, y] = cross[Math.round(u * (cross.length - 1))];
        return [x, y, bz0 + v * (bz1 - bz0)];
    }, t), m('cloth'));
    g.add(blanket);
    // отворот простыни поверх одеяла у его головного края
    const ft = 0.012;
    g.add(boxMesh('cot-sheet-fold', MW + 0.02, ft, 0.2, m('cloth'), 0, top + 0.002 + t + ft / 2, bz0 + 0.1, 1, 'x'));
    // подушка у изголовья, на матрасе
    const pw = 0.56;
    const ph = 0.14;
    const pd = 0.36;
    const pr = 0.05;
    const ps = [];
    const pc = (cx, cy, a0) => {
        for (let k = 0; k <= 3; k++) {
            const a = a0 + (k / 3) * (Math.PI / 2);
            ps.push([cx + Math.cos(a) * pr, cy + Math.sin(a) * pr]);
        }
    };
    pc(pw / 2 - pr, pr, -Math.PI / 2);
    pc(pw / 2 - pr, ph - pr, 0);
    pc(-pw / 2 + pr, ph - pr, Math.PI / 2);
    pc(-pw / 2 + pr, pr, Math.PI);
    const pillow = mesh('cot-pillow', extrude(ps, pd), m('cloth'), 0, top, -ML / 2 + 0.03);
    g.add(pillow);
    return { group: g, w, d: l, h: HEAD, top, mattress, blanket, pillow };
}
/**
 * Скатанный матрас, перевязанный двумя шнурами. Ось рулона вдоль X, `l` -
 * длина рулона (ширина матраса), `d` - диаметр вместе со шнурами. В разрезе
 * - виток спирали: у пола ступенька там, где кончается внешний слой. Рулон
 * лежит на шнурах, шнуры - на полу. Роли: cloth (матрас и шнуры).
 */
export function rolledMattress({ l = 0.9, d = 0.32, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'rolled-mattress';
    const m = roleMats(mats);
    const tube = 0.005;
    const R = d / 2 - 2 * tube - 0.0005;
    const cy = d / 2;
    const K = 20;
    const snail = [];
    for (let k = 0; k < K; k++) {
        const a = (k / K) * Math.PI * 2;
        const r = R - 0.012 * (k / K);
        // угол от низа: ступенька внешнего слоя - у пола
        snail.push([Math.sin(a) * r, -Math.cos(a) * r]);
    }
    const geo = extrude(snail, l);
    geo.rotateY(Math.PI / 2);
    g.add(mesh('mattress-roll', geo, m('cloth'), -l / 2, cy, 0));
    for (const sx of [-1, 1]) {
        const cord = new THREE.TorusGeometry(R + tube + 0.0005, tube, 5, 16);
        cord.rotateY(Math.PI / 2);
        g.add(mesh('mattress-cord', cord, m('cloth'), sx * (l / 2 - 0.15), cy, 0));
    }
    return { group: g, ...frameOf(g) };
}
/**
 * Сложенная раскладушка, стоит на торце: две рамы из трубы кольцом,
 * между ними брезент, поверх передней рамы - сложенные опоры.
 * Роли: steel (рамы, опоры), cloth (брезент).
 */
export function foldedCot({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'folded-cot';
    const m = roleMats(mats);
    const r = 0.012;
    const W = 0.65;
    const H = 0.95;
    const loop = (z) => {
        const pts = [
            [-W / 2, r, z],
            [W / 2, r, z],
            [W / 2, r + H, z],
            [-W / 2, r + H, z],
        ];
        const round = [];
        // скруглить все четыре угла кольца
        for (let i = 0; i < 4; i++) {
            const a = pts[(i + 3) % 4];
            const p = pts[i];
            const b = pts[(i + 1) % 4];
            round.push(...fillet([a, p, b], 0.05, 2).slice(1, -1));
        }
        return pipe(round, r, 6, true);
    };
    const zb = -0.045;
    const zf = 0.035;
    g.add(mesh('folded-cot-frame', loop(zb), m('steel')));
    g.add(mesh('folded-cot-frame', loop(zf), m('steel')));
    const ct = zf - zb - 2 * r - 0.006;
    g.add(boxMesh('folded-cot-canvas', W - 0.06, H - 0.06, ct, m('cloth'), 0, r + H / 2, (zb + zf) / 2, 2));
    // опоры: две гнутые скобы поверх передней рамы, лежат на её стойках
    for (const sy of [0.2, 0.75]) {
        const leg = [
            [-0.32, sy - 0.1, zf + 2 * r],
            [-0.345, sy, zf + 2 * r],
            [0.345, sy, zf + 2 * r],
            [0.32, sy - 0.1, zf + 2 * r],
        ];
        g.add(mesh('folded-cot-leg', pipe(fillet(leg, 0.03, 2), 0.01, 6), m('steel')));
    }
    return { group: g, ...frameOf(g) };
}
//# sourceMappingURL=beds.js.map