/**
 * shape.ts — мелочь, которой лепится цвет и высота.
 *
 * Всё работает на кортежах `[r, g, b]` в диапазоне 0..255. Диапазон именно
 * такой, а не 0..1, потому что генератор пишет прямо в байты карты: перевод
 * туда-обратно на каждом из 262144 пикселей стоил бы дороже всей остальной
 * арифметики вместе взятой.
 */

/** Цвет как тройка байт, 0..255. */
export type RGB = [number, number, number]

/** Зажать в отрезок. */
export const cl = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)

/** Зажать в 0..1. */
export const cl01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smoothstep. Работает и «наоборот», когда e0 > e1. */
export function ss(e0: number, e1: number, x: number): number {
  const t = cl01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Смешать два цвета. */
export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Подвинуть яркость на `k` байт, не трогая тон. */
export function add(c: RGB, k: number): RGB {
  return [c[0] + k, c[1] + k, c[2] + k]
}
