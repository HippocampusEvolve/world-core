/**
 * bed.ts — кровать: каркас на ножках, изголовье, матрас, плед с полами,
 * подушка.
 *
 * Начало координат - середина пятна кровати на полу, длина вдоль Z, изголовье
 * у −Z. Плед - три коробки: полотно поверх матраса и две полы, свисающие по
 * бокам НАРУЖУ каркаса. Без пол одеяло читается крышкой ящика; с ними, да ещё
 * в клетку, - одеялом. Каждая деталь либо стоит на соседней, либо отстоит от
 * неё на миллиметр: пересечений тел нет, и за этим следит счёт
 * (`world-check-kit`), а не глаз.
 */
import * as THREE from 'three';
import { lookOf } from './look.js';
import { boxMesh } from './parts.js';
export function bed({ w = 1.02, l = 2.1, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'bed';
    const frame = lookOf(mats, 'frame', 'beam', { normalScale: 0.7, color: 0x8a6a4a });
    const sheet = lookOf(mats, 'sheet', 'cloth', { normalScale: 0.8, color: 0xe6dcc8 });
    const blanket = lookOf(mats, 'blanket', 'wool', { normalScale: 1.1 });
    const pillow = lookOf(mats, 'pillow', 'cloth', { normalScale: 0.9, color: 0xf2ebdc });
    const LEG = 0.08; // просвет под каркасом
    const FRAME = 0.26;
    const MATT = 0.13;
    const frameTop = LEG + FRAME;
    const mattTop = frameTop + MATT;
    // ножки-чурки по углам и каркас на них, планки вдоль длины
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            g.add(boxMesh('bed-leg', 0.06, LEG, 0.06, frame, sx * (w / 2 - 0.05), LEG / 2, sz * (l / 2 - 0.05), 1));
        }
    }
    g.add(boxMesh('bed-frame', w, FRAME, l, frame, 0, LEG + FRAME / 2, 0, 1, 'z'));
    // изголовье: доски стоймя, ЗА каркасом, от пола
    const HEAD = 0.85;
    g.add(boxMesh('bed-head', w, HEAD, 0.05, frame, 0, HEAD / 2, -l / 2 - 0.025, 1));
    // матрас: уже каркаса, на нём
    g.add(boxMesh('bed-mattress', w - 0.08, MATT, l - 0.08, sheet, 0, frameTop + MATT / 2, 0, 4));
    // плед: полотно шире матраса и две полы наружу каркаса
    const BL = 0.05;
    const blLen = l * 0.62;
    const blZ = l / 2 - blLen / 2 - 0.02;
    g.add(boxMesh('bed-blanket', w + 0.04, BL, blLen, blanket, 0, mattTop + BL / 2, blZ, 3, 'z'));
    const FLAP = 0.32;
    for (const sx of [-1, 1]) {
        g.add(boxMesh('bed-blanket-flap', 0.02, FLAP, blLen, blanket, sx * (w / 2 + 0.011), mattTop - FLAP / 2, blZ, 3, 'z'));
    }
    // подушка у изголовья, чуть вкось
    const PW = 0.52;
    const PH = 0.11;
    const PD = 0.34;
    const p = boxMesh('bed-pillow', PW, PH, PD, pillow, 0, mattTop + PH / 2, -l / 2 + 0.06 + PD / 2, 4);
    p.rotation.y = 0.08;
    g.add(p);
    return { group: g, w, l, h: mattTop };
}
//# sourceMappingURL=bed.js.map