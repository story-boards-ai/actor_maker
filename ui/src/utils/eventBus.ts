/**
 * Event Bus for Cross-Component Communication
 * 
 * Provides a lightweight pub/sub system for components to communicate
 * without tight coupling or prop drilling.
 */

type EventCallback = (data?: any) => void;

interface EventBus {
  on: (event: string, callback: EventCallback) => () => void;
  emit: (event: string, data?: any) => void;
  off: (event: string, callback: EventCallback) => void;
}

class EventBusImpl implements EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param callback - Function to call when event is emitted
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Optional data to pass to listeners
   */
  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param callback - The callback to remove
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }
}

// Singleton instance
export const eventBus: EventBus = new EventBusImpl();

// Event type constants for type safety
export const EVENT_TYPES = {
  TRAINING_IMAGE_SAVED: 'training-image-saved',
  TRAINING_IMAGE_DELETED: 'training-image-deleted',
  TRAINING_IMAGES_GENERATED: 'training-images-generated',
} as const;

// Event data interfaces for type safety
export interface TrainingImageSavedEvent {
  styleId: string;
  baseImageFilename: string;
  trainingImagePath: string;
}

export interface TrainingImageDeletedEvent {
  styleId: string;
  trainingImageFilename: string;
}

export interface TrainingImagesGeneratedEvent {
  styleId: string;
  count: number;
}
