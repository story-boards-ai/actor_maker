import { useState, useEffect } from 'react';
import type { Actor } from '../../types';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Separator from '@radix-ui/react-separator';
import * as Progress from '@radix-ui/react-progress';
import { BaseImageModal } from './BaseImageModal';
import { BaseImageThumbnail } from './BaseImageThumbnail';
import { TrainingImageModal } from './TrainingImageModal';
import { useImageCache } from '../../hooks/useImageCache';
import { prefetchManager } from '../../utils/prefetchManager';
import { CachedImage } from '../CachedImage';

interface ActorTrainingDataManagerProps {
  actor: Actor;
  onClose: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

interface TrainingImage {
  index: number;
  filename: string;
  s3_url: string;
  size_mb: number;
  modified_date: string | null;
  good: boolean;
}

interface SyncStatus {
  syncing: boolean;
  progress: { current: number; total: number };
  message: string;
}

export function ActorTrainingDataManager({ 
  actor, 
  onClose, 
  onNavigatePrevious, 
  onNavigateNext, 
  hasPrevious = false, 
  hasNext = false 
}: ActorTrainingDataManagerProps) {
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([]);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBaseImageModal, setShowBaseImageModal] = useState(false);
  const [selectedTrainingImage, setSelectedTrainingImage] = useState<TrainingImage | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [gridSize, setGridSize] = useState(200); // 200px default
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    progress: { current: 0, total: 0 },
    message: ''
  });
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Image cache hook
  const { invalidateImage } = useImageCache();

  useEffect(() => {
    loadTrainingData();
  }, [actor.id]);

  // Trigger high-priority prefetch when actor training data loads
  useEffect(() => {
    if (trainingImages.length > 0) {
      const imagesToPrefetch = trainingImages.map(img => ({
        s3_url: img.s3_url,
        filename: img.filename
      }));

      // Add base image if exists
      if (baseImage) {
        imagesToPrefetch.unshift({
          s3_url: baseImage,
          filename: `${actor.name}_base.jpg`
        });
      }

      // Trigger high-priority prefetch for this actor
      prefetchManager.prefetchActor(String(actor.id), imagesToPrefetch);
    }
  }, [trainingImages, baseImage, actor.id, actor.name]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showBaseImageModal) {
        setShowBaseImageModal(false);
      }
    };

    if (showBaseImageModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showBaseImageModal]);

  // Keyboard navigation with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't trigger if a modal is open
      if (showBaseImageModal || selectedTrainingImage || showGenerateModal || showDeleteAllConfirm) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, onNavigatePrevious, onNavigateNext, showBaseImageModal, selectedTrainingImage, showGenerateModal, showDeleteAllConfirm]);

  async function loadTrainingData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch training data info from backend
      const response = await fetch(`/api/actors/${actor.id}/training-data`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load training data');
      }
      
      const data = await response.json();
      
      // Set base image (S3 URL from manifest)
      setBaseImage(data.base_image_url || null);
      
      // Set training images from new API structure
      setTrainingImages(data.training_images || []);
    } catch (err) {
      console.error('Error loading training data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  }

  // S3-only architecture: No sync functions needed
  // All images are stored in S3, manifest is the source of truth

  async function deleteAllTrainingData() {
    try {
      setSyncStatus({
        syncing: true,
        progress: { current: 0, total: trainingImages.length },
        message: 'Deleting all training data...'
      });

      const response = await fetch(`/api/actors/${actor.id}/training-data/delete-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_name: actor.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const result = await response.json();
      
      setSyncStatus({
        syncing: false,
        progress: { current: result.deleted || 0, total: trainingImages.length },
        message: `✅ Deleted ${result.deleted || 0} training images`
      });

      // Reload to show empty state
      await loadTrainingData();
      setShowDeleteAllConfirm(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, message: '' }));
      }, 3000);

    } catch (err) {
      console.error('Delete all failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  async function generateAllPromptImages() {
    try {
      setSyncStatus({
        syncing: true,
        progress: { current: 0, total: 25 },
        message: 'Generating one image for each prompt...'
      });

      const response = await fetch(`/api/actors/${actor.id}/training-data/generate-all-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actor.id,
          actor_name: actor.name,
          base_image_url: baseImage,
          actor_type: 'person',
          actor_sex: actor.sex
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      
      setSyncStatus({
        syncing: false,
        progress: { current: result.successful || 0, total: result.total || 8 },
        message: `✅ Generated ${result.successful || 0} images (${result.failed || 0} failed)`
      });

      // Reload to show new images
      await loadTrainingData();
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, message: '' }));
      }, 3000);

    } catch (err) {
      console.error('Generation failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  async function deleteTrainingImage(image: TrainingImage) {
    try {
      const response = await fetch(`/api/actors/${actor.id}/training-data/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actor.id,
          actor_name: actor.name,
          filename: image.filename,
          s3_url: image.s3_url
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      await response.json();
      
      // Invalidate cache for deleted image
      await invalidateImage(image.s3_url);
      
      // Reset sync status without showing a message
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: ''
      });

      // Reload to update list
      await loadTrainingData();

    } catch (err) {
      console.error('Delete failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{actor.name} - Training Data</h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>Loading...</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(102, 126, 234, 0.3)', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <p style={{ color: '#64748b' }}>Loading training data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{actor.name} - Training Data</h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>Error loading data</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Error Loading Training Data</h3>
          <p style={{ margin: 0, color: '#64748b' }}>{error}</p>
          <button style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => loadTrainingData()}>Retry</button>
        </div>
      </div>
    );
  }

  const s3Count = trainingImages.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ padding: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Navigation Chevrons */}
          {(hasPrevious || hasNext) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onNavigatePrevious}
                disabled={!hasPrevious}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasPrevious ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '20px',
                  cursor: hasPrevious ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: hasPrevious ? 1 : 0.4
                }}
                title="Previous Actor"
                onMouseEnter={(e) => hasPrevious && (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => hasPrevious && (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              >
                ‹
              </button>
              <button
                onClick={onNavigateNext}
                disabled={!hasNext}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasNext ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '20px',
                  cursor: hasNext ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: hasNext ? 1 : 0.4
                }}
                title="Next Actor"
                onMouseEnter={(e) => hasNext && (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => hasNext && (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              >
                ›
              </button>
            </div>
          )}
          
          <BaseImageThumbnail 
            baseImage={baseImage}
            actorName={actor.name}
            onClick={() => setShowBaseImageModal(true)}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{actor.name} - Training Data</h2>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              {!baseImage && <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚠️ No base image • </span>}
              {s3Count} images in S3 • {actor.age}y {actor.sex} {actor.ethnicity}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {syncStatus.syncing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              <span>{syncStatus.message}</span>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setShowGenerateModal(true)}
                disabled={!baseImage}
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: !baseImage ? 'not-allowed' : 'pointer', opacity: !baseImage ? 0.5 : 1 }}
              >
                ✨ Generate Single Image
              </button>

              <button 
                onClick={generateAllPromptImages}
                disabled={!baseImage}
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: !baseImage ? 'not-allowed' : 'pointer', opacity: !baseImage ? 0.5 : 1 }}
              >
                🎨 Generate All Prompts (25)
              </button>

              <button 
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={trainingImages.length === 0}
                style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: trainingImages.length === 0 ? 'not-allowed' : 'pointer', opacity: trainingImages.length === 0 ? 0.5 : 1 }}
              >
                🗑️ Delete All
              </button>

              <Separator.Root decorative orientation="vertical" style={{ width: '1px', background: 'rgba(255,255,255,0.3)', height: '32px' }} />

              {/* Grid Size Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>Grid:</span>
                <button
                  onClick={() => setGridSize(Math.max(120, gridSize - 20))}
                  style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Decrease grid size"
                >
                  −
                </button>
                <span style={{ fontSize: '14px', minWidth: '50px', textAlign: 'center' }}>{gridSize}px</span>
                <button
                  onClick={() => setGridSize(Math.min(400, gridSize + 20))}
                  style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Increase grid size"
                >
                  +
                </button>
              </div>

              <button
                onClick={onClose}
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {syncStatus.syncing && syncStatus.progress.total > 0 && (
        <div style={{ padding: '16px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Progress.Root value={(syncStatus.progress.current / syncStatus.progress.total) * 100} style={{ position: 'relative', overflow: 'hidden', background: '#e2e8f0', borderRadius: '4px', width: '100%', height: '8px' }}>
            <Progress.Indicator style={{ background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', width: '100%', height: '100%', transition: 'transform 0.3s ease', transform: `translateX(-${100 - (syncStatus.progress.current / syncStatus.progress.total) * 100}%)` }} />
          </Progress.Root>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
            {syncStatus.message}: {syncStatus.progress.current} / {syncStatus.progress.total}
          </p>
        </div>
      )}

      {/* Status Message */}
      {syncStatus.message && !syncStatus.syncing && (
        <div style={{ padding: '16px 32px', background: '#f0f9ff', borderLeft: '4px solid #3b82f6', margin: 0, fontSize: '14px' }}>
          {syncStatus.message}
        </div>
      )}

      {/* Main Content with ScrollArea */}
      <ScrollArea.Root style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollArea.Viewport style={{ width: '100%', height: '100%' }}>
          <div style={{ padding: '32px' }}>
            {/* No Base Image Warning */}
            {!baseImage && (
              <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)', border: '2px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                  <div style={{ fontSize: '64px', lineHeight: 1 }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 600, color: '#78350f' }}>No Base Image Found</h3>
                    <p style={{ margin: '0 0 20px 0', color: '#78350f', fontSize: '16px', lineHeight: 1.6 }}>
                      This actor doesn't have a base image yet. A base image is required to generate training data for LoRA training.
                      <br />
                      <strong>Actor:</strong> {actor.age}y {actor.sex} {actor.ethnicity}
                      {actor.description && <><br /><strong>Description:</strong> {actor.description}</>}
                    </p>
                    <button
                      onClick={() => setShowBaseImageModal(true)}
                      style={{
                        padding: '14px 28px',
                        background: '#78350f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#451a03';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#78350f';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>🎨</span>
                      <span>Create Base Image Now</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {trainingImages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>📸</div>
                <h3 style={{ margin: 0, color: '#1e293b' }}>No Training Images</h3>
                <p style={{ margin: 0, color: '#64748b' }}>
                  {baseImage ? 'Generate training images from the base image to get started' : 'Create a base image first, then generate training images'}
                </p>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#1e293b' }}>Training Images ({trainingImages.length})</h3>
                
                {/* FLEXBOX GRID - NO CSS GRID */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  {trainingImages.map((img) => {
                    // S3-only: all images are in S3, blue border
                    const borderColor = '#3b82f6';
                    
                    return (
                      <div key={img.index} style={{ width: `${gridSize}px`, background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `2px solid ${borderColor}`, transition: 'transform 0.2s ease', position: 'relative' }}>
                        <div 
                          onClick={() => setSelectedTrainingImage(img)}
                          style={{ position: 'relative', width: `${gridSize}px`, height: `${gridSize}px`, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Click to view full size"
                        >
                          <CachedImage
                            s3_url={img.s3_url}
                            alt={img.filename}
                            loading="lazy"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                          
                          {/* S3 Badge */}
                          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
                            <div style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.9)', color: 'white', fontSize: '12px', borderRadius: '4px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="S3 Storage">
                              ☁️
                            </div>
                          </div>
                          
                          {/* Delete Button - Direct delete, no confirmation */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent modal from opening
                              deleteTrainingImage(img);
                            }}
                            style={{ position: 'absolute', bottom: '8px', right: '8px', width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '6px', background: '#ef4444', color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
                            title="Delete from local and S3"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        {/* Info */}
                        <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={img.filename}>{img.filename}</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginLeft: '8px' }}>#{img.index}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" style={{ display: 'flex', userSelect: 'none', touchAction: 'none', padding: '2px', background: '#f1f5f9', width: '10px' }}>
          <ScrollArea.Thumb style={{ flex: 1, background: '#cbd5e1', borderRadius: '10px', position: 'relative' }} />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Base Image Modal */}
      <BaseImageModal
        actor={actor}
        baseImage={baseImage}
        open={showBaseImageModal}
        onOpenChange={setShowBaseImageModal}
        onBaseImageRegenerated={loadTrainingData}
      />

      {/* Training Image Modal - View Mode */}
      <TrainingImageModal
        image={selectedTrainingImage}
        open={selectedTrainingImage !== null}
        onOpenChange={(open) => !open && setSelectedTrainingImage(null)}
        actorId={actor.id}
        actorName={actor.name}
        baseImagePath={baseImage}
        onImageGenerated={loadTrainingData}
      />

      {/* Training Image Modal - Generator Mode */}
      <TrainingImageModal
        image={null}
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        actorId={actor.id}
        actorName={actor.name}
        baseImagePath={baseImage}
        onImageGenerated={loadTrainingData}
      />

      {/* Delete All Confirmation Dialog */}
      {showDeleteAllConfirm && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000 
          }}
          onClick={() => setShowDeleteAllConfirm(false)}
        >
          <div 
            style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '32px', 
              maxWidth: '500px', 
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600, color: '#1e293b', textAlign: 'center' }}>
              Delete All Training Data?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
              This will permanently delete all <strong>{trainingImages.length} training images</strong> from both local storage and S3. 
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                style={{ 
                  padding: '12px 24px', 
                  background: '#f1f5f9', 
                  color: '#475569', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 500, 
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteAllTrainingData}
                style={{ 
                  padding: '12px 24px', 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 500, 
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
