import * as THREE from 'three';
import { Surface, color, randomOf } from './geometry.js';
export const PLANT_KINDS = ['birch', 'spruce', 'juniper', 'rowan', 'grass', 'fern', 'reeds'];
export const PLANT_RADIUS = { birch: 1.8, spruce: 1.25, juniper: 0.85, rowan: 0.75, grass: 0.38, fern: 0.55, reeds: 0.45 };
/** Kenney Nature Kit is the silhouette reference; every surface is generated.
 * A winter palette, asymmetric branching and snow resting on upper boughs.
 * All parts share one vertex-colour material, including berries and snow. */
export function plantGeometry(kind, seed = 1) {
    const s = new Surface(), rand = randomOf(seed), tau = Math.PI * 2;
    const bark = color(kind === 'birch' ? 0xb9b8a8 : 0x75614f), twig = color(0x75664e);
    const needle = color(0x486454), snow = color(0xb9c8d1), straw = color(0x92866b);
    const leaf = (a, b, w, c = needle) => s.leaf(a, b, w, c.clone().multiplyScalar(0.85 + rand() * 0.3));
    const tuft = (p, length, width, height, angle) => {
        const g = new THREE.SphereGeometry(1, 6, 3), vertices = g.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
            const ripple = 1 + 0.13 * Math.sin(x * 19 + z * 13 + seed);
            vertices.setXYZ(i, x * ripple, y, z * ripple);
        }
        g.scale(width, height, length);
        g.rotateY(angle);
        g.translate(...p);
        s.append(g, (x, y, z) => needle.clone().multiplyScalar(0.84 + (y - p[1]) / height * 0.16 + 0.09 * Math.sin(x * 7 + z * 9)));
        g.dispose();
    };
    if (kind === 'birch') {
        const h = 5.2 + rand() * 1.8, lean = (rand() - 0.5) * 0.75;
        const at = (t) => [lean * t * t, h * t, Math.sin(t * 3) * 0.14];
        for (let i = 0; i < 9; i++) {
            const a = at(i / 9), b = at((i + 1) / 9), r = 0.13 * (1 - i / 10);
            s.branch(a, b, r, r * 0.89, bark.clone().multiplyScalar(0.94 + rand() * 0.12), 7);
            // Thin bark scars are coloured geometry, not overlapping black decals.
            for (let j = 0; j < 2; j++) {
                const t = (i + (j + 0.25) * 0.43) / 9, p = at(t), a0 = rand() * tau;
                const g = new THREE.CylinderGeometry(r * 0.94, r, 0.025 + rand() * 0.018, 7, 1, true, a0, 0.4 + rand() * 1.6);
                g.translate(...p);
                s.append(g, () => color(0x5a6059));
                g.dispose();
            }
        }
        for (let i = 0; i < 17; i++) {
            const t = 0.28 + i / 25, a = i * 2.399 + rand() * 0.5, length = (1 - t) * 2.0 + 0.24;
            const base = at(t), end = [base[0] + Math.cos(a) * length, base[1] + 0.40 + rand() * 0.45, base[2] + Math.sin(a) * length];
            s.branch(base, end, 0.032 * (1 - t) + 0.007, 0.009, bark, 5);
            for (let j = 0; j < 3; j++) {
                const k = (j + 1) / 3, p = base.map((n, axis) => n + (end[axis] - n) * k);
                const tip = [p[0] + Math.cos(a + j - 1) * 0.45, p[1] + 0.22 - j * 0.15, p[2] + Math.sin(a + j - 1) * 0.45];
                s.branch(p, tip, 0.010, 0.002, twig, 4);
                s.branch(tip, [tip[0] + 0.1, tip[1] - 0.30, tip[2] + 0.09], 0.004, 0.001, twig, 4);
            }
            if (i % 3 === 0)
                s.ellipsoid([end[0] * 0.78, end[1] + 0.015, end[2] * 0.78], [length * 0.24, 0.035, 0.11], snow, 7, 3);
        }
    }
    else if (kind === 'spruce' || kind === 'juniper') {
        const tree = kind === 'spruce', h = tree ? 2.8 + rand() * 0.9 : 0.70 + rand() * 0.35;
        s.branch([0, 0, 0], [0.07, h, 0], tree ? 0.095 : 0.034, 0.007, bark, 7);
        const tiers = tree ? 8 : 4, arms = tree ? 5 : 7;
        for (let k = 0; k < tiers; k++)
            for (let j = 0; j < arms; j++) {
                const t = (k + 0.6) / tiers, a = j * tau / arms + k * 2.399 + rand() * 0.3;
                const length = (tree ? 1.05 : 0.85) * (1 - t * 0.82) * (0.76 + rand() * 0.42);
                const base = [0.04 * t, h * (tree ? 0.16 + t * 0.80 : 0.10 + t * 0.75) + (rand() - 0.5) * h * 0.045, 0];
                const tip = [Math.cos(a) * length, base[1] + (tree ? 0.16 * t - 0.14 : 0.06), Math.sin(a) * length];
                s.branch(base, tip, tree ? 0.018 : 0.010, 0.003, twig, 4);
                for (let n = 1; n <= 3; n++) {
                    const u = n / 3, p = base.map((v, i) => v + (tip[i] - v) * u);
                    const size = (tree ? 0.34 : 0.26) * (1 - u * 0.36) * (0.7 + 0.3 * (1 - t));
                    tuft(p, size, size * 0.74, size * 0.44, Math.PI / 2 - a);
                    leaf(p, [p[0] + Math.cos(a) * size * 1.35, p[1] + 0.025, p[2] + Math.sin(a) * size * 1.35], size * 0.35);
                    if (n === 2 && (k + j) % 2 === 0) {
                        // Irregular, solid snow pillows. No alpha overdraw over the crown.
                        s.ellipsoid([p[0], p[1] + 0.035, p[2]], [0.19, 0.055, 0.13], snow, 7, 3);
                    }
                }
                if (!tree && j % 3 === 0)
                    s.ellipsoid([tip[0] * 0.7, tip[1] + 0.06, tip[2] * 0.7], [0.031, 0.031, 0.031], color(0x596986), 6, 3);
            }
        if (tree) {
            tuft([0.05, h - 0.14, 0], 0.12, 0.13, 0.26, 0);
            leaf([0.04, h - 0.24, 0], [0.06, h + 0.06, 0.04], 0.06);
        }
    }
    else if (kind === 'rowan') {
        for (let stem = 0; stem < 7; stem++) {
            const a = stem * 2.399, h = 0.70 + rand() * 0.80, r = 0.25 + rand() * 0.26;
            const end = [Math.cos(a) * r, h, Math.sin(a) * r];
            s.branch([0, 0, 0], end, 0.029, 0.006, bark, 5);
            for (let j = 0; j < 3; j++) {
                const u = 0.5 + j * 0.23, p = end.map(v => v * u), az = a + j * 1.7;
                const tip = [p[0] + Math.cos(az) * 0.23, p[1] + 0.15, p[2] + Math.sin(az) * 0.23];
                s.branch(p, tip, 0.011, 0.003, twig, 4);
                for (let b = 0; b < 5; b++) {
                    const ba = b * 2.4, br = 0.035 + (b % 2) * 0.015;
                    s.ellipsoid([tip[0] + Math.cos(ba) * br, tip[1] - 0.02 - (b % 2) * 0.035, tip[2] + Math.sin(ba) * br], [0.027, 0.030, 0.027], color(b % 2 ? 0x954b35 : 0xb26043), 6, 3);
                }
                if (j === 2)
                    s.ellipsoid([tip[0], tip[1] + 0.025, tip[2]], [0.08, 0.025, 0.07], snow, 7, 3);
            }
        }
    }
    else if (kind === 'fern') {
        for (let f = 0; f < 7; f++) {
            const a = f * 2.399, length = 0.40 + rand() * 0.30;
            let prev = [0, 0, 0];
            for (let n = 1; n <= 8; n++) {
                const t = n / 8, p = [Math.cos(a) * length * t, Math.sin(t * 2.1) * 0.28, Math.sin(a) * length * t];
                s.branch(prev, p, 0.006 * (1 - t) + 0.001, 0.002, twig, 4);
                prev = p;
                for (const side of [-1, 1]) {
                    const az = a + side * 0.9, l = (1 - t) * 0.20 + 0.014;
                    leaf(p, [p[0] + Math.cos(az) * l, p[1] + 0.022, p[2] + Math.sin(az) * l], l * 0.17, color(0x737358));
                }
            }
        }
    }
    else {
        const reeds = kind === 'reeds';
        for (let i = 0; i < (reeds ? 12 : 22); i++) {
            const a = rand() * tau, r = rand() * 0.24, h = (reeds ? 0.50 : 0.18) + rand() * (reeds ? 0.65 : 0.42);
            const p = [Math.cos(a) * r, 0, Math.sin(a) * r], tip = [p[0] + Math.cos(a) * 0.18, h, p[2] + Math.sin(a) * 0.18];
            leaf(p, tip, reeds ? 0.018 : 0.012, straw);
            if (reeds && i % 2 === 0)
                s.branch([tip[0], tip[1] - 0.12, tip[2]], tip, 0.025, 0.019, color(0x74664e), 5);
            if (!reeds && i % 4 === 0)
                for (let j = 0; j < 3; j++) {
                    s.ellipsoid([tip[0] + (j - 1) * 0.018, tip[1] - j * 0.025, tip[2]], [0.014, 0.024, 0.01], straw, 5, 3);
                }
        }
    }
    return s.geometry();
}
/** Spatial batches keep frustum culling useful. One mesh per species/variant/cell.
 * No per-plant update; a small shader bends only the upper part. */
export function createVegetation(sites, { variants = 2, cellSize = 36 } = {}) {
    const root = new THREE.Group();
    root.name = 'winter-vegetation';
    const time = { value: 0 }, strength = { value: 0.5 }, geometries = new Map();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    const bend = (shader) => {
        shader.uniforms.ecoTime = time;
        shader.uniforms.ecoWind = strength;
        shader.vertexShader = 'uniform float ecoTime;\nuniform float ecoWind;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ecoAnchor = vec3(0.0);
      #ifdef USE_INSTANCING
        ecoAnchor = instanceMatrix[3].xyz;
      #endif
      float ecoBend = min(position.y * position.y * 0.07, 1.0);
      float ecoWave = sin(ecoTime * 1.15 + ecoAnchor.x * 0.19 + ecoAnchor.z * 0.12);
      transformed.x += ecoWave * ecoBend * 0.075 * ecoWind;
      transformed.z += sin(ecoTime * 0.81 + ecoAnchor.z * 0.2) * ecoBend * 0.035 * ecoWind;
    `);
    };
    material.onBeforeCompile = bend;
    material.customProgramCacheKey = () => 'winter-plants-1';
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    depth.onBeforeCompile = bend;
    depth.customProgramCacheKey = () => 'winter-plants-depth-1';
    const buckets = new Map();
    sites.forEach((site, i) => {
        const variant = Math.abs((site.seed ?? i) | 0) % variants;
        const key = `${site.kind}:${variant}:${Math.floor(site.x / cellSize)}:${Math.floor(site.z / cellSize)}`;
        const list = buckets.get(key) ?? [];
        list.push(site);
        buckets.set(key, list);
    });
    const dummy = new THREE.Object3D(), meshes = [];
    const instances = new Map();
    for (const [key, list] of buckets) {
        const [kind, variant] = key.split(':'), gkey = `${kind}:${variant}`;
        if (!geometries.has(gkey))
            geometries.set(gkey, plantGeometry(kind, 781 + Number(variant) * 173));
        const mesh = new THREE.InstancedMesh(geometries.get(gkey), material, list.length);
        mesh.name = key;
        mesh.customDepthMaterial = depth;
        mesh.receiveShadow = true;
        mesh.castShadow = kind === 'birch' || kind === 'spruce' || kind === 'rowan';
        list.forEach((site, i) => {
            dummy.position.set(site.x, site.y - 0.025, site.z);
            dummy.rotation.set(0, site.yaw ?? 0, 0);
            dummy.scale.setScalar(site.scale ?? 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            instances.set(site, { mesh, index: i, matrix: dummy.matrix.clone() });
        });
        mesh.computeBoundingSphere();
        // Include the shader displacement, otherwise edge-of-frustum leaves pop.
        if (mesh.boundingSphere)
            mesh.boundingSphere.radius += 0.20;
        root.add(mesh);
        meshes.push(mesh);
    }
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    return { root, sites, meshes, setVisible(site, visible) {
            const item = instances.get(site);
            if (!item)
                return;
            item.mesh.setMatrixAt(item.index, visible ? item.matrix : hidden);
            item.mesh.instanceMatrix.needsUpdate = true;
        }, update(seconds, wind = 0.5, reduced = false) {
            time.value = reduced ? 0 : seconds;
            strength.value = reduced ? 0 : Math.max(0, Math.min(1, wind));
        }, dispose() { for (const m of meshes)
            m.dispose(); for (const g of geometries.values())
            g.dispose(); material.dispose(); depth.dispose(); root.removeFromParent(); } };
}
//# sourceMappingURL=plants.js.map