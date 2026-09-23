/**
 * heroes/tube.ts — светильник с люминесцентной трубкой.
 *
 * Корпус - швеллер полками вверх, к потолку: снизу виден ровный стальной
 * пояс, под ним трубка между двумя патронами. Так выглядит казённый
 * светильник без рассеивателя, и так он читается с пола.
 *
 * Начало координат - точка крепления на потолке, длина вдоль X. Без подвесов
 * (`rods = 0`) это середина верха корпуса: полки швеллера упираются в потолок
 * при y = 0. С подвесами корпус опускается на `rods`, и два прута держат его
 * от потолочных чашек.
 *
 * Трубка - цилиндр ⌀38 мм с UV в метрах: V идёт вдоль трубки, и мир может
 * положить на её концы тёмные ожоги градиентом, не разрезая геометрию.
 */
import * as THREE from 'three';
import { cylGeo, looks, merged, part, prismGeo, spanGeo } from './kit.js';
/** Радиус трубки: ⌀38 мм, старый образец. */
const R_TUBE = 0.019;
export function tubeFixture({ length = 1.25, rods = 0, mats } = {}) {
    const look = looks(mats);
    const g = new THREE.Group();
    g.name = 'tube-fixture';
    const W = 0.07; // ширина швеллера (Z)
    const H = 0.05; // высота швеллера
    const T = 0.002; // стенка
    const top = -rods;
    const web = top - H; // низ корпуса
    // швеллер: профиль U в (z, y), полки вверх
    const u = [
        [-W / 2, top],
        [-W / 2 + T, top],
        [-W / 2 + T, web + T],
        [W / 2 - T, web + T],
        [W / 2 - T, top],
        [W / 2, top],
        [W / 2, web],
        [-W / 2, web],
    ];
    g.add(part('tube-fixture-body', prismGeo(u, 'x', -length / 2, length / 2), look('paint')));
    // патроны у торцов, под поясом, заподлицо с торцом корпуса
    const HX = 0.03;
    const HH = 0.055;
    const HD = 0.045;
    g.add(merged('tube-fixture-holders', [-1, 1].map((s) => spanGeo(s < 0 ? -length / 2 : length / 2 - HX, s < 0 ? -length / 2 + HX : length / 2, web - HH, web, -HD / 2, HD / 2)), look('plastic')));
    // трубка между патронами, торцами в их внутренние грани
    const tubeLength = length - 2 * HX;
    const yc = web - 0.011 - R_TUBE;
    g.add(part('tube-fixture-tube', cylGeo(R_TUBE, R_TUBE, tubeLength, 16, 'x', 0, yc, 0), look('tube')));
    // подвесы: чашка на потолке и прут до верха пояса, между полками
    if (rods > 0) {
        const cups = [];
        const bars = [];
        const CUP = 0.012;
        for (const s of [-1, 1]) {
            const x = s * (length / 2 - 0.2);
            cups.push(cylGeo(0.03, 0.03, CUP, 12, 'y', x, -CUP / 2, 0));
            const y0 = web + T;
            const y1 = -CUP;
            bars.push(cylGeo(0.004, 0.004, y1 - y0, 6, 'y', x, (y0 + y1) / 2, 0));
        }
        g.add(merged('tube-fixture-cups', cups, look('steel')));
        g.add(merged('tube-fixture-rods', bars, look('steel')));
    }
    return {
        group: g,
        w: length,
        d: W,
        h: rods + H + HH,
        tube: new THREE.Vector3(0, yc, 0),
        tubeLength,
        moving: {},
    };
}
//# sourceMappingURL=tube.js.map