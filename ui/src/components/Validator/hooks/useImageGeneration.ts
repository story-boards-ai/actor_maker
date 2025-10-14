import { Dispatch, SetStateAction } from "react";
import {
  stripColorReferences,
  isMonochromeStyle,
} from "../../../utils/promptUtils";
import type { Style } from "../../../types";
import type { TrainedModel } from "./useValidatorState";
import type { ValidatorCharacter } from "../types/character";

interface UseImageGenerationProps {
  selectedStyle: string;
  selectedModel: string;
  trainedModels: TrainedModel[];
  prompt: string;
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
  loraWeight: number;
  characterLoraWeight: number;
  cineLoraWeight: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
  selectedCharacters: ValidatorCharacter[];
  useCameraLora: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setGeneratedImage: Dispatch<SetStateAction<string | null>>;
  setFullPrompt: Dispatch<SetStateAction<string>>;
  addLog: (message: string) => void;
}

export function useImageGeneration(props: UseImageGenerationProps) {
  const {
    selectedStyle,
    selectedModel,
    trainedModels,
    prompt,
    styles,
    seed,
    seedLocked,
    setSeed,
    steps,
    denoise,
    guidance,
    width,
    height,
    samplerName,
    schedulerName,
    loraWeight,
    characterLoraWeight,
    cineLoraWeight,
    frontpad,
    backpad,
    selectedCharacters,
    useCameraLora,
    setLoading,
    setError,
    setGeneratedImage,
    setFullPrompt,
    addLog,
  } = props;

  async function generateImage() {
    if (!selectedStyle) {
      setError("Please select a style");
      addLog("ERROR: No style selected");
      return;
    }

    if (!prompt || prompt.trim() === '') {
      setError("Please enter a prompt");
      addLog("ERROR: No prompt entered");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGeneratedImage(null);
      addLog("=".repeat(60));
      addLog("Starting text-to-image generation...");
      
      // Randomize seed if not locked
      let currentSeed = seed;
      if (!seedLocked) {
        currentSeed = Math.floor(Math.random() * 1000000);
        setSeed(currentSeed);
        addLog(`🎲 Random seed: ${currentSeed}`);
      } else {
        addLog(`🔒 Locked seed: ${currentSeed}`);
      }

      const styleData = styles.find((s) => s.id === selectedStyle);

      if (!styleData) {
        throw new Error("Selected style not found");
      }

      addLog(`Selected style: ${styleData.title} (${styleData.lora_name})`);

      // Load workflow template for text-to-image
      addLog("Loading workflow template...");
      const workflowResponse = await fetch("/workflows/normal_image_v4_workflow.json");
      const workflowTemplate = await workflowResponse.json();
      addLog("Workflow template loaded");

      // Find the selected trained model
      const trainedModel = trainedModels.find(m => m.id === selectedModel);
      if (!trainedModel) {
        throw new Error("Selected trained model not found. Please select a trained LoRA model.");
      }
      addLog(`Selected trained model: ${trainedModel.styleName} - ${trainedModel.name}`);

      // Always use flux1-dev-fp8 as base model for validation
      const baseModelName = "flux1-dev-fp8";
      workflowTemplate.workflow["1"].inputs.unet_name = `${baseModelName}.safetensors`;
      addLog(`Base model: ${baseModelName}.safetensors`);

      // Inject generation parameters using new workflow structure
      workflowTemplate.workflow["25"].inputs.noise_seed = currentSeed;
      workflowTemplate.workflow["16"].inputs.sampler_name = samplerName;
      workflowTemplate.workflow["17"].inputs.scheduler = schedulerName;
      workflowTemplate.workflow["17"].inputs.steps = steps;
      workflowTemplate.workflow["17"].inputs.denoise = denoise;
      workflowTemplate.workflow["26"].inputs.guidance = guidance;
      workflowTemplate.workflow["27"].inputs.width = width;
      workflowTemplate.workflow["27"].inputs.height = height;
      workflowTemplate.workflow["27"].inputs.batch_size = 1;
      
      // Also fix template placeholders in node 30 (ModelSamplingFlux)
      workflowTemplate.workflow["30"].inputs.width = width;
      workflowTemplate.workflow["30"].inputs.height = height;
      
      addLog(
        `Settings: ${steps} steps, denoise ${denoise}, guidance ${guidance}, ${width}x${height}`
      );

      // Extract LoRA filename from URL
      const loraFilename = trainedModel.loraUrl.split('/').pop() || 'trained_model.safetensors';
      
      // Calculate character LoRA strength multipliers based on count (MUST BE BEFORE USAGE)
      const getCharacterLoraStrengthMultiplier = (count: number): number => {
        if (count <= 0) return 1.0;
        if (count === 1) return 0.85;
        if (count === 2) return 0.75;
        return 0.65; // 3+ characters
      };

      const getCineLoraStrengthMultiplier = (count: number): number => {
        if (count <= 0) return 1.0;
        if (count === 1) return 0.95;
        if (count === 2) return 0.85;
        return 0.75; // 3+ characters
      };

      const characterCount = selectedCharacters.length;
      const charLoraMultiplier = getCharacterLoraStrengthMultiplier(characterCount);
      const cineLoraMultiplier = getCineLoraStrengthMultiplier(characterCount);
      const adjustedCharacterLoraWeight = characterLoraWeight * charLoraMultiplier;
      const adjustedCineLoraWeight = cineLoraWeight * cineLoraMultiplier;
      
      // Inject trained LoRA into LoRA stack (slot 1) and clear unused slots
      workflowTemplate.workflow["43"].inputs.num_loras = 1;
      workflowTemplate.workflow["43"].inputs.lora_1_name = loraFilename;
      workflowTemplate.workflow["43"].inputs.lora_1_strength = loraWeight;
      workflowTemplate.workflow["43"].inputs.lora_1_model_strength = loraWeight;
      workflowTemplate.workflow["43"].inputs.lora_1_clip_strength = loraWeight;
      
      // Build LoRA stack: style LoRA (slot 1) + character LoRAs + camera LoRA
      let loraSlotIndex = 2; // Start from slot 2 (slot 1 is style LoRA)
      const characterLoraNames: string[] = [];

      // Add character LoRAs to stack
      if (selectedCharacters.length > 0) {
        for (const character of selectedCharacters) {
          if (loraSlotIndex > 10) {
            addLog(`⚠️ Warning: Maximum 10 LoRA slots. Skipping remaining characters.`);
            break;
          }
          const loraName = `${character.id}.safetensors`;
          characterLoraNames.push(loraName);
          workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_name`] = loraName;
          workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_strength`] = adjustedCharacterLoraWeight;
          workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_model_strength`] = adjustedCharacterLoraWeight;
          workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_clip_strength`] = adjustedCharacterLoraWeight;
          addLog(`  - Slot ${loraSlotIndex}: ${character.name} (${adjustedCharacterLoraWeight.toFixed(2)})`);
          loraSlotIndex++;
        }
      }

      // Add camera LoRA if enabled
      if (useCameraLora && loraSlotIndex <= 10) {
        const cameraLoraName = "FILM-V3-FLUX.safetensors";
        workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_name`] = cameraLoraName;
        workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_strength`] = adjustedCineLoraWeight;
        workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_model_strength`] = adjustedCineLoraWeight;
        workflowTemplate.workflow["43"].inputs[`lora_${loraSlotIndex}_clip_strength`] = adjustedCineLoraWeight;
        addLog(`  - Slot ${loraSlotIndex}: Camera LoRA (${adjustedCineLoraWeight.toFixed(2)})`);
        loraSlotIndex++;
      }

      // Update num_loras to reflect actual count
      workflowTemplate.workflow["43"].inputs.num_loras = loraSlotIndex - 1;

      // Clear remaining unused LoRA slots
      for (let i = loraSlotIndex; i <= 10; i++) {
        workflowTemplate.workflow["43"].inputs[`lora_${i}_name`] = "None";
        workflowTemplate.workflow["43"].inputs[`lora_${i}_strength`] = 1;
        workflowTemplate.workflow["43"].inputs[`lora_${i}_model_strength`] = 1;
        workflowTemplate.workflow["43"].inputs[`lora_${i}_clip_strength`] = 1;
      }
      
      addLog(`Injected trained LoRA: ${loraFilename}`);
      addLog(`  - Model strength: ${loraWeight}`);
      addLog(`  - CLIP strength: ${loraWeight}`);
      addLog(`  - LoRA URL: ${trainedModel.loraUrl}`);

      // Log strength adjustments
      if (characterCount > 0) {
        addLog(`Character LoRAs: ${characterCount} selected`);
        addLog(`  - Base strength: ${characterLoraWeight}`);
        addLog(`  - Multiplier: ${charLoraMultiplier}`);
        addLog(`  - Adjusted strength: ${adjustedCharacterLoraWeight.toFixed(2)}`);
      }

      if (useCameraLora) {
        addLog(`Camera LoRA: FILM-V3-FLUX`);
        addLog(`  - Base strength: ${cineLoraWeight}`);
        addLog(`  - Multiplier: ${cineLoraMultiplier}`);
        addLog(`  - Adjusted strength: ${adjustedCineLoraWeight.toFixed(2)}`);
      }

      // Process prompt with character tokens
      let baseDescription = prompt;
      if (selectedCharacters.length > 0) {
        addLog(`Adding ${selectedCharacters.length} character(s) to prompt...`);
        
        // Build character tokens to prepend to the prompt
        const characterTokens: string[] = [];
        for (const character of selectedCharacters) {
          // Class token format: (character_name as description)
          // Example: (0000_european_16_male as 16 year old young man)
          const classToken = `(${character.name} as ${character.description || 'person'})`;
          characterTokens.push(classToken);
          addLog(`  - Added: ${classToken}`);
        }
        
        // Prepend character tokens to the prompt
        if (characterTokens.length > 0) {
          baseDescription = characterTokens.join(', ') + (baseDescription ? ', ' + baseDescription : '');
          addLog(`  → Combined prompt with ${characterTokens.length} character(s)`);
        }
      }

      const triggerWords = styleData.trigger_words || "";
      let activeFrontpad = frontpad;
      let activeBackpad = backpad;

      addLog(`Style data loaded: ${styleData.title}`);
      addLog(`  - Monochrome: ${styleData.monochrome ? "YES" : "NO"}`);
      addLog(
        `  - Trigger words: ${triggerWords ? `"${triggerWords}"` : "(none)"}`
      );
      addLog(`  - Frontpad length: ${activeFrontpad.length} chars`);
      addLog(`  - Backpad length: ${activeBackpad.length} chars`);
      addLog(
        `  - Prompt: "${baseDescription.substring(0, 50)}${
          baseDescription.length > 50 ? "..." : ""
        }"`
      );

      // Handle monochrome color stripping
      if (isMonochromeStyle(styleData)) {
        const originalFrontpad = activeFrontpad;
        const originalBackpad = activeBackpad;
        const originalPrompt = baseDescription;

        activeFrontpad = stripColorReferences(activeFrontpad);
        activeBackpad = stripColorReferences(activeBackpad);
        baseDescription = stripColorReferences(baseDescription);

        addLog(`⚫ Monochrome mode: Stripped color references`);
        if (originalFrontpad !== activeFrontpad)
          addLog(
            `  - Frontpad cleaned: ${originalFrontpad.length} → ${activeFrontpad.length} chars`
          );
        if (originalBackpad !== activeBackpad)
          addLog(
            `  - Backpad cleaned: ${originalBackpad.length} → ${activeBackpad.length} chars`
          );
        if (originalPrompt !== baseDescription)
          addLog(
            `  - Prompt cleaned: "${originalPrompt}" → "${baseDescription}"`
          );
      }

      // Assemble final prompt
      let finalPrompt = "";
      if (triggerWords) {
        finalPrompt += triggerWords;
      }
      if (activeFrontpad) {
        finalPrompt += (finalPrompt ? ", " : "") + activeFrontpad;
      }
      if (baseDescription) {
        finalPrompt += (finalPrompt ? ", " : "") + baseDescription;
      }
      if (activeBackpad) {
        finalPrompt += (finalPrompt ? ", " : "") + activeBackpad;
      }

      addLog(`✅ Final prompt assembled: ${finalPrompt.length} total chars`);

      // Inject prompt into workflow (node 6 uses the prompt)
      workflowTemplate.workflow["6"].inputs.text = finalPrompt;

      setFullPrompt(finalPrompt);

      // Add all LoRAs to model_urls for download
      const model_urls: Array<{ id: string; url: string }> = [
        {
          id: loraFilename,
          url: trainedModel.loraUrl
        }
      ];
      addLog(`Added trained LoRA to model_urls: ${loraFilename}`);

      // Add character LoRAs to model_urls
      for (const character of selectedCharacters) {
        if (character.loraUrl) {
          const charLoraFilename = `${character.id}.safetensors`;
          model_urls.push({
            id: charLoraFilename,
            url: character.loraUrl
          });
          addLog(`Added character LoRA to model_urls: ${character.name}`);
        }
      }

      // Note: Camera LoRA (FILM-V3-FLUX) is assumed to already exist on the worker

      const payload = {
        input: {
          workflow: workflowTemplate.workflow,
          model_urls: model_urls,
          force_download: false,
        },
      };

      addLog("Payload constructed");
      addLog(`Workflow nodes: ${Object.keys(workflowTemplate.workflow).length}`);

      const requestData = {
        payload,
        styleId: styleData.id,
        mode: 'text-to-image'
      };

      // Save request to debug file
      try {
        await fetch('/api/debug/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: 'validator_image_request.json',
            data: requestData
          })
        });
        addLog("💾 Saved request to debug/validator_image_request.json");
      } catch (debugErr) {
        console.warn('Failed to save debug request:', debugErr);
      }

      addLog("Sending request to backend...");
      const generationResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      // Check content type before parsing
      const contentType = generationResponse.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!generationResponse.ok) {
        if (isJson) {
          const errorData = await generationResponse.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${generationResponse.status}`);
        } else {
          const textError = await generationResponse.text();
          addLog(`❌ Server returned HTML instead of JSON (status ${generationResponse.status})`);
          addLog(`Response preview: ${textError.substring(0, 200)}...`);
          throw new Error(`API endpoint not found or returned HTML. Check if the backend server is running and the endpoint exists.`);
        }
      }

      if (!isJson) {
        const textResponse = await generationResponse.text();
        addLog(`❌ Response is not JSON. Content-Type: ${contentType}`);
        addLog(`Response preview: ${textResponse.substring(0, 200)}...`);
        throw new Error("Backend returned HTML instead of JSON. The /api/generate-image endpoint may not exist.");
      }

      const result = await generationResponse.json();
      addLog("Received response from backend");
      addLog(`Response status: ${result.status}`);

      // Save response to debug file
      try {
        await fetch('/api/debug/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: 'validator_image_response.json',
            data: result
          })
        });
        addLog("💾 Saved response to debug/validator_image_response.json");
      } catch (debugErr) {
        console.warn('Failed to save debug response:', debugErr);
      }

      if (result.status === "COMPLETED" || result.status === "success") {
        const getImageUrl = (img: any): string => {
          return typeof img === "string" ? img : img.url;
        };

        let imageUrl: string | null = null;

        if (
          result.output?.job_results?.images &&
          result.output.job_results.images.length > 0
        ) {
          imageUrl = getImageUrl(result.output.job_results.images[0]);
          addLog(`Found image in job_results.images`);
        } else if (
          result.output?.output?.images &&
          result.output.output.images.length > 0
        ) {
          imageUrl = getImageUrl(result.output.output.images[0]);
          addLog(`Found image in output.images`);
        } else if (result.output?.images && result.output.images.length > 0) {
          imageUrl = getImageUrl(result.output.images[0]);
          addLog(`Found image in output.images (direct)`);
        }

        if (imageUrl) {
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
          throw new Error("No images found in response");
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
