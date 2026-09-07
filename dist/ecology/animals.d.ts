import * as THREE from 'three';
export type AnimalKind = 'fox' | 'deer' | 'raven';
export declare const ANIMAL_KINDS: AnimalKind[];
export interface AnimalPose {
    speed?: number;
    alert?: number;
    graze?: number;
    flying?: number;
}
/** Procedural interpretation of Quaternius CC0 silhouettes; see PROVENANCE.md.
 * Feet at Y=0, nose along +Z. Proportions are in metres, not arbitrary mesh units. */
export declare function createAnimal(kind: AnimalKind, seed?: number): {
    root: THREE.Group<THREE.Object3DEventMap>;
    kind: "raven";
    update(dt: number, pose?: AnimalPose): void;
    dispose(): void;
} | {
    root: THREE.Group<THREE.Object3DEventMap>;
    kind: "fox" | "deer";
    update(dt: number, pose?: AnimalPose): void;
    dispose(): void;
};
