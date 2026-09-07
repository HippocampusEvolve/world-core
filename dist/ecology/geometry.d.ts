import * as THREE from 'three';
export type Point = [number, number, number];
export type Paint = (x: number, y: number, z: number) => THREE.Color;
export declare const randomOf: (seed: number) => () => number;
export declare const color: (hex: number) => THREE.Color;
/** Small indexed surface builder. No DOM, textures, model loaders or global caches. */
export declare class Surface {
    positions: number[];
    colors: number[];
    indices: number[];
    vertex(p: Point, c: THREE.Color): number;
    tri(a: number, b: number, c: number): void;
    /** Elliptic cross-sections along Z: [z, centreY, halfWidth, halfHeight]. */
    loft(rings: [number, number, number, number][], paint: Paint, sides?: number): void;
    ellipsoid(p: Point, radii: Point, c: THREE.Color, sides?: number, rings?: number): void;
    branch(a: Point, b: Point, r0: number, r1: number, c: THREE.Color, sides?: number): void;
    leaf(a: Point, b: Point, width: number, c: THREE.Color, lift?: number): void;
    append(g: THREE.BufferGeometry, paint: Paint): void;
    geometry(): THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>;
}
