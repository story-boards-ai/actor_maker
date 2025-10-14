import { IncomingMessage, ServerResponse } from "http";
import * as path from "path";
import * as fs from "fs/promises";
import { EventEmitter } from "events";
import { getActualServerPort } from "../server-plugin";

// Job status tracking
interface TestSuiteJob {
  id: string;
  styleId: string;
  suiteId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress: { current: number; total: number };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  resultId?: string;
}

// Global job storage and event emitter
const activeJobs = new Map<string, TestSuiteJob>();
const jobEvents = new EventEmitter();

/**
 * Create test suite job API routes
 */
export function createTestSuiteJobApi(projectRoot: string) {
  const STYLES_DIR = path.join(projectRoot, "resources", "style_images");

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // Start test suite job
    if (url === "/api/test-suite/start" && req.method === "POST") {
      handleStartJob(req, res, STYLES_DIR);
      return;
    }

    // Get job status
    if (url?.startsWith("/api/test-suite/job/") && req.method === "GET") {
      const jobId = url.split("/api/test-suite/job/")[1]?.split("?")[0];
      handleGetJobStatus(jobId, res);
      return;
    }

    // Cancel job
    if (
      url?.startsWith("/api/test-suite/job/") &&
      url.includes("/cancel") &&
      req.method === "POST"
    ) {
      const jobId = url.split("/api/test-suite/job/")[1]?.split("/cancel")[0];
      handleCancelJob(jobId, res);
      return;
    }

    // SSE endpoint for job progress
    if (
      url?.startsWith("/api/test-suite/job/") &&
      url.includes("/progress") &&
      req.method === "GET"
    ) {
      const jobId = url.split("/api/test-suite/job/")[1]?.split("/progress")[0];
      handleProgressStream(jobId, req, res);
      return;
    }

    // Not a test suite job route
    next();
  };
}

/**
 * Start a new test suite job
 */
async function handleStartJob(
  req: IncomingMessage,
  res: ServerResponse,
  stylesDir: string
) {
  try {
    const body = await parseJsonBody(req);
    const { styleId, suiteId, suite, settings, trainedModel } = body;

    if (!styleId || !suiteId || !suite || !settings || !trainedModel) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required parameters" }));
      return;
    }

    const jobId = `test-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const job: TestSuiteJob = {
      id: jobId,
      styleId,
      suiteId,
      status: "running",
      progress: { current: 0, total: suite.prompts.length },
      startedAt: new Date(),
    };

    activeJobs.set(jobId, job);

    // Start processing in background (non-blocking)
    processTestSuiteJob(jobId, suite, settings, trainedModel, stylesDir).catch(
      (error) => {
        console.error("[TEST-SUITE-JOB] Processing error:", error);
        const job = activeJobs.get(jobId);
        if (job) {
          job.status = "failed";
          job.error = error.message;
          job.completedAt = new Date();
          activeJobs.set(jobId, job);
          jobEvents.emit(`job:${jobId}`, job);
        }
      }
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jobId, status: "started" }));
  } catch (error) {
    console.error("[TEST-SUITE-JOB] Start error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to start job" }));
  }
}

/**
 * Get job status
 */
function handleGetJobStatus(jobId: string, res: ServerResponse) {
  const job = activeJobs.get(jobId);

  if (!job) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Job not found" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(job));
}

/**
 * Cancel a running job
 */
function handleCancelJob(jobId: string, res: ServerResponse) {
  const job = activeJobs.get(jobId);

  if (!job) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Job not found" }));
    return;
  }

  if (job.status === "running") {
    job.status = "cancelled";
    job.completedAt = new Date();
    activeJobs.set(jobId, job);
    jobEvents.emit(`job:${jobId}`, job);
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(job));
}

/**
 * SSE stream for job progress updates
 */
function handleProgressStream(
  jobId: string,
  req: IncomingMessage,
  res: ServerResponse
) {
  const job = activeJobs.get(jobId);

  if (!job) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Job not found" }));
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial state
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  // Listen for updates
  const updateHandler = (updatedJob: TestSuiteJob) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);

    // Close stream when job completes
    if (updatedJob.status !== "running") {
      res.end();
    }
  };

  jobEvents.on(`job:${jobId}`, updateHandler);

  // Clean up on client disconnect
  req.on("close", () => {
    jobEvents.off(`job:${jobId}`, updateHandler);
  });
}

/**
 * Process test suite job with parallel generation (2 at a time)
 */
async function processTestSuiteJob(
  jobId: string,
  suite: any,
  settings: any,
  trainedModel: any,
  stylesDir: string
) {
  const job = activeJobs.get(jobId);
  if (!job) return;

  console.log(
    `[TEST-SUITE-JOB] Starting job ${jobId} with ${suite.prompts.length} prompts`
  );

  const images: any[] = [];
  const prompts = suite.prompts;
  const batchSize = 2; // Process 2 images in parallel

  // Create resultId at the start so we can save images to the correct folder
  const resultId = `${suite.id}_${new Date().toISOString()}`;

  // Add resultId to job immediately so frontend can load partial results
  job.resultId = resultId;
  activeJobs.set(jobId, job);
  jobEvents.emit(`job:${jobId}`, job);

  try {
    // Process prompts in batches of 2
    for (let i = 0; i < prompts.length; i += batchSize) {
      // Check if job was cancelled
      const currentJob = activeJobs.get(jobId);
      if (currentJob?.status === "cancelled") {
        console.log(`[TEST-SUITE-JOB] Job ${jobId} cancelled at prompt ${i}`);
        return;
      }

      const batch = prompts.slice(i, i + batchSize);
      console.log(
        `[TEST-SUITE-JOB] Processing batch ${Math.floor(i / batchSize) + 1}: ${
          batch.length
        } images`
      );

      // Generate images in parallel (2 at a time)
      const batchPromises = batch.map((testPrompt: any) =>
        generateTestImage(
          testPrompt,
          settings,
          trainedModel,
          resultId,
          stylesDir
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, batchIndex) => {
        const promptIndex = i + batchIndex;
        const testPrompt = prompts[promptIndex];

        if (result.status === "fulfilled" && result.value) {
          images.push(result.value);
          console.log(`[TEST-SUITE-JOB] ✓ Generated ${testPrompt.id}`);
        } else {
          console.error(
            `[TEST-SUITE-JOB] ✗ Failed ${testPrompt.id}:`,
            result.status === "rejected" ? result.reason : "Unknown error"
          );
        }

        // Update progress
        job.progress.current = promptIndex + 1;
        activeJobs.set(jobId, job);
        jobEvents.emit(`job:${jobId}`, job);
      });

      // Save partial results after each batch so frontend can display them progressively
      const partialResult = {
        suiteId: suite.id,
        suiteName: suite.name,
        styleId: settings.styleId,
        styleName: settings.styleName,
        modelId: trainedModel.id,
        modelName: trainedModel.name,
        timestamp: new Date().toISOString(),
        settings: {
          steps: settings.steps,
          cfg: settings.cfg,
          denoise: settings.denoise,
          guidance: settings.guidance,
          width: settings.width,
          height: settings.height,
          samplerName: settings.samplerName,
          schedulerName: settings.schedulerName,
          loraWeight: settings.loraWeight,
          seed: settings.seed,
        },
        images,
      };

      try {
        await saveTestResult(
          settings.styleId,
          trainedModel.id,
          resultId,
          partialResult,
          stylesDir
        );
      } catch (saveError) {}
    }

    // Save results
    const result = {
      suiteName: suite.name,
      styleName: settings.styleName,
      modelName: trainedModel.name,
      timestamp: new Date().toISOString(),
      settings: {
        steps: settings.steps,
        cfg: settings.cfg,
        denoise: settings.denoise,
        guidance: settings.guidance,
        width: settings.width,
        height: settings.height,
        samplerName: settings.samplerName,
        schedulerName: settings.schedulerName,
        loraWeight: settings.loraWeight,
        seed: settings.seed,
      },
      images,
    };

    await saveTestResult(
      settings.styleId,
      trainedModel.id,
      resultId,
      result,
      stylesDir
    );

    // Mark job as completed
    job.status = "completed";
    job.completedAt = new Date();
    job.resultId = resultId;
    activeJobs.set(jobId, job);
    jobEvents.emit(`job:${jobId}`, job);

    console.log(`[TEST-SUITE-JOB] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[TEST-SUITE-JOB] Job ${jobId} failed:`, error);
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown error";
    job.completedAt = new Date();
    activeJobs.set(jobId, job);
    jobEvents.emit(`job:${jobId}`, job);
  }
}

/**
 * Generate a single test image
 */
async function generateTestImage(
  testPrompt: any,
  settings: any,
  trainedModel: any,
  resultId: string,
  stylesDir: string
): Promise<any> {
  const testSeed = settings.seedLocked
    ? settings.seed
    : Math.floor(Math.random() * 1000000);

  const fullPrompt =
    `${settings.frontpad} ${testPrompt.prompt} ${settings.backpad}`.trim();

  try {
    // Validate trainedModel has loraUrl
    if (!trainedModel.loraUrl) {
      throw new Error(`Trained model ${trainedModel.id} is missing loraUrl`);
    }

    // Load workflow template
    const port = getActualServerPort() || 5173;
    const workflowResponse = await fetch(
      `http://localhost:${port}/workflows/normal_image_v4_workflow.json`
    );
    const workflowTemplate = await workflowResponse.json();

    // Configure workflow with settings
    const baseModelName = "flux1-dev-fp8";
    workflowTemplate.workflow[
      "1"
    ].inputs.unet_name = `${baseModelName}.safetensors`;
    workflowTemplate.workflow["6"].inputs.text = fullPrompt;
    workflowTemplate.workflow["25"].inputs.noise_seed = testSeed;
    workflowTemplate.workflow["16"].inputs.sampler_name = settings.samplerName;
    workflowTemplate.workflow["17"].inputs.scheduler = settings.schedulerName;
    workflowTemplate.workflow["17"].inputs.steps = settings.steps;
    workflowTemplate.workflow["17"].inputs.denoise = settings.denoise;
    workflowTemplate.workflow["26"].inputs.guidance = settings.guidance;
    workflowTemplate.workflow["27"].inputs.width = settings.width;
    workflowTemplate.workflow["27"].inputs.height = settings.height;
    workflowTemplate.workflow["27"].inputs.batch_size = 1;
    workflowTemplate.workflow["30"].inputs.width = settings.width;
    workflowTemplate.workflow["30"].inputs.height = settings.height;

    // Configure LoRA
    const loraFilename =
      trainedModel.loraUrl.split("/").pop() || "trained_model.safetensors";
    workflowTemplate.workflow["43"].inputs.num_loras = 1;
    workflowTemplate.workflow["43"].inputs.lora_1_name = loraFilename;
    workflowTemplate.workflow["43"].inputs.lora_1_strength =
      settings.loraWeight;
    workflowTemplate.workflow["43"].inputs.lora_1_model_strength =
      settings.loraWeight;
    workflowTemplate.workflow["43"].inputs.lora_1_clip_strength =
      settings.loraWeight;

    // Clear other LoRA slots
    for (let i = 2; i <= 10; i++) {
      workflowTemplate.workflow["43"].inputs[`lora_${i}_name`] = "None";
      workflowTemplate.workflow["43"].inputs[`lora_${i}_strength`] = 1;
      workflowTemplate.workflow["43"].inputs[`lora_${i}_model_strength`] = 1;
      workflowTemplate.workflow["43"].inputs[`lora_${i}_clip_strength`] = 1;
    }

    // Build payload
    const payload = {
      input: {
        workflow: workflowTemplate.workflow,
        model_urls: [
          {
            id: loraFilename,
            url: trainedModel.loraUrl,
          },
        ],
        force_download: false,
      },
    };

    const requestData = {
      payload,
      styleId: settings.styleId,
      mode: "text-to-image",
    };

    // Call generation API
    const response = await fetch(
      `http://localhost:${port}/api/generate-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Extract image URL from result (handles multiple response formats)
    let imageUrl = null;
    if (result.output) {
      const locations = [
        result.output.job_results?.images?.[0],
        result.output.output?.images?.[0],
        result.output.images?.[0],
        result.output.message?.images?.[0],
        result.output.image,
      ];

      for (const img of locations) {
        if (!img) continue;
        imageUrl = typeof img === "string" ? img : img?.url;
        if (imageUrl) break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image URL found in generation result");
    }

    // Save test image using actual server port
    const saveResponse = await fetch(
      `http://localhost:${port}/api/save-test-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: settings.styleId,
          modelId: trainedModel.id,
          resultId: resultId,
          promptId: testPrompt.id,
          imageUrl: imageUrl,
        }),
      }
    );

    if (!saveResponse.ok) {
      throw new Error(`Failed to save test image: ${saveResponse.statusText}`);
    }

    const savedImage = await saveResponse.json();

    return {
      promptId: testPrompt.id,
      prompt: testPrompt.prompt,
      category: testPrompt.category,
      description: testPrompt.description,
      imageUrl: savedImage.localPath,
      fullPrompt,
      frontpad: settings.frontpad,
      backpad: settings.backpad,
      seed: testSeed,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[TEST-IMAGE] Failed to generate ${testPrompt.id}:`, error);
    throw error;
  }
}

/**
 * Save test result metadata
 */
async function saveTestResult(
  styleId: string,
  modelId: string,
  resultId: string,
  result: any,
  stylesDir: string
) {
  const port = getActualServerPort() || 5173;

  const response = await fetch(
    `http://localhost:${port}/api/save-test-result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleId, modelId, resultId, result }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save test result: ${response.statusText}`);
  }
}

/**
 * Parse JSON body from request
 */
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
