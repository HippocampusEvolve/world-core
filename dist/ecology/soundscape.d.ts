export type NatureVoice = 'songbird' | 'raven' | 'owl' | 'fox' | 'deer' | 'bough' | 'snowfall' | 'ice';
export declare const NATURE_VOICES: NatureVoice[];
/** Seeded micro-recordings synthesised into short mono buffers once per variant.
 * Soft, zero-ended envelopes; de-mean removes DC, peak cap leaves mixing headroom.
 * No oscillator graphs accumulating on paused AudioContexts. */
export declare function natureSamples(kind: NatureVoice, seed?: number, sampleRate?: number): {
    data: Float32Array<ArrayBuffer>;
    sampleRate: number;
    duration: number;
};
type Position = {
    x: number;
    y: number;
    z: number;
};
type Bus = {
    ctx: AudioContext;
    out: AudioNode;
};
export interface SoundscapeState {
    position: Position;
    direction: Position;
    shelter?: number;
    storm?: number;
    active?: boolean;
}
export declare function createNatureSoundscape(getBus: () => Bus | null, { seed, alpine }?: {
    seed?: number | undefined;
    alpine?: boolean | undefined;
}): {
    play: (kind: NatureVoice, position: Position, level?: number) => boolean;
    readonly events: number;
    readonly activeVoices: number;
    readonly cachedVoices: number;
    update(dt: number, state: SoundscapeState): void;
    dispose(): void;
};
export {};
