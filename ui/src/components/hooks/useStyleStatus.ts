import { useState, useEffect } from 'react';
import type { Style } from '../../types';

export interface StyleStatus {
  captionsGenerated: number;
  captionsTotal: number;
  s3Synced: number;
  s3Total: number;
  loraModels: number;
  validationPassed: boolean;
  validationRating: number | null;
}

// Cache for S3 status to avoid repeated checks during startup
const s3StatusCache = new Map<string, { data: { synced: number; total: number }, timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Clear S3 status cache for a specific style or all styles
 */
export function clearS3StatusCache(styleId?: string) {
  if (styleId) {
    s3StatusCache.delete(styleId);
  } else {
    s3StatusCache.clear();
  }
}

/**
 * Hook to fetch and manage style status information
 * @param style - The style to fetch status for
 * @param options - Configuration options
 * @param options.enabled - Whether to automatically fetch status (default: false for performance)
 * @param options.skipS3 - Skip expensive S3 checks (default: false)
 */
export function useStyleStatus(style: Style | null, options: { enabled?: boolean; skipS3?: boolean } = {}) {
  const { enabled = false, skipS3 = false } = options;
  const [status, setStatus] = useState<StyleStatus>({
    captionsGenerated: 0,
    captionsTotal: 0,
    s3Synced: 0,
    s3Total: 0,
    loraModels: 0,
    validationPassed: false,
    validationRating: null,
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    if (!style) return;
    
    setLoading(true);
    try {
      // Fetch status data in parallel (skip S3 if requested for performance)
      const captionData = await fetchCaptionStatus(style.id);
      const s3Data = skipS3 ? { synced: 0, total: 0 } : await fetchS3Status(style.id);
      const trainingData = await fetchTrainingStatus(style.id);
      const validationData = await fetchValidationStatus(style.id);

      setStatus({
        captionsGenerated: captionData.generated,
        captionsTotal: captionData.total,
        s3Synced: s3Data.synced,
        s3Total: s3Data.total,
        loraModels: trainingData.models,
        validationPassed: validationData.passed,
        validationRating: validationData.rating,
      });
    } catch (error) {
      console.error('Failed to fetch style status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch automatically if enabled
    if (enabled) {
      fetchStatus();
    }
  }, [style?.id, enabled]);

  return { status, loading, refresh: fetchStatus };
}

async function fetchCaptionStatus(styleId: string): Promise<{ generated: number; total: number }> {
  try {
    const response = await fetch(`/api/styles/${styleId}/training-images-with-captions`);
    if (!response.ok) return { generated: 0, total: 0 };
    
    const data = await response.json();
    const images = data.images || [];
    const total = images.length;
    const generated = images.filter((img: any) => img.hasCaption).length;
    
    return { generated, total };
  } catch {
    return { generated: 0, total: 0 };
  }
}

async function fetchS3Status(styleId: string): Promise<{ synced: number; total: number }> {
  try {
    // Check cache first
    const cached = s3StatusCache.get(styleId);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    
    const response = await fetch(`/api/s3/check-status?styleId=${styleId}`);
    if (!response.ok) return { synced: 0, total: 0 };
    
    const data = await response.json();
    const files = data.files || [];
    const result = { synced: files.length, total: files.length };
    
    // Cache the result
    s3StatusCache.set(styleId, { data: result, timestamp: now });
    
    return result;
  } catch {
    return { synced: 0, total: 0 };
  }
}

async function fetchTrainingStatus(styleId: string): Promise<{ models: number }> {
  try {
    const response = await fetch(`/api/styles/${styleId}/training-versions`);
    if (!response.ok) return { models: 0 };
    
    const data = await response.json();
    const versions = data.versions || [];
    const completedModels = versions.filter((v: any) => v.status === 'completed').length;
    
    return { models: completedModels };
  } catch {
    return { models: 0 };
  }
}

async function fetchValidationStatus(styleId: string): Promise<{ passed: boolean; rating: number | null }> {
  try {
    // Check if there's a settings set with validation results
    const response = await fetch(`/api/settings-sets?styleId=${styleId}`);
    if (!response.ok) return { passed: false, rating: null };
    
    const data = await response.json();
    const sets = data.settingsSets || [];
    
    if (sets.length === 0) return { passed: false, rating: null };
    
    // Find the highest rated settings set
    const rated = sets.filter((s: any) => s.rating != null && s.rating !== '');
    if (rated.length === 0) return { passed: false, rating: null };
    
    const highestRating = Math.max(...rated.map((s: any) => parseFloat(s.rating) || 0));
    const passed = highestRating >= 4; // Consider 4+ stars as "passed"
    
    return { passed, rating: highestRating };
  } catch {
    return { passed: false, rating: null };
  }
}
