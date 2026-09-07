import * as THREE from 'three';
export type PlantKind = 'birch' | 'spruce' | 'juniper' | 'rowan' | 'grass' | 'fern' | 'reeds';
export declare const PLANT_KINDS: PlantKind[];
export declare const PLANT_RADIUS: Record<PlantKind, number>;
/** Kenney Nature Kit is the silhouette reference; every surface is generated.
 * A winter palette, asymmetric branching and snow resting on upper boughs.
 * All parts share one vertex-colour material, including berries and snow. */
export declare function plantGeometry(kind: PlantKind, seed?: number): THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>;
export interface PlantSite {
    kind: PlantKind;
    x: number;
    y: number;
    z: number;
    scale?: number;
    yaw?: number;
    seed?: number;
}
/** Spatial batches keep frustum culling useful. One mesh per species/variant/cell.
 * No per-plant update; a small shader bends only the upper part. */
export declare function createVegetation(sites: PlantSite[], { variants, cellSize }?: {
    variants?: number | undefined;
    cellSize?: number | undefined;
}): {
    root: THREE.Group<THREE.Object3DEventMap>;
    sites: PlantSite[];
    meshes: THREE.InstancedMesh<THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>, THREE.Material<THREE.MaterialEventMap> | THREE.Material<THREE.MaterialEventMap>[], THREE.InstancedMeshEventMap>[];
    setVisible(site: PlantSite, visible: boolean): void;
    update(seconds: number, wind?: number, reduced?: boolean): void;
    dispose(): void;
};
