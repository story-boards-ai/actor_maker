import type { GenerationSettings } from "../../components/TrainingDataManager/types";
import type { Style, Actor } from "../../types";

export const BATCH_SIZE = 2; // Process 2 images at a time

export const DEFAULT_SETTINGS = {
  width: 1360,
  height: 768,
  monochromeContrast: 1.2,
  monochromeBrightness: 1.0,
  seedLocked: false,
};

export function getDefaultSettings(
  styleOrActor: Style | Actor
): Partial<GenerationSettings> {
  // Check if it's a Style (has lora_weight property) or Actor
  if ("lora_weight" in styleOrActor) {
    // It's a Style
    const style = styleOrActor as Style;
    return {
      steps: style.steps ?? 20,
      cfg: style.cfg ?? 1,
      denoise: style.denoise ?? 0.8,
      guidance: style.guidance ?? 3.5,
      samplerName: style.sampler_name ?? "euler",
      schedulerName: style.scheduler_name ?? "ddim_uniform",
      loraStrengthModel: style.lora_weight || 1.0,
      loraStrengthClip: style.lora_weight || 1.0,
      frontpad: style.frontpad || "",
      backpad: style.backpad || "",
    };
  } else {
    // It's an Actor - use sensible defaults
    return {
      steps: 20,
      cfg: 1,
      denoise: 1,
      guidance: 3.5,
      samplerName: "euler",
      schedulerName: "ddim_uniform",
      loraStrengthModel: 1.0,
      loraStrengthClip: 1.0,
      frontpad: "",
      backpad: "",
    };
  }
}
