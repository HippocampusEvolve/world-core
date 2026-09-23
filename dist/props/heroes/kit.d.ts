/**
 * heroes/kit.ts — общее для предметов-героев: роли материалов, подвижные
 * части и детали, которых нет в `parts.ts`.
 *
 * Герой - это машина или прибор, у которого есть что крутить и что зажигать.
 * Отсюда три вещи, общие для всех.
 *
 * РОЛИ. Материал детали называется ролью из словаря (`ROLES`): краска, сталь,
 * стекло, свечение экрана. У каждой роли есть набор ядра по умолчанию, чтобы
 * предмет стоял в любом мире без единой строчки про материалы, но мир,
 * которому важен цвет, подменяет роли своими (`mats`). Новых наборов карт
 * здесь не заводится: краска - это подкрашенная сталь, лак - та же бумага с
 * другим блеском.
 *
 * ПОДВИЖНЫЕ ЧАСТИ. Всё, что мир двигает, - отдельная группа с опорной точкой
 * на оси вращения, и в `userData` у неё записано, как её двигать:
 *
 *     { moving: 'lever', axis: 'z', range: [-0.6, 0.6], spin: false }
 *
 * Мир ставит `rotation[axis]` в пределах `range` (радианы, в собственных осях
 * группы), остальные две составляющие поворота у группы нулевые. `spin` -
 * часть крутится без упора (маховик, катушка), `range` у неё условный. Ось
 * `xz` - маятник: качается вокруг X и вокруг Z одновременно. Где стоит часть,
 * когда предмет только собран, сказано у предмета. Проверка счётом ставит
 * каждую часть в оба края `range` и меряет рамку и тела там тоже.
 *
 * ДЕТАЛИ. Цилиндр вдоль X и Z, тело вращения, призма по профилю, тор, слияние
 * деталей одной роли в один меш. UV везде в метрах (1 тайл на метр), как у
 * `parts.ts`; исключения - циферблаты и экраны, им нужна вся карта на лицо
 * (`discUV`, штатная развёртка коробки), и они названы у предмета.
 */
import * as THREE from 'three';
import { type Mats } from '../look.js';
/** Словарь ролей. Других у героев нет, мир подменяет любые из этих. */
export declare const ROLES: readonly ["paint", "paint2", "steel", "rust", "wood", "cloth", "rubber", "glass", "water", "enamel", "paper", "photo", "plastic", "brass", "soil", "leaf", "fruit", "tube", "bulb", "screen", "dial", "led", "shade"];
export type Role = (typeof ROLES)[number];
/**
 * Материалы предмета по ролям: подмена мира, иначе набор ядра. Один материал
 * на роль на весь предмет - сколько бы деталей его ни просили.
 */
export declare function looks(mats: Mats | undefined): (role: Role) => THREE.Material;
/** Ось поворота подвижной части в её собственных осях. `xz` - маятник. */
export type Axis = 'x' | 'y' | 'z' | 'xz';
export type MovingInfo = {
    moving: string;
    axis: Axis;
    /**
     * Края хода, радианы: первое - положение покоя (закрыто, выключено, у
     * упора), второе - дальний край. Порядок не по величине, а по смыслу. У
     * `spin` условные: полный оборот.
     */
    range: [number, number];
    spin: boolean;
};
/** Повернуть подвижную часть на `v` радиан вокруг её оси. */
export declare function turn(o: THREE.Object3D, v: number): void;
/**
 * Опорная группа подвижной части: стоит на оси, `at` - положение при сборке.
 * Детали части кладутся в неё в координатах относительно оси.
 */
export declare function pivot(name: string, x: number, y: number, z: number, axis: Axis, range: [number, number], at?: number, spin?: boolean): THREE.Group;
/** Все подвижные части предмета по именам. */
export declare function movingParts(root: THREE.Object3D): Record<string, THREE.Object3D>;
/** Точка в координатах предмета: где окажется `local` детали `o` при собранном предмете. */
export declare function pointOf(root: THREE.Object3D, o: THREE.Object3D, local?: THREE.Vector3): THREE.Vector3;
/** Меш с именем. */
export declare function part(name: string, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh;
/** Коробка w×h×d с центром в (x, y, z), UV в метрах. */
export declare function boxGeo(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry;
/** Коробка по границам. */
export declare function spanGeo(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry;
/**
 * Цилиндр с осью вдоль `axis`, центр в (x, y, z). Радиусы - у концов по
 * направлению оси: `r0` у меньшей координаты, `r1` у большей.
 */
export declare function cylGeo(r0: number, r1: number, len: number, seg: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number): THREE.BufferGeometry;
/** Тор радиуса `R` с трубкой `r` вокруг оси `axis`, центр в (x, y, z). `arc` - дуга. */
export declare function torusGeo(R: number, r: number, radial: number, tubular: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number, arc?: number): THREE.BufferGeometry;
/**
 * Тело вращения вокруг Y. Профиль `[r, y]` обходится ПРОТИВ часовой в
 * плоскости (r вправо, y вверх): тогда нормали смотрят наружу. Концы профиля
 * на оси (r = 0) закрываются веером к оси, без вырожденных треугольников
 * (у штатного `LatheGeometry` полюс даёт треугольники нулевой площади);
 * профиль без точек на оси считается замкнутым кольцом.
 *
 * `smooth` - общие вершины между звеньями профиля (лампа, колба); без него
 * каждое звено со своими нормалями, и рёбра профиля остаются острыми (обод,
 * фланец).
 *
 * `matOf` - номер материала звена (звено j идёт от точки j к следующей, у
 * кольца последнее - к первой): одно тело, разные роли по поясам, как борта
 * катушки и рулон ленты между ними. Крышки берут материал соседнего звена.
 */
export declare function revolveGeo(profile: [number, number][], seg: number, smooth?: boolean, matOf?: (link: number) => number): THREE.BufferGeometry;
/** Кривая как точки: прямоугольник со скруглёнными углами, против часовой, центр в нуле. */
export declare function roundRect(w: number, h: number, r: number, seg?: number): [number, number][];
/**
 * Призма: плоский профиль, выдавленный вдоль оси от `from` до `to`.
 *
 *   axis 'x': профиль в (z, y), выдавлен по X;
 *   axis 'y': профиль в (x, z), выдавлен по Y;
 *   axis 'z': профиль в (x, y), выдавлен по Z.
 *
 * Профиль - замкнутый многоугольник (последняя точка не повторяет первую),
 * `holes` - дыры в нём. UV `ExtrudeGeometry` уже в метрах: он берёт их из
 * координат.
 */
export declare function prismGeo(outline: [number, number][], axis: 'x' | 'y' | 'z', from: number, to: number, holes?: [number, number][][]): THREE.BufferGeometry;
/** Точки дуги окружности (центр cx, cy), от угла a0 до a1 включительно. */
export declare function arc(cx: number, cy: number, r: number, a0: number, a1: number, seg: number): [number, number][];
/**
 * Трубка по ломаной или сглаженной линии (провод, проволока). Концы открыты:
 * годится для того, что концами упирается в другие детали.
 */
export declare function wireGeo(points: THREE.Vector3[], r: number, segments: number, radial?: number, smooth?: boolean): THREE.BufferGeometry;
/**
 * Слить детали одной роли в один меш: одна деталь - один вызов отрисовки
 * меньше. Индексированные и нет смешиваются через развёртку в треугольники.
 */
export declare function merged(name: string, geos: THREE.BufferGeometry[], mat: THREE.Material): THREE.Mesh;
/**
 * Развернуть треугольники наружу, если тело собрано навыворот: знак объёма
 * замкнутого тела говорит, куда смотрят его нормали. Нужно телам, которые
 * собираются сеткой колец (лофт, ткань), где обход легко перепутать.
 */
export declare function outward(geo: THREE.BufferGeometry): THREE.BufferGeometry;
/** Детерминированный генератор по семени: складки и разнобой без случайности между сборками. */
export declare function rng(seed: number): () => number;
