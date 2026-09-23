/**
 * heroes/pod.ts — капсула-ложе: постамент, ванна, прозрачная крышка-свод.
 *
 * Постамент 0.4 утоплен под ванной на 8 см со всех сторон. Ванна - плита дна
 * и на ней стенки кольцом, всё со скруглёнными углами в плане. Крышка
 * навешена на заднюю длинную кромку (у −Z): рама-кольцо по контуру ванны и на
 * ней стеклянный свод - сегмент кольца вдоль X с плоскими торцами. Свод ногами
 * стоит на раме, торцы - внутри свода, заподлицо с его концами.
 *
 * При `occupied` на дне ванны лежит закутанная форма во весь рост, головой к
 * −X: кольца сечений от темени до стоп, низ сплющен и касается дна, по верху
 * мелкие складки. У изголовья на постаменте спереди - панелька с тремя
 * огоньками (`led`).
 *
 * Начало координат - середина пятна на полу, длина вдоль X, лицо на +Z.
 * Подвижная `lid`: ось X по задней кромке, на 12 мм выше и дальше угла ванны
 * (петли не режут стенку), 0 - закрыта, −1.9 рад - откинута назад за
 * вертикаль. `open` собирает её откинутой. Петли выступают назад за `w` на
 * 2.4 см - это в габарите.
 */
import * as THREE from 'three';
import { arc, cylGeo, looks, merged, movingParts, outward, part, pivot, prismGeo, roundRect, spanGeo } from './kit.js';
const PED = 0.4;
const SLAB = 0.04;
const WALL = 0.04;
const RIM = 0.68;
const OPEN = -1.9;
const KN = 0.012; // радиус петли и вынос оси от угла ванны
const FRAME = 0.03;
const RISE = 0.16;
const GLASS = 0.006;
/**
 * Закутанная форма: кольца сечений вдоль X. Сечение - эллипс со сплющенным
 * низом (нижняя половина на 0.3 высоты), так что самая нижняя точка ровно на
 * `floorY`. Складки - по верхней половине, наружу.
 */
function shroud(len, floorY, x0) {
    // доля длины, полуширина, полувысота
    const prof = [
        [0.0, 0.025, 0.03],
        [0.03, 0.075, 0.075],
        [0.07, 0.095, 0.09],
        [0.11, 0.085, 0.08],
        [0.14, 0.07, 0.065],
        [0.19, 0.19, 0.1],
        [0.3, 0.2, 0.12],
        [0.42, 0.18, 0.11],
        [0.52, 0.175, 0.1],
        [0.62, 0.18, 0.095],
        [0.75, 0.14, 0.08],
        [0.87, 0.11, 0.07],
        [0.95, 0.1, 0.075],
        [0.985, 0.09, 0.09],
        [1.0, 0.04, 0.06],
    ];
    const N = 14;
    const pos = [];
    const uv = [];
    const idx = [];
    const ring = (t, a, b) => {
        const x = x0 + t * len;
        for (let i = 0; i <= N; i++) {
            const phi = (i / N) * Math.PI * 2;
            const s = Math.sin(phi);
            const fold = s > 0 ? 1 + 0.05 * s * Math.sin(3 * phi + t * 23) : 1;
            const z = a * Math.cos(phi) * fold;
            const y = floorY + 0.3 * b + (s >= 0 ? b * s * fold : 0.3 * b * s);
            pos.push(x, y, z);
            uv.push(phi * 0.15, x);
        }
    };
    for (const [t, a, b] of prof)
        ring(t, a, b);
    const R = N + 1;
    for (let k = 0; k + 1 < prof.length; k++) {
        for (let i = 0; i < N; i++) {
            const a = k * R + i;
            const b = a + 1;
            const c = a + R;
            const d = c + 1;
            idx.push(a, c, b, b, c, d);
        }
    }
    // крышки-веера на темени и у стоп
    for (const [k, dx] of [
        [0, -0.012],
        [prof.length - 1, 0.012],
    ]) {
        const [t, , b] = prof[k];
        const c = pos.length / 3;
        pos.push(x0 + t * len + dx, floorY + 0.3 * b + 0.3 * b, 0);
        uv.push(0, 0);
        for (let i = 0; i < N; i++) {
            const a = k * R + i;
            if (k === 0)
                idx.push(c, a + 1, a);
            else
                idx.push(c, a, a + 1);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return outward(g);
}
export function pod({ l = 2.1, w = 0.8, open = false, occupied = true, mats } = {}) {
    const look = looks(mats);
    const g = new THREE.Group();
    g.name = 'pod';
    // постамент, дно, стенки
    g.add(part('pod-pedestal', prismGeo(roundRect(l - 0.16, w - 0.16, 0.06), 'y', 0, PED), look('paint2')));
    const outline = roundRect(l, w, 0.12, 5);
    g.add(part('pod-floor', prismGeo(outline, 'y', PED, PED + SLAB), look('paint')));
    g.add(part('pod-walls', prismGeo(outline, 'y', PED + SLAB, RIM, [roundRect(l - 2 * WALL, w - 2 * WALL, 0.08, 5)]), look('paint')));
    // крышка: ось по задней кромке; в её осях z - от оси вперёд, y - от оси вверх
    const lid = pivot('lid', 0, RIM + KN, -w / 2 - KN, 'x', [0, OPEN], open ? OPEN : 0);
    const zc = w / 2 + KN; // середина ванны в осях крышки
    const frame = prismGeo(outline, 'y', -KN, -KN + FRAME, [roundRect(l - 0.1, w - 0.1, 0.07, 5)]);
    frame.translate(0, 0, zc);
    lid.add(part('lid-frame', frame, look('steel')));
    // свод: сегмент кольца с горизонтальными ногами на раме, торцы внутри
    const base = -KN + FRAME;
    const half = w / 2 - 0.04;
    const Ro = (half * half + RISE * RISE) / (2 * RISE);
    const Ri = Ro - GLASS;
    const yc = base + RISE - Ro;
    const a0 = Math.atan2(base - yc, half);
    const b0 = Math.atan2(base - yc, Math.sqrt(Ri * Ri - (base - yc) ** 2));
    const L = l / 2 - 0.04;
    const shell = prismGeo([...arc(zc, yc, Ro, a0, Math.PI - a0, 24), ...arc(zc, yc, Ri, Math.PI - b0, b0, 24)], 'x', -L, L);
    const ends = [-1, 1].map((s) => prismGeo(arc(zc, yc, Ri, b0, Math.PI - b0, 24), 'x', s < 0 ? -L : L - GLASS, s < 0 ? -L + GLASS : L));
    lid.add(merged('lid-glass', [shell, ...ends], look('glass')));
    lid.add(merged('lid-hinges', [-1, 1].map((s) => cylGeo(KN, KN, 0.1, 10, 'x', s * (l / 2 - 0.35), 0, 0)), look('steel')));
    g.add(lid);
    // огоньки у изголовья: панелька на лице постамента
    const pz = w / 2 - 0.08;
    const PX0 = -l / 2 + 0.17;
    g.add(part('pod-panel', spanGeo(PX0, PX0 + 0.18, 0.25, 0.35, pz, pz + 0.025), look('paint2')));
    g.add(merged('pod-leds', [0.04, 0.09, 0.14].map((dx) => cylGeo(0.006, 0.006, 0.006, 10, 'z', PX0 + dx, 0.3, pz + 0.028)), look('led')));
    if (occupied) {
        const len = Math.min(1.8, l - 2 * WALL - 0.14);
        g.add(part('pod-shroud', shroud(len, PED + SLAB, -len / 2 - 0.03), look('cloth')));
    }
    // габарит - как собрана: откинутая крышка выше и дальше закрытой
    const box = new THREE.Box3().setFromObject(g, true);
    return {
        group: g,
        w: box.max.x - box.min.x,
        d: box.max.z - box.min.z,
        h: box.max.y - box.min.y,
        floor: new THREE.Vector3(0, PED + SLAB, 0),
        leds: new THREE.Vector3(PX0 + 0.09, 0.3, pz + 0.031),
        hinge: new THREE.Vector3(0, RIM + KN, -w / 2 - KN),
        moving: movingParts(g),
    };
}
//# sourceMappingURL=pod.js.map