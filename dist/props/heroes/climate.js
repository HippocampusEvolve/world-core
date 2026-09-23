/**
 * heroes/climate.ts — стойка управления и брезент, которым её накрывают.
 *
 * СТОЙКА. Шкаф на утопленном цоколе с козырьком-крышкой. На лице сверху слева
 * планка с тремя стрелочными приборами, справа планка большого рычага режима:
 * рычаг ходит в плоскости лица между двумя положениями. Внизу две дверцы с
 * ручками. Всё, что выступает (планки, приборы, рычаг с рукоятью), помещается
 * в габарит `d`: корпус на 9 см мельче.
 *
 * Начало координат - середина пятна на полу, лицо на +Z. Подвижные части:
 *   `lever` - рычаг, ось Z через прилив: 0.6 (рукоять влево, так собран) и
 *     −0.6 (вправо);
 *   `needle-1..3` - стрелки, ось Y своего прибора (нормаль циферблата,
 *     смотрит на +Z): 0.8 - левый упор, так собраны, −0.8 - правый.
 *
 * БРЕЗЕНТ. Накинут на ящик `w`×`d`×`h`: верх с лёгкой морщиной, скруглённые
 * через ребро края и свес. Спереди (+Z) свес до пола, сзади на 0.35 от верха,
 * по бокам косой - от заднего к переднему. Складки идут вниз и растут к
 * кромке, углы расходятся раструбом. Ткань - замкнутая оболочка толщиной
 * 5 мм (наружная и внутренняя поверхность и полоса кромки), внутренняя
 * поверхность везде не ближе 1.5 см к ящику: складки и морщины идут только
 * наружу. Начало - середина пятна ящика на полу.
 */
import * as THREE from 'three';
import { discUV } from '../../materials/index.js';
import { cylGeo, looks, merged, movingParts, outward, part, pivot, revolveGeo, spanGeo } from './kit.js';
const PRO = 0.09; // полоса перед лицом корпуса под выступающее
export function climateConsole({ w = 1.2, d = 0.5, h = 1.2, mats } = {}) {
    const look = looks(mats);
    const g = new THREE.Group();
    g.name = 'climate-console';
    const FZ = d / 2 - PRO; // лицо корпуса
    const KICK = 0.06;
    const CAP = 0.03;
    g.add(part('climate-kick', spanGeo(-w / 2 + 0.02, w / 2 - 0.02, 0, KICK, -d / 2 + 0.02, FZ - 0.03), look('paint2')));
    g.add(part('climate-body', spanGeo(-w / 2, w / 2, KICK, h - CAP, -d / 2, FZ), look('paint')));
    g.add(part('climate-cap', spanGeo(-w / 2, w / 2, h - CAP, h, -d / 2, FZ + 0.015), look('paint2')));
    // дверцы и ручки
    const PLATE = 0.015;
    const doors = [-1, 1].map((s) => spanGeo(s < 0 ? -w / 2 + 0.03 : 0.01, s < 0 ? -0.01 : w / 2 - 0.03, 0.1, 0.7, FZ, FZ + PLATE));
    g.add(merged('climate-doors', doors, look('paint')));
    g.add(merged('climate-handles', [-1, 1].map((s) => spanGeo(s * 0.05 - 0.01, s * 0.05 + 0.01, 0.35, 0.47, FZ + PLATE, FZ + PLATE + 0.025)), look('steel')));
    // планки: приборная слева сверху, рычажная справа
    const DY = 0.98;
    const DXS = [-0.4, -0.2, 0.0].map((x) => (x * w) / 1.2);
    g.add(part('climate-dial-plate', spanGeo(DXS[0] - 0.12, DXS[2] + 0.08, DY - 0.1, DY + 0.1, FZ, FZ + PLATE), look('paint2')));
    const LX = (0.35 * w) / 1.2;
    const LY = 0.78;
    g.add(part('climate-lever-plate', spanGeo(LX - 0.21, LX + 0.21, LY - 0.06, LY + 0.32, FZ, FZ + PLATE), look('paint2')));
    // приборы: обечайка, циферблат, стрелка - в осях прибора, Y смотрит на +Z
    // циферблат на 16 мм перед планкой (лицо смотрит туда же, куда планка, и
    // накрывает её - ближе сантиметра это полосы), обечайка на 6 мм выше
    const DR = 0.06;
    const FR = 0.052;
    const DH = 0.022;
    const FH = 0.016;
    const bezels = [];
    const faces = [];
    const dials = [];
    DXS.forEach((x, i) => {
        const mount = new THREE.Group();
        mount.name = `climate-dial-${i + 1}`;
        mount.position.set(x, DY, FZ + PLATE);
        mount.rotation.x = Math.PI / 2;
        const ring = revolveGeo([
            [FR, 0],
            [DR, 0],
            [DR, DH],
            [FR, DH],
        ], 16);
        ring.rotateX(Math.PI / 2);
        ring.translate(x, DY, FZ + PLATE);
        bezels.push(ring);
        const face = new THREE.CylinderGeometry(FR, FR, FH, 16);
        discUV(face, FR);
        face.translate(0, FH / 2, 0);
        face.rotateX(Math.PI / 2);
        face.translate(x, DY, FZ + PLATE);
        faces.push(face);
        const n = pivot(`needle-${i + 1}`, 0, FH, 0, 'y', [0.8, -0.8], 0.8);
        n.add(merged(`needle-${i + 1}`, [spanGeo(-0.0012, 0.0012, 0.0005, 0.002, -0.042, 0.006), cylGeo(0.005, 0.005, 0.003, 6, 'y', 0, 0.002, 0)], look('plastic')));
        mount.add(n);
        g.add(mount);
        dials.push(new THREE.Vector3(x, DY, FZ + PLATE + FH));
    });
    g.add(merged('climate-dial-bezels', bezels, look('paint2')));
    g.add(merged('climate-dial-faces', faces, look('dial')));
    // рычаг: прилив на планке, полоса, рукоять к оператору
    const BOSS = 0.015;
    const lz = FZ + PLATE + BOSS;
    g.add(part('climate-lever-boss', cylGeo(0.035, 0.035, BOSS, 16, 'z', LX, LY, FZ + PLATE + BOSS / 2), look('steel')));
    const lever = pivot('lever', LX, LY, lz, 'z', [0.6, -0.6], 0.6);
    const BAR = 0.015;
    const KNOB = d / 2 - lz - BAR;
    lever.add(part('lever-arm', spanGeo(-0.015, 0.015, -0.04, 0.26, 0, BAR), look('steel')));
    lever.add(part('lever-knob', cylGeo(0.022, 0.022, KNOB, 14, 'z', 0, 0.24, BAR + KNOB / 2), look('rubber')));
    g.add(lever);
    g.updateMatrixWorld(true);
    const knob = new THREE.Vector3(0, 0.24, BAR + KNOB / 2);
    lever.localToWorld(knob);
    return {
        group: g,
        w,
        d,
        h,
        lever: knob,
        dials,
        face: new THREE.Vector3(0, 0.55, FZ + PLATE),
        moving: movingParts(g),
    };
}
const GAP = 0.02; // наружная поверхность от ящика
const CLOTH = 0.005;
const FOLD = 0.03; // складка у кромки
const WRINKLE = 0.008; // морщина верха
const BACK = 0.35; // свес сзади
function perimeter(w, d) {
    const X = w / 2;
    const Z = d / 2;
    // стороны против часовой, если смотреть сверху (+X вправо, +Z к себе)
    const sides = [
        // x0, z0, x1, z1, nx, nz
        [X, Z, -X, Z, 0, 1],
        [-X, Z, -X, -Z, -1, 0],
        [-X, -Z, X, -Z, 0, -1],
        [X, -Z, X, Z, 1, 0],
    ];
    const out = [];
    let along = 0;
    sides.forEach(([x0, z0, x1, z1, nx, nz], i) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(6, Math.round(len / 0.1));
        const k = 2 * Math.max(1, Math.round(len / 0.7)); // чётное: пик складки на концах и в середине
        for (let j = 0; j <= n; j++) {
            const t = j / n;
            out.push({
                bx: x0 + (x1 - x0) * t,
                bz: z0 + (z1 - z0) * t,
                nx,
                nz,
                fold: 0.5 + 0.5 * Math.cos(2 * Math.PI * k * (t - 0.5)),
                along: along + len * t,
            });
        }
        along += len;
        // угол: раструб от нормали этой стороны к нормали следующей
        const [, , , , mx, mz] = sides[(i + 1) % 4];
        const a0 = Math.atan2(nz, nx);
        let a1 = Math.atan2(mz, mx);
        if (a1 < a0)
            a1 += Math.PI * 2;
        for (const f of [1 / 3, 2 / 3]) {
            const a = a0 + (a1 - a0) * f;
            out.push({ bx: x1, bz: z1, nx: Math.cos(a), nz: Math.sin(a), fold: 1, along });
        }
    });
    return out;
}
export function tarp({ w = 1.2, d = 0.5, h = 1.2, mats } = {}) {
    const look = looks(mats);
    const g = new THREE.Group();
    g.name = 'tarp';
    const ring = perimeter(w, d);
    const P = ring.length;
    const TOP = 3; // колец по верху
    const ARC = 2; // колец по скруглению ребра
    const DROP = 8; // колец по свесу
    const hem = (z) => {
        // спереди до пола, сзади на BACK от верха, по бокам косо
        const t = (z + d / 2) / d;
        return h - BACK + (0.005 - (h - BACK)) * t;
    };
    const wrinkle = (x, z) => WRINKLE * Math.cos((Math.PI * x) / w) * Math.cos((Math.PI * z) / d) * (0.75 + 0.25 * Math.cos((6 * Math.PI * x) / w));
    const pos = [];
    const uv = [];
    const idx = [];
    const at = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    const tri = (a, b, c) => {
        const A = at(a);
        if (A.distanceToSquared(at(b)) < 1e-14 || A.distanceToSquared(at(c)) < 1e-14 || at(b).distanceToSquared(at(c)) < 1e-14)
            return;
        idx.push(a, b, c);
    };
    /** Кольца одной поверхности на отступе `c`; возвращает начало каждого кольца. */
    const surface = (c) => {
        const starts = [];
        const push = (f, v, scale) => {
            starts.push(pos.length / 3);
            for (const p of ring) {
                const [x, y, z] = f(p);
                pos.push(x, y, z);
                uv.push(p.along * scale, v);
            }
        };
        // верх: прямоугольники от середины к ребру
        for (let r = 0; r <= TOP; r++) {
            const k = r / TOP;
            push((p) => {
                const x = p.bx * k;
                const z = p.bz * k;
                return [x, h + c + wrinkle(x, z), z];
            }, (k * d) / 2, k);
        }
        // скругление ребра
        for (let r = 1; r <= ARC; r++) {
            const a = (r / ARC) * (Math.PI / 2);
            push((p) => [p.bx + p.nx * c * Math.sin(a), h + c * Math.cos(a), p.bz + p.nz * c * Math.sin(a)], d / 2 + c * a, 1);
        }
        // свес: складки наружу растут к кромке
        for (let r = 1; r <= DROP; r++) {
            const s = r / DROP;
            push((p) => {
                const off = c + FOLD * Math.pow(s, 0.8) * p.fold;
                const y = h - (h - hem(p.bz)) * s;
                return [p.bx + p.nx * off, y, p.bz + p.nz * off];
            }, d / 2 + c * (Math.PI / 2) + (h - hem(0)) * s, 1);
        }
        return starts;
    };
    const outer = surface(GAP);
    const inner = surface(GAP - CLOTH);
    const band = (rows, flip) => {
        for (let r = 0; r + 1 < rows.length; r++) {
            for (let i = 0; i < P; i++) {
                const a = rows[r] + i;
                const b = rows[r] + ((i + 1) % P);
                const c = rows[r + 1] + i;
                const e = rows[r + 1] + ((i + 1) % P);
                if (flip) {
                    tri(a, b, c);
                    tri(b, e, c);
                }
                else {
                    tri(a, c, b);
                    tri(b, c, e);
                }
            }
        }
    };
    band(outer, false);
    band(inner, true);
    // кромка: нижнее кольцо наружной с нижним кольцом внутренней
    band([outer[outer.length - 1], inner[inner.length - 1]], false);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    g.add(part('tarp', outward(geo), look('cloth')));
    const box = new THREE.Box3().setFromObject(g, true);
    return { group: g, w: box.max.x - box.min.x, d: box.max.z - box.min.z, h: box.max.y - box.min.y, moving: {} };
}
//# sourceMappingURL=climate.js.map