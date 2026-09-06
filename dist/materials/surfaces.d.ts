import type { Generator } from './bake.js';
import type { Recipe } from './generators.js';
export type SurfaceKind = 'snow' | 'rock' | 'gravel' | 'concrete' | 'wood' | 'rust' | 'metal' | 'cloth' | 'ice' | 'paper';
export declare const SURFACE_MEAN_LINEAR: Record<string, number>;
/** Neutral tileable maps. Worlds supply their own palette and physical UV scale. */
export declare function surfaceGenerator(kind: SurfaceKind, seed?: number): Generator;
export declare const SURFACE_KINDS: SurfaceKind[];
export declare const SURFACE_RECIPES: Recipe[];
