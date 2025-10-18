import type { IncomingMessage, ServerResponse } from "http";
import { spawn } from "child_process";
import path from "path";

interface ScriptRequest {
  script: string;
  args?: string[];
}

/**
 * API endpoint for running scripts
 */
export function createScriptsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url === "/api/scripts/run" && req.method === "POST") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const { script, args = [] }: ScriptRequest = JSON.parse(body);

          // Validate script path to prevent directory traversal
          if (!script || script.includes("..") || !script.startsWith("scripts/")) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: false,
                error: "Invalid script path",
              })
            );
            return;
          }

          const scriptPath = path.join(projectRoot, script);

          // Run the script
          const result = await runScript(scriptPath, args, projectRoot);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("[Scripts API] Error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          );
        }
      });

      return;
    }

    next();
  };
}

/**
 * Run a Python script and capture output
 */
function runScript(
  scriptPath: string,
  args: string[],
  cwd: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    const python = spawn("python3", [scriptPath, ...args], {
      cwd,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: stdout.trim(),
        });
      } else {
        resolve({
          success: false,
          error: stderr.trim() || stdout.trim() || `Script exited with code ${code}`,
        });
      }
    });

    python.on("error", (error) => {
      resolve({
        success: false,
        error: error.message,
      });
    });
  });
}
