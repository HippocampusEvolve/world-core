/**
 * shape.ts — мелочь, которой лепится цвет и высота.
 *
 * Всё работает на кортежах `[r, g, b]` в диапазоне 0..255. Диапазон именно
 * такой, а не 0..1, потому что генератор пишет прямо в байты карты: перевод
 * туда-обратно на каждом из 262144 пикселей стоил бы дороже всей остальной
 * арифметики вместе взятой.
 */
/** Цвет как тройка байт, 0..255. */
export type RGB = [number, number, number];
/** Зажать в отрезок. */
export declare const cl: (v: number, a: number, b: number) => number;
/** Зажать в 0..1. */
export declare const cl01: (v: number) => number;
/** Smoothstep. Работает и «наоборот», когда e0 > e1. */
export declare function ss(e0: number, e1: number, x: number): number;
/** Смешать два цвета. */
export declare function mix(a: RGB, b: RGB, t: number): RGB;
/** Подвинуть яркость на `k` байт, не трогая тон. */
export declare function add(c: RGB, k: number): RGB;
