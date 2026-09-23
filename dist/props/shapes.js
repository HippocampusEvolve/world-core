/**
 * shapes.ts — формы, которых нет среди коробки и цилиндра.
 *
 * Все формы здесь - ЗАМКНУТЫЕ тела с наружу смотрящими гранями, и это не
 * эстетика: проверка предметов (`world-check-kit`) считает, влезла ли деталь
 * в соседку, чётностью пересечений луча, а у незамкнутой поверхности чётность
 * случайна. Поэтому у трубы есть торцы, у тела вращения - дно и полюса веером
 * (без треугольников нулевой площади), у ткани - обе стороны и кромка.
 *
 * UV везде в метрах, как у `boxMesh` и `cylMesh`: по обхвату - длина дуги,
 * вдоль - длина пути. Исключение - плоские диски тел вращения с `disc`: там
 * вся картинка ложится на круг (циферблат, донышко), UV от 0 до 1.
 */
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
const V = (p) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());
/** Меш с именем и посадкой одной строкой. */
export function mesh(name, geo, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(x, y, z);
    return m;
}
/**
 * Рамка предмета по его треугольникам: ширина по X, глубина по Z, высота по Y.
 * Для предметов неправильной формы (плащ, куст, ведро с дужкой) габариты
 * считаются, а не выписываются руками: так они не разойдутся с геометрией.
 */
export function frameOf(g) {
    g.updateMatrixWorld(true);
    const s = new THREE.Box3().setFromObject(g, true).getSize(new THREE.Vector3());
    return { w: s.x, d: s.z, h: s.y };
}
/** Подгруппа с именем и посадкой: петля дверцы, ось стрелки. */
export function pivot(name, x = 0, y = 0, z = 0, moving) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    if (moving)
        g.userData.moving = moving;
    return g;
}
/**
 * Развернуть треугольники наружу, если тело собрано навыворот.
 *
 * Знак объёма замкнутого тела говорит, куда смотрят грани: плюс - наружу.
 * Считать обход в уме для каждой формы - верный способ получить одну деталь
 * изнанкой, а проверка тел по изнанке уводит пробную точку наружу и видит
 * проникновение там, где его нет.
 */
export function orient(geo) {
    const pos = geo.attributes.position;
    const idx = geo.index;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    let vol = 0;
    for (let t = 0; t < idx.count; t += 3) {
        a.fromBufferAttribute(pos, idx.getX(t));
        b.fromBufferAttribute(pos, idx.getX(t + 1));
        c.fromBufferAttribute(pos, idx.getX(t + 2));
        vol += a.dot(b.clone().cross(c));
    }
    if (vol < 0) {
        const arr = idx.array;
        for (let t = 0; t < arr.length; t += 3) {
            const tmp = arr[t + 1];
            arr[t + 1] = arr[t + 2];
            arr[t + 2] = tmp;
        }
        idx.needsUpdate = true;
    }
    return geo;
}
function build(pos, uv, idx, groups) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    if (groups)
        for (const [s, n, m] of groups)
            g.addGroup(s, n, m);
    orient(g);
    return g;
}
/** Сгладить нормали там, где швы развёртки разрезали вершины, и оставить рёбра острыми. */
function shade(g, crease = Math.PI / 4) {
    const groups = g.groups.slice();
    const out = toCreasedNormals(g, crease);
    // toCreasedNormals отдаёт неиндексированную геометрию: проверке нужен индекс
    const n = out.attributes.position.count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++)
        idx[i] = i;
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.clearGroups();
    for (const gr of groups)
        out.addGroup(gr.start, gr.count, gr.materialIndex);
    return out;
}
/**
 * Скруглить углы ломаной: вершина заменяется дугой (квадратичная кривая через
 * угол) радиусом `r`, но не длиннее половины соседних отрезков. `only` -
 * номера вершин, которые скруглять (остальные остаются острыми): каждая дуга
 * стоит треугольников.
 */
export function fillet(points, r, steps = 3, only) {
    if (points.length < 3)
        return points;
    const out = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        if (only && !only.includes(i)) {
            out.push(points[i]);
            continue;
        }
        const p = V(points[i]);
        const a = V(points[i - 1]);
        const b = V(points[i + 1]);
        const da = a.clone().sub(p);
        const db = b.clone().sub(p);
        const ra = Math.min(r, da.length() / 2);
        const rb = Math.min(r, db.length() / 2);
        const s = p.clone().add(da.normalize().multiplyScalar(ra));
        const e = p.clone().add(db.normalize().multiplyScalar(rb));
        for (let k = 0; k <= steps; k++) {
            const t = k / steps;
            const q = s
                .clone()
                .multiplyScalar((1 - t) * (1 - t))
                .add(p.clone().multiplyScalar(2 * t * (1 - t)))
                .add(e.clone().multiplyScalar(t * t));
            out.push([q.x, q.y, q.z]);
        }
    }
    out.push(points[points.length - 1]);
    return out;
}
/**
 * Труба по ломаной: замкнутое тело с торцами. Стыки отрезков - по
 * биссектрисе угла (усом), так что колено не проваливается и не пухнет.
 * `r` - радиус или функция радиуса от доли пути (рукав шире у плеча).
 * `loop` - замкнутое кольцо без торцов (рамка раскладушки); годится для
 * плоских колец, у которых рамка трубы не закручивается при обходе.
 */
export function pipe(points, r, radial = 8, loop = false) {
    // совпавшие соседние точки (скругления двух углов на коротком отрезке
    // сходятся в одну) дали бы отрезок нулевой длины и кольцо из вырожденных
    // треугольников
    const P = points.map(V).filter((p, i, a) => i === 0 || p.distanceTo(a[i - 1]) > 1e-6);
    const n = P.length;
    const R = typeof r === 'number' ? () => r : r;
    const segs = loop ? n : n - 1;
    const dir = [];
    for (let i = 0; i < segs; i++)
        dir.push(P[(i + 1) % n].clone().sub(P[i]).normalize());
    // длина пути до каждой вершины
    const len = [0];
    for (let i = 1; i < n; i++)
        len.push(len[i - 1] + P[i].distanceTo(P[i - 1]));
    const total = loop ? len[n - 1] + P[0].distanceTo(P[n - 1]) : len[n - 1];
    // рамка у первого отрезка и её перенос вдоль пути без закрутки
    const d0 = dir[0];
    const helper = Math.abs(d0.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const frames = [helper.clone().cross(d0).normalize()];
    for (let i = 1; i < segs; i++) {
        const q = new THREE.Quaternion().setFromUnitVectors(dir[i - 1], dir[i]);
        frames.push(frames[i - 1].clone().applyQuaternion(q));
    }
    const pos = [];
    const uv = [];
    const idx = [];
    const rings = [];
    for (let i = 0; i < n; i++) {
        // входящий отрезок задаёт окружность, биссектриса - плоскость кольца
        const inc = loop ? (i - 1 + segs) % segs : Math.max(0, i - 1);
        const out = loop ? i % segs : Math.min(segs - 1, i);
        const d = dir[inc];
        const miter = !loop && (i === 0 || i === n - 1) ? d.clone() : dir[inc].clone().add(dir[out]).normalize();
        const N = frames[inc];
        const B = d.clone().cross(N).normalize();
        const rad = R(len[i] / total);
        rings.push(pos.length / 3);
        for (let k = 0; k <= radial; k++) {
            const a = (k / radial) * Math.PI * 2;
            const q = P[i]
                .clone()
                .addScaledVector(N, Math.cos(a) * rad)
                .addScaledVector(B, Math.sin(a) * rad);
            const s = P[i].clone().sub(q).dot(miter) / d.dot(miter);
            q.addScaledVector(d, s);
            pos.push(q.x, q.y, q.z);
            uv.push((k / radial) * Math.PI * 2 * rad, len[i]);
        }
    }
    const ring = (i, k) => rings[i] + k;
    for (let i = 0; i < segs; i++) {
        const j = (i + 1) % n;
        for (let k = 0; k < radial; k++) {
            idx.push(ring(i, k), ring(i, k + 1), ring(j, k + 1), ring(i, k), ring(j, k + 1), ring(j, k));
        }
    }
    if (!loop) {
        // торцы веером: свой центр и свои вершины кольца - грань плоская
        for (const [i, d] of [
            [0, dir[0]],
            [n - 1, dir[segs - 1]],
        ]) {
            const c = pos.length / 3;
            pos.push(P[i].x, P[i].y, P[i].z);
            uv.push(0, 0);
            const base = pos.length / 3;
            for (let k = 0; k < radial; k++) {
                const o = ring(i, k) * 3;
                pos.push(pos[o], pos[o + 1], pos[o + 2]);
                uv.push((pos[o] - P[i].x) * 1, (pos[o + 1] - P[i].y + pos[o + 2] - P[i].z) * 1);
            }
            for (let k = 0; k < radial; k++) {
                const a = base + k;
                const b = base + ((k + 1) % radial);
                if (i === 0)
                    idx.push(c, b, a);
                else
                    idx.push(c, a, b);
                void d;
            }
        }
    }
    return shade(build(pos, uv, idx), Math.PI / 3);
}
/**
 * Тело вращения по профилю: чашка, ведро, баллон, раковина.
 *
 * Профиль - несколько ПРОГОНОВ; внутри прогона нормали гладкие, на стыке
 * прогонов ребро острое (кромка раковины, край ведра). Точка с нулевым
 * радиусом - полюс: к нему сходится веер, а не полоса из вырожденных
 * треугольников. Профиль обязан быть замкнутым (с полюсами на оси или петлёй),
 * тогда тело замкнуто.
 *
 * `power` больше 2 превращает круг в скруглённый прямоугольник
 * (суперэллипс) - так раковина выходит прямоугольной с круглыми углами.
 * У прогона свой номер материала (`mat`), группа геометрии на прогон.
 */
export function revolve(runs, segments = 16, power = 2) {
    const pos = [];
    const uv = [];
    const idx = [];
    const groups = [];
    const e = 2 / power;
    const sec = (a) => {
        const c = Math.cos(a);
        const s = Math.sin(a);
        return [Math.sign(c) * Math.abs(c) ** e, Math.sign(s) * Math.abs(s) ** e];
    };
    runs.forEach((raw, ri) => {
        const run = Array.isArray(raw) ? { pts: raw } : raw;
        const start = idx.length;
        const pts = run.pts.map((p) => ({ x: p[0], y: p[1], z: p[2] ?? p[0] }));
        const rmax = Math.max(...pts.map((p) => Math.max(p.x, p.z)), 1e-6);
        let v = 0;
        const rows = [];
        pts.forEach((p, j) => {
            if (j > 0)
                v += Math.hypot(p.x - pts[j - 1].x, p.y - pts[j - 1].y);
            const flatUV = (x, z) => run.disc ? [0.5 + x / (2 * rmax), 0.5 + z / (2 * rmax)] : [0, 0];
            if (p.x < 1e-7 && p.z < 1e-7) {
                rows.push(pos.length / 3);
                pos.push(0, p.y, 0);
                const [u0, v0] = run.disc ? flatUV(0, 0) : [0, v];
                uv.push(u0, v0);
                return;
            }
            const row = [];
            for (let k = 0; k <= segments; k++) {
                const a = (k / segments) * Math.PI * 2;
                const [cx, sz] = sec(a);
                const x = p.x * cx;
                const z = p.z * sz;
                row.push(pos.length / 3);
                pos.push(x, p.y, z);
                if (run.disc)
                    uv.push(...flatUV(x, z));
                else
                    uv.push(a * (p.x + p.z) * 0.5, v);
            }
            rows.push(row);
        });
        for (let j = 0; j < rows.length - 1; j++) {
            const A = rows[j];
            const Bn = rows[j + 1];
            for (let k = 0; k < segments; k++) {
                if (typeof A === 'number' && typeof Bn === 'number')
                    continue;
                if (typeof A === 'number')
                    idx.push(A, Bn[k + 1], Bn[k]);
                else if (typeof Bn === 'number')
                    idx.push(A[k], A[k + 1], Bn);
                else
                    idx.push(A[k], A[k + 1], Bn[k + 1], A[k], Bn[k + 1], Bn[k]);
            }
        }
        groups.push([start, idx.length - start, run.mat ?? 0]);
    });
    return shade(build(pos, uv, idx, groups), Math.PI / 5);
}
/**
 * Тело по сечениям сверху вниз: плащ на крючке, мешок, сапог в разрезе.
 *
 * Сечения идут подряд; первое и последнее, если это не полюс, закрываются
 * плоской крышкой веером к своему центру - тело замкнуто всегда. `warp`
 * сдвигает точку сечения: первое число - вдоль нормали овала (складка),
 * второе - по высоте (неровный подол); `t` - доля пути от первого сечения к
 * последнему, `a` - угол по овалу (π/2 - перёд, −π/2 - спина).
 */
export function loft(sections, segments = 16, warp) {
    const pos = [];
    const uv = [];
    const idx = [];
    const n = sections.length;
    let v = 0;
    const rows = [];
    const ring = (s, i) => {
        const row = [];
        const t = i / (n - 1);
        const back = s.back ?? s.b;
        for (let k = 0; k <= segments; k++) {
            const a = (k / segments) * Math.PI * 2;
            const c = Math.cos(a);
            const sn = Math.sin(a);
            const bz = sn >= 0 ? s.b : back;
            let x = (s.x ?? 0) + s.a * c;
            let z = s.z + bz * sn;
            let y = s.y;
            if (warp) {
                const [dn, dy] = warp(t, a);
                // нормаль овала в плоскости сечения
                const nx = c / Math.max(s.a, 1e-6);
                const nz = sn / Math.max(bz, 1e-6);
                const l = Math.hypot(nx, nz) || 1;
                x += (nx / l) * dn;
                z += (nz / l) * dn;
                y += dy;
            }
            row.push(pos.length / 3);
            pos.push(x, y, z);
            uv.push(a * (s.a + (s.b + back) / 2) * 0.5, v);
        }
        return row;
    };
    const pole = (s) => {
        const i = pos.length / 3;
        pos.push(s.x ?? 0, s.y, s.z);
        uv.push(0, v);
        return i;
    };
    sections.forEach((s, i) => {
        if (i > 0)
            v += Math.abs(s.y - sections[i - 1].y);
        const isPole = s.a < 1e-7 && s.b < 1e-7;
        if (isPole) {
            rows.push(pole(s));
            return;
        }
        // крышка у открытого конца: свой центр в плоскости сечения
        if (i === 0)
            rows.push(pole(s));
        rows.push(ring(s, i));
        if (i === n - 1)
            rows.push(pole(s));
    });
    for (let j = 0; j < rows.length - 1; j++) {
        const A = rows[j];
        const B = rows[j + 1];
        for (let k = 0; k < segments; k++) {
            if (typeof A === 'number' && typeof B === 'number')
                continue;
            if (typeof A === 'number')
                idx.push(A, B[k + 1], B[k]);
            else if (typeof B === 'number')
                idx.push(A[k], A[k + 1], B);
            else
                idx.push(A[k], A[k + 1], B[k + 1], A[k], B[k + 1], B[k]);
        }
    }
    return shade(build(pos, uv, idx), Math.PI / 4);
}
/**
 * Тонкое полотно толщиной `t` по поверхности `f(u, v)`, u и v от 0 до 1:
 * плащ, простыня на зеркале, хвост бинта. Лицевая и изнаночная стороны
 * сдвинуты от поверхности по нормали на полтолщины, по краю - кромка, так
 * что тело замкнуто. Складки - это сама `f`: обе стороны идут за ней вместе,
 * и полотно не протыкает само себя, пока складка мягче толщины.
 */
export function slab(nu, nv, f, t) {
    const P = [];
    for (let i = 0; i <= nu; i++) {
        P.push([]);
        for (let j = 0; j <= nv; j++)
            P[i].push(V(f(i / nu, j / nv)));
    }
    const Nrm = (i, j) => {
        const du = P[Math.min(nu, i + 1)][j].clone().sub(P[Math.max(0, i - 1)][j]);
        const dv = P[i][Math.min(nv, j + 1)].clone().sub(P[i][Math.max(0, j - 1)]);
        return du.cross(dv).normalize();
    };
    // метры вдоль u и v - по средней линии
    const U = [0];
    for (let i = 1; i <= nu; i++)
        U.push(U[i - 1] + P[i][nv >> 1].distanceTo(P[i - 1][nv >> 1]));
    const W = [0];
    for (let j = 1; j <= nv; j++)
        W.push(W[j - 1] + P[nu >> 1][j].distanceTo(P[nu >> 1][j - 1]));
    const pos = [];
    const uv = [];
    const idx = [];
    const side = (sgn) => {
        const base = pos.length / 3;
        for (let i = 0; i <= nu; i++) {
            for (let j = 0; j <= nv; j++) {
                const q = P[i][j].clone().addScaledVector(Nrm(i, j), (sgn * t) / 2);
                pos.push(q.x, q.y, q.z);
                uv.push(U[i], W[j]);
            }
        }
        return (i, j) => base + i * (nv + 1) + j;
    };
    const F = side(1);
    const Bk = side(-1);
    for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
            idx.push(F(i, j), F(i + 1, j), F(i + 1, j + 1), F(i, j), F(i + 1, j + 1), F(i, j + 1));
            idx.push(Bk(i, j), Bk(i + 1, j + 1), Bk(i + 1, j), Bk(i, j), Bk(i, j + 1), Bk(i + 1, j + 1));
        }
    }
    // кромка: обход границы сетки, свои вершины - ребро острое
    const edge = [];
    for (let i = 0; i < nu; i++)
        edge.push([i, 0]);
    for (let j = 0; j < nv; j++)
        edge.push([nu, j]);
    for (let i = nu; i > 0; i--)
        edge.push([i, nv]);
    for (let j = nv; j > 0; j--)
        edge.push([0, j]);
    let run = 0;
    for (let e = 0; e < edge.length; e++) {
        const [i0, j0] = edge[e];
        const [i1, j1] = edge[(e + 1) % edge.length];
        const b = pos.length / 3;
        for (const [i, j, s] of [
            [i0, j0, 1],
            [i1, j1, 1],
            [i1, j1, -1],
            [i0, j0, -1],
        ]) {
            const q = P[i][j].clone().addScaledVector(Nrm(i, j), (s * t) / 2);
            pos.push(q.x, q.y, q.z);
        }
        const l = P[i0][j0].distanceTo(P[i1][j1]);
        uv.push(run, 0, run + l, 0, run + l, t, run, t);
        run += l;
        idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    return shade(build(pos, uv, idx), Math.PI / 3);
}
/**
 * Плоский контур, вытянутый на `depth` по +Z, со скруглённой фаской `bevel`:
 * сапог в профиль, канистра, лезвие ножниц. Контур - точки по кругу в метрах.
 * UV у three здесь уже в единицах контура, то есть в метрах.
 */
export function extrude(outline, depth, bevel = 0, curveSegments = 4) {
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        curveSegments,
        steps: 1,
    });
    // фаска растёт наружу контура и вперёд-назад по глубине: сдвигаем, чтобы тело
    // лежало от z = 0 до depth + 2·bevel ровно
    g.translate(0, 0, bevel);
    g.deleteAttribute('normal');
    const merged = weld(g);
    return shade(merged, Math.PI / 5);
}
/** Сварить совпадающие вершины и выбросить треугольники нулевой площади. */
function weld(g) {
    const src = g.index ? g.toNonIndexed() : g;
    const pos = src.attributes.position;
    const uvA = src.attributes.uv;
    const P = [];
    const UVs = [];
    const I = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let t = 0; t < pos.count; t += 3) {
        a.fromBufferAttribute(pos, t);
        b.fromBufferAttribute(pos, t + 1);
        c.fromBufferAttribute(pos, t + 2);
        if (b.clone().sub(a).cross(c.clone().sub(a)).length() < 1e-9)
            continue;
        for (let k = 0; k < 3; k++) {
            I.push(P.length / 3);
            P.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
            UVs.push(uvA.getX(t + k), uvA.getY(t + k));
        }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2));
    out.setIndex(I);
    return orient(out);
}
/**
 * Слить несколько геометрий в одну (чашка с ручкой - один меш). Все
 * приводятся к одному виду: с индексом, позиция, нормаль, UV.
 */
export function merge(geos) {
    const list = geos.map((g) => {
        const x = g.index ? g : (() => {
            const n = g.attributes.position.count;
            const idx = new Uint32Array(n);
            for (let i = 0; i < n; i++)
                idx[i] = i;
            g.setIndex(new THREE.BufferAttribute(idx, 1));
            return g;
        })();
        for (const k of Object.keys(x.attributes))
            if (k !== 'position' && k !== 'normal' && k !== 'uv')
                x.deleteAttribute(k);
        x.clearGroups();
        return x;
    });
    const out = mergeGeometries(list, false);
    if (!out)
        throw new Error('merge: геометрии с разными атрибутами');
    return out;
}
/** Сдвинуть и повернуть геометрию на месте: удобно перед слиянием. */
export function place(g, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    return g;
}
/** Коробка с UV в метрах как геометрия - для слияния. */
export function boxGeo(w, h, d, x = 0, y = 0, z = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [
        [d, h],
        [d, h],
        [w, d],
        [w, d],
        [w, h],
        [w, h],
    ];
    for (let f = 0; f < 6; f++) {
        for (let k = 0; k < 4; k++) {
            const i = f * 4 + k;
            uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
        }
    }
    g.translate(x, y, z);
    return g;
}
//# sourceMappingURL=shapes.js.map