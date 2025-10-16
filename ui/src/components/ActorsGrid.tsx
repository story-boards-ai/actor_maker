import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ActorCard } from "./ActorCard";
import type { Actor } from "../types";
import "./ActorsGrid.css";

interface ActorsGridProps {
  onOpenTrainingData?: (actor: Actor) => void;
}

export function ActorsGrid({ onOpenTrainingData }: ActorsGridProps = {}) {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    async function loadActors() {
      try {
        // Import the actorsData from the data directory
        const module = await import("../../../data/actorsData.ts");
        setActors(module.actorsLibraryData);
      } catch (err) {
        console.error("Error loading actors:", err);
        setError(err instanceof Error ? err.message : "Failed to load actors");
      } finally {
        setLoading(false);
      }
    }

    loadActors();
  }, []);

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
      const module = await import("../../../data/actorsData.ts");
      setActors(module.actorsLibraryData);

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
            {actors.length} {actors.length === 1 ? "actor" : "actors"} available
          </p>
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
      <div className="actors-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {actors.map((actor) => (
          <ActorCard
            key={actor.id}
            actor={actor}
            onOpenTrainingData={onOpenTrainingData}
            onRegeneratePosterFrame={handleRegeneratePosterFrame}
          />
        ))}
      </div>
    </div>
  );
}
