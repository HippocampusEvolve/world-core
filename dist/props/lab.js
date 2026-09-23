/**
 * lab.ts — лаборатория и медпункт: стеллаж рассады с лампами, куст помидора
 * в горшке, банка с землёй, микроскоп, ящичек с жестяными бирками,
 * медицинские весы.
 *
 * Начало координат - середина пятна на полу (или на столе), лицо к +Z.
 * Живое (куст) собирается от семени (`seed`): тот же номер - тот же куст.
 */
import * as THREE from 'three';
import {} from './look.js';
import { boxMesh, cylMesh } from './parts.js';
import { roleMats } from './roles.js';
import { boxGeo, extrude, frameOf, merge, mesh, pipe, place, revolve, slab } from './shapes.js';
/** Детерминированный случай от семени (mulberry32). */
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * Стальной стеллаж: четыре уголка-стойки, полки на продольных связях, крыша;
 * под каждой вышележащей полкой (и под крышей) - лампа-планка: корпус и
 * трубка. Роли: paint (стойки, связи), steel (полки, корпуса ламп), tube.
 */
export function plantRack({ w = 2.0, d = 0.5, h = 1.8, shelves = 3, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'plant-rack';
    const m = roleMats(mats);
    const S = 0.04; // стойка
    const PT = 0.03; // полка
    const RT = 0.025; // связь
    const px = w / 2 - S / 2;
    const pz = d / 2 - S / 2;
    for (const sx of [-1, 1])
        for (const sz of [-1, 1])
            g.add(boxMesh('rack-post', S, h, S, m('paint'), sx * px, h / 2, sz * pz, 1, 'y'));
    const inX = w - 2 * S;
    const y0 = 0.15;
    const gap = (h - PT - y0) / shelves;
    const tops = [];
    const lamps = [];
    for (let i = 0; i <= shelves; i++) {
        // нижняя грань полки; последняя - крыша вровень с верхом стоек
        const yb = i < shelves ? y0 + i * gap : h - PT;
        for (const sz of [-1, 1])
            g.add(boxMesh('rack-beam', inX, RT, RT, m('paint'), 0, yb - RT / 2, sz * pz, 1, 'x'));
        g.add(boxMesh(i < shelves ? 'rack-shelf' : 'rack-roof', inX, PT, 2 * pz, m('steel'), 0, yb + PT / 2, 0, 1, 'x'));
        if (i < shelves)
            tops.push(yb + PT);
        if (i > 0) {
            // лампа под этой полкой - над предыдущей; корпус прижат к её низу
            const hy = yb;
            const HW = inX - 0.2;
            g.add(boxMesh('rack-lamp-housing', HW, 0.035, 0.06, m('steel'), 0, hy - 0.0175, 0, 1, 'x'));
            const tube = cylMesh('rack-lamp-tube', 0.012, 0.012, HW - 0.06, 10, m('tube'), 0, hy - 0.035 - 0.012, 0, 1);
            tube.rotation.z = Math.PI / 2;
            g.add(tube);
            lamps.push(tube);
        }
    }
    return { group: g, w, d, h, shelves: tops, lamps };
}
/**
 * Куст помидора в пластиковом горшке, подвязан к колышку: стебель, четыре
 * ветки с листьями, мелкие красные плоды под ветками. Высота 0.4-0.47 м.
 * Плоды одним мешем (`tomato-fruits`), листья одним (`tomato-leaves`).
 * Роли: plastic (горшок), soil, wood (колышек), leaf, fruit.
 */
export function tomatoPlant({ fruits = 6, seed = 1, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'tomato-plant';
    const m = roleMats(mats);
    const rnd = rng(seed * 7919 + 13);
    const S = 12;
    const wallAt = (y) => 0.056 + ((y - 0.01) / 0.13) * 0.019;
    g.add(mesh('tomato-pot', revolve([
        [[0, 0], [0.06, 0]],
        [[0.06, 0], [0.08, 0.14]],
        [[0.08, 0.14], [0.083, 0.142], [0.083, 0.15], [0.075, 0.15]],
        [[0.075, 0.15], [0.075, 0.14]],
        [[0.075, 0.14], [0.056, 0.01]],
        [[0.056, 0.01], [0, 0.01]],
    ], S), m('plastic')));
    // земля - слой у верха горшка с отвесным боком
    const sy0 = 0.12;
    const sy1 = 0.135;
    const sr = wallAt(sy0) - 0.001;
    g.add(mesh('tomato-soil', revolve([[[0, sy0], [sr, sy0]], [[sr, sy0], [sr, sy1]], [[sr, sy1], [0, sy1]]], S), m('soil')));
    // колышек
    g.add(boxMesh('tomato-stake', 0.01, 0.33, 0.01, m('wood'), -0.03, sy1 + 0.165, -0.03, 4, 'y'));
    // стебель
    const stem = [];
    for (let k = 0; k <= 5; k++) {
        const y = sy1 + (k / 5) * 0.29;
        stem.push([Math.sin(k * 1.3) * 0.006, y, Math.cos(k * 1.7) * 0.004]);
    }
    g.add(mesh('tomato-stem', pipe(stem, (t) => 0.006 - 0.003 * t, 6), m('leaf')));
    const stemAt = (y) => {
        const k = ((y - sy1) / 0.29) * 5;
        const i = Math.min(4, Math.floor(k));
        const f = k - i;
        const a = new THREE.Vector3(...stem[i]);
        return a.lerp(new THREE.Vector3(...stem[i + 1]), f);
    };
    // ветки: от поверхности стебля наружу и чуть вниз к концу
    const leafGeos = [];
    const fruitGeos = [];
    const fruitSpots = [];
    const heights = [0.21, 0.27, 0.33, 0.39];
    heights.forEach((y, i) => {
        const a = i * 2.4 + rnd() * 0.5;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const base = stemAt(y).addScaledVector(dir, 0.004);
        const mid = base.clone().addScaledVector(dir, 0.05).add(new THREE.Vector3(0, 0.02, 0));
        const end = base.clone().addScaledVector(dir, 0.1).add(new THREE.Vector3(0, -0.005, 0));
        const br = 0.0028;
        g.add(mesh('tomato-branch', pipe([base.toArray(), mid.toArray(), end.toArray()], br, 5), m('leaf')));
        // листья: у конца и по бокам середины, плоские, каждый со своим наклоном
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        const spots = [
            [end.clone().addScaledVector(dir, 0.028), dir],
            [mid.clone().addScaledVector(side, 0.024), side],
            [mid.clone().addScaledVector(side, -0.024), side.clone().negate()],
        ];
        for (const [p, along] of spots) {
            const leaf = new THREE.SphereGeometry(1, 5, 3);
            leaf.scale(0.028, 0.004, 0.013);
            const yaw = Math.atan2(-along.z, along.x);
            place(leaf, p.x, p.y + 0.004, p.z, 0, yaw, (rnd() - 0.5) * 0.5);
            leafGeos.push(leaf);
        }
        // плоды висят под веткой, касаясь её
        fruitSpots.push(mid.clone().lerp(end, 0.35), mid.clone().lerp(base, 0.3));
    });
    // верхушка
    const tip = new THREE.Vector3(...stem[5]);
    for (const s of [-1, 1]) {
        const leaf = new THREE.SphereGeometry(1, 5, 3);
        leaf.scale(0.024, 0.004, 0.011);
        place(leaf, tip.x + s * 0.02, tip.y + 0.004, tip.z, 0, 0, s * 0.3);
        leafGeos.push(leaf);
    }
    const FR = 0.012;
    for (let i = 0; i < Math.min(fruits, fruitSpots.length); i++) {
        const p = fruitSpots[i];
        const f = new THREE.SphereGeometry(FR, 6, 4);
        place(f, p.x, p.y - 0.0028 - FR - 0.0005, p.z);
        fruitGeos.push(f);
    }
    const leaves = mesh('tomato-leaves', merge(leafGeos), m('leaf'));
    const fr = mesh('tomato-fruits', merge(fruitGeos), m('fruit'));
    g.add(leaves, fr);
    return { group: g, ...frameOf(g), fruits: fr, leaves };
}
/**
 * Стеклянная банка с землёй: стенка, плечики, горло, металлическая крышка;
 * земля насыпана на `fill` высоты. Роли: glass, soil, steel.
 */
export function jar({ h = 0.2, fill = 0.6, lid = true, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'jar';
    const m = roleMats(mats);
    const S = 16;
    const neck = lid ? h - 0.012 : h;
    g.add(mesh('jar-glass', revolve([
        [[0, 0], [0.042, 0]],
        [[0.042, 0], [0.045, 0.005], [0.045, neck - 0.028], [0.038, neck - 0.013], [0.034, neck - 0.008]],
        [[0.034, neck - 0.008], [0.036, neck - 0.005], [0.036, neck]],
        [[0.036, neck], [0.031, neck]],
        [[0.031, neck], [0.031, neck - 0.008], [0.041, neck - 0.028], [0.041, 0.008], [0.038, 0.005]],
        [[0.038, 0.005], [0, 0.005]],
    ], S), m('glass')));
    const y1 = Math.max(0.02, Math.min(neck - 0.03, fill * h));
    g.add(mesh('jar-soil', revolve([[[0, 0.0085], [0.0405, 0.0085]], [[0.0405, 0.0085], [0.0405, y1]], [[0.0405, y1], [0, y1]]], S), m('soil')));
    if (lid)
        g.add(cylMesh('jar-lid', 0.038, 0.038, h - neck, S, m('steel'), 0, neck + (h - neck) / 2, 0, 4));
    return { group: g, ...frameOf(g) };
}
/**
 * Микроскоп: основание, колонна с винтами фокуса, предметный столик, дуга
 * тубусодержателя, наклонный тубус с окуляром и объективом.
 * Роли: paint (корпус), steel (тубус, винты), glass (линза окуляра).
 */
export function microscope({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'microscope';
    const m = roleMats(mats, { paint: 0x222322 });
    g.add(boxMesh('microscope-base', 0.13, 0.03, 0.18, m('paint'), 0, 0.015, 0, 4));
    g.add(boxMesh('microscope-pillar', 0.04, 0.11, 0.04, m('paint'), 0, 0.03 + 0.055, -0.06, 4));
    g.add(boxMesh('microscope-stage', 0.1, 0.01, 0.1, m('paint'), 0, 0.13, 0.01, 4));
    for (const sx of [-1, 1]) {
        const k = cylMesh('microscope-knob', 0.018, 0.018, 0.012, 12, m('steel'), sx * (0.02 + 0.006), 0.08, -0.06, 4);
        k.rotation.z = Math.PI / 2;
        g.add(k);
    }
    // тубус: ось наклонена назад на 30°, низ над столиком
    const tilt = Math.PI / 6;
    const axis = new THREE.Vector3(0, Math.cos(tilt), -Math.sin(tilt));
    const foot = new THREE.Vector3(0, 0.17, 0.015);
    const along = (s) => foot.clone().addScaledVector(axis, s);
    // дуга от колонны вверх; последним отрезком упирается в тубус сзади торцом,
    // торец касается его боковины
    const back = new THREE.Vector3(0, -Math.sin(tilt), -Math.cos(tilt));
    const E = along(0.1).addScaledVector(back, 0.016 + 0.0005);
    const pre = E.clone().addScaledVector(back, 0.03);
    const arm = [[0, 0.14, -0.06], [0, 0.2, -0.08], pre.toArray(), E.toArray()];
    g.add(mesh('microscope-arm', pipe(arm, 0.014, 8), m('paint')));
    const cyl = (name, r, s0, s1, role) => {
        const c = along((s0 + s1) / 2);
        const k = cylMesh(name, r, r, s1 - s0, 12, m(role), c.x, c.y, c.z, 4);
        k.rotation.x = -tilt;
        g.add(k);
    };
    cyl('microscope-objective', 0.007, 0, 0.03, 'steel');
    cyl('microscope-tube', 0.016, 0.03, 0.17, 'steel');
    cyl('microscope-eyepiece', 0.011, 0.17, 0.21, 'steel');
    cyl('microscope-lens', 0.009, 0.21, 0.212, 'glass');
    return { group: g, ...frameOf(g) };
}
/**
 * Деревянный ящичек без крышки, в нём рядом стоят на ребре жестяные бирки -
 * как карточки в картотеке, каждая чуть наклонена. Бирки через 1.2 см:
 * ближе их лица сошлись бы за сантиметр. Роли: wood, steel.
 */
export function tagBox({ tags = 16, seed = 1, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'tag-box';
    const m = roleMats(mats);
    const rnd = rng(seed * 104729 + 7);
    const W = 0.25;
    const D = 0.12;
    const H = 0.05;
    const B = 0.008;
    for (const sz of [-1, 1])
        g.add(boxMesh('tagbox-side', W, H, B, m('wood'), 0, H / 2, sz * (D / 2 - B / 2), 4, 'x'));
    for (const sx of [-1, 1])
        g.add(boxMesh('tagbox-end', B, H, D - 2 * B, m('wood'), sx * (W / 2 - B / 2), H / 2, 0, 4, 'z'));
    // дно толще стенок: его верх - внутри ящичка на 12 мм над столом, а не на
    // 8, иначе он спорил бы со столешницей за глубину
    const BB = 0.012;
    g.add(boxMesh('tagbox-bottom', W - 2 * B, BB, D - 2 * B, m('wood'), 0, BB / 2, 0, 4, 'x'));
    const n = Math.max(1, Math.min(tags, 18));
    const step = 0.012;
    const TH = 0.055;
    const TW = 0.035;
    const geos = [];
    for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * step;
        const lean = (rnd() - 0.5) * 0.1;
        const yaw = (rnd() - 0.5) * 0.12;
        const t = boxGeo(0.001, TH, TW, 0, TH / 2, 0);
        place(t, x, BB, (rnd() - 0.5) * 0.02, 0, yaw, lean);
        geos.push(t);
    }
    const mt = mesh('tagbox-tags', merge(geos), m('steel'));
    g.add(mt);
    return { group: g, ...frameOf(g), tags: mt };
}
/**
 * Медицинские весы с гирями на коромысле: площадка с резиновым ковриком,
 * колонна сзади, коробка коромысла наверху, коромысло с двумя гирями.
 * Большая гиря - подвижная подгруппа (`weight`), едет вдоль X.
 * Роли: paint, rubber, steel.
 */
export function scales({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'scales';
    const m = roleMats(mats);
    g.add(boxMesh('scales-platform', 0.4, 0.08, 0.5, m('paint'), 0, 0.04, 0.02, 2));
    g.add(boxMesh('scales-mat', 0.34, 0.012, 0.36, m('rubber'), 0, 0.08 + 0.006, 0.06, 2));
    g.add(boxMesh('scales-column', 0.07, 1.2, 0.07, m('paint'), 0, 0.08 + 0.6, -0.19, 2, 'y'));
    const by = 1.28;
    g.add(boxMesh('scales-beam-box', 0.46, 0.08, 0.07, m('paint'), 0.08, by + 0.04, -0.19, 2, 'x'));
    // коромысло перед коробкой, гири на нём
    const bz = -0.19 + 0.035 + 0.01;
    g.add(boxMesh('scales-beam', 0.44, 0.02, 0.02, m('steel'), 0.08, by + 0.04, bz, 4, 'x'));
    const weight = new THREE.Group();
    weight.name = 'scales-weight';
    weight.userData.moving = 'weight';
    weight.userData.motion = 'slide';
    weight.userData.axis = 'x';
    weight.userData.sign = 1;
    weight.userData.limit = 0.3;
    weight.position.set(-0.08, by + 0.04, bz);
    weight.add(boxMesh('scales-weight-body', 0.03, 0.04, 0.012, m('steel'), 0, 0, 0.01 + 0.006, 4));
    g.add(weight);
    g.add(boxMesh('scales-weight-small', 0.02, 0.03, 0.01, m('steel'), 0.2, by + 0.04, bz + 0.01 + 0.005, 4));
    return { group: g, ...frameOf(g), weight };
}
/**
 * Скатанный бинт диаметром 0.1 лежит на боку, с отпущенным концом. Рулон -
 * кольцо с дыркой по оси, ось вдоль X; хвост - полоса, которая выходит
 * из-под рулона вперёд (+Z) и лежит на столе, конец чуть загнут. Рулон
 * стоит на собственном хвосте: низ рулона - на верху полосы. Отпущенный
 * хвост короче 13 см: полоса площадью больше квадратного дециметра легла бы
 * в двух миллиметрах над столом одной с ним стороной. Начало - под осью
 * рулона на столе. Роль: cloth.
 */
export function bandage({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'bandage';
    const m = roleMats(mats);
    const R = 0.05;
    const W = 0.07;
    const RI = 0.009;
    const c = 0.003; // скругление кромки рулона
    const geo = revolve([
        [[RI, -W / 2], [R - c, -W / 2]],
        [[R - c, -W / 2], [R, -W / 2 + c], [R, W / 2 - c], [R - c, W / 2]],
        [[R - c, W / 2], [RI, W / 2]],
        [[RI, W / 2], [RI, -W / 2]],
    ], 16);
    // ось рулона - вдоль X; вершина кольца (не грань) смотрит вниз
    geo.rotateZ(-Math.PI / 2);
    const T = 0.0015;
    const lift = 0.0005;
    const roll = mesh('bandage-roll', geo, m('cloth'), 0, lift + T + R, 0);
    g.add(roll);
    // хвост: от-под рулона вперёд, в конце загиб кверху
    const TW = W - 0.004;
    const z0 = -0.02;
    const z1 = 0.105;
    const curl = 0.025;
    const tail = mesh('bandage-tail', slab(2, 12, (u, v) => {
        const x = (u - 0.5) * TW;
        const s = v * (z1 - z0 + curl);
        let z = z0 + s;
        let y = lift + T / 2;
        if (s > z1 - z0) {
            // загиб: дуга радиусом 2.5 см кверху
            const a = (s - (z1 - z0)) / curl;
            z = z1 + Math.sin(a) * curl * 0.8;
            y += (1 - Math.cos(a)) * curl * 0.8;
        }
        // полоса чуть гуляет поперёк
        return [x + Math.sin(s * 40) * 0.002 * Math.max(0, s - 0.03), y, z];
    }, T), m('cloth'));
    g.add(tail);
    return { group: g, ...frameOf(g), roll, tail };
}
/**
 * Ножницы, закрытые, лежат плашмя: две половины - лезвие с хвостовиком и
 * кольцо, одним куском каждая. Нижняя лежит на столе, верхняя лезвием на
 * нижней, её кольцо - на столе рядом; винт сверху на оси. Длина 0.15, лезвия
 * к +X. Начало - середина рамки на столе. Роль: steel.
 */
export function scissors({ mats } = {}) {
    const g = new THREE.Group();
    g.name = 'scissors';
    const m = roleMats(mats);
    const T = 0.0022;
    const RR = 0.011;
    const RT = 0.0022;
    // половина в плане: лезвие от оси к +X, хвостовик назад и вбок к кольцу
    const outline = [
        [0.09, 0.0],
        [0.086, 0.003],
        [0.04, 0.0045],
        [0.005, 0.0055],
        [-0.012, 0.009],
        [-0.036, 0.0125],
        [-0.039, 0.0085],
        [-0.015, 0.0035],
        [-0.006, -0.004],
        [0.02, -0.0055],
        [0.07, -0.004],
        [0.087, -0.0015],
    ];
    const half = (name, side, y) => {
        const blade = extrude(side > 0 ? outline : outline.map(([x, v]) => [x, -v]), T);
        // контур лежал в XY, выдавлен по +Z: положить плашмя, толщина вверх
        blade.rotateX(Math.PI / 2);
        blade.translate(0, y + T, 0);
        const ring = new THREE.TorusGeometry(RR, RT, 5, 14);
        ring.rotateX(Math.PI / 2);
        ring.translate(-0.049, RT, side * 0.018);
        return mesh(name, merge([blade, ring]), m('steel'));
    };
    const lower = half('scissors-lower', 1, 0);
    const upper = half('scissors-upper', -1, T + 0.0003);
    const screw = cylMesh('scissors-screw', 0.003, 0.003, 0.0015, 10, m('steel'), 0, 2 * T + 0.0003 + 0.00075, 0, 4);
    g.add(lower, upper, screw);
    const box = new THREE.Box3().setFromObject(g);
    const cx = (box.min.x + box.max.x) / 2;
    for (const o of [lower, upper, screw])
        o.position.x -= cx;
    return { group: g, ...frameOf(g) };
}
//# sourceMappingURL=lab.js.map