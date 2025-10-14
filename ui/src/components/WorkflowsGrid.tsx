import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkflowCard } from "./WorkflowCard";
import "./WorkflowsGrid.css";

interface WorkflowFile {
  name: string;
  nodeCount: number;
  lastModified?: string;
  content: any;
}

export function WorkflowsGrid() {
  const [workflows, setWorkflows] = useState<WorkflowFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowFile | null>(
    null
  );

  useEffect(() => {
    async function loadWorkflows() {
      try {
        // Load the known workflow file
        // In production, this would be an API endpoint that lists and serves workflows
        const workflowFiles = ["style_transfer_3_API.json"];

        const loadedWorkflows = await Promise.all(
          workflowFiles.map(async (filename) => {
            try {
              const response = await fetch(`/workflows/${filename}`);
              if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
              }
              const content = await response.json();

              // Count nodes in the workflow
              const nodeCount = Object.keys(content).length;

              return {
                name: filename,
                nodeCount,
                description: getWorkflowDescription(filename),
                content,
              } as WorkflowFile;
            } catch (err) {
              console.error(`Failed to load workflow ${filename}:`, err);
              return null;
            }
          })
        );

        const validWorkflows = loadedWorkflows.filter(
          (w): w is WorkflowFile => w !== null
        );
        setWorkflows(validWorkflows);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load workflows"
        );
      } finally {
        setLoading(false);
      }
    }

    loadWorkflows();
  }, []);

  function getWorkflowDescription(filename: string): string {
    const descriptions: Record<string, string> = {
      "style_transfer_3_API.json":
        "ComfyUI workflow for style transfer with LoRA model integration",
    };
    return descriptions[filename] || "ComfyUI workflow";
  }

  function handleViewWorkflow(workflow: WorkflowFile) {
    setSelectedWorkflow(workflow);
  }

  function handleExecuteWorkflow(workflow: WorkflowFile) {
    console.log("Execute workflow:", workflow.name);
    // TODO: Implement workflow execution
    toast.info(`Workflow execution coming soon: ${workflow.name}`);
  }

  function handleCloseModal() {
    setSelectedWorkflow(null);
  }

  if (loading) {
    return (
      <div className="workflows-grid-loading">
        <div className="spinner"></div>
        <p>Loading workflows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflows-grid-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Workflows</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="workflows-grid-empty">
        <div className="empty-icon">⚙️</div>
        <h3>No Workflows Found</h3>
        <p>Add ComfyUI workflow JSON files to the workflows directory</p>
      </div>
    );
  }

  return (
    <div className="workflows-container">
      <div className="workflows-header">
        <h2>ComfyUI Workflows</h2>
        <p className="workflows-count">
          {workflows.length} {workflows.length === 1 ? "workflow" : "workflows"}{" "}
          available
        </p>
      </div>

      <div className="workflows-grid">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.name}
            name={workflow.name}
            nodeCount={workflow.nodeCount}
            description={workflow.description}
            lastModified={workflow.lastModified}
            onView={() => handleViewWorkflow(workflow)}
            onExecute={() => handleExecuteWorkflow(workflow)}
          />
        ))}
      </div>

      {selectedWorkflow && (
        <div className="workflow-modal-overlay" onClick={handleCloseModal}>
          <div className="workflow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workflow-modal-header">
              <h2>Workflow Details</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="workflow-modal-content">
              <h3>{selectedWorkflow.name}</h3>
              <div className="workflow-stats">
                <span>
                  <strong>Nodes:</strong> {selectedWorkflow.nodeCount}
                </span>
              </div>
              <pre className="workflow-json">
                {JSON.stringify(selectedWorkflow.content, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
