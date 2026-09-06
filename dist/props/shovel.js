import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
/** Tip at (0,0,0), handle along +Y, scoop opens toward -Z. Height 1.45m. */
export function shovel(mats) {
    const pieces = { wood: [], steel: [] };
    const add = (role, g, x, y, z, rz = 0) => {
        if (rz)
            g.rotateZ(rz);
        g.translate(x, y, z);
        pieces[role].push(g.index ? g.toNonIndexed() : g);
        if (g.index)
            g.dispose();
    };
    // A closed, gently cupped blade. Each row shares the front/back outline.
    const points = [], indices = [];
    const rows = 10, columns = 12;
    for (let side = 0; side < 2; side++)
        for (let row = 0; row <= rows; row++) {
            const h = row / rows, halfWidth = 0.035 + Math.sin(h * Math.PI / 2) * 0.08;
            for (let col = 0; col <= columns; col++) {
                const u = col / columns * 2 - 1;
                points.push(u * halfWidth, h * 0.26, -0.024 + u * u * 0.032 + side * 0.009);
            }
        }
    const layer = (rows + 1) * (columns + 1);
    const quad = (a, b, c, d) => indices.push(a, b, d, b, c, d);
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
            const a = row * (columns + 1) + col, b = a + 1, d = a + columns + 1, c = d + 1;
            quad(a, d, c, b);
            quad(a + layer, b + layer, c + layer, d + layer);
        }
    for (let col = 0; col < columns; col++) {
        quad(col, col + 1, col + 1 + layer, col + layer);
        const a = rows * (columns + 1) + col;
        quad(a + 1, a, a + layer, a + 1 + layer);
    }
    for (let row = 0; row < rows; row++) {
        const a = row * (columns + 1), b = a + columns + 1;
        quad(b, a, a + layer, b + layer);
        quad(a + columns, b + columns, b + columns + layer, a + columns + layer);
    }
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    blade.setIndex(indices);
    blade.computeVertexNormals();
    blade.setAttribute('uv', new THREE.Float32BufferAttribute(points.flatMap((_, i) => i % 3 === 0 ? [points[i], points[i + 1]] : []), 2));
    add('steel', blade, 0, 0, 0);
    add('steel', new THREE.CylinderGeometry(0.022, 0.033, 0.22, 10), 0, 0.355, -0.006);
    add('steel', new THREE.CylinderGeometry(0.011, 0.011, 0.21, 8), 0, 0.254, 0, Math.PI / 2);
    add('wood', new THREE.CylinderGeometry(0.019, 0.022, 1, 10), 0, 0.925, -0.002);
    add('wood', new THREE.CylinderGeometry(0.016, 0.016, 0.15, 12), 0, 1.434, -0.002, Math.PI / 2);
    const root = new THREE.Group();
    root.name = 'Procedural shovel';
    for (const role of ['steel', 'wood']) {
        const geometry = mergeGeometries(pieces[role]);
        for (const part of pieces[role])
            part.dispose();
        const mesh = new THREE.Mesh(geometry, mats[role]);
        mesh.name = `shovel/${role}`;
        mesh.castShadow = mesh.receiveShadow = true;
        root.add(mesh);
    }
    return root;
}
//# sourceMappingURL=shovel.js.map