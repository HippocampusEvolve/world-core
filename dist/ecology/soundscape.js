import { randomOf } from './geometry.js';
export const NATURE_VOICES = ['songbird', 'raven', 'owl', 'fox', 'deer', 'bough', 'snowfall', 'ice'];
const TAU = Math.PI * 2;
/** Seeded micro-recordings synthesised into short mono buffers once per variant.
 * Soft, zero-ended envelopes; de-mean removes DC, peak cap leaves mixing headroom.
 * No oscillator graphs accumulating on paused AudioContexts. */
export function natureSamples(kind, seed = 1, sampleRate = 24000) {
    const rand = randomOf(seed), duration = kind === 'songbird' ? 2.3 : kind === 'owl' ? 2.8 : kind === 'snowfall' ? 2.6 : kind === 'ice' ? 2.1 : 1.5;
    const data = new Float32Array(Math.ceil(duration * sampleRate)), variation = 0.94 + rand() * 0.12;
    let phase = 0, low = 0, brown = 0;
    const env = (t, start, len) => {
        const p = (t - start) / len;
        return p > 0 && p < 1 ? Math.pow(Math.sin(p * Math.PI), 1.8) : 0;
    };
    for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate, n = rand() * 2 - 1;
        low += 0.12 * (n - low);
        brown += 0.015 * (n - brown);
        let value = 0;
        if (kind === 'songbird') {
            // Three short phrases with breaths between notes and different contours.
            const starts = [0.12, 0.43, 0.98, 1.19, 1.75], lengths = [0.18, 0.26, 0.10, 0.25, 0.30];
            for (let k = 0; k < starts.length; k++) {
                const e = env(t, starts[k], lengths[k]), u = (t - starts[k]) / lengths[k];
                const f = (2250 + k % 2 * 580 + 360 * Math.sin(u * 3.1)) * variation;
                value += e * (Math.sin(TAU * f * (t - starts[k])) + 0.12 * Math.sin(TAU * f * 2 * (t - starts[k]))) * 0.15;
            }
        }
        else if (kind === 'raven' || kind === 'fox' || kind === 'deer') {
            const raven = kind === 'raven', base = (raven ? 185 : kind === 'fox' ? 370 : 125) * variation;
            const frequency = base * (1 + 0.13 * Math.sin(t * 8.5) + 0.018 * n);
            phase += TAU * frequency / sampleRate;
            const e = env(t, 0.12, raven ? 0.42 : 0.23) + env(t, raven ? 0.78 : 0.65, raven ? 0.36 : 0.31) * 0.65;
            const voiced = Math.sin(phase) + 0.42 * Math.sin(phase * 2) + 0.26 * Math.sin(phase * 3) + 0.12 * Math.sin(phase * 5);
            value = e * (voiced * 0.12 + low * (raven ? 0.33 : 0.20));
        }
        else if (kind === 'owl') {
            phase += TAU * (385 + 9 * Math.sin(t * 12)) * variation / sampleRate;
            const e = env(t, 0.15, 0.48) + env(t, 0.96, 0.27) * 0.72 + env(t, 1.48, 0.92) * 0.87;
            value = e * (Math.sin(phase) + Math.sin(phase * 2) * 0.11) * 0.17;
        }
        else if (kind === 'bough') {
            const e = env(t, 0.04, 1.25), f = 135 + 32 * Math.sin(t * 3.1);
            phase += TAU * f / sampleRate;
            value = e * (brown * 0.6 + Math.sin(phase) * 0.025 + Math.sin(phase * 2.71) * 0.014) * (0.65 + 0.35 * Math.sin(t * 34));
        }
        else if (kind === 'snowfall') {
            value = (low * 0.45 + brown * 0.45) * env(t, 0.05, 2.45) * (0.65 + 0.35 * Math.sin(t * 12) ** 2);
        }
        else {
            for (let k = 0; k < 4; k++) {
                const start = 0.08 + k * 0.35, u = t - start;
                if (u > 0)
                    value += Math.sin(TAU * (710 + k * 293) * variation * u) * Math.exp(-u * 6) * (1 - Math.exp(-u * 100)) * 0.055;
            }
            value *= env(t, 0, duration);
        }
        data[i] = value;
    }
    let sum = 0, weight = 0;
    for (let i = 0; i < data.length; i++) {
        const w = Math.sin(Math.PI * i / (data.length - 1)) ** 2;
        sum += data[i];
        weight += w;
    }
    const correction = sum / weight;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
        data[i] -= correction * Math.sin(Math.PI * i / (data.length - 1)) ** 2;
        peak = Math.max(peak, Math.abs(data[i]));
    }
    if (peak > 0.32)
        for (let i = 0; i < data.length; i++)
            data[i] *= 0.32 / peak;
    data[0] = data[data.length - 1] = 0;
    return { data, sampleRate, duration };
}
export function createNatureSoundscape(getBus, { seed = 37, alpine = false } = {}) {
    const rand = randomOf(seed), cache = new Map(), playing = new Set();
    let last = null, timer = 3, age = 0, count = 0, disposed = false, cachedContext = null;
    function play(kind, position, level = 1) {
        if (disposed || !last || last.active === false)
            return false;
        const bus = getBus();
        if (!bus || bus.ctx.state !== 'running' || playing.size >= 5)
            return false;
        const { ctx, out } = bus, p = last.position, dx = position.x - p.x, dz = position.z - p.z;
        const distance = Math.hypot(dx, position.y - p.y, dz);
        if (distance > 65)
            return false;
        if (ctx !== cachedContext) {
            cache.clear();
            cachedContext = ctx;
        }
        const variant = Math.floor(rand() * 3), key = `${kind}:${variant}`;
        if (!cache.has(key)) {
            const samples = natureSamples(kind, seed + variant * 113);
            const buffer = ctx.createBuffer(1, samples.data.length, samples.sampleRate);
            buffer.copyToChannel(samples.data, 0);
            cache.set(key, buffer);
        }
        const source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner(), lp = ctx.createBiquadFilter();
        source.buffer = cache.get(key);
        source.playbackRate.value = 0.97 + rand() * 0.06;
        const shelter = Math.max(0, Math.min(1, last.shelter ?? 0)), storm = Math.max(0, Math.min(1, last.storm ?? 0));
        gain.gain.value = level * 0.52 / (1 + distance * distance / 150) * (1 - shelter * 0.90) * (1 - storm * 0.65);
        // Camera-right = (-forward.z, 0, forward.x), including non-horizontal look.
        const d = last.direction, horizontal = Math.hypot(d.x, d.z) || 1;
        pan.pan.value = Math.max(-0.92, Math.min(0.92, (-d.z * dx + d.x * dz) / horizontal / Math.max(distance, 0.1)));
        lp.type = 'lowpass';
        lp.frequency.value = Math.max(550, 5800 - distance * 58 - shelter * 3500);
        source.connect(lp).connect(gain).connect(pan).connect(out);
        source.onended = () => { playing.delete(source); source.disconnect(); lp.disconnect(); gain.disconnect(); pan.disconnect(); };
        playing.add(source);
        source.start();
        count++;
        return true;
    }
    return { play, get events() { return count; }, get activeVoices() { return playing.size; }, get cachedVoices() { return cache.size; },
        update(dt, state) {
            last = state;
            if (disposed || state.active === false || !getBus())
                return;
            const step = Math.max(0, Math.min(0.1, dt));
            timer -= step;
            age += step;
            if (timer > 0)
                return;
            const storm = state.storm ?? 0, shelter = state.shelter ?? 0;
            timer = alpine ? 10 + rand() * 13 : 7 + rand() * 12;
            if (shelter > 0.75 || storm > 0.8)
                return;
            const a = rand() * TAU, r = 8 + rand() * 20, p = state.position;
            const choices = alpine ? ['raven', 'ice', 'snowfall', 'bough'] : ['songbird', 'bough', 'snowfall', 'owl'];
            // Night owls stay rare; the first sound gives the surroundings a voice.
            const kind = age < 8 ? (alpine ? 'raven' : 'songbird') : choices[Math.floor(rand() * choices.length)];
            play(kind, { x: p.x + Math.sin(a) * r, y: p.y + 2, z: p.z + Math.cos(a) * r }, kind === 'owl' ? 0.7 : 1);
        }, dispose() { disposed = true; for (const source of playing) {
            try {
                source.stop();
            }
            catch { }
        } playing.clear(); cache.clear(); } };
}
//# sourceMappingURL=soundscape.js.map