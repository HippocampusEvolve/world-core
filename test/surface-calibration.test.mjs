import test from 'node:test'
import assert from 'node:assert/strict'
import { bake, recipe, normalFromHeight } from '../dist/materials/index.js'

test('reference normal bias survives the height bake without a seam', () => {
  const gen = (x, y, n, p) => { p.h = .5 }
  gen.normalBias = [.2, -.1]
  const b = bake(gen, 16, 1)
  const expected = normalFromHeight(new Float32Array(256).fill(.5), 16, 1, [.2, -.1])
  assert.deepEqual(b.normal, expected)
  assert.ok(b.normal[0] > 150 && b.normal[1] < 120)
  for (let i = 0; i < b.normal.length; i += 4) assert.deepEqual(b.normal.slice(i, i + 4), b.normal.slice(0, 4))
})

// Native-file measurements, not a snapshot of the generator output.
const references = {
  surfaceSnow: [15.8852, .8026],
  surfaceTowerSnow: [9.3185, .5100],
  surfaceTowerRock: [36.0027, .6934],
  surfaceTowerGravel: [32.2803, .4632],
  surfaceTowerConcrete: [5.9706, .5165],
  surfaceTowerWood: [19.3834, .6777],
  surfaceTowerRust: [4.6464, .9030],
  surfaceTowerMetal: [17.0145, .2963],
  surfaceTowerCloth: [11.4086, .8449],
  surfaceTowerIce: [2.7266, .2872],
  surfaceTowerPaper: [3.1721, .6419],
}
for (const [name, [tilt, rough]] of Object.entries(references)) test(`${name}: measured relief and roughness`, () => {
  const r = recipe(name), b = bake(r.gen, r.size, r.normalStrength)
  let angles = 0, roughness = 0
  for (let i = 0; i < b.normal.length; i += 4) {
    const x = b.normal[i] / 127.5 - 1, y = b.normal[i + 1] / 127.5 - 1, z = b.normal[i + 2] / 127.5 - 1
    angles += Math.atan2(Math.hypot(x, y), z) ** 2
    roughness += b.rough[i + 1] / 255
  }
  const measured = Math.sqrt(angles / b.size ** 2) * 180 / Math.PI
  assert.ok(Math.abs(measured - tilt) <= Math.max(.5, tilt * .05), `${measured} vs ${tilt}`)
  assert.ok(Math.abs(roughness / b.size ** 2 - rough) <= .002)
})
