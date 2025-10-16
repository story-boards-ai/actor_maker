import { useState } from "react";
import type { Actor } from "../../../types";
import "./ActorSelectorModal.css";

interface ActorSelectorModalProps {
  actors: Actor[];
  selectedActorId: string;
  onSelect: (actorId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActorSelectorModal({
  actors,
  selectedActorId,
  onSelect,
  open,
  onOpenChange,
}: ActorSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSex, setFilterSex] = useState<string>("all");
  const [filterEthnicity, setFilterEthnicity] = useState<string>("all");

  if (!open) return null;

  // Filter actors based on search and filters
  const filteredActors = actors.filter((actor) => {
    const matchesSearch =
      searchQuery === "" ||
      actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.id.toString().includes(searchQuery);

    const matchesSex = filterSex === "all" || actor.sex === filterSex;
    const matchesEthnicity =
      filterEthnicity === "all" || actor.ethnicity === filterEthnicity;

    return matchesSearch && matchesSex && matchesEthnicity;
  });

  // Get unique values for filters
  const sexOptions = ["all", ...new Set(actors.map((a) => a.sex))];
  const ethnicityOptions = [
    "all",
    ...new Set(actors.map((a) => a.ethnicity)),
  ];

  const handleSelect = (actorId: string) => {
    onSelect(actorId);
    onOpenChange(false);
  };

  return (
    <div className="modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Actor</h3>
          <button
            className="modal-close"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-filters">
          <input
            type="text"
            placeholder="Search actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <div className="filter-row">
            <select
              value={filterSex}
              onChange={(e) => setFilterSex(e.target.value)}
              className="filter-select"
            >
              {sexOptions.map((sex) => (
                <option key={sex} value={sex}>
                  {sex === "all" ? "All Sexes" : sex}
                </option>
              ))}
            </select>

            <select
              value={filterEthnicity}
              onChange={(e) => setFilterEthnicity(e.target.value)}
              className="filter-select"
            >
              {ethnicityOptions.map((ethnicity) => (
                <option key={ethnicity} value={ethnicity}>
                  {ethnicity === "all" ? "All Ethnicities" : ethnicity}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-body">
          <div className="actors-grid">
            {filteredActors.map((actor) => (
              <div
                key={actor.id}
                className={`actor-card ${
                  selectedActorId === actor.id.toString() ? "selected" : ""
                }`}
                onClick={() => handleSelect(actor.id.toString())}
              >
                <div className="actor-image-container">
                  <img
                    src={actor.poster_frames.standard.webp_sm}
                    alt={actor.name}
                    className="actor-image"
                  />
                  {actor.good && <div className="good-badge">✓ Good</div>}
                  {actor.training_data && (
                    <div className="training-badge">
                      {actor.training_data.count} imgs
                    </div>
                  )}
                </div>
                <div className="actor-info">
                  <div className="actor-name">{actor.name}</div>
                  <div className="actor-meta">
                    {actor.age} • {actor.sex} • {actor.ethnicity}
                  </div>
                  <div className="actor-id">ID: {actor.id}</div>
                </div>
              </div>
            ))}
          </div>

          {filteredActors.length === 0 && (
            <div className="no-results">
              <p>No actors found matching your criteria</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="results-count">
            {filteredActors.length} of {actors.length} actors
          </div>
          <button
            className="modal-cancel-btn"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
