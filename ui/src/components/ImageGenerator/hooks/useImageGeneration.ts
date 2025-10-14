import { Dispatch, SetStateAction } from "react";
import {
  stripColorReferences,
  isMonochromeStyle,
} from "../../../utils/promptUtils";
import type { Style } from "../../../types";
import {
  blobToBase64Jpeg,
  applyMonochromeFilter,
} from "../utils/imageProcessing";

interface InputImage {
  filename: string;
  path: string;
  hasPrompt: boolean;
}

interface ImageResult {
  url: string;
  filename?: string;
}

interface GenerationResult {
  status: string;
  output?: {
    job_results?: {
      images?: Array<ImageResult | string>;
    };
    output?: {
      images?: Array<ImageResult | string>;
    };
    images?: Array<ImageResult | string>;
  };
  error?: string;
}

interface UseImageGenerationProps {
  selectedImage: string;
  selectedStyle: string;
  prompt: string;
  inputImages: InputImage[];
  styles: Style[];
  seed: number;
  seedLocked: boolean;
  setSeed: Dispatch<SetStateAction<number>>;
  steps: number;
  cfg: number;
  denoise: number;
  guidance: number;
  width: number;
  height: number;
  samplerName: string;
  schedulerName: string;
  loraStrengthModel: number;
  loraStrengthClip: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setGeneratedImage: Dispatch<SetStateAction<string | null>>;
  setFullPrompt: Dispatch<SetStateAction<string>>;
  setPromptBreakdown: Dispatch<SetStateAction<any>>;
  addLog: (message: string) => void;
}

export function useImageGeneration(props: UseImageGenerationProps) {
  const {
    selectedImage,
    selectedStyle,
    prompt,
    inputImages,
    styles,
    seed,
    seedLocked,
    setSeed,
    steps,
    cfg,
    denoise,
    guidance,
    width,
    height,
    samplerName,
    schedulerName,
    loraStrengthModel,
    loraStrengthClip,
    monochromeContrast,
    monochromeBrightness,
    setLoading,
    setError,
    setGeneratedImage,
    setFullPrompt,
    setPromptBreakdown,
    addLog,
  } = props;

  async function generateImage() {
    if (!selectedImage || !selectedStyle) {
      setError("Please select both an input image and a style");
      addLog("ERROR: Missing image or style selection");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGeneratedImage(null);
      addLog("=".repeat(60));
      addLog("Starting image generation...");
      
      // Randomize seed if not locked
      let currentSeed = seed;
      if (!seedLocked) {
        currentSeed = Math.floor(Math.random() * 1000000);
        setSeed(currentSeed);
        addLog(`🎲 Random seed: ${currentSeed}`);
      } else {
        addLog(`🔒 Locked seed: ${currentSeed}`);
      }

      // selectedImage can be either a path or a filename, check both
      const imageData = inputImages.find(
        (img) => img.path === selectedImage || img.filename === selectedImage
      );
      const styleData = styles.find((s) => s.id === selectedStyle);

      if (!imageData || !styleData) {
        throw new Error("Selected image or style not found");
      }

      addLog(`Selected image: ${imageData.filename}`);
      addLog(`Selected style: ${styleData.title} (${styleData.lora_name})`);

      addLog("Fetching source image...");
      const imageResponse = await fetch(imageData.path);
      const imageBlob = await imageResponse.blob();
      addLog(`Original format: ${imageBlob.type} (${imageBlob.size} bytes)`);
      addLog("Converting to JPEG format...");
      let base64 = await blobToBase64Jpeg(imageBlob);
      addLog(`Image converted to JPEG base64 (${base64.length} bytes)`);

      if (styleData.monochrome) {
        addLog(
          `⚫ Applying B&W conversion (contrast: ${monochromeContrast}x, brightness: ${monochromeBrightness}x)...`
        );
        base64 = await applyMonochromeFilter(
          base64,
          monochromeContrast,
          monochromeBrightness
        );
        addLog(`✅ B&W filter applied to source image`);
      }

      addLog("Loading workflow template...");
      const workflowResponse = await fetch("/workflows/img2img_workflow.json");
      const workflowTemplate = await workflowResponse.json();
      addLog("Workflow template loaded");

      const modelName = styleData.model || "flux1-dev-fp8";
      workflowTemplate["1"].inputs.unet_name = `${modelName}.safetensors`;
      addLog(`Injected model: ${modelName}.safetensors`);

      workflowTemplate["150"].inputs.seed = currentSeed;
      workflowTemplate["150"].inputs.steps = steps;
      workflowTemplate["150"].inputs.cfg = cfg;
      workflowTemplate["150"].inputs.sampler_name = samplerName;
      workflowTemplate["150"].inputs.scheduler = schedulerName;
      workflowTemplate["150"].inputs.denoise = denoise;
      workflowTemplate["51"].inputs.guidance = guidance;
      workflowTemplate["132"].inputs.guidance = guidance;
      workflowTemplate["215"].inputs.width = width;
      workflowTemplate["215"].inputs.height = height;
      addLog(
        `Settings: ${steps} steps, denoise ${denoise}, guidance ${guidance}, ${width}x${height}`
      );

      workflowTemplate["216"].inputs.base64_data = base64;
      addLog("Injected source image into workflow node 216");

      workflowTemplate["205"].inputs.lora_name = `${styleData.lora_file}`;
      workflowTemplate["205"].inputs.strength_model = loraStrengthModel;
      workflowTemplate["205"].inputs.strength_clip = loraStrengthClip;
      addLog(`Injected style LoRA: ${styleData.lora_file}`);
      addLog(`  - Model strength: ${loraStrengthModel}`);
      addLog(`  - CLIP strength: ${loraStrengthClip}`);

      const triggerWords = styleData.trigger_words || "";
      let frontpad = styleData.frontpad || "";
      let backpad = styleData.backpad || "";
      let baseDescription = prompt || "a beautiful scene";

      addLog(`Style data loaded: ${styleData.title}`);
      addLog(`  - Monochrome: ${styleData.monochrome ? "YES" : "NO"}`);
      addLog(
        `  - Trigger words: ${triggerWords ? `"${triggerWords}"` : "(none)"}`
      );
      addLog(`  - Frontpad length: ${frontpad.length} chars`);
      addLog(`  - Backpad length: ${backpad.length} chars`);
      addLog(
        `  - Caption: "${baseDescription.substring(0, 50)}${
          baseDescription.length > 50 ? "..." : ""
        }"`
      );

      if (isMonochromeStyle(styleData)) {
        const originalFrontpad = frontpad;
        const originalBackpad = backpad;
        const originalCaption = baseDescription;

        frontpad = stripColorReferences(frontpad);
        backpad = stripColorReferences(backpad);
        baseDescription = stripColorReferences(baseDescription);

        addLog(`⚫ Monochrome mode: Stripped color references`);
        if (originalFrontpad !== frontpad)
          addLog(
            `  - Frontpad cleaned: ${originalFrontpad.length} → ${frontpad.length} chars`
          );
        if (originalBackpad !== backpad)
          addLog(
            `  - Backpad cleaned: ${originalBackpad.length} → ${backpad.length} chars`
          );
        if (originalCaption !== baseDescription)
          addLog(
            `  - Caption cleaned: "${originalCaption}" → "${baseDescription}"`
          );
      }

      let finalPrompt = "";
      if (triggerWords) {
        finalPrompt += triggerWords;
      }
      if (frontpad) {
        finalPrompt += (finalPrompt ? ", " : "") + frontpad;
      }
      if (baseDescription) {
        finalPrompt += (finalPrompt ? ", " : "") + baseDescription;
      }
      if (backpad) {
        finalPrompt += (finalPrompt ? ", " : "") + backpad;
      }

      addLog(`✅ Final prompt assembled: ${finalPrompt.length} total chars`);

      workflowTemplate["132"].inputs.t5xxl = finalPrompt;
      workflowTemplate["132"].inputs.clip_l = finalPrompt;

      setFullPrompt(finalPrompt);
      setPromptBreakdown({
        triggerWords,
        frontpad,
        prompt: baseDescription,
        backpad,
      });

      const model_urls: Array<{ id: string; url: string }> = [];
      addLog("Using system style LoRA (already on RunPod)");

      const payload = {
        input: {
          workflow: workflowTemplate,
          model_urls: model_urls,
          force_download: false,
        },
      };

      addLog("Payload constructed");
      addLog(`Workflow nodes: ${Object.keys(workflowTemplate).length}`);
      addLog(
        `Model URLs: ${
          model_urls.length > 0 ? JSON.stringify(model_urls) : "[]"
        }`
      );

      const requestData = {
        payload,
        styleId: styleData.id,
        imageName: imageData.filename,
      };

      addLog("Sending request to backend...");
      const generationResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${generationResponse.status}`);
      }

      const result: GenerationResult = await generationResponse.json();
      addLog("Received response from backend");
      addLog(`Response status: ${result.status}`);
      addLog(`Response structure: ${JSON.stringify(Object.keys(result))}`);

      if (result.output) {
        addLog(`Output keys: ${JSON.stringify(Object.keys(result.output))}`);
      }

      if (result.status === "COMPLETED" || result.status === "success") {
        const getImageUrl = (img: ImageResult | string): string => {
          return typeof img === "string" ? img : img.url;
        };

        let imageUrl: string | null = null;

        if (
          result.output?.job_results?.images &&
          result.output.job_results.images.length > 0
        ) {
          imageUrl = getImageUrl(result.output.job_results.images[0]);
          addLog(`Found image in job_results.images: ${imageUrl}`);
        } else if (
          result.output?.output?.images &&
          result.output.output.images.length > 0
        ) {
          imageUrl = getImageUrl(result.output.output.images[0]);
          addLog(`Found image in output.images: ${imageUrl}`);
        } else if (result.output?.images && result.output.images.length > 0) {
          imageUrl = getImageUrl(result.output.images[0]);
          addLog(`Found image in output.images (direct): ${imageUrl}`);
        }

        if (imageUrl) {
          // Add cache-busting timestamp to force browser to reload the image
          const cacheBustedUrl = imageUrl.includes('?') 
            ? `${imageUrl}&t=${Date.now()}` 
            : `${imageUrl}?t=${Date.now()}`;
          setGeneratedImage(cacheBustedUrl);
          addLog(`✅ SUCCESS: Image generated`);
          addLog(`Image URL: ${cacheBustedUrl}`);
        } else {
          addLog(
            `❌ ERROR: Response structure: ${JSON.stringify(result, null, 2)}`
          );
          throw new Error("No images found in any expected response format");
        }
      } else if (result.status === "FAILED" || result.status === "failed") {
        throw new Error(result.error || "Generation failed");
      } else {
        throw new Error(`Unexpected status: ${result.status}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Generation failed";
      addLog(`❌ ERROR: ${errorMsg}`);
      setError(errorMsg);
      setGeneratedImage(null);
    } finally {
      setLoading(false);
      addLog("=".repeat(60));
    }
  }

  return { generateImage };
}
