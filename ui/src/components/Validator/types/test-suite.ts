export interface TestSuitePrompt {
  id: string;
  prompt: string;
  category: string;
  description: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  version: string;
  prompts: TestSuitePrompt[];
}

export interface TestSuiteResult {
  suiteId: string;
  suiteName: string;
  styleId: string;
  styleName: string;
  modelId: string;
  modelName: string;
  timestamp: string;
  settings: {
    seed: number;
    steps: number;
    cfg: number;
    denoise: number;
    guidance: number;
    width: number;
    height: number;
    samplerName: string;
    schedulerName: string;
    loraWeight: number;
  };
  images: TestSuiteImage[];
}

export interface TestSuiteImage {
  promptId: string;
  prompt: string;
  category: string;
  description: string;
  imageUrl: string;
  fullPrompt: string;
  frontpad: string;
  backpad: string;
  seed: number;
  generatedAt: string;
}
