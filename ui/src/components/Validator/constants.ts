export const AVAILABLE_MODELS = [
  { id: 'flux1-dev-fp8', name: 'FLUX.1 Dev (FP8)', description: 'High quality, balanced speed' },
  { id: 'flux1-schnell', name: 'FLUX.1 Schnell', description: 'Fast generation, good quality' },
  { id: 'flux1-dev', name: 'FLUX.1 Dev (Full)', description: 'Maximum quality, slower' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];
