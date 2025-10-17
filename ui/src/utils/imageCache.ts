/**
 * Image Cache Service
 *
 * Provides local disk caching for S3 images with automatic sync detection.
 * Cache is stored in .image-cache/ (gitignored) and tracks S3 URLs with metadata.
 */

interface CacheEntry {
  s3_url: string;
  local_path: string;
  cached_at: number;
  size_bytes: number;
  actor_id: string;
  filename: string;
  etag?: string; // S3 ETag for change detection
}

interface CacheManifest {
  version: string;
  entries: Record<string, CacheEntry>; // key: s3_url
  last_updated: number;
}

class ImageCacheService {
  private manifest: CacheManifest | null = null;
  private manifestLoaded = false;
  private cachingEnabled = true; // Can be disabled if S3 requires auth

  /**
   * Check if caching is enabled
   */
  isCachingEnabled(): boolean {
    return this.cachingEnabled;
  }

  /**
   * Disable caching (useful when S3 requires authentication)
   */
  disableCaching(): void {
    this.cachingEnabled = false;
    console.log('[ImageCache] Caching disabled - using S3 URLs directly');
  }

  /**
   * Initialize cache - load manifest from backend
   */
  async initialize(): Promise<void> {
    if (this.manifestLoaded) return;

    try {
      const response = await fetch("/api/cache/manifest");
      if (response.ok) {
        this.manifest = await response.json();
      } else {
        // Create new manifest
        this.manifest = {
          version: "1.0",
          entries: {},
          last_updated: Date.now(),
        };
      }
      this.manifestLoaded = true;
    } catch (error) {
      console.error("Failed to load cache manifest:", error);
      this.manifest = {
        version: "1.0",
        entries: {},
        last_updated: Date.now(),
      };
      this.manifestLoaded = true;
    }
  }

  /**
   * Get cached image URL or return S3 URL if not cached
   */
  async getCachedUrl(s3_url: string): Promise<string> {
    // If caching is disabled, always return S3 URL
    if (!this.cachingEnabled) {
      return s3_url;
    }

    await this.initialize();

    const entry = this.manifest?.entries[s3_url];
    if (entry) {
      // Check if cache file exists
      const exists = await this.checkCacheExists(entry.local_path);
      if (exists) {
        return `/api/cache/image?path=${encodeURIComponent(entry.local_path)}`;
      }
    }

    // Not cached, return S3 URL
    return s3_url;
  }

  /**
   * Check if image is cached
   */
  async isCached(s3_url: string): Promise<boolean> {
    await this.initialize();

    const entry = this.manifest?.entries[s3_url];
    if (!entry) return false;

    return await this.checkCacheExists(entry.local_path);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    total_entries: number;
    total_size_mb: number;
    cached_actors: Set<string>;
  }> {
    await this.initialize();

    const entries = Object.values(this.manifest?.entries || {});
    const total_size_mb = entries.reduce(
      (sum, e) => sum + e.size_bytes / 1024 / 1024,
      0
    );
    const cached_actors = new Set(entries.map((e) => e.actor_id));

    return {
      total_entries: entries.length,
      total_size_mb: Math.round(total_size_mb * 100) / 100,
      cached_actors,
    };
  }

  /**
   * Prefetch images for an actor
   */
  async prefetchActor(
    actorId: string,
    images: Array<{ s3_url: string; filename: string }>
  ): Promise<void> {
    await this.initialize();

    const uncachedImages = [];
    for (const img of images) {
      const cached = await this.isCached(img.s3_url);
      if (!cached) {
        uncachedImages.push(img);
      }
    }

    if (uncachedImages.length === 0) {
      return; // All cached
    }

    // Request backend to cache these images
    try {
      await fetch("/api/cache/prefetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_id: actorId,
          images: uncachedImages,
        }),
      });

      // Reload manifest after prefetch
      this.manifestLoaded = false;
      await this.initialize();
    } catch (error) {
      console.error("Prefetch failed:", error);
    }
  }

  /**
   * Clear cache for specific actor
   */
  async clearActorCache(actorId: string): Promise<void> {
    try {
      await fetch(`/api/cache/clear/${actorId}`, { method: "POST" });

      // Reload manifest
      this.manifestLoaded = false;
      await this.initialize();
    } catch (error) {
      console.error("Failed to clear actor cache:", error);
    }
  }

  /**
   * Clear entire cache
   */
  async clearAll(): Promise<void> {
    try {
      await fetch("/api/cache/clear-all", { method: "POST" });

      // Reset manifest
      this.manifest = {
        version: "1.0",
        entries: {},
        last_updated: Date.now(),
      };
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }

  /**
   * Check if cache file exists (via backend)
   */
  private async checkCacheExists(localPath: string): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/cache/exists?path=${encodeURIComponent(localPath)}`
      );
      const data = await response.json();
      return data.exists === true;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate cache entry (when image is deleted from S3)
   */
  async invalidate(s3_url: string): Promise<void> {
    await this.initialize();

    if (this.manifest?.entries[s3_url]) {
      delete this.manifest.entries[s3_url];

      // Notify backend to remove from manifest
      try {
        await fetch("/api/cache/invalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ s3_url }),
        });
      } catch (error) {
        console.error("Failed to invalidate cache:", error);
      }
    }
  }
}

// Singleton instance
export const imageCache = new ImageCacheService();
