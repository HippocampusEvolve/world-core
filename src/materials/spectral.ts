import { hash2, worley } from './noise.js'
import type { Generator } from './bake.js'
import { SURFACE_PROFILES } from './surface-profiles.js'

// Iterative radix-2 FFT. Real fields retain conjugate symmetry after filtering.
function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len *= 2) {
    const angle = (inverse ? 2 : -2) * Math.PI / len
    const wr = Math.cos(angle), wi = Math.sin(angle)
    for (let i = 0; i < n; i += len) {
      let ar = 1, ai = 0
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2
        const br = re[b] * ar - im[b] * ai, bi = re[b] * ai + im[b] * ar
        re[b] = re[a] - br; im[b] = im[a] - bi
        re[a] += br; im[a] += bi
        const next = ar * wr - ai * wi
        ai = ar * wi + ai * wr; ar = next
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n }
}
function fft2(re: Float64Array, im: Float64Array, n: number, inverse: boolean) {
  const r = new Float64Array(n), m = new Float64Array(n)
  for (let axis = 0; axis < 2; axis++) for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) { const i = axis ? b * n + a : a * n + b; r[b] = re[i]; m[b] = im[i] }
    fft(r, m, inverse)
    for (let b = 0; b < n; b++) { const i = axis ? b * n + a : a * n + b; re[i] = r[b]; im[i] = m[b] }
  }
}
type Profile = { readonly mean: number; readonly bands: readonly number[]; readonly quantiles?: readonly number[] }
function field(profile: Profile, n: number, seed: number, relief: boolean, cells: number, sparse = false, repeats = 1): Float64Array {
  const fullSize = n
  n /= repeats
  const re = new Float64Array(n * n), im = new Float64Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = hash2(x, y, seed) - .5
    if (sparse) v = v > .485 ? (v - .485) / .015 : 0
    if (cells) { const c = worley(x / n * cells, y / n * cells, cells, cells, seed); v += 4 * (c.f2 - c.f1) }
    re[y * n + x] = v
  }
  fft2(re, im, n, false)
  const energy = new Float64Array(10), band = new Uint8Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = x <= n / 2 ? x : x - n, fy = y <= n / 2 ? y : y - n
    const radius = Math.hypot(fx, fy) * repeats, i = y * n + x
    const b = Math.min(9, Math.max(0, Math.floor(Math.log2(Math.max(1, radius)))))
    band[i] = b
    if (!radius) { re[i] = 0; im[i] = 0; continue }
    // Match the slope spectrum through the exact central-difference operator
    // used by normalFromHeight (normalStrength=1), not a continuous derivative.
    const transfer = relief ? (2 * n / 128) ** 2 * (Math.sin(2 * Math.PI * fx / n) ** 2 + Math.sin(2 * Math.PI * fy / n) ** 2) : 1
    energy[b] += (re[i] ** 2 + im[i] ** 2) * transfer / n ** 4
  }
  for (let i = 0; i < re.length; i++) {
    const b = band[i], scale = energy[b] ? profile.bands[b] / Math.sqrt(energy[b]) : 0
    re[i] *= scale; im[i] *= scale
  }
  fft2(re, im, n, true)
  for (let i = 0; i < re.length; i++) re[i] += profile.mean
  if (profile.quantiles) for (let iteration = 0; iteration < 8; iteration++) {
    // Rank-preserving histogram transfer handles sparse exposed metal and rust
    // without clipping a Gaussian field into a flat white/black plateau.
    const sorted = re.slice().sort(), q = profile.quantiles
    for (let i = 0; i < re.length; i++) {
      let lo = 0, hi = sorted.length - 1
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (sorted[mid] < re[i]) lo = mid + 1; else hi = mid }
      const u = lo / (sorted.length - 1) * (q.length - 1), a = Math.min(q.length - 2, Math.floor(u))
      re[i] = q[a] + (q[a + 1] - q[a]) * (u - a)
    }
    // Alternating spectral/histogram projections preserve sparse patches.
    // Final histogram projection guarantees legal PBR values without clipping.
    if (iteration === 7) break
    im.fill(0)
    fft2(re, im, n, false)
    energy.fill(0)
    re[0] = im[0] = 0
    for (let i = 0; i < re.length; i++) energy[band[i]] += (re[i] ** 2 + im[i] ** 2) / n ** 4
    for (let i = 0; i < re.length; i++) {
      const b = band[i], scale = energy[b] ? profile.bands[b] / Math.sqrt(energy[b]) : 0
      re[i] *= scale; im[i] *= scale
    }
    fft2(re, im, n, true)
    for (let i = 0; i < re.length; i++) re[i] += profile.mean
  }
  if (repeats === 1) return re
  const tiled = new Float64Array(fullSize ** 2)
  for (let y = 0; y < fullSize; y++) for (let x = 0; x < fullSize; x++) tiled[y * fullSize + x] = re[(y % n) * n + x % n]
  return tiled
}
const srgb = (v: number) => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)

/** Seeded periodic synthesis from measured band energies, never source pixels. */
export function calibratedSurface(kind: keyof typeof SURFACE_PROFILES, seed: number): Generator {
  let cachedSize = 0
  let color: Float64Array | undefined, height: Float64Array = new Float64Array(0), rough: Float64Array = new Float64Array(0), metal: Float64Array | undefined
  const gen: Generator = (x, y, size, p) => {
    if (cachedSize !== size) {
      const profile = SURFACE_PROFILES[kind]
      const cells = kind === 'rock' ? 9 : kind === 'gravel' ? 28 : 0
      color = 'albedo' in profile ? field(profile.albedo, size, seed, false, 0) : undefined
      height = field(profile.normal, size, seed + 1, true, cells, kind === 'metal')
      rough = field(profile.rough, size, seed + 2, false, 0)
      metal = 'metal' in profile ? field(profile.metal, size, seed + 3, false, 0, false, kind === 'metal' ? 8 : 1) : undefined
      cachedSize = size
    }
    const i = ((y % size + size) % size) * size + ((x % size + size) % size)
    p.r = p.g = p.b = color ? srgb(Math.max(0, color[i])) : 255
    p.h = height[i]; p.rough = rough[i]
    if (metal) p.metal = metal[i]
  }
  gen.normalBias = SURFACE_PROFILES[kind].normal.bias
  gen.release = () => { cachedSize = 0; color = metal = undefined; height = rough = new Float64Array(0) }
  return gen
}
