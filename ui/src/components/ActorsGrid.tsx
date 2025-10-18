import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ActorCard } from "./ActorCard";
import type { Actor } from "../types";
import {
  fetchTrainingDataInfo,
  type TrainingDataInfo,
} from "../utils/trainingDataUtils";
import "./ActorsGrid.css";

interface ActorsGridProps {
  onOpenTrainingData?: (actor: Actor) => void;
  onActorsLoaded?: (actors: Actor[]) => void;
}

type FilterType =
  // Training Data Filters
  | "no_training_data"
  | "has_training_not_good"
  | "training_data_good"
  // Model Filters
  | "no_custom_models"
  | "has_models_not_good"
  | "has_good_model"
  | "production_synced";

export function ActorsGrid({
  onOpenTrainingData,
  onActorsLoaded,
}: ActorsGridProps = {}) {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem("actorsGrid_filters");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
    return new Set();
  });
  const [invertFilter, setInvertFilter] = useState(() => {
    // Load saved invert state from localStorage
    const saved = localStorage.getItem("actorsGrid_invertFilter");
    return saved === "true";
  });
  const [trainingDataMap, setTrainingDataMap] = useState<
    Map<number, TrainingDataInfo>
  >(new Map());

  useEffect(() => {
    loadActors();
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "actorsGrid_filters",
      JSON.stringify(Array.from(activeFilters))
    );
  }, [activeFilters]);

  // Save invert state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("actorsGrid_invertFilter", String(invertFilter));
  }, [invertFilter]);

  useEffect(() => {
    // Load training data for all actors
    if (actors.length > 0) {
      loadTrainingData();
    }
  }, [actors]);

  async function loadTrainingData() {
    const dataMap = new Map<number, TrainingDataInfo>();
    await Promise.all(
      actors.map(async (actor) => {
        const info = await fetchTrainingDataInfo(actor.id);
        dataMap.set(actor.id, info);
      })
    );
    setTrainingDataMap(dataMap);
  }

  async function loadActors() {
    try {
      setLoading(true);
      // Fetch actors from API to get latest data including 'good' flags
      const response = await fetch("/api/actors");
      if (!response.ok) {
        throw new Error(`Failed to load actors: ${response.statusText}`);
      }
      const actorsData = await response.json();
      setActors(actorsData);
      onActorsLoaded?.(actorsData);
    } catch (err) {
      console.error("Error loading actors:", err);
      setError(err instanceof Error ? err.message : "Failed to load actors");
    } finally {
      setLoading(false);
    }
  }

  const handleRegeneratePosterFrame = async (actor: Actor) => {
    console.log("Regenerating poster frame for:", actor.name);

    try {
      const response = await fetch(
        `/api/actors/${actor.id}/regenerate-poster-frame`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_name: actor.name,
            lora_model_url: actor.url || "",
            actor_description: actor.face_prompt || "",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate poster frame");
      }

      const result = await response.json();
      console.log("Poster frame regenerated:", result);

      // Reload actors to get updated poster frame URLs
      await loadActors();

      toast.success(`Poster frame regenerated successfully for ${actor.name}!`);
    } catch (error) {
      console.error("Error regenerating poster frame:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="actors-grid-loading">
        <div className="spinner"></div>
        <p>Loading actors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="actors-grid-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Actors</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Toggle filter on/off
  const toggleFilter = (filterType: FilterType) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(filterType)) {
        newFilters.delete(filterType);
      } else {
        newFilters.add(filterType);
      }
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters(new Set());
    setInvertFilter(false);
  };

  // Filter actors based on selected filters
  const filteredActors = actors.filter((actor) => {
    // If no filters active and no inversion, show all
    if (activeFilters.size === 0 && !invertFilter) return true;

    const trainingInfo = trainingDataMap.get(actor.id);
    if (!trainingInfo) return false;

    // Group 1: Training Data Status (mutually exclusive - use OR logic)
    const trainingDataFilters = [];
    if (activeFilters.has("no_training_data")) {
      const matches = trainingInfo.count === 0;
      trainingDataFilters.push(invertFilter ? !matches : matches);
    }
    if (activeFilters.has("has_training_not_good")) {
      const matches = trainingInfo.count > 0 && !actor.training_data_good;
      trainingDataFilters.push(invertFilter ? !matches : matches);
    }
    if (activeFilters.has("training_data_good")) {
      const matches = actor.training_data_good === true;
      trainingDataFilters.push(invertFilter ? !matches : matches);
    }

    // Group 2: Model Status (mutually exclusive - use OR logic)
    const modelStatusFilters = [];
    if (activeFilters.has("no_custom_models")) {
      const matches = (actor.custom_models_count || 0) === 0;
      modelStatusFilters.push(invertFilter ? !matches : matches);
    }
    if (activeFilters.has("has_models_not_good")) {
      const matches = (actor.custom_models_count || 0) > 0 && !actor.custom_models_good;
      modelStatusFilters.push(invertFilter ? !matches : matches);
    }
    if (activeFilters.has("has_good_model")) {
      const matches = actor.custom_models_good === true;
      modelStatusFilters.push(invertFilter ? !matches : matches);
    }
    if (activeFilters.has("production_synced")) {
      const matches = actor.production_synced === true;
      modelStatusFilters.push(invertFilter ? !matches : matches);
    }

    // Evaluate each group with OR logic (match ANY within group)
    const matchesTrainingData =
      trainingDataFilters.length === 0 ||
      (invertFilter
        ? trainingDataFilters.every((result) => result === true)
        : trainingDataFilters.some((result) => result === true));

    const matchesModelStatus =
      modelStatusFilters.length === 0 ||
      (invertFilter
        ? modelStatusFilters.every((result) => result === true)
        : modelStatusFilters.some((result) => result === true));

    // Combine groups with AND logic
    return matchesTrainingData && matchesModelStatus;
  });

  if (actors.length === 0) {
    return (
      <div className="actors-grid-empty">
        <div className="empty-icon">🎭</div>
        <h3>No Actors Found</h3>
        <p>Start by adding your first actor</p>
      </div>
    );
  }

  return (
    <div className="actors-container">
      <div className="actors-header">
        <div className="actors-header-left">
          <h2>Actor Library</h2>
          <p className="actors-count">
            {filteredActors.length} of {actors.length}{" "}
            {actors.length === 1 ? "actor" : "actors"}
            {(activeFilters.size > 0 || invertFilter) &&
              ` (${activeFilters.size} filter${
                activeFilters.size !== 1 ? "s" : ""
              }${invertFilter ? " - inverted" : ""})`}
          </p>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label
            style={{ fontSize: "14px", fontWeight: 500, color: "#64748b" }}
          >
            Filter:
          </label>
          <button
            onClick={() => setInvertFilter(!invertFilter)}
            style={{
              padding: "8px 12px",
              background: invertFilter ? "#ef4444" : "#f1f5f9",
              color: invertFilter ? "white" : "#475569",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            title={
              invertFilter
                ? "Invert filter: ON (showing opposite)"
                : "Invert filter: OFF (showing matches)"
            }
          >
            {invertFilter ? "⊘" : "="}
          </button>
          <button
            onClick={clearAllFilters}
            style={{
              padding: "8px 16px",
              background:
                activeFilters.size === 0 && !invertFilter
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "#f1f5f9",
              color:
                activeFilters.size === 0 && !invertFilter ? "white" : "#475569",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Clear All
          </button>
          
          {/* Training Data Filters */}
          <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", alignSelf: "center" }}>Training Data:</span>
            <button
              onClick={() => toggleFilter("no_training_data")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("no_training_data") ? "#94a3b8" : "#f1f5f9",
                color: activeFilters.has("no_training_data") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ∅ No Data
            </button>
            <button
              onClick={() => toggleFilter("has_training_not_good")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("has_training_not_good") ? "#3b82f6" : "#f1f5f9",
                color: activeFilters.has("has_training_not_good") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              📸 Has Data (Not Good)
            </button>
            <button
              onClick={() => toggleFilter("training_data_good")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("training_data_good") ? "#10b981" : "#f1f5f9",
                color: activeFilters.has("training_data_good") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ✓ Marked Good
            </button>
          </div>
          
          {/* Model Filters */}
          <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", alignSelf: "center" }}>Models:</span>
            <button
              onClick={() => toggleFilter("no_custom_models")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("no_custom_models") ? "#94a3b8" : "#f1f5f9",
                color: activeFilters.has("no_custom_models") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ∅ No Models
            </button>
            <button
              onClick={() => toggleFilter("has_models_not_good")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("has_models_not_good") ? "#3b82f6" : "#f1f5f9",
                color: activeFilters.has("has_models_not_good") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              🎯 Has Models (Not Good)
            </button>
            <button
              onClick={() => toggleFilter("has_good_model")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("has_good_model") ? "#10b981" : "#f1f5f9",
                color: activeFilters.has("has_good_model") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ✓ Good Model
            </button>
            <button
              onClick={() => toggleFilter("production_synced")}
              style={{
                padding: "8px 16px",
                background: activeFilters.has("production_synced") ? "#9333ea" : "#f1f5f9",
                color: activeFilters.has("production_synced") ? "white" : "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              🚀 Production Synced
            </button>
          </div>
        </div>

        <div className="column-control">
          <label className="column-control-label">Columns:</label>
          <button
            className="column-btn"
            onClick={() => setColumns(Math.max(1, columns - 1))}
            aria-label="Decrease columns"
          >
            −
          </button>
          <input
            type="number"
            className="column-input"
            value={columns}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setColumns(Math.max(1, Math.min(10, val)));
            }}
            min="1"
            max="10"
          />
          <button
            className="column-btn"
            onClick={() => setColumns(Math.min(10, columns + 1))}
            aria-label="Increase columns"
          >
            +
          </button>
        </div>
      </div>
      {filteredActors.length === 0 ? (
        <div className="actors-grid-empty">
          <div className="empty-icon">🔍</div>
          <h3>No Actors Match Filter</h3>
          <p>Try adjusting your filter settings</p>
          <button
            onClick={clearAllFilters}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div
          className="actors-grid"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {filteredActors.map((actor) => (
            <ActorCard
              key={actor.id}
              actor={actor}
              onOpenTrainingData={onOpenTrainingData}
              onRegeneratePosterFrame={handleRegeneratePosterFrame}
              onActorUpdated={loadActors}
            />
          ))}
        </div>
      )}
    </div>
  );
}
