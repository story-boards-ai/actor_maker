import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { config as dotenvConfig } from "dotenv";
import { getProjectRoot } from "./utils/path-helpers";
import { createFileServingMiddleware } from "./middleware/file-serving";
import { createImagesApi } from "./routes/images-api";
import { createPromptsApi } from "./routes/prompts-api";
import { createCaptionsApi } from "./routes/captions-api";
import { createSettingsApi } from "./routes/settings-api";
import { createStylesApi } from "./routes/styles-api";
import { createGenerationApi } from "./routes/generation-api";
import { createS3Api } from "./routes/s3-api";
import { createSelectionSetsApi } from "./routes/selection-sets-api";
import { createTrainingApi } from "./routes/training-api";
import { createDebugApi } from "./routes/debug-api";
import { createTestSuiteApi } from "./routes/test-suite-api";
import { createTestSuiteJobApi } from "./routes/test-suite-job-api";
import { createSettingsSetsApi } from "./routes/settings-sets-api";
import { createAssessmentsApi } from "./routes/assessments-api";
import { createActorsApi } from "./routes/actors-api";
import { createBaseImageApi } from "./routes/base-image-api";

// Global variable to store actual running port
let actualServerPort: number | undefined;

/**
 * Get the actual port the Vite server is running on
 */
export function getActualServerPort(): number | undefined {
  return actualServerPort;
}

/**
 * Custom Vite plugin to serve multiple directories and provide API endpoints
 */
export function createServerPlugin(): Plugin {
  const projectRoot = getProjectRoot();

  // Load environment variables from .env file in project root
  const envPath = path.join(projectRoot, ".env");
  dotenvConfig({ path: envPath });

  return {
    name: "serve-multiple-dirs",
    configureServer(server) {
      // Store the actual port when server starts
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        if (address && typeof address === 'object') {
          actualServerPort = address.port;
          console.log(`[Server Plugin] Detected server running on port ${actualServerPort}`);
        }
      });

      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          // Create middleware chain
          const middlewares = [
            createFileServingMiddleware(projectRoot),
            createImagesApi(projectRoot),
            createPromptsApi(projectRoot),
            createCaptionsApi(projectRoot),
            createSettingsApi(projectRoot),
            createStylesApi(projectRoot),
            createGenerationApi(projectRoot),
            createS3Api(projectRoot),
            createSelectionSetsApi(projectRoot),
            createTrainingApi(projectRoot),
            createDebugApi(projectRoot),
            createTestSuiteApi(projectRoot),
            createTestSuiteJobApi(projectRoot),
            createSettingsSetsApi(projectRoot),
            createAssessmentsApi(projectRoot),
            createActorsApi(projectRoot),
            createBaseImageApi(projectRoot),
          ];

          // Execute middleware chain
          let currentIndex = 0;

          const executeNext = () => {
            if (currentIndex >= middlewares.length) {
              next();
              return;
            }

            const middleware = middlewares[currentIndex];
            currentIndex++;
            middleware(req, res, executeNext);
          };

          executeNext();
        }
      );
    },
  };
}
