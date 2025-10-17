/**
 * Prefetch Manager
 * 
 * Manages background prefetching of images with priority system.
 * Runs on app startup and continues in background.
 */

import { imageCache } from './imageCache';
import type { Actor } from '../types';

interface PrefetchTask {
  actorId: string;
  priority: 'high' | 'normal' | 'low';
  images: Array<{ s3_url: string; filename: string }>;
}

class PrefetchManager {
  private queue: PrefetchTask[] = [];
  private isRunning = false;
  private isPaused = false;
  private currentTask: PrefetchTask | null = null;
  private completedActors = new Set<string>();
  private onProgressCallback: ((progress: PrefetchProgress) => void) | null = null;

  /**
   * Start prefetching all actors
   */
  async startPrefetch(actors: Actor[]): Promise<void> {
    if (this.isRunning) {
      console.log('Prefetch already running');
      return;
    }

    console.log(`Starting prefetch for ${actors.length} actors`);
    this.isRunning = true;
    this.completedActors.clear();

    // Build prefetch queue
    await this.buildQueue(actors);

    // Start processing in background
    this.processQueue();
  }

  /**
   * Prefetch specific actor with high priority
   */
  async prefetchActor(actorId: string, images: Array<{ s3_url: string; filename: string }>): Promise<void> {
    // Check if already cached
    const uncached = [];
    for (const img of images) {
      const cached = await imageCache.isCached(img.s3_url);
      if (!cached) {
        uncached.push(img);
      }
    }

    if (uncached.length === 0) {
      console.log(`Actor ${actorId} already fully cached`);
      return;
    }

    // Add high priority task
    const task: PrefetchTask = {
      actorId,
      priority: 'high',
      images: uncached
    };

    // Insert at front of queue
    this.queue.unshift(task);

    // Start processing if not running
    if (!this.isRunning) {
      this.isRunning = true;
      this.processQueue();
    }
  }

  /**
   * Pause prefetching
   */
  pause(): void {
    this.isPaused = true;
    console.log('Prefetch paused');
  }

  /**
   * Resume prefetching
   */
  resume(): void {
    this.isPaused = false;
    console.log('Prefetch resumed');
    if (this.isRunning && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Stop prefetching
   */
  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.queue = [];
    this.currentTask = null;
    console.log('Prefetch stopped');
  }

  /**
   * Get current progress
   */
  getProgress(): PrefetchProgress {
    const total = this.queue.length + this.completedActors.size;
    const completed = this.completedActors.size;
    
    return {
      total,
      completed,
      remaining: this.queue.length,
      currentActor: this.currentTask?.actorId || null,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    };
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (progress: PrefetchProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Build prefetch queue from actors
   */
  private async buildQueue(actors: Actor[]): Promise<void> {
    this.queue = [];

    for (const actor of actors) {
      try {
        const actorIdStr = String(actor.id);
        
        // Fetch training data for actor
        const response = await fetch(`/api/actors/${actorIdStr}/training-data`);
        if (!response.ok) continue;

        const data = await response.json();
        const images = data.training_images || [];

        // Add base image if exists
        if (data.base_image_url) {
          images.unshift({
            s3_url: data.base_image_url,
            filename: `${actor.name}_base.jpg`
          });
        }

        if (images.length === 0) continue;

        // Check which images need caching
        const uncached = [];
        for (const img of images) {
          const cached = await imageCache.isCached(img.s3_url);
          if (!cached) {
            uncached.push(img);
          }
        }

        if (uncached.length > 0) {
          this.queue.push({
            actorId: actorIdStr,
            priority: 'normal',
            images: uncached
          });
        } else {
          // Already fully cached
          this.completedActors.add(actorIdStr);
        }
      } catch (error) {
        console.error(`Failed to build prefetch task for actor ${actor.id}:`, error);
      }
    }

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`Prefetch queue built: ${this.queue.length} actors need caching`);
  }

  /**
   * Process queue in background
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning && this.queue.length > 0) {
      if (this.isPaused) {
        // Wait and check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Get next task (high priority first)
      this.currentTask = this.queue.shift() || null;
      if (!this.currentTask) break;

      try {
        console.log(`Prefetching actor ${this.currentTask.actorId} (${this.currentTask.images.length} images)`);
        
        await imageCache.prefetchActor(this.currentTask.actorId, this.currentTask.images);
        
        this.completedActors.add(this.currentTask.actorId);
        
        // Notify progress
        if (this.onProgressCallback) {
          this.onProgressCallback(this.getProgress());
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to prefetch actor ${this.currentTask.actorId}:`, error);
      }
    }

    this.isRunning = false;
    this.currentTask = null;
    console.log('Prefetch completed');

    // Final progress update
    if (this.onProgressCallback) {
      this.onProgressCallback(this.getProgress());
    }
  }
}

export interface PrefetchProgress {
  total: number;
  completed: number;
  remaining: number;
  currentActor: string | null;
  isRunning: boolean;
  isPaused: boolean;
}

// Singleton instance
export const prefetchManager = new PrefetchManager();
