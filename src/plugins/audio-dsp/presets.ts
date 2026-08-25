export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export interface EqPreset {
  id: string;
  name: string;
  gains: number[]; // dB values for each of the 10 bands (-12dB to +12dB)
  preamp?: number;
}

export const EQ_PRESETS: Record<string, EqPreset> = {
  flat: {
    id: 'flat',
    name: 'Flat (Default)',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preamp: 0
  },
  bass_boost: {
    id: 'bass_boost',
    name: 'Bass Boost',
    gains: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
    preamp: -2
  },
  bass_reducer: {
    id: 'bass_reducer',
    name: 'Bass Reducer',
    gains: [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0],
    preamp: 0
  },
  treble_boost: {
    id: 'treble_boost',
    name: 'Treble Boost',
    gains: [0, 0, 0, 0, 0, 1, 2, 4, 6, 7],
    preamp: -1
  },
  vocal_clarity: {
    id: 'vocal_clarity',
    name: 'Vocal Clarity & Podcasts',
    gains: [-2, -2, 0, 2, 4, 4, 3, 1, 0, -1],
    preamp: 0
  },
  electronic: {
    id: 'electronic',
    name: 'Electronic / EDM',
    gains: [5.5, 4.5, 2, 0, -1.5, 2, 1, 2.5, 4.5, 5],
    preamp: -1.5
  },
  rock: {
    id: 'rock',
    name: 'Rock / Metal',
    gains: [5, 3.5, 2, 0.5, -1, -0.5, 1.5, 3, 4, 4.5],
    preamp: -1
  },
  classical: {
    id: 'classical',
    name: 'Classical / Acoustic',
    gains: [4, 3, 2, 1.5, -1, -1, 0, 2, 3, 3.5],
    preamp: 0
  },
  pop: {
    id: 'pop',
    name: 'Pop',
    gains: [-1, 1.5, 3, 3.5, 2, -1, -1.5, -1, 1.5, 2.5],
    preamp: 0
  }
};

export function clampGain(db: number): number {
  return Math.max(-12, Math.min(12, db));
}
