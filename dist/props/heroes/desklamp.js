/**
 * heroes/desklamp.ts — настольная лампа с зелёным стеклянным абажуром.
 *
 * Кабинетный силуэт: круглое латунное основание, стойка сзади, от неё
 * вперёд под абажуром кронштейн с патроном и колбой. Абажур - горизонтальный
 * полуцилиндр стеклом наружу с торцевыми стенками, открытый снизу: свет
 * падает на стол, а сам абажур светится своей ролью (`shade`). Держится
 * абажур задней нижней кромкой на латунной перекладине вдоль него. Из-под
 * абажура висит цепочка-выключатель с шариком.
 *
 * Начало координат - середина основания на столе, лицо на +Z. Абажур
 * смещён вперёд на 12 мм, чтобы стойка прошла за ним. Подвижных частей нет:
 * цепочку дёргает мир, если захочет, - она отдельный меш.
 */
import * as THREE from 'three';
import { arc, cylGeo, looks, merged, part, prismGeo, revolveGeo, spanGeo } from './kit.js';
const BASE_R = 0.1;
const BASE_H = 0.02;
const AXIS_Y = 0.37; // ось абажура, она же нижняя кромка
const AXIS_Z = 0.012;
const SHADE_R = 0.075;
const GLASS = 0.004;
const SHADE_L = 0.3;
const STEM_Z = -0.075;
export function deskLamp({ mats } = {}) {
    const look = looks(mats);
    const g = new THREE.Group();
    g.name = 'desk-lamp';
    // основание: плоский диск со скошенной кромкой
    g.add(part('desk-lamp-base', revolveGeo([
        [0, 0],
        [BASE_R, 0],
        [BASE_R, 0.01],
        [BASE_R - 0.004, 0.016],
        [BASE_R - 0.014, BASE_H],
        [0, BASE_H],
    ], 32), look('brass')));
    // стойка, перекладина под задней кромкой абажура, кронштейн патрона
    const ROD = 0.006;
    const rodY = AXIS_Y + ROD;
    const rodZ = AXIS_Z - Math.sqrt(SHADE_R * SHADE_R - ROD * ROD) - ROD - 0.0002;
    const ARM_Y = 0.33;
    g.add(merged('desk-lamp-stem', [
        cylGeo(0.008, 0.008, rodY + ROD - BASE_H, 12, 'y', 0, (BASE_H + rodY + ROD) / 2, STEM_Z),
        cylGeo(ROD, ROD, 0.12, 10, 'x', 0, rodY, rodZ),
        cylGeo(ROD, ROD, AXIS_Z + 0.012 - STEM_Z, 10, 'z', 0, ARM_Y, (STEM_Z + AXIS_Z + 0.012) / 2),
    ], look('brass')));
    // патрон на конце кронштейна, колба над ним
    const SOCK = 0.013;
    const s0 = ARM_Y + ROD;
    const s1 = s0 + 0.024;
    g.add(part('desk-lamp-socket', cylGeo(SOCK, SOCK, s1 - s0, 12, 'y', 0, (s0 + s1) / 2, AXIS_Z), look('paint2')));
    const bulb = revolveGeo([
        [0, 0],
        [0.011, 0],
        [0.012, 0.012],
        [0.018, 0.025],
        [0.021, 0.037],
        [0.019, 0.049],
        [0.012, 0.057],
        [0, 0.06],
    ], 16, true);
    bulb.translate(0, s1, AXIS_Z);
    g.add(part('desk-lamp-bulb', bulb, look('bulb')));
    // абажур: полукольцо стекла вдоль X и две торцевые стенки
    const shell = prismGeo([...arc(0, 0, SHADE_R, 0, Math.PI, 24), ...arc(0, 0, SHADE_R - GLASS, Math.PI, 0, 24)], 'x', -SHADE_L / 2, SHADE_L / 2);
    const ends = [-1, 1].map((s) => prismGeo(arc(0, 0, SHADE_R - GLASS, 0, Math.PI, 24), 'x', s < 0 ? -SHADE_L / 2 : SHADE_L / 2 - GLASS, s < 0 ? -SHADE_L / 2 + GLASS : SHADE_L / 2));
    const shade = merged('desk-lamp-shade', [shell, ...ends], look('shade'));
    shade.geometry.translate(0, AXIS_Y, AXIS_Z);
    g.add(shade);
    // цепочка-выключатель: ушко на патроне, цепочка, шарик
    const CX = SOCK + 0.003;
    const lug = spanGeo(SOCK - 0.001, SOCK + 0.006, s1 - 0.012, s1 - 0.005, AXIS_Z - 0.002, AXIS_Z + 0.002);
    const chainTop = s1 - 0.012;
    const chainBottom = 0.26;
    const BEAD = 0.004;
    g.add(merged('desk-lamp-chain', [
        lug,
        cylGeo(0.0015, 0.0015, chainTop - chainBottom, 5, 'y', CX, (chainTop + chainBottom) / 2, AXIS_Z),
        cylGeo(BEAD, BEAD, 0.008, 8, 'y', CX, chainBottom - 0.004, AXIS_Z),
    ], look('brass')));
    return {
        group: g,
        w: SHADE_L,
        d: 2 * BASE_R,
        h: AXIS_Y + SHADE_R,
        bulb: new THREE.Vector3(0, s1 + 0.035, AXIS_Z),
        chain: new THREE.Vector3(CX, chainBottom - 0.004, AXIS_Z),
        moving: {},
    };
}
//# sourceMappingURL=desklamp.js.map