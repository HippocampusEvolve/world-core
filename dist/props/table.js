/**
 * table.ts — стол на четырёх ногах с царгами и табурет на трёх.
 *
 * Начало координат - середина пятна на полу. Столешница из половой доски
 * (планки вдоль длины), ноги и царги из бруса. Царги идут между ногами
 * встык, а не сквозь них: у стола, собранного «в глаз», царга проходила бы
 * через ногу, и проверка тел назвала бы это пересечением.
 */
import * as THREE from 'three';
import { lookOf } from './look.js';
import { boxMesh, cylMesh } from './parts.js';
export function table({ w = 1.15, d = 0.75, h = 0.755, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'table';
    const top = lookOf(mats, 'top', 'floor', { normalScale: 0.8, color: 0xc9a473 });
    const legs = lookOf(mats, 'legs', 'beam', { normalScale: 0.7, color: 0x8a6a4a });
    const TOP = 0.05;
    const LEG = 0.07;
    const INSET = 0.1;
    g.add(boxMesh('table-top', w, TOP, d, top, 0, h - TOP / 2, 0, 1, 'x'));
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            g.add(boxMesh('table-leg', LEG, h - TOP, LEG, legs, sx * (w / 2 - INSET), (h - TOP) / 2, sz * (d / 2 - INSET), 1));
        }
    }
    // царги между ногами, под столешницей
    const APRON = 0.08;
    for (const sz of [-1, 1]) {
        g.add(boxMesh('table-apron', w - 2 * INSET - LEG, APRON, 0.03, legs, 0, h - TOP - APRON / 2, sz * (d / 2 - INSET), 1, 'x'));
    }
    return { group: g, w, d, h };
}
export function stool({ r = 0.19, h = 0.45, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'stool';
    const seat = lookOf(mats, 'seat', 'floor', { normalScale: 0.8, color: 0xc9a473 });
    const legs = lookOf(mats, 'legs', 'beam', { normalScale: 0.7, color: 0x8a6a4a });
    const SEAT = 0.055;
    g.add(cylMesh('stool-seat', r, r * 1.05, SEAT, 10, seat, 0, h - SEAT / 2, 0, 2));
    for (const a of [0.4, 2.5, 4.6]) {
        g.add(cylMesh('stool-leg', 0.024, 0.03, h - SEAT, 6, legs, Math.cos(a) * 0.13, (h - SEAT) / 2, Math.sin(a) * 0.13, 2));
    }
    return { group: g, r, h };
}
//# sourceMappingURL=table.js.map