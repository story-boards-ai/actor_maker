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
    }
  }, [open]);

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
        
        // Filter actors that have LoRA models in their manifests
        const actorIds = new Set<string>();
        actors.forEach((actor: any) => {
          // Check if actor has system LoRA model or custom LoRA models
          const hasSystemLora = actor.lora_model && actor.lora_model.filename;
          const hasCustomLoras = actor.custom_lora_models && actor.custom_lora_models.length > 0;
          
          if (hasSystemLora || hasCustomLoras) {
            actorIds.add(actor.id.toString());
          }
        });

        console.log(
          "[CharacterModal] Actors with LoRA models:",
          Array.from(actorIds),
          `(${actorIds.size} out of ${actors.length})`
        );
        
        setSystemActors(actors || []);
        setActorsWithModels(actorIds);
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

  const handleSelectActor = (actor: any) => {
    const character: ValidatorCharacter = {
      id: actor.id.toString(), // Use numeric ID as string to match backend
      name: actor.name,
      classToken: actor.name, // Use actor name as class token (e.g., "0006_european_20_female")
      type: "system",
      description: actor.description,
      loraUrl: actor.lora_model?.s3_accelerated_url || actor.lora_model?.s3_url || actor.url,
      previewImage:
        actor.poster_frames?.accelerated?.webp_sm ||
        actor.poster_frames?.accelerated?.webp_md,
      customLoraModels: actor.custom_lora_models || [],
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
                ? "No actors with LoRA models match your search."
                : "No actors with LoRA models available. Actors need to have lora_model or custom_lora_models in their manifests."}
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
