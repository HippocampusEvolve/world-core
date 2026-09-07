import * as THREE from 'three';
import { createAnimal } from './animals.js';
import { randomOf } from './geometry.js';
/** Bounded population, deterministic fixed-step movement and obstacle probes.
 * Only three models are allocated. No spawning/destruction in the frame loop. */
export function createWildlife(habitat) {
    const root = new THREE.Group();
    root.name = 'forest-wildlife';
    const seed = habitat.seed ?? 719, rand = randomOf(seed), tau = Math.PI * 2;
    const animals = (habitat.kinds ?? ['fox', 'deer', 'raven']).map((kind, i) => {
        const model = createAnimal(kind, seed + i * 47);
        model.root.visible = false;
        root.add(model.root);
        return { kind, model, x: 0, y: 0, z: 0, yaw: 0, targetYaw: 0, homeX: 0, homeZ: 0,
            active: false, wait: 8 + i * 17, age: 0, state: 'watch', timer: 0, speed: 0, phase: rand() * 10,
            turn: 0, callAt: 10 + rand() * 15, trackAt: 0, flown: 0, avoidFor: 0,
            previousX: 0, previousY: 0, previousZ: 0, previousYaw: 0, graze: 0, alert: 0 };
    });
    let accumulator = 0, time = 0, disposed = false;
    const ground = (x, z) => {
        const y = habitat.surfaceAt(x, z);
        return typeof y === 'number' && Number.isFinite(y) && (!habitat.canStand || habitat.canStand(x, z, y)) ? y : null;
    };
    function spawn(a, p, direction) {
        for (let n = 0; n < 30; n++) {
            const angle = rand() * tau, radius = 18 + rand() * 15;
            const home = habitat.homes?.[Math.floor(rand() * habitat.homes.length)];
            const x = home ? home.x + (rand() - 0.5) * 4 : p.x + Math.sin(angle) * radius;
            const z = home ? home.z + (rand() - 0.5) * 4 : p.z + Math.cos(angle) * radius;
            const dist = Math.hypot(x - p.x, z - p.z);
            if (dist < 13 || dist > 65)
                continue;
            // New encounters enter from outside the visible forward hemisphere.
            if (direction && ((x - p.x) * direction.x + (z - p.z) * direction.z) > dist * 0.15)
                continue;
            const y = ground(x, z);
            if (y === null || Math.abs(y - p.y) > 9)
                continue;
            let safe = true;
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const gy = ground(x + dx, z + dz);
                if (gy === null || Math.abs(gy - y) > 0.35)
                    safe = false;
            }
            if (!safe)
                continue;
            a.x = x;
            a.z = z;
            a.y = y;
            a.homeX = x;
            a.homeZ = z;
            a.yaw = rand() * tau;
            a.targetYaw = a.yaw;
            a.active = true;
            a.age = 0;
            a.timer = 3 + rand() * 5;
            a.state = 'watch';
            a.speed = 0;
            a.flown = 0;
            a.previousX = x;
            a.previousY = y;
            a.previousZ = z;
            a.previousYaw = a.yaw;
            a.graze = 0;
            a.alert = 0;
            a.model.root.visible = true;
            return true;
        }
        return false;
    }
    function step(dt, p, w) {
        time += dt;
        for (const a of animals) {
            if (!a.active) {
                a.wait -= dt;
                if (a.wait <= 0 && (w.shelter ?? 0) < 0.5 && (w.storm ?? 0) < 0.72) {
                    spawn(a, p, w.direction);
                    a.wait = 12 + rand() * 12;
                }
                continue;
            }
            a.previousX = a.x;
            a.previousY = a.y + a.flown;
            a.previousZ = a.z;
            a.previousYaw = a.yaw;
            a.age += dt;
            a.timer -= dt;
            a.callAt -= dt;
            a.trackAt -= dt;
            a.avoidFor -= dt;
            const dx = a.x - p.x, dz = a.z - p.z, distance = Math.hypot(dx, dz);
            const bird = a.kind === 'raven', flee = distance < (a.kind === 'deer' ? 10 : bird ? 5 : 6) || (w.storm ?? 0) > 0.82;
            if (flee) {
                a.state = 'flee';
                a.timer = 4.5;
                if (a.avoidFor <= 0)
                    a.targetYaw = Math.atan2(dx, dz);
            }
            else if (a.timer <= 0) {
                a.state = rand() < 0.44 ? 'graze' : 'walk';
                a.timer = 3 + rand() * 7;
                const homeDist = Math.hypot(a.homeX - a.x, a.homeZ - a.z);
                a.targetYaw = homeDist > 7 ? Math.atan2(a.homeX - a.x, a.homeZ - a.z) : a.yaw + (rand() - 0.5) * 2.5;
            }
            if (bird && a.state === 'flee')
                a.flown = Math.min(5, a.flown + dt * 1.4);
            else
                a.flown = Math.max(0, a.flown - dt * 0.7);
            a.graze += ((a.state === 'graze' ? 1 : 0) - a.graze) * (1 - Math.exp(-dt * 3.2));
            a.alert += ((a.state === 'flee' ? 1 : 0) - a.alert) * (1 - Math.exp(-dt * 7));
            const targetSpeed = a.state === 'flee' ? (bird ? 3.8 : a.kind === 'deer' ? 3.2 : 2.5) : a.state === 'walk' ? (bird ? 0.35 : a.kind === 'deer' ? 0.72 : 0.48) : 0;
            const turn = Math.atan2(Math.sin(a.targetYaw - a.yaw), Math.cos(a.targetYaw - a.yaw));
            a.yaw += Math.max(-dt * 2.8, Math.min(dt * 2.8, turn));
            a.speed += (targetSpeed - a.speed) * Math.min(1, dt * 5);
            const nx = a.x + Math.sin(a.yaw) * a.speed * dt, nz = a.z + Math.cos(a.yaw) * a.speed * dt;
            const ny = ground(nx, nz);
            const aheadX = nx + Math.sin(a.yaw) * 0.65, aheadZ = nz + Math.cos(a.yaw) * 0.65, ahead = ground(aheadX, aheadZ);
            if (ny !== null && ahead !== null && Math.abs(ny - a.y) < 0.24 && Math.abs(ahead - ny) < 0.32) {
                a.x = nx;
                a.z = nz;
                a.y = ny;
            }
            else {
                a.speed = 0;
                if (a.avoidFor <= 0) {
                    a.targetYaw = a.yaw + Math.PI * 0.70;
                    a.avoidFor = 1.2;
                }
            }
            if (a.callAt <= 0) {
                if (a.state !== 'flee' && distance < 42 && (w.storm ?? 0) < 0.65)
                    habitat.onCall?.(a.kind, { x: a.x, y: a.y + 0.6, z: a.z });
                a.callAt = 18 + rand() * 25;
            }
            if (a.speed > 0.15 && a.trackAt <= 0 && !bird) {
                habitat.onTrack?.(a.kind, { x: a.x, y: a.y, z: a.z }, a.yaw);
                a.trackAt = (a.kind === 'fox' ? 0.36 : 0.65) / a.speed;
            }
            const behind = w.direction && (dx * w.direction.x + dz * w.direction.z) < 0;
            if (distance > 65 || (a.age > 100 && distance > 25 && behind)) {
                a.active = false;
                a.model.root.visible = false;
                a.wait = 25 + rand() * 35;
            }
        }
    }
    return { root, animals, get time() { return time; }, update(dt, p, w = {}) {
            if (disposed || w.active === false)
                return;
            if (w.reducedMotion) {
                for (const a of animals)
                    if (!a.active && a.age === 0) {
                        spawn(a, p, w.direction);
                        a.age = 1;
                    }
                for (const a of animals)
                    if (a.active) {
                        a.model.root.position.set(a.x, a.y, a.z);
                        a.model.root.rotation.y = a.yaw;
                        a.model.update(0);
                    }
                return;
            }
            accumulator += Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
            while (accumulator + 1e-8 >= 1 / 30) {
                step(1 / 30, p, w);
                accumulator -= 1 / 30;
            }
            const blend = Math.max(0, Math.min(1, accumulator * 30));
            for (const a of animals)
                if (a.active) {
                    a.model.root.position.set(a.previousX + (a.x - a.previousX) * blend, a.previousY + (a.y + a.flown - a.previousY) * blend, a.previousZ + (a.z - a.previousZ) * blend);
                    a.model.root.rotation.y = a.previousYaw + Math.atan2(Math.sin(a.yaw - a.previousYaw), Math.cos(a.yaw - a.previousYaw)) * blend;
                    a.model.update(dt, { speed: a.speed, alert: a.alert, graze: a.graze, flying: a.flown > 0.1 ? 1 : 0 });
                }
        }, dispose() { disposed = true; for (const a of animals)
            a.model.dispose(); root.removeFromParent(); } };
}
//# sourceMappingURL=wildlife.js.map