import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import type { Style } from '../types';
import { clearS3StatusCache } from './hooks/useStyleStatus';
import './TrainingDataS3Manager.css';

interface TrainingDataS3ManagerProps {
  style: Style;
  onClose: () => void;
}

interface TrainingImage {
  filename: string;
  localPath: string;
  s3Key: string;
  isInS3: boolean;
  isSelected: boolean;
  size?: number;
  hasCaption?: boolean;
  captionFile?: string;
  captionInS3?: boolean;
}

interface SelectionSet {
  id: number;
  filenames: string[];
}

export function TrainingDataS3Manager({ style, onClose }: TrainingDataS3ManagerProps) {
  const [images, setImages] = useState<TrainingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [selectionSets, setSelectionSets] = useState<SelectionSet[]>([]);
  const [currentSetId, setCurrentSetId] = useState<number | null>(null);
  const [hideUnselected, setHideUnselected] = useState(false);
  const [showSetMenu, setShowSetMenu] = useState(false);
  const [syncDeletes, setSyncDeletes] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const setMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadData();
    loadSelectionSets();
  }, [style.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (setMenuRef.current && !setMenuRef.current.contains(event.target as Node)) {
        setShowSetMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load local training images with caption status
      const response = await fetch(`/api/styles/${style.id}/training-images-with-captions`);
      
      // Handle 404 gracefully - it just means no training images exist yet
      if (response.status === 404) {
        console.log('No training images found for style', style.id);
        setImages([]);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load training images: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      // Load S3 status for each image with metadata
      const s3StatusResponse = await fetch(`/api/s3/check-status?styleId=${style.id}`);
      const s3Data = s3StatusResponse.ok ? await s3StatusResponse.json() : { files: [], fileMap: {} };
      const s3Files = new Set(s3Data.files || []);
      const s3FileMap = s3Data.fileMap || {};

      console.log('S3 files:', s3Files);
      console.log('S3 file map with ETags:', s3FileMap);

      // Map images with S3 status and caption status (with hash comparison)
      const mappedImages: TrainingImage[] = (data.images || []).map((img: any, index: number) => {
        const captionFilename = img.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.txt');
        
        // Check if image hash matches S3
        const imageInS3 = s3Files.has(img.filename);
        const s3ImageInfo = s3FileMap[img.filename];
        const imageHashMatches = imageInS3 && s3ImageInfo && s3ImageInfo.etag === img.md5;
        
        // Check if caption exists and hash matches S3
        const captionInS3 = s3Files.has(captionFilename);
        const s3CaptionInfo = s3FileMap[captionFilename];
        const captionHashMatches = captionInS3 && img.captionMd5 && s3CaptionInfo && s3CaptionInfo.etag === img.captionMd5;
        
        // Debug logging for first few files
        if (index < 3) {
          console.log(`[S3 Status] ${img.filename}:`, {
            imageInS3,
            localMd5: img.md5,
            s3Etag: s3ImageInfo?.etag,
            imageHashMatches,
            captionInS3,
            localCaptionMd5: img.captionMd5,
            s3CaptionEtag: s3CaptionInfo?.etag,
            captionHashMatches
          });
        }
        
        return {
          filename: img.filename,
          localPath: img.path,
          s3Key: `styles/${style.id}/${img.filename}`,
          isInS3: imageInS3 && imageHashMatches, // Only true if hash matches
          isSelected: false,
          size: img.size,
          hasCaption: img.hasCaption || false,
          captionFile: img.captionFile,
          captionInS3: captionInS3 && (img.hasCaption ? captionHashMatches : true), // Only true if hash matches
        };
      });

      setImages(mappedImages);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(index: number) {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isSelected: !img.isSelected } : img
    ));
  }

  function selectAll() {
    setImages(prev => prev.map(img => ({ ...img, isSelected: true })));
  }

  function deselectAll() {
    setImages(prev => prev.map(img => ({ ...img, isSelected: false })));
    setCurrentSetId(null);
  }

  async function loadSelectionSets() {
    try {
      const response = await fetch(`/api/styles/${style.id}/selection-sets`);
      if (response.ok) {
        const data = await response.json();
        setSelectionSets(data.sets || []);
      }
    } catch (err) {
      console.error('Failed to load selection sets:', err);
    }
  }

  async function saveCurrentSelection() {
    const selectedFilenames = images.filter(img => img.isSelected).map(img => img.filename);
    if (selectedFilenames.length === 0) {
      toast.warning('No images selected to save');
      return;
    }

    try {
      // Find next available set number
      const existingIds = selectionSets.map(s => s.id);
      const nextId = existingIds.length === 0 ? 1 : Math.max(...existingIds) + 1;

      const response = await fetch(`/api/styles/${style.id}/selection-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextId,
          filenames: selectedFilenames
        })
      });

      if (!response.ok) throw new Error('Failed to save selection set');

      await loadSelectionSets();
      setCurrentSetId(nextId);
      toast.success(`Saved as Set ${nextId} (${selectedFilenames.length} images)`);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save selection set');
    }
  }

  async function updateCurrentSet() {
    if (currentSetId === null) {
      toast.warning('No set selected to update');
      return;
    }

    const selectedFilenames = images.filter(img => img.isSelected).map(img => img.filename);
    if (selectedFilenames.length === 0) {
      toast.warning('No images selected');
      return;
    }

    try {
      const response = await fetch(`/api/styles/${style.id}/selection-sets/${currentSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: selectedFilenames })
      });

      if (!response.ok) throw new Error('Failed to update selection set');

      await loadSelectionSets();
      toast.success(`Updated Set ${currentSetId} (${selectedFilenames.length} images)`);
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update selection set');
    }
  }

  function loadSet(setId: number) {
    const set = selectionSets.find(s => s.id === setId);
    if (!set) return;

    const filenameSet = new Set(set.filenames);
    setImages(prev => prev.map(img => ({
      ...img,
      isSelected: filenameSet.has(img.filename)
    })));
    setCurrentSetId(setId);
    setShowSetMenu(false);
    toast.success(`Loaded Set ${setId} (${set.filenames.length} images)`);
  }

  async function deleteSet(setId: number) {
    // Show confirmation toast with action buttons
    toast.warning(`Delete Set ${setId}?`, {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const response = await fetch(`/api/styles/${style.id}/selection-sets/${setId}`, {
              method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete selection set');

            await loadSelectionSets();
            if (currentSetId === setId) {
              setCurrentSetId(null);
            }
            toast.success(`Deleted Set ${setId}`);
          } catch (err) {
            console.error('Delete error:', err);
            toast.error('Failed to delete selection set');
          }
        }
      }
    });
  }

  function selectNotInS3() {
    setImages(prev => prev.map(img => ({ ...img, isSelected: !img.isInS3 })));
  }

  function selectMissingCaptions() {
    setImages(prev => prev.map(img => ({ 
      ...img, 
      isSelected: !!(img.hasCaption && !img.captionInS3)
    })));
  }

  async function syncToS3() {
    // Get selected images
    const selected = images.filter(img => img.isSelected);
    if (selected.length === 0) {
      toast.warning('No images selected');
      return;
    }

    try {
      setSyncing(true);
      setComparing(true);
      
      // Build list of all files to sync (images + captions)
      const filesToCheck: Array<{filename: string, localPath: string, isCaption?: boolean}> = [];
      
      for (const img of selected) {
        // Add image file
        filesToCheck.push({
          filename: img.filename,
          localPath: img.localPath
        });
        
        // Add caption file if it exists locally
        if (img.hasCaption && img.captionFile) {
          const captionPath = img.localPath.replace(/\.[^.]+$/, '.txt');
          filesToCheck.push({
            filename: img.captionFile,
            localPath: captionPath,
            isCaption: true
          });
        }
      }
      
      // Compare all files (images + captions) with S3
      const compareResponse = await fetch('/api/s3/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: style.id,
          localImages: filesToCheck
        })
      });
      
      if (!compareResponse.ok) throw new Error('Failed to compare with S3');
      
      const compareResult = await compareResponse.json();
      setComparing(false);
      
      // Files that need uploading: missing in S3 or different
      const filesToUpload = [
        ...compareResult.missing_in_s3,
        ...compareResult.different
      ];
      
      if (filesToUpload.length === 0) {
        const checkedCount = filesToCheck.length;
        const msg = checkedCount === selected.length 
          ? `All ${selected.length} selected images are already synced`
          : `All selected files (${checkedCount} total) are already synced`;
        toast.success(msg);
        return;
      }
      
      // Count images vs captions
      const imageFiles = filesToUpload.filter(f => !f.filename.endsWith('.txt'));
      const captionFiles = filesToUpload.filter(f => f.filename.endsWith('.txt'));
      
      const msg = [];
      if (imageFiles.length > 0) msg.push(`${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''}`);
      if (captionFiles.length > 0) msg.push(`${captionFiles.length} caption${captionFiles.length !== 1 ? 's' : ''}`);
      
      toast.info(`Uploading ${msg.join(' and ')} to S3...`);
      
      // Upload files that are missing or different
      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: style.id,
          images: filesToUpload.map(file => ({
            filename: file.filename,
            localPath: file.localPath
          })),
          syncDeletes: syncDeletes
        })
      });

      if (!response.ok) throw new Error('Failed to upload to S3');
      
      const result = await response.json();
      console.log('Upload result:', result);
      
      // Clear S3 status cache for this style
      clearS3StatusCache(style.id);
      
      // Refresh data
      await loadData();
      
      const uploadedImages = result.uploaded_files?.filter((f: any) => !f.filename.endsWith('.txt')).length || 0;
      const uploadedCaptions = result.uploaded_files?.filter((f: any) => f.filename.endsWith('.txt')).length || 0;
      
      const successMsg = [];
      if (uploadedImages > 0) successMsg.push(`${uploadedImages} image${uploadedImages !== 1 ? 's' : ''}`);
      if (uploadedCaptions > 0) successMsg.push(`${uploadedCaptions} caption${uploadedCaptions !== 1 ? 's' : ''}`);
      
      toast.success(`Successfully uploaded ${successMsg.join(' and ')} to S3`);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sync to S3');
    } finally {
      setSyncing(false);
      setComparing(false);
    }
  }

  async function removeFromS3() {
    const selected = images.filter(img => img.isSelected && img.isInS3);
    if (selected.length === 0) {
      toast.warning('No S3 images selected');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: style.id,
          filenames: selected.map(img => img.filename)
        })
      });

      if (!response.ok) throw new Error('Failed to remove from S3');
      
      const result = await response.json();
      console.log('Delete result:', result);
      
      // Clear S3 status cache for this style
      clearS3StatusCache(style.id);
      
      // Refresh data
      await loadData();
      toast.success(`Successfully removed ${result.deleted} image${result.deleted !== 1 ? 's' : ''} from S3`);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to remove from S3');
    } finally {
      setSyncing(false);
    }
  }

  async function syncFromS3() {
    try {
      setDownloading(true);
      setComparing(true);
      
      // First, compare to see what needs downloading
      const compareResponse = await fetch('/api/s3/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: style.id,
          localImages: images.map(img => ({
            filename: img.filename,
            localPath: img.localPath
          }))
        })
      });
      
      if (!compareResponse.ok) throw new Error('Failed to compare with S3');
      
      const compareResult = await compareResponse.json();
      setComparing(false);
      
      // Files that need downloading: missing locally or different
      const filesToDownload = [
        ...compareResult.missing_locally,
        ...compareResult.different
      ];
      
      if (filesToDownload.length === 0) {
        toast.success('All files are already synced from S3!');
        return;
      }
      
      toast.info(`Syncing ${filesToDownload.length} file${filesToDownload.length !== 1 ? 's' : ''} from S3...`);
      const response = await fetch('/api/s3/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: style.id,
          syncDeletes: syncDeletes
        })
      });

      if (!response.ok) throw new Error('Failed to download from S3');
      
      const result = await response.json();
      console.log('Download result:', result);
      
      // Clear S3 status cache for this style
      clearS3StatusCache(style.id);
      
      // Refresh data
      await loadData();
      toast.success(`Successfully synced ${result.downloaded} image${result.downloaded !== 1 ? 's' : ''} from S3`);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sync from S3');
    } finally {
      setDownloading(false);
      setComparing(false);
    }
  }

  function handleMouseEnter(filename: string) {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredImage(filename);
    }, 2500);
  }

  function handleMouseLeave() {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredImage(null);
  }

  if (loading) {
    return (
      <div className="s3-manager">
        <div className="s3-header">
          <h2>{style.title} - Training Data (S3)</h2>
        </div>
        <div className="s3-loading">
          <div className="spinner"></div>
          <p>Loading training data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="s3-manager">
        <div className="s3-header">
          <h2>{style.title} - Training Data (S3)</h2>
        </div>
        <div className="s3-error">
          <div className="error-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="s3-button" onClick={() => loadData()}>Retry</button>
        </div>
      </div>
    );
  }

  const selectedCount = images.filter(img => img.isSelected).length;
  const inS3Count = images.filter(img => img.isInS3).length;
  const notInS3Count = images.length - inS3Count;
  const captionsInS3Count = images.filter(img => img.captionInS3).length;
  const captionsNotInS3Count = images.filter(img => img.hasCaption && !img.captionInS3).length;
  const visibleImages = hideUnselected ? images.filter(img => img.isSelected) : images;

  return (
    <div className="s3-manager">
      <div className="s3-header">
        <div>
          <h2>{style.title} - Training Data (S3)</h2>
          <p className="s3-subtitle">
            {images.length} images • {inS3Count} in S3 • {notInS3Count} local only<br/>
            {captionsInS3Count} captions in S3
            {captionsNotInS3Count > 0 && ` • ⚠️ ${captionsNotInS3Count} captions not synced`}
            {selectedCount > 0 && ` • ${selectedCount} selected`}
          </p>
        </div>

        <div className="s3-actions">
          <button 
            className="s3-button"
            onClick={() => loadData()}
            disabled={loading}
            title="Refresh S3 status"
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          
          <button 
            className="s3-button primary"
            onClick={syncToS3}
            disabled={syncing || comparing}
            title="Sync local files to S3 (uploads new/changed files)"
          >
            {comparing ? '🔍 Comparing...' : syncing ? '⏳ Syncing...' : '☁️ Sync to S3'}
          </button>
          
          <button 
            className="s3-button"
            onClick={syncFromS3}
            disabled={downloading || comparing}
            title="Sync files from S3 to local (downloads new/changed files)"
          >
            {comparing ? '🔍 Comparing...' : downloading ? '⏳ Syncing...' : '⬇️ Sync from S3'}
          </button>

          <button 
            className="s3-button danger"
            onClick={removeFromS3}
            disabled={syncing || selectedCount === 0}
            title="Remove selected images from S3 (keeps local copies)"
          >
            🗑️ Remove from S3
          </button>

          <button
            className="s3-button"
            onClick={onClose}
            title="Close and return to style library"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="s3-toolbar">
        <div className="selection-actions">
          <button 
            className="s3-button small"
            onClick={selectAll}
            disabled={images.length === 0}
          >
            Select All
          </button>
          <button 
            className="s3-button small"
            onClick={selectNotInS3}
            disabled={notInS3Count === 0}
          >
            Select Not in S3 ({notInS3Count})
          </button>
          <button 
            className="s3-button small"
            onClick={selectMissingCaptions}
            disabled={captionsNotInS3Count === 0}
            title="Select images with captions that need to be synced to S3"
          >
            Select Missing Captions ({captionsNotInS3Count})
          </button>
          <button 
            className="s3-button small"
            onClick={deselectAll}
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
          <div className="sync-delete-option">
            <label>
              <input
                type="checkbox"
                checked={syncDeletes}
                onChange={(e) => setSyncDeletes(e.target.checked)}
                title="When enabled, files deleted in source will also be deleted in target during sync"
              />
              <span>Sync Deletes</span>
            </label>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="set-manager" ref={setMenuRef}>
            <button 
              className="s3-button small set-toggle"
              onClick={() => setShowSetMenu(!showSetMenu)}
              title="Manage selection sets"
            >
              📁 Sets {currentSetId !== null && `(${currentSetId})`}
            </button>
            
            {showSetMenu && (
              <div className="set-menu">
                <div className="set-menu-header">
                  <span>Selection Sets</span>
                </div>
                
                <div className="set-menu-actions">
                  <button 
                    className="set-menu-button"
                    onClick={saveCurrentSelection}
                    disabled={selectedCount === 0}
                    title="Save current selection as new set"
                  >
                    💾 Save New
                  </button>
                  <button 
                    className="set-menu-button"
                    onClick={updateCurrentSet}
                    disabled={currentSetId === null || selectedCount === 0}
                    title="Update current set with current selection"
                  >
                    ✏️ Update
                  </button>
                </div>

                <div className="set-list">
                  {selectionSets.length === 0 ? (
                    <div className="set-empty">No sets saved</div>
                  ) : (
                    selectionSets.map(set => (
                      <div 
                        key={set.id} 
                        className={`set-item ${currentSetId === set.id ? 'active' : ''}`}
                      >
                        <button
                          className="set-load-button"
                          onClick={() => loadSet(set.id)}
                          title={`Load Set ${set.id}`}
                        >
                          <span className="set-number">{set.id}</span>
                          <span className="set-count">{set.filenames.length} images</span>
                        </button>
                        <button
                          className="set-delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSet(set.id);
                          }}
                          title="Delete set"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            className={`s3-button small ${hideUnselected ? 'active' : ''}`}
            onClick={() => setHideUnselected(!hideUnselected)}
            disabled={selectedCount === 0}
            title="Show only selected images"
          >
            {hideUnselected ? '👁️ Show All' : '👁️ Hide Unselected'}
          </button>

          <div className="column-control">
            <label htmlFor="columns">Columns:</label>
            <input
              id="columns"
              type="range"
              min="2"
              max="8"
              value={columns}
              onChange={(e) => setColumns(Number(e.target.value))}
            />
            <span>{columns}</span>
          </div>
        </div>
      </div>

      <div className="s3-grid-container">
        <div 
          className="s3-grid" 
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {visibleImages.map((img) => {
            const index = images.findIndex(i => i.filename === img.filename);
            return (
            <div
              key={img.filename}
              className={`s3-item ${img.isSelected ? 'selected' : ''}`}
              onMouseEnter={() => handleMouseEnter(img.filename)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="s3-item-checkbox">
                <input
                  type="checkbox"
                  checked={img.isSelected}
                  onChange={() => toggleSelection(index)}
                />
              </div>

              <div 
                className="s3-item-image"
                onClick={() => toggleSelection(index)}
                style={{ cursor: 'pointer' }}
              >
                <img src={img.localPath} alt={img.filename} loading="lazy" />
                <div className={`s3-status-dot ${img.isInS3 ? 'synced' : 'not-synced'}`} 
                     title={img.isInS3 ? 'Image synced to S3' : 'Image not in S3'}>
                </div>
                {img.hasCaption && (
                  <div 
                    className={`s3-caption-indicator ${img.captionInS3 ? 'synced' : 'not-synced'}`}
                    title={img.captionInS3 ? 'Caption synced to S3' : img.hasCaption ? 'Caption exists locally but not synced to S3' : 'No caption file'}
                  >
                    📝
                  </div>
                )}
                
                {hoveredImage === img.filename && (
                  <div className="s3-preview">
                    <img src={img.localPath} alt={img.filename} />
                  </div>
                )}
              </div>
              <div className="s3-item-info">
                <span className="s3-filename">{img.filename}</span>
                {img.size && (
                  <span className="s3-filesize">{(img.size / 1024).toFixed(1)} KB</span>
                )}
              </div>
            </div>
          )})}
        </div>

        {images.length === 0 && (
          <div className="s3-empty">
            <div className="empty-icon">📦</div>
            <h3>No Training Images</h3>
            <p>Generate training images first using the "Generate" button on the style card.</p>
          </div>
        )}
      </div>
    </div>
  );
}
