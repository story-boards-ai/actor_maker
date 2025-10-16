import React, { useEffect, useState } from 'react';
import { ActorCard } from './ActorCard';
import type { Actor } from '../types';
import './ActorsGrid.css';

interface ActorsGridProps {
  onOpenTrainingData?: (actor: Actor) => void;
}

export function ActorsGrid({ onOpenTrainingData }: ActorsGridProps = {}) {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActors() {
      try {
        // Import the actorsData from the data directory
        const module = await import('../../../data/actorsData.ts');
        setActors(module.actorsLibraryData);
      } catch (err) {
        console.error('Error loading actors:', err);
        setError(err instanceof Error ? err.message : 'Failed to load actors');
      } finally {
        setLoading(false);
      }
    }

    loadActors();
  }, []);


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
            {actors.length} {actors.length === 1 ? 'actor' : 'actors'} available
          </p>
        </div>
      </div>
      <div className="actors-grid">
        {actors.map((actor) => (
          <ActorCard 
            key={actor.id} 
            actor={actor}
            onOpenTrainingData={onOpenTrainingData}
          />
        ))}
      </div>
    </div>
  );
}
