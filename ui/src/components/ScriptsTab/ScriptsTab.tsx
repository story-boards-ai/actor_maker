import { useState } from "react";
import { toast } from "sonner";
import "./ScriptsTab.css";

interface ScriptAction {
  id: string;
  name: string;
  description: string;
  script: string;
  category: "actors" | "training" | "sync" | "maintenance";
  requiresConfirmation?: boolean;
  args?: string[];
}

const SCRIPT_ACTIONS: ScriptAction[] = [
  // Actor Management
  {
    id: "copy-from-system",
    name: "Sync from System Actors",
    description: "Copy actor data from system_actors to local, preserving 'good' flags",
    script: "scripts/copy_from_system_actors.py",
    category: "actors",
  },
  {
    id: "regenerate-actors-ts",
    name: "Regenerate Actors TypeScript",
    description: "Generate TypeScript definitions from actorsData.json",
    script: "scripts/regenerate_actors_ts.py",
    category: "actors",
  },
  {
    id: "analyze-manifests",
    name: "Analyze Actor Manifests",
    description: "Generate statistics and reports from all actor manifests",
    script: "scripts/analyze_manifests.py",
    category: "actors",
  },
  
  // Training Data Management
  {
    id: "auto-train-actors",
    name: "Auto Train Actors",
    description: "Train up to 2 actors with good training data and no good custom models",
    script: "scripts/auto_train_actors.py",
    category: "training",
    requiresConfirmation: true,
  },
  {
    id: "auto-generate-training",
    name: "Auto Generate Training Data",
    description: "Automatically generate balanced training data for actors",
    script: "scripts/training_data/auto_generate_training_data.py",
    category: "training",
  },
  {
    id: "evaluate-balance",
    name: "Evaluate & Balance Training Data",
    description: "Analyze training data distribution and create action plans",
    script: "scripts/training_data/evaluate_and_balance.py",
    category: "training",
    args: ["--all", "--dry-run"],
  },
  {
    id: "show-training-stats",
    name: "Show Training Statistics",
    description: "Display training data statistics for all actors",
    script: "scripts/training_data/show_stats.py",
    category: "training",
  },
  {
    id: "cleanup-duplicates",
    name: "Cleanup Duplicate Training Images",
    description: "Remove duplicate training images based on hash comparison",
    script: "scripts/training_data/cleanup_duplicate_training_images.py",
    category: "training",
    requiresConfirmation: true,
  },
  
  // S3 Sync Operations
  {
    id: "sync-all-training",
    name: "Sync All Training Data to S3",
    description: "Upload all actor training data to S3 and update manifests",
    script: "scripts/sync_all_actors_training_data.py",
    category: "sync",
  },
  {
    id: "sync-s3-loras",
    name: "Sync LoRA Models from S3",
    description: "Download trained LoRA models from S3 to local storage",
    script: "scripts/sync_s3_loras.py",
    category: "sync",
  },
  {
    id: "migrate-manifests",
    name: "Migrate Manifests from S3",
    description: "Download and update actor manifests from S3",
    script: "scripts/migrate_manifests_from_s3.py",
    category: "sync",
  },
  {
    id: "update-s3-urls",
    name: "Update Manifest S3 URLs",
    description: "Update all manifests with current S3 URLs for training images",
    script: "scripts/update_manifests_with_s3_urls.py",
    category: "sync",
  },
  
  // Maintenance & Cleanup
  {
    id: "validate-base-images",
    name: "Validate Base Images",
    description: "Check all actor base images for quality and consistency",
    script: "scripts/validate_base_images.py",
    category: "maintenance",
  },
  {
    id: "cleanup-mismatched-base",
    name: "Cleanup Mismatched Base Images",
    description: "Remove base images that don't match actor characteristics",
    script: "scripts/cleanup_mismatched_base_images.py",
    category: "maintenance",
    requiresConfirmation: true,
  },
  {
    id: "cleanup-no-base",
    name: "Cleanup Training Without Base",
    description: "Remove training data for actors missing base images",
    script: "scripts/cleanup_training_data_without_base_image.py",
    category: "maintenance",
    requiresConfirmation: true,
  },
  {
    id: "cleanup-duplicate-versions",
    name: "Cleanup Duplicate Training Versions",
    description: "Remove duplicate training version files and consolidate data",
    script: "scripts/cleanup_duplicate_versions.py",
    category: "maintenance",
    requiresConfirmation: true,
  },
  {
    id: "verify-manifests",
    name: "Verify Manifest Data",
    description: "Validate manifest data integrity and consistency",
    script: "scripts/verify_manifest_data.py",
    category: "maintenance",
  },
];

export function ScriptsTab() {
  const [runningScripts, setRunningScripts] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Scripts" },
    { id: "actors", label: "Actor Management" },
    { id: "training", label: "Training Data" },
    { id: "sync", label: "S3 Sync" },
    { id: "maintenance", label: "Maintenance" },
  ];

  const filteredScripts = selectedCategory === "all" 
    ? SCRIPT_ACTIONS 
    : SCRIPT_ACTIONS.filter(s => s.category === selectedCategory);

  const runScript = async (action: ScriptAction) => {
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(
        `⚠️ This action will modify your data.\n\n${action.description}\n\nAre you sure you want to continue?`
      );
      if (!confirmed) return;
    }

    setRunningScripts(prev => new Set(prev).add(action.id));
    
    try {
      const response = await fetch("/api/scripts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: action.script,
          args: action.args || [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${action.name} completed successfully`, {
          description: result.output ? result.output.substring(0, 200) : undefined,
        });
      } else {
        toast.error(`${action.name} failed`, {
          description: result.error || "Unknown error",
        });
      }
    } catch (error) {
      toast.error(`Failed to run ${action.name}`, {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setRunningScripts(prev => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  return (
    <div className="scripts-tab">
      <div className="scripts-header">
        <h2>Script Actions</h2>
        <p className="scripts-description">
          Run maintenance and automation scripts for actor management, training data, and S3 sync operations.
        </p>
      </div>

      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-button ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="scripts-grid">
        {filteredScripts.map(action => {
          const isRunning = runningScripts.has(action.id);
          
          return (
            <div key={action.id} className="script-card">
              <div className="script-card-header">
                <h3>{action.name}</h3>
                <span className={`category-badge ${action.category}`}>
                  {action.category}
                </span>
              </div>
              
              <p className="script-description">{action.description}</p>
              
              {action.requiresConfirmation && (
                <div className="warning-badge">
                  ⚠️ Requires confirmation
                </div>
              )}
              
              <button
                className="run-button"
                onClick={() => runScript(action)}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <span className="spinner" />
                    Running...
                  </>
                ) : (
                  <>▶ Run Script</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
