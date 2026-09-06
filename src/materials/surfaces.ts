import { fbm, worley } from './noise.js'
import type { Generator } from './bake.js'
import type { Recipe } from './generators.js'
import { calibratedSurface } from './spectral.js'

export type SurfaceKind = 'snow' | 'rock' | 'gravel' | 'concrete' | 'wood' | 'rust' | 'metal' | 'cloth' | 'ice' | 'paper'
const TAU = Math.PI * 2

// Measured linear mean of the 256px recipes below. The material test checks
// these values; clients can compensate their palette before cloning materials.
export const SURFACE_MEAN_LINEAR: Record<string, number> = {
  surfaceSnow: 0.9111900618229365, surfaceRock: 0.8219052662388465,
  surfaceGravel: 0.8081718405863105, surfaceConcrete: 0.8383933638521872,
  surfaceWood: 0.7492808629959894, surfaceRust: 0.8157743628531261,
  surfaceMetal: 0.8077781709824997, surfaceCloth: 0.8122590918638553,
  surfaceIce: 0.876990158945863, surfacePaper: 0.8779483329150881,
}

/** Neutral tileable maps. Worlds supply their own palette and physical UV scale. */
export function surfaceGenerator(kind: SurfaceKind, seed = 17): Generator {
  return (x, y, size, p) => {
    const u = x / size, v = y / size
    const broad = fbm(u * 4, v * 4, 4, 4, 3, seed)
    const fine = fbm(u * 48, v * 48, 48, 48, 2, seed + 103)
    let height = 0.5, shade = 0.94, rough = 0.9
    if (kind === 'snow') {
      const wind = fbm(u * 3, v * 12, 3, 12, 3, seed + 43)
      height = 0.30 + wind * 0.28 + fine * 0.16
      shade = 0.91 + wind * 0.075 + fine * 0.025
      rough = 0.91 + fine * 0.07
    } else if (kind === 'gravel') {
      const cell = worley(u * 32, v * 32, 32, 32, seed + 19)
      // Isolated rounded grains; continuous F2-F1 seams read as paving slabs.
      const grain = Math.exp(-cell.f1 * cell.f1 * 10)
      height = 0.3 + broad * 0.1 + fine * 0.16 + grain * 0.08
      shade = 0.87 + broad * 0.055 + fine * 0.025
      rough = 0.82 + fine * 0.15
    } else if (kind === 'rock') {
      const strata = fbm(u * 6, v * 18, 6, 18, 3, seed + 19)
      height = 0.18 + broad * 0.3 + strata * 0.2 + fine * 0.24
      shade = 0.84 + broad * 0.09 + strata * 0.045 + fine * 0.02
      rough = 0.79 + fine * 0.18
    } else if (kind === 'wood') {
      const grain = fbm(u * 48, v * 3, 48, 3, 3, seed + 37)
      const ring = Math.sin((u * 14 + broad * 0.65) * TAU) * 0.5 + 0.5
      height = 0.31 + grain * 0.19 + ring * 0.06
      shade = 0.77 + grain * 0.15 + ring * 0.07
      rough = 0.71 + grain * 0.2
    } else if (kind === 'cloth') {
      const a = Math.cos(u * 64 * TAU), b = Math.cos(v * 64 * TAU)
      height = 0.5 + (a + b) * 0.065 + a * b * 0.025
      shade = 0.9 + (a + b) * 0.025 + broad * 0.025
      rough = 0.97
    } else if (kind === 'ice') {
      const vein = 1 - Math.abs(broad * 2 - 1)
      height = 0.3 + vein * 0.11 + fine * 0.15
      shade = 0.88 + vein * 0.09
      rough = 0.22 + broad * 0.22
    } else if (kind === 'metal' || kind === 'rust') {
      const brushed = fbm(u * 3, v * 64, 3, 64, 2, seed + 29)
      height = 0.42 + fine * 0.15 + brushed * 0.03
      shade = 0.85 + broad * 0.09 + brushed * 0.03
      rough = kind === 'rust' ? 0.85 + fine * 0.13 : 0.5 + brushed * 0.18
      if (kind === 'metal') p.metal = 0.8 + fine * 0.18
    } else if (kind === 'paper') {
      const fibres = fbm(u * 12, v * 64, 12, 64, 2, seed + 31)
      height = 0.38 + broad * 0.06 + fibres * 0.06 + fine * 0.15
      shade = 0.91 + broad * 0.045 + fibres * 0.025
      rough = 0.94
    } else {
      height = 0.35 + broad * 0.13 + fine * 0.14
      shade = 0.85 + broad * 0.11 + fine * 0.03
      rough = 0.83 + fine * 0.14
    }
    p.r = p.g = p.b = shade * 255
    p.h = height
    p.rough = rough
  }
}

export const SURFACE_KINDS: SurfaceKind[] = ['snow', 'rock', 'gravel', 'concrete', 'wood', 'rust', 'metal', 'cloth', 'ice', 'paper']
export const SURFACE_RECIPES: Recipe[] = SURFACE_KINDS.map((kind, i) => ({
  name: `surface${kind[0].toUpperCase()}${kind.slice(1)}`,
  title: `поверхность: ${kind}`,
  size: 256,
  normalStrength: 2.2,
  tiles: 'both',
  gen: kind === 'snow' ? calibratedSurface('snowfall', 1709) : surfaceGenerator(kind, 1709 + i * 97),
}))

// Snowfall's 11.76m tile needs the original 1k grain. Tower has distinct CC0
// references and 2.5m snow tiles; keep its calibration separate from Snowfall.
SURFACE_RECIPES[0].size = 1024
SURFACE_RECIPES[0].normalStrength = 1
SURFACE_RECIPES.push(...SURFACE_KINDS.map((kind, i): Recipe => ({
  name: `surfaceTower${kind[0].toUpperCase()}${kind.slice(1)}`,
  title: `поверхность башни: ${kind}`,
  size: 1024,
  normalStrength: 1,
  tiles: 'both',
  gen: calibratedSurface(kind, 2909 + i * 97),
})))
