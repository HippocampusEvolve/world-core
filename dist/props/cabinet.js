/**
 * cabinet.ts — корпус из щитов: боковины, крыша, дно, задник, перемычки,
 * а в проёмах ящики, дверцы и полки.
 *
 * На нём стоят стол с тумбой, тумбочка, сервант, стальной шкафчик, аптечка
 * и электрощит: у всех одно устройство, разное только сочетание проёмов.
 *
 * Корпус собран так, чтобы проверка тел не нашла в нём ничего:
 *   - щиты стоят встык: дно, задник и перемычки МЕЖДУ боковинами, крыша
 *     поверх; ни один щит не проходит сквозь другой;
 *   - дверцы и лица ящиков утоплены в проём заподлицо с кромкой корпуса и
 *     отстоят от неё на зазор: их лицевая плоскость совпадает с кромками, но
 *     не перекрывает их (соседство, не наложение);
 *   - короб ящика отстоит от боковин и перемычек на зазор, щиты не тоньше
 *     1.2 см - иначе параллельные грани одной стороны сошлись бы ближе
 *     сантиметра и спорили за глубину.
 *
 * Подвижные части - подгруппы с `userData`:
 *   moving  имя ('door', 'door-left', 'drawer'...)
 *   motion  'rotate' или 'slide'
 *   axis    локальная ось движения ('y' у дверцы, 'z' у ящика)
 *   sign    в какую сторону открывается (+1 или −1)
 *   limit   предел: угол в радианах или ход в метрах
 * Дверца крутится вокруг своей петли (начало подгруппы на оси петли у лицевой
 * кромки), ящик едет вдоль +Z (начало - середина его лица). Содержимое ящика
 * мир кладёт в саму подгруппу, и оно едет вместе с ним.
 */
import * as THREE from 'three';
import { boxMesh, cylMesh } from './parts.js';
import { pivot } from './shapes.js';
/** Зазор вокруг дверцы и ящика. */
export const GAP = 0.003;
/** Вынос ручки от лица. */
export const HANDLE_OUT = 0.015;
const DOOR_LIMIT = (100 * Math.PI) / 180;
export function carcass(o) {
    const T = o.T ?? 0.018;
    const base = o.base ?? 0;
    const top = o.top ?? true;
    const { w, h, d, name } = o;
    const g = new THREE.Group();
    g.name = name;
    const drawers = [];
    const doors = [];
    const shelves = [];
    const sideH = (top ? h - T : h) - base;
    for (const sx of [-1, 1]) {
        g.add(boxMesh(`${name}-side`, T, sideH, d, o.body, sx * (w / 2 - T / 2), base + sideH / 2, 0, 1, 'y'));
    }
    if (top)
        g.add(boxMesh(`${name}-top`, w, T, d, o.body, 0, h - T / 2, 0, 1, 'x'));
    const wi = w - 2 * T;
    // дно и перемычки - между боковинами и перед задником
    const rail = (y, label) => g.add(boxMesh(`${name}-${label}`, wi, T, d - T, o.body, 0, y + T / 2, T / 2, 1, 'x'));
    rail(base, 'bottom');
    const backH = (top ? h - T : h) - base;
    g.add(boxMesh(`${name}-back`, wi, backH, T, o.body, 0, base + backH / 2, -d / 2 + T / 2, 1, 'y'));
    if (base > 0) {
        g.add(boxMesh(`${name}-plinth`, w - 0.04, base, d - 0.04, o.body, 0, base / 2, 0, 1, 'x'));
    }
    const yTop = top ? h - T : h;
    const yBot = base + T;
    const fixed = o.slots.reduce((s, x) => s + (x.h ?? 0), 0);
    const loose = o.slots.filter((x) => x.h === undefined).length;
    const railsH = (o.slots.length - 1) * T;
    const rest = loose ? (yTop - yBot - fixed - railsH) / loose : 0;
    let y = yTop;
    o.slots.forEach((s, i) => {
        const sh = s.h ?? rest;
        const y0 = y - sh;
        const yc = y0 + sh / 2;
        const hasFront = s.kind === 'door' || s.kind === 'doors';
        if (s.kind === 'drawer')
            drawers.push(drawer(g, `${name}-drawer`, wi, sh, d, T, yc, o, drawers.length));
        if (s.kind === 'door')
            doors.push(door(g, `${name}-door`, wi, sh, d, T, yc, s.hinge ?? 'left', o, 'door'));
        if (s.kind === 'doors') {
            const half = wi / 2 + GAP / 2;
            doors.push(door(g, `${name}-door-left`, half, sh, d, T, yc, 'left', o, 'door-left', -wi / 2));
            doors.push(door(g, `${name}-door-right`, half, sh, d, T, yc, 'right', o, 'door-right', wi / 2));
        }
        if (s.shelf) {
            const sd = d - T - (hasFront ? T + 0.006 : 0.01);
            g.add(boxMesh(`${name}-shelf`, wi, T, sd, o.body, 0, yc - T / 2, -d / 2 + T + sd / 2, 1, 'x'));
            shelves.push(yc);
        }
        shelves.push(y0);
        y = y0 - T;
        if (i < o.slots.length - 1)
            rail(y, 'rail');
    });
    const inner = new THREE.Box3(new THREE.Vector3(-wi / 2, yBot, -d / 2 + T), new THREE.Vector3(wi / 2, yTop, d / 2));
    return { group: g, drawers, doors, shelves, inner };
}
/** Ящик: лицо заподлицо с кромкой и короб за ним. Подгруппа едет по +Z. */
function drawer(g, name, wi, sh, d, T, yc, o, n) {
    const t = 0.012;
    const fw = wi - 2 * GAP;
    const fh = sh - 2 * GAP;
    const FT = 0.018;
    const p = pivot(n ? `${name}-${n + 1}` : name, 0, yc, d / 2 + (o.pull ?? 0), 'drawer');
    const dd = d - FT - T - 0.01;
    const side = Math.max(0.04, fh - 0.03);
    const y0 = -fh / 2 + 0.01;
    p.userData.motion = 'slide';
    p.userData.axis = 'z';
    p.userData.sign = 1;
    p.userData.limit = dd * 0.75;
    p.add(boxMesh(`${name}-front`, fw, fh, FT, o.front, 0, 0, -FT / 2, 1, 'x'));
    for (const sx of [-1, 1]) {
        p.add(boxMesh(`${name}-wall`, t, side, dd, o.body, sx * (fw / 2 - t / 2), y0 + side / 2, -FT - dd / 2, 1, 'z'));
    }
    p.add(boxMesh(`${name}-floor`, fw - 2 * t, t, dd - t, o.body, 0, y0 + t / 2, -FT - (dd - t) / 2, 1, 'x'));
    p.add(boxMesh(`${name}-tail`, fw - 2 * t, side, t, o.body, 0, y0 + side / 2, -FT - dd + t / 2, 1, 'x'));
    handle(p, o, 0, 0);
    // куда класть содержимое: середина дна ящика, в координатах подгруппы
    p.userData.inside = new THREE.Vector3(0, y0 + t, -FT - (dd - t) / 2);
    g.add(p);
    return p;
}
/** Дверца в проёме: подгруппа на оси петли у лицевой кромки. */
function door(g, name, width, sh, d, T, yc, hinge, o, moving, at) {
    const s = hinge === 'left' ? 1 : -1;
    const x = at ?? (s * -1 * (o.w / 2 - T));
    const dw = width - 2 * GAP;
    const p = pivot(name, x, yc, d / 2, moving);
    p.userData.motion = 'rotate';
    p.userData.axis = 'y';
    p.userData.sign = -s;
    p.userData.limit = DOOR_LIMIT;
    p.add(boxMesh(`${name}-leaf`, dw, sh - 2 * GAP, T, o.front, s * (GAP + dw / 2), 0, -T / 2, 1, 'y'));
    handle(p, o, s * (GAP + dw - 0.04), 0);
    p.rotation.y = -s * (o.open ?? 0);
    g.add(p);
    return p;
}
function handle(p, o, x, y) {
    // ручка у лица: у ящика планка, у дверцы кнопка; обе стоят на лице, не в нём
    if (p.userData.moving === 'drawer') {
        p.add(boxMesh(`${p.name}-handle`, 0.1, 0.014, HANDLE_OUT, o.handle, x, y, HANDLE_OUT / 2, 4));
    }
    else {
        const k = cylMesh(`${p.name}-knob`, 0.011, 0.011, HANDLE_OUT, 10, o.handle, x, y, HANDLE_OUT / 2, 4);
        k.rotation.x = Math.PI / 2;
        p.add(k);
    }
}
//# sourceMappingURL=cabinet.js.map