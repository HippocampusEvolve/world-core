import type { Generator } from './bake.js';
import { SURFACE_PROFILES } from './surface-profiles.js';
/** Seeded periodic synthesis from measured band energies, never source pixels. */
export declare function calibratedSurface(kind: keyof typeof SURFACE_PROFILES, seed: number): Generator;
