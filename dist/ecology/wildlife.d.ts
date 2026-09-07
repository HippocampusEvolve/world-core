import * as THREE from 'three';
import { type AnimalKind } from './animals.js';
type Location = {
    x: number;
    y: number;
    z: number;
};
export interface Habitat {
    surfaceAt: (x: number, z: number) => number | null;
    canStand?: (x: number, z: number, y: number) => boolean;
    seed?: number;
    kinds?: AnimalKind[];
    /** Optional prevalidated homes, useful for small fixed worlds. */
    homes?: Location[];
    onCall?: (kind: AnimalKind, position: Location) => void;
    onTrack?: (kind: AnimalKind, position: Location, yaw: number) => void;
}
export interface WildlifeWeather {
    active?: boolean;
    shelter?: number;
    storm?: number;
    reducedMotion?: boolean;
    direction?: Location;
}
/** Bounded population, deterministic fixed-step movement and obstacle probes.
 * Only three models are allocated. No spawning/destruction in the frame loop. */
export declare function createWildlife(habitat: Habitat): {
    root: THREE.Group<THREE.Object3DEventMap>;
    animals: {
        kind: AnimalKind;
        model: {
            root: THREE.Group<THREE.Object3DEventMap>;
            kind: "raven";
            update(dt: number, pose?: import("./animals.js").AnimalPose): void;
            dispose(): void;
        } | {
            root: THREE.Group<THREE.Object3DEventMap>;
            kind: "fox" | "deer";
            update(dt: number, pose?: import("./animals.js").AnimalPose): void;
            dispose(): void;
        };
        x: number;
        y: number;
        z: number;
        yaw: number;
        targetYaw: number;
        homeX: number;
        homeZ: number;
        active: boolean;
        wait: number;
        age: number;
        state: string;
        timer: number;
        speed: number;
        phase: number;
        turn: number;
        callAt: number;
        trackAt: number;
        flown: number;
        avoidFor: number;
        previousX: number;
        previousY: number;
        previousZ: number;
        previousYaw: number;
        graze: number;
        alert: number;
    }[];
    readonly time: number;
    update(dt: number, p: Location, w?: WildlifeWeather): void;
    dispose(): void;
};
export {};
