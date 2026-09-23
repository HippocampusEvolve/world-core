/**
 * heroes/cage.ts — лампа накаливания в проволочной сетке.
 *
 * Сетка - шесть меридианов от воротника у патрона к нижней точке и два
 * пояса поперёк, всё одним мешем: проволока сварена в узлах, и тела друг в
 * друге там по замыслу, а в одном меше проверка тел их не сравнивает. Колба
 * внутри не касается ни одной проволоки.
 *
 * Два крепления:
 *
 *   `hang` - на шнуре. Начало - точка подвеса на потолке; чашка на потолке
 *   неподвижна, всё ниже неё - подвижная `swing`: маятник вокруг точки
 *   подвеса (ось `xz`, ±0.12 рад). При сборке висит отвесно.
 *
 *   `wall` - на кронштейне. Начало - на стене, стена в плоскости z = 0,
 *   лампа выступает на +Z и висит колбой вниз. Подвижных частей нет.
 */
import * as THREE from 'three';
import { boxGeo, cylGeo, looks, merged, movingParts, part, pivot, revolveGeo, torusGeo, wireGeo } from './kit.js';
const SOCKET_R = 0.02;
const SOCKET_H = 0.05;
const WIRE = 0.0022;
/**
 * Патрон, колба и сетка. Начало - середина низа патрона (там колба входит в
 * патрон), колба и сетка ниже. Середина колбы - на 0.05 ниже начала.
 */
function lampHead(look, name) {
    const g = new THREE.Group();
    g.name = `${name}-head`;
    g.add(part(`${name}-socket`, cylGeo(SOCKET_R, SOCKET_R, SOCKET_H, 14, 'y', 0, SOCKET_H / 2, 0), look('paint2')));
    // колба-груша: профиль от низа по оси к горлу, против часовой
    const c = -0.05;
    const bulbProfile = [
        [0, -0.065],
        [0.012, -0.062],
        [0.022, -0.054],
        [0.028, -0.042],
        [0.03, -0.028],
        [0.029, -0.014],
        [0.025, 0.0],
        [0.019, 0.015],
        [0.014, 0.03],
        [0.013, 0.05],
        [0, 0.05],
    ];
    const bulb = revolveGeo(bulbProfile, 16, true);
    bulb.translate(0, c, 0);
    g.add(part(`${name}-bulb`, bulb, look('bulb')));
    // сетка: воротник вокруг патрона, меридианы, два пояса, шишка внизу
    const COLLAR = SOCKET_R + WIRE + 0.0006;
    const merid = [
        [COLLAR, 0.006],
        [0.045, -0.005],
        [0.06, -0.03],
        [0.062, -0.08],
        [0.05, -0.125],
        [0.028, -0.155],
        [0, -0.165],
    ];
    const wires = [torusGeo(COLLAR, WIRE, 4, 20, 'y', 0, 0.006, 0)];
    for (let k = 0; k < 6; k++) {
        const phi = (k / 6) * Math.PI * 2;
        const pts = merid.map(([r, y]) => new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi)));
        wires.push(wireGeo(pts, WIRE, 14, 4));
    }
    wires.push(torusGeo(0.06, WIRE, 4, 24, 'y', 0, -0.03, 0));
    wires.push(torusGeo(0.062, WIRE, 4, 24, 'y', 0, -0.08, 0));
    wires.push(cylGeo(0.008, 0.008, 0.006, 8, 'y', 0, -0.165 - 0.003, 0));
    g.add(merged(`${name}-cage`, wires, look('steel')));
    return g;
}
export function cageLamp({ mount = 'hang', cord = 0.5, mats } = {}) {
    const look = looks(mats);
    const g = new THREE.Group();
    g.name = 'cage-lamp';
    const bottom = 0.171; // от низа патрона до низа сетки
    if (mount === 'hang') {
        const CUP = 0.02;
        g.add(part('cage-lamp-cup', cylGeo(0.035, 0.035, CUP, 14, 'y', 0, -CUP / 2, 0), look('paint2')));
        const swing = pivot('swing', 0, 0, 0, 'xz', [-0.12, 0.12]);
        swing.add(part('cage-lamp-cord', cylGeo(0.004, 0.004, cord - CUP, 6, 'y', 0, -(cord + CUP) / 2, 0), look('rubber')));
        const head = lampHead(look, 'cage-lamp');
        head.position.set(0, -cord - SOCKET_H, 0);
        swing.add(head);
        g.add(swing);
        const R = 0.062 + WIRE;
        return {
            group: g,
            w: 2 * R,
            d: 2 * R,
            h: cord + SOCKET_H + bottom,
            bulb: new THREE.Vector3(0, -cord - SOCKET_H - 0.05, 0),
            moving: movingParts(g),
        };
    }
    // на стене: пластина, вынос, колено, лампа колбой вниз
    const PLATE = 0.012;
    const KNEE = 0.032;
    const OUT = 0.14;
    g.add(part('cage-lamp-plate', boxGeo(0.09, 0.13, PLATE, 0, 0, PLATE / 2), look('paint')));
    g.add(part('cage-lamp-arm', cylGeo(0.009, 0.009, OUT - PLATE, 10, 'z', 0, 0, (OUT + PLATE) / 2), look('steel')));
    g.add(part('cage-lamp-knee', boxGeo(KNEE, KNEE, KNEE, 0, 0, OUT + KNEE / 2), look('paint2')));
    const head = lampHead(look, 'cage-lamp');
    const zc = OUT + KNEE / 2;
    head.position.set(0, -KNEE / 2 - SOCKET_H, zc);
    g.add(head);
    const R = 0.062 + WIRE;
    return {
        group: g,
        w: 2 * R,
        d: zc + R,
        h: 0.13 / 2 + KNEE / 2 + SOCKET_H + bottom,
        bulb: new THREE.Vector3(0, -KNEE / 2 - SOCKET_H - 0.05, zc),
        moving: {},
    };
}
//# sourceMappingURL=cage.js.map