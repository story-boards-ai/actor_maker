import { useState, useEffect } from "react";
import type { ValidatorCharacter, ActorData } from "../types/character";
import "./CharacterSelectionModal.css";

interface CharacterSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (character: ValidatorCharacter) => void;
  selectedCharacters: ValidatorCharacter[];
}

export function CharacterSelectionModal({
  open,
  onClose,
  onSelect,
  selectedCharacters,
}: CharacterSelectionModalProps) {
  const [systemActors, setSystemActors] = useState<ActorData[]>([]);
  const [actorsWithModels, setActorsWithModels] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      loadSystemActors();
      loadActorsWithModels();
    }
  }, [open]);

  async function loadActorsWithModels() {
    try {
      console.log("[CharacterModal] Fetching trained models...");
      const response = await fetch("/api/training/models");

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];

        // Extract unique actor IDs that have trained models
        const actorIds = new Set<string>();
        models.forEach((model: any) => {
          if (model.styleId) {
            actorIds.add(model.styleId);
          }
        });

        console.log(
          "[CharacterModal] Actors with models:",
          Array.from(actorIds)
        );
        setActorsWithModels(actorIds);
      }
    } catch (error) {
      console.error("[CharacterModal] Failed to load trained models:", error);
    }
  }

  async function loadSystemActors() {
    try {
      setLoading(true);
      console.log("[CharacterModal] Fetching actors from /api/actors...");

      // Fetch from API endpoint which reads actorsData.json
      const response = await fetch("/api/actors");
      console.log("[CharacterModal] Response status:", response.status);

      if (response.ok) {
        const actors = await response.json();
        console.log("[CharacterModal] Loaded actors:", actors);
        console.log("[CharacterModal] Number of actors:", actors?.length || 0);
        setSystemActors(actors || []);
      } else {
        console.error(
          "[CharacterModal] Failed to load actors, status:",
          response.status
        );
        const text = await response.text();
        console.error("[CharacterModal] Response text:", text);
      }
    } catch (error) {
      console.error("[CharacterModal] Failed to load system actors:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredActors = systemActors.filter((actor) => {
    // Only show actors that have trained models
    const hasModels = actorsWithModels.has(actor.id.toString());

    if (!hasModels) return false;

    // Apply search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      actor.name.toLowerCase().includes(search) ||
      actor.description?.toLowerCase().includes(search) ||
      actor.ethnicity?.toLowerCase().includes(search) ||
      actor.age?.toLowerCase().includes(search) ||
      actor.sex?.toLowerCase().includes(search)
    );
  });

  const handleSelectActor = (actor: ActorData) => {
    const character: ValidatorCharacter = {
      id: actor.id.toString(), // Use numeric ID as string to match backend
      name: actor.name,
      type: "system",
      description: actor.description,
      loraUrl: actor.url,
      previewImage:
        actor.poster_frames?.accelerated?.webp_sm ||
        actor.poster_frames?.accelerated?.webp_md,
    };
    onSelect(character);
  };

  const isSelected = (actorName: string) => {
    return selectedCharacters.some((c) => c.name === actorName);
  };

  if (!open) return null;

  return (
    <div className="character-modal-overlay" onClick={onClose}>
      <div
        className="character-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="character-modal-header">
          <h2>Select Character</h2>
          <button onClick={onClose} className="character-modal-close">
            ✕
          </button>
        </div>

        <div className="character-modal-search">
          <input
            type="text"
            placeholder="Search by name, age, ethnicity, gender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="character-search-input"
          />
        </div>

        <div className="character-modal-body">
          {loading ? (
            <div className="character-loading">Loading actors...</div>
          ) : filteredActors.length === 0 ? (
            <div className="character-empty">
              {searchTerm
                ? "No actors with trained models match your search."
                : "No actors with trained models available. Train a model from the Training tab first."}
            </div>
          ) : (
            <div className="character-grid">
              {filteredActors.map((actor) => (
                <div
                  key={actor.name}
                  className={`character-card ${
                    isSelected(actor.name) ? "selected" : ""
                  }`}
                  onClick={() => handleSelectActor(actor)}
                >
                  {actor.poster_frames?.accelerated?.webp_sm && (
                    <img
                      src={actor.poster_frames.accelerated.webp_sm}
                      alt={actor.name}
                      className="character-image"
                    />
                  )}
                  <div className="character-info">
                    <div className="character-name">
                      {actor.name.replace(/_/g, " ")}
                    </div>
                    <div className="character-meta">
                      {actor.age && <span>{actor.age}y</span>}
                      {actor.sex && <span>{actor.sex}</span>}
                      {actor.ethnicity && <span>{actor.ethnicity}</span>}
                    </div>
                    {actor.description && (
                      <div className="character-description">
                        {actor.description}
                      </div>
                    )}
                  </div>
                  {isSelected(actor.name) && (
                    <div className="character-selected-badge">✓ Selected</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="character-modal-footer">
          <button onClick={onClose} className="btn-character-done">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
