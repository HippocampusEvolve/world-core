import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { shovel } from '../dist/props/index.js'

test('procedural shovel preserves the held-tool coordinate contract and budget', () => {
  const root = shovel({ wood: new THREE.MeshStandardMaterial(), steel: new THREE.MeshStandardMaterial() })
  const box = new THREE.Box3().setFromObject(root)
  assert(Math.abs(box.min.y) < 1e-6, 'tip stays at y=0')
  assert(Math.abs(box.max.y - 1.45) < 1e-6, 'handle stays 1.45m high')
  assert(box.max.z - box.min.z > 0.05, 'scoop has real depth')
  assert(box.max.x - box.min.x < 0.26, 'blade fits original tool footprint')
  assert.equal(root.children.length, 2, 'one draw per material')
  let count = 0
  for (const mesh of root.children) {
    for (const attribute of Object.values(mesh.geometry.attributes)) assert(attribute.array.every(Number.isFinite))
    count += mesh.geometry.attributes.position.count / 3
    assert.equal(mesh.geometry.attributes.uv.count, mesh.geometry.attributes.position.count)
  }
  assert(count < 1000, `${count} triangles`)
})
