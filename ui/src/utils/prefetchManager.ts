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
  private failedActors = new Set<string>(); // Track actors with missing/failed images
  private onProgressCallback: ((progress: PrefetchProgress) => void) | null = null;

  /**
   * Start prefetching all actors
   */
  async startPrefetch(actors: Actor[]): Promise<void> {
    if (this.isRunning) {
      console.log('[Prefetch] Already running, skipping duplicate call');
      return;
    }

    console.log(`[Prefetch] Starting for ${actors.length} actors`);
    this.isRunning = true;
    
    // Initialize completedActors from cache manifest on first run
    if (this.completedActors.size === 0) {
      const cachedActorIds = await imageCache.getCachedActorIds();
      cachedActorIds.forEach(id => this.completedActors.add(id));
      console.log(`[Prefetch] Initialized with ${this.completedActors.size} already-cached actors`);
    }

    // Build prefetch queue
    await this.buildQueue(actors);

    // Start processing in background
    this.processQueue();
  }

  /**
   * Prefetch specific actor with high priority
   */
  async prefetchActor(actorId: string, images: Array<{ s3_url: string; filename: string }>): Promise<void> {
    // Check if already completed
    if (this.completedActors.has(actorId)) {
      console.log(`[Prefetch] Actor ${actorId} already completed, skipping`);
      return;
    }

    // Check if already in queue
    if (this.queue.some(task => task.actorId === actorId)) {
      console.log(`[Prefetch] Actor ${actorId} already in queue, skipping duplicate`);
      return;
    }

    // Check if currently being processed
    if (this.currentTask?.actorId === actorId) {
      console.log(`[Prefetch] Actor ${actorId} currently being processed, skipping duplicate`);
      return;
    }

    // Check if already cached
    const uncached = [];
    for (const img of images) {
      const cached = await imageCache.isCached(img.s3_url);
      if (!cached) {
        uncached.push(img);
      }
    }

    if (uncached.length === 0) {
      console.log(`[Prefetch] Actor ${actorId} already fully cached`);
      this.completedActors.add(actorId);
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
    console.log(`[Prefetch] Added actor ${actorId} to queue (high priority, ${uncached.length} images)`);

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
    console.log(`[Prefetch] Building queue for ${actors.length} actors, ${this.completedActors.size} already completed`);

    for (const actor of actors) {
      try {
        const actorIdStr = String(actor.id);
        
        // Skip if already completed in a previous run
        if (this.completedActors.has(actorIdStr)) {
          continue;
        }
        
        // Skip if previously failed (images don't exist in S3)
        if (this.failedActors.has(actorIdStr)) {
          continue;
        }
        
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

    console.log(`[Prefetch] Queue built: ${this.queue.length} actors need caching`);
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
        
        const result = await imageCache.prefetchActor(this.currentTask.actorId, this.currentTask.images);
        
        // If all images failed (likely missing from S3), mark as failed
        if (result.cached === 0 && result.failed > 0) {
          this.failedActors.add(this.currentTask.actorId);
          console.log(`[Prefetch] Actor ${this.currentTask.actorId} marked as failed (${result.failed} missing images)`);
        } else if (result.cached > 0) {
          // At least some images were cached successfully
          this.completedActors.add(this.currentTask.actorId);
          console.log(`[Prefetch] Actor ${this.currentTask.actorId} completed (${result.cached} images cached)`);
        }
        
        // Notify progress
        if (this.onProgressCallback) {
          this.onProgressCallback(this.getProgress());
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to prefetch actor ${this.currentTask.actorId}:`, error);
        this.failedActors.add(this.currentTask.actorId);
      }
    }

    this.isRunning = false;
    this.currentTask = null;
    console.log(`[Prefetch] Completed - ${this.completedActors.size} actors cached, ${this.failedActors.size} actors skipped (missing images)`);

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
