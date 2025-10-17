/**
 * useImageCache Hook
 * 
 * Provides image caching functionality for components
 */

import { useState, useEffect, useCallback } from 'react';
import { imageCache } from '../utils/imageCache';

interface UseImageCacheOptions {
  actorId?: string;
  images?: Array<{ s3_url: string; filename: string }>;
  autoPrefetch?: boolean;
}

export function useImageCache(options: UseImageCacheOptions = {}) {
  const { actorId, images, autoPrefetch = false } = options;
  const [cachedUrls, setCachedUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{
    total_entries: number;
    total_size_mb: number;
    cached_actors: Set<string>;
  } | null>(null);

  /**
   * Get cached URL for an S3 URL
   */
  const getCachedUrl = useCallback(async (s3_url: string): Promise<string> => {
    // Check if already in state
    if (cachedUrls.has(s3_url)) {
      return cachedUrls.get(s3_url)!;
    }

    // Get from cache service
    const url = await imageCache.getCachedUrl(s3_url);
    
    // Update state
    setCachedUrls(prev => new Map(prev).set(s3_url, url));
    
    return url;
  }, [cachedUrls]);

  /**
   * Check if image is cached
   */
  const isCached = useCallback(async (s3_url: string): Promise<boolean> => {
    return await imageCache.isCached(s3_url);
  }, []);

  /**
   * Prefetch images for current actor
   */
  const prefetch = useCallback(async () => {
    if (!actorId || !images || images.length === 0) return;

    setLoading(true);
    try {
      await imageCache.prefetchActor(actorId, images);
      
      // Update cache stats
      const stats = await imageCache.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Prefetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [actorId, images]);

  /**
   * Clear cache for current actor
   */
  const clearActorCache = useCallback(async () => {
    if (!actorId) return;

    setLoading(true);
    try {
      await imageCache.clearActorCache(actorId);
      
      // Clear cached URLs for this actor
      setCachedUrls(prev => {
        const newMap = new Map(prev);
        if (images) {
          images.forEach(img => newMap.delete(img.s3_url));
        }
        return newMap;
      });

      // Update cache stats
      const stats = await imageCache.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Clear cache failed:', error);
    } finally {
      setLoading(false);
    }
  }, [actorId, images]);

  /**
   * Invalidate specific image from cache
   */
  const invalidateImage = useCallback(async (s3_url: string) => {
    await imageCache.invalidate(s3_url);
    
    // Remove from cached URLs
    setCachedUrls(prev => {
      const newMap = new Map(prev);
      newMap.delete(s3_url);
      return newMap;
    });
  }, []);

  /**
   * Load cache stats
   */
  const loadStats = useCallback(async () => {
    try {
      const stats = await imageCache.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  }, []);

  // Auto-prefetch on mount if enabled
  useEffect(() => {
    if (autoPrefetch && actorId && images && images.length > 0) {
      prefetch();
    }
  }, [autoPrefetch, actorId, images, prefetch]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    getCachedUrl,
    isCached,
    prefetch,
    clearActorCache,
    invalidateImage,
    loading,
    cacheStats,
    cachedUrls
  };
}
