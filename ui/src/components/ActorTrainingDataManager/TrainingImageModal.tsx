import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { imageCache } from "../../utils/imageCache";
import { prefetchManager } from "../../utils/prefetchManager";

interface TrainingImage {
  index: number;
  filename: string;
  s3_url: string;
  size_mb: number;
  modified_date: string | null;
  good: boolean;
}

interface TrainingPrompt {
  id: string;
  category: string;
  label: string;
  prompt: string;
}

interface TrainingImageModalProps {
  image: TrainingImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: number;
  actorName: string;
  baseImagePath: string | null;
  onImageGenerated?: () => void;
}

export function TrainingImageModal({
  image,
  open,
  onOpenChange,
  actorId,
  actorName,
  baseImagePath,
  onImageGenerated,
}: TrainingImageModalProps) {
  const [prompts, setPrompts] = useState<TrainingPrompt[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(
    new Set()
  );
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [promptUsage, setPromptUsage] = useState<Record<string, number>>({});
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
  });
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9">("1:1");

  useEffect(() => {
    if (open && !image) {
      // Load prompts when modal opens in generator mode
      loadPrompts();
      setShowGenerator(true);
    } else {
      setShowGenerator(false);
    }
  }, [open, image]);

  async function loadPrompts() {
    try {
      const response = await fetch(`/api/actors/${actorId}/training-prompts`);
      if (!response.ok) throw new Error("Failed to load prompts");
      const data = await response.json();
      setPrompts(data.prompts || []);
      if (data.prompts?.length > 0) {
        setSelectedPromptIds(new Set([data.prompts[0].id]));
      }

      // Load prompt usage
      const usageResponse = await fetch(`/api/actors/${actorId}/prompt-usage`);
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setPromptUsage(usageData.prompt_usage || {});
      }
    } catch (error) {
      console.error("Error loading prompts:", error);
    }
  }

  const togglePromptSelection = (promptId: string) => {
    const newSelection = new Set(selectedPromptIds);
    if (newSelection.has(promptId)) {
      newSelection.delete(promptId);
    } else {
      newSelection.add(promptId);
    }
    setSelectedPromptIds(newSelection);
  };

  const selectAll = () => {
    setSelectedPromptIds(new Set(prompts.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedPromptIds(new Set());
  };

  async function generateTrainingImages() {
    if (selectedPromptIds.size === 0 || !baseImagePath) return;

    const selectedPrompts = prompts.filter((p) => selectedPromptIds.has(p.id));
    if (selectedPrompts.length === 0) return;

    try {
      setGenerating(true);
      setGenerationProgress({ current: 0, total: selectedPrompts.length });
      setGenerationMessage(`Generating ${selectedPrompts.length} images...`);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedPrompts.length; i++) {
        const prompt = selectedPrompts[i];
        setGenerationProgress({ current: i, total: selectedPrompts.length });
        setGenerationMessage(
          `Generating ${i + 1}/${selectedPrompts.length}: ${prompt.label}...`
        );

        try {
          const response = await fetch(
            `/api/actors/${actorId}/training-data/generate-single`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actor_id: actorId,
                actor_name: actorName,
                base_image_url: baseImagePath,
                prompt: prompt.prompt,
                aspect_ratio: aspectRatio,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Generation failed");
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to generate ${prompt.label}:`, error);
          failCount++;
        }
      }

      setGenerationProgress({
        current: selectedPrompts.length,
        total: selectedPrompts.length,
      });
      setGenerationMessage(
        `✅ Generated ${successCount} images${
          failCount > 0 ? ` (${failCount} failed)` : ""
        }`
      );

      // Reload cache manifest to detect new images
      if (successCount > 0) {
        console.log("[TrainingImageModal] Reloading cache manifest after generation...");
        await imageCache.reloadManifest();
        
        // Trigger prefetch for this actor's new images
        console.log("[TrainingImageModal] Triggering prefetch for actor:", actorId);
        // The prefetch will happen in background when parent reloads
      }

      // Reload prompt usage
      loadPrompts();

      // Notify parent to reload
      if (onImageGenerated) {
        setTimeout(() => {
          onImageGenerated();
          onOpenChange(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setGenerationMessage(
        `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setGenerating(false);
    }
  }

  if (!image && !showGenerator) return null;

  // Render generator mode
  if (showGenerator && !image) {
    const categoryColors = {
      photorealistic: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
      bw_stylized: { bg: "#f3f4f6", border: "#6b7280", text: "#1f2937" },
      color_stylized: { bg: "#fce7f3", border: "#ec4899", text: "#9f1239" },
    };

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              background: "rgba(0,0,0,0.8)",
              position: "fixed",
              inset: 0,
              zIndex: 1000,
            }}
          />
          <Dialog.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "12px",
              maxWidth: "900px",
              width: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
              zIndex: 1001,
            }}
          >
            <div style={{ padding: "32px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <Dialog.Title
                  style={{ margin: 0, fontSize: "24px", color: "#1e293b" }}
                >
                  Generate Training Images
                </Dialog.Title>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={selectAll}
                    disabled={generating}
                    style={{
                      padding: "6px 12px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: generating ? "not-allowed" : "pointer",
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    disabled={generating}
                    style={{
                      padding: "6px 12px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: generating ? "not-allowed" : "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Aspect Ratio Toggle */}
              <div
                style={{
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  Aspect Ratio:
                </span>
                <div
                  style={{
                    display: "inline-flex",
                    background: "#f1f5f9",
                    borderRadius: "8px",
                    padding: "4px",
                  }}
                >
                  <button
                    onClick={() => setAspectRatio("1:1")}
                    disabled={generating}
                    style={{
                      padding: "8px 16px",
                      background: aspectRatio === "1:1" ? "white" : "transparent",
                      color: aspectRatio === "1:1" ? "#667eea" : "#64748b",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: generating ? "not-allowed" : "pointer",
                      boxShadow: aspectRatio === "1:1" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    1:1 Square
                  </button>
                  <button
                    onClick={() => setAspectRatio("16:9")}
                    disabled={generating}
                    style={{
                      padding: "8px 16px",
                      background: aspectRatio === "16:9" ? "white" : "transparent",
                      color: aspectRatio === "16:9" ? "#667eea" : "#64748b",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: generating ? "not-allowed" : "pointer",
                      boxShadow: aspectRatio === "16:9" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    16:9 Cinematic
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    marginBottom: "12px",
                  }}
                >
                  {selectedPromptIds.size} selected • Click tiles to
                  select/deselect
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "12px",
                    maxHeight: "400px",
                    overflowY: "auto",
                    padding: "4px",
                  }}
                >
                  {prompts.map((prompt) => {
                    const isSelected = selectedPromptIds.has(prompt.id);
                    const usageCount = promptUsage[prompt.prompt] || 0;
                    const colors =
                      categoryColors[
                        prompt.category as keyof typeof categoryColors
                      ] || categoryColors.photorealistic;

                    return (
                      <button
                        key={prompt.id}
                        onClick={() => togglePromptSelection(prompt.id)}
                        disabled={generating}
                        title={prompt.prompt}
                        style={{
                          padding: "12px",
                          background: isSelected ? colors.bg : "white",
                          border: `2px solid ${
                            isSelected ? colors.border : "#e2e8f0"
                          }`,
                          borderRadius: "8px",
                          cursor: generating ? "not-allowed" : "pointer",
                          textAlign: "left",
                          transition: "all 0.2s ease",
                          opacity: generating ? 0.6 : 1,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: isSelected ? colors.text : "#1e293b",
                              lineHeight: "1.3",
                            }}
                          >
                            {prompt.label}
                          </div>
                          {isSelected && (
                            <div
                              style={{ fontSize: "16px", color: colors.border }}
                            >
                              ✓
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            textTransform: "uppercase",
                            marginBottom: "4px",
                          }}
                        >
                          {prompt.category.replace("_", " ")}
                        </div>
                        {usageCount > 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#3b82f6",
                            }}
                          >
                            {usageCount}x used
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {generationMessage && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    background: generationMessage.startsWith("✅")
                      ? "#f0fdf4"
                      : "#fef2f2",
                    borderRadius: "8px",
                    border: `1px solid ${
                      generationMessage.startsWith("✅") ? "#bbf7d0" : "#fecaca"
                    }`,
                    fontSize: "14px",
                    color: generationMessage.startsWith("✅")
                      ? "#166534"
                      : "#991b1b",
                  }}
                >
                  {generationMessage}
                  {generating && generationProgress.total > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        background: "#e2e8f0",
                        borderRadius: "4px",
                        height: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          background: "#667eea",
                          height: "100%",
                          width: `${
                            (generationProgress.current /
                              generationProgress.total) *
                            100
                          }%`,
                          transition: "width 0.3s ease",
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={generating}
                  style={{
                    padding: "12px 24px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: generating ? "not-allowed" : "pointer",
                    opacity: generating ? 0.5 : 1,
                  }}
                >
                  {generating ? "Generating..." : "Cancel"}
                </button>
                <button
                  onClick={generateTrainingImages}
                  disabled={
                    generating || selectedPromptIds.size === 0 || !baseImagePath
                  }
                  style={{
                    padding: "12px 24px",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor:
                      generating ||
                      selectedPromptIds.size === 0 ||
                      !baseImagePath
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      generating ||
                      selectedPromptIds.size === 0 ||
                      !baseImagePath
                        ? 0.5
                        : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {generating && (
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    ></div>
                  )}
                  {generating
                    ? `Generating ${generationProgress.current}/${generationProgress.total}`
                    : `✨ Generate ${selectedPromptIds.size} Image${
                        selectedPromptIds.size !== 1 ? "s" : ""
                      }`}
                </button>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.1)",
                  color: "#475569",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                ✕
              </button>
            </Dialog.Close>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Render image viewer mode
  if (!image) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            background: "rgba(0,0,0,0.8)",
            position: "fixed",
            inset: 0,
            zIndex: 1000,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            borderRadius: "12px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            zIndex: 1001,
          }}
        >
          <img
            src={image.s3_url}
            alt={image.filename}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          <div style={{ padding: "24px" }}>
            <Dialog.Title
              style={{ margin: 0, fontSize: "20px", color: "#1e293b" }}
            >
              {image.filename}
            </Dialog.Title>
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                fontSize: "14px",
              }}
            >
              <div>
                <strong>Index:</strong> #{image.index}
              </div>
              <div>
                <strong>Source:</strong> <span style={{ color: "#3b82f6", fontWeight: 600 }}>S3 Storage</span>
              </div>
              <div>
                <strong>Size:</strong> {image.size_mb.toFixed(2)} MB
              </div>
              {image.modified_date && (
                <div>
                  <strong>Modified:</strong> {new Date(image.modified_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
              }}
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
