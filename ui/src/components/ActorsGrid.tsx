import React, { useEffect, useState } from "react";
import { ActorCard } from "./ActorCard";
import type { Actor } from "../types";
import "./StylesGrid.css";

export function ActorsGrid() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActors() {
      try {
        // Import the actorsData from the data directory
        // Since publicDir is '../data', we need to import from the actual file path
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

  if (loading) {
    return (
      <div className="styles-grid-loading">
        <div className="spinner"></div>
        <p>Loading actors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="styles-grid-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Actors</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (actors.length === 0) {
    return (
      <div className="styles-grid-empty">
        <div className="empty-icon">🎭</div>
        <h3>No Actors Found</h3>
        <p>Start by creating your first actor model</p>
      </div>
    );
  }

  return (
    <div className="styles-container">
      <div className="styles-header">
        <div className="styles-header-left">
          <h2>Actors Library</h2>
          <p className="styles-count">
            {actors.length} {actors.length === 1 ? "actor" : "actors"} available
          </p>
        </div>
      </div>
      <div className="styles-grid">
        {actors.map((actor) => (
          <ActorCard key={actor.id} actor={actor} />
        ))}
      </div>
    </div>
  );
}
