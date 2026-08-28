/**
 * books.ts — полка на кронштейнах, ряд книг и кружка.
 *
 * Начало координат - середина полки по длине, на уровне её верха; полка
 * прижата задней кромкой к стене (стена у −Z), книги стоят корешком в комнату
 * (+Z). Книга - коробка с шестью гранями по ролям: переплёт на крышках и
 * корешке, обрез страниц сверху, снизу и спереди. Цвет корешка даёт
 * подкраска одной и той же карты кожи.
 *
 * Последняя книга наклонена к ряду и касается соседки верхним углом, а
 * нижним стоит на полке: наклон вокруг центра коробки утопил бы угол в доску.
 */
import * as THREE from 'three';
import { boxUV } from '../materials/index.js';
import { lookOf } from './look.js';
import { boxMesh, cylMesh } from './parts.js';
const COLORS = [0x6b3434, 0x35502f, 0x2f3f5c, 0x77582a, 0x4c3355];
export function shelfWithBooks({ width = 1.2, depth = 0.24, n = 5, colors = COLORS, mats } = {}) {
    const g = new THREE.Group();
    g.name = 'shelf';
    const wood = lookOf(mats, 'wood', 'beam', { normalScale: 0.7, color: 0xa88a66 });
    const pages = lookOf(mats, 'pages', 'paper', { normalScale: 0.8, repeat: [2, 2] });
    const PLANK = 0.05;
    g.add(boxMesh('shelf-plank', width, PLANK, depth, wood, 0, -PLANK / 2, 0, 1, 'x'));
    // кронштейны под полкой, у стены
    const BR = 0.16;
    for (const sx of [-1, 1]) {
        g.add(boxMesh('shelf-bracket', 0.04, BR, depth - 0.03, wood, sx * (width / 2 - 0.1), -PLANK - BR / 2, -0.015, 1));
    }
    // книги слева направо
    const D = 0.16;
    let x = -width / 2 + 0.08;
    let right = x; // правая грань предыдущей книги
    let tallest = 0;
    for (let i = 0; i < n; i++) {
        const w = 0.045 + (i % 2) * 0.02;
        const h = 0.2 + (i % 3) * 0.03;
        tallest = Math.max(tallest, h);
        const cover = lookOf(mats, `cover${i}`, 'leather', { color: colors[i % colors.length], normalScale: 0.8 });
        const geo = new THREE.BoxGeometry(w, h, D);
        boxUV(geo, w, h, D, 10);
        // +X, −X, +Y, −Y, +Z, −Z: крышки, обрез сверху и снизу, корешок, обрез спереди
        const m = new THREE.Mesh(geo, [cover, cover, pages, pages, cover, pages]);
        m.name = 'book';
        if (i < n - 1) {
            m.position.set(x + w / 2, h / 2, 0);
            right = x + w;
            x += w + 0.012;
        }
        else {
            const a = 0.22;
            const cx = right + 0.002 + (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a);
            const cy = (h / 2) * Math.cos(a) + (w / 2) * Math.sin(a);
            m.position.set(cx, cy, 0);
            m.rotation.z = a;
        }
        g.add(m);
    }
    // кружка справа
    const mug = mats?.mug ?? new THREE.MeshStandardMaterial({ color: 0x9c4a2f, roughness: 0.7 });
    g.add(cylMesh('mug', 0.05, 0.05, 0.09, 10, mug, width / 2 - 0.18, 0.045, 0, 4));
    return { group: g, width, depth, height: tallest };
}
//# sourceMappingURL=books.js.map