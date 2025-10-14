import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { StyleSelectorModal } from './StyleSelectorModal';
import type { Style } from '../types';
import './CaptionEditor.css';

interface InputImage {
  filename: string;
  path: string;
  captionFile: string;
  hasCaption: boolean;
}

interface ImageWithCaption extends InputImage {
  caption: string;
  isEditing: boolean;
  isSaving: boolean;
  isSelected: boolean;
  isGenerating: boolean;
}

// Default prompts based on Flux LoRA training best practices (see docs/CAPTION_GUIDE.md)
const DEFAULT_SYSTEM_PROMPT = `You are an expert at creating training captions for Flux LoRA style models.

CRITICAL RULES FOR STYLE LORA TRAINING:

1. NEVER describe the style itself (e.g. "oil painting", "vibrant colors", "soft brush strokes")
   - The style is encoded implicitly through the trigger token
   - Style descriptors interfere with proper LoRA learning

2. ONLY describe scene content that varies between images:
   - Subject(s) and what they're doing
   - Objects, props, and their positions
   - Background elements (landscape, architecture, weather)
   - Lighting conditions (direction, intensity, time of day)
   - Camera framing and composition
   - Pose, gaze, expression (for characters)

3. Caption elements you want to prompt IN or OUT later:
   - If you want flexibility to add/remove "smiling" → caption it
   - If you want to vary "forest" vs "city" → caption the setting
   - If something should be fixed to the style → DON'T caption it

4. Keep captions moderate length (8-20 words) + trigger token

5. Always end the caption with " [TRIGGER]" (will be replaced with SBai_style_ID automatically)

6. Vary your descriptions across images to prevent overfitting

FORMAT: [scene description with variable elements], [TRIGGER]

NOTE: [TRIGGER] is automatically replaced with the style's trigger token (e.g., SBai_style_16)`;

const DEFAULT_USER_PROMPT = `Analyze this image and create a training caption following these rules:

DESCRIBE (things that vary or you want prompt control over):
- Main subject(s): what they are, doing, position, pose
- Objects and props: what's present, where they are
- Setting: location type, environment, background elements
- Lighting: direction, intensity, natural/artificial, time of day
- Weather/atmosphere: if visible (fog, rain, clear sky, etc.)
- Camera: framing, angle, composition type
- Character details: gaze direction, expression, pose (if applicable)

DO NOT DESCRIBE (style elements):
- Artistic medium (painting, illustration, photograph)
- Color palette or color mood (vibrant, muted, pastel)
- Brush strokes, textures, or artistic techniques
- Aesthetic qualities (beautiful, dramatic, moody)
- Style-related adjectives unless they're scene facts

EXAMPLES:

Good: "a woman sitting on a park bench reading a book, autumn trees in background, soft afternoon light, [TRIGGER]"

Bad: "a beautifully painted woman in vibrant autumn colors with soft brush strokes, [TRIGGER]"

Good: "a foggy mountain valley with pine trees, winding river in foreground, overcast sky, [TRIGGER]"

Bad: "a moody atmospheric landscape painting with misty mountains in muted tones, [TRIGGER]"

Good: "portrait of a girl on a swing under cherry blossom trees, smiling, backlit by golden hour sun, [TRIGGER]"

Bad: "a dreamy pastel portrait of a girl with soft lighting and romantic mood, [TRIGGER]"

IMPORTANT: Always end your caption with ", [TRIGGER]" - this will be automatically replaced with the style's trigger token (e.g., SBai_style_16).

Now create a caption for this image. Output ONLY the caption text, nothing else.`;

export function CaptionEditor() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [images, setImages] = useState<ImageWithCaption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'with-caption' | 'without-caption'>('all');
  
  // GPT settings
  const [showSettings, setShowSettings] = useState(false);
  const [systemCaption, setSystemCaption] = useState(DEFAULT_SYSTEM_PROMPT);
  const [userCaption, setUserCaption] = useState(DEFAULT_USER_PROMPT);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showStyleSelector, setShowStyleSelector] = useState(false);

  // Available vision models
  const visionModels = [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Best quality, higher cost', cost: 'High' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Balanced cost and quality', cost: 'Medium' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Large context window', cost: 'High' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Large context, lower cost', cost: 'Medium' },
    { id: 'gpt-5', name: 'GPT-5', description: 'Next-gen (if available)', cost: 'Very High' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Next-gen balanced', cost: 'High' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest next-gen', cost: 'Medium' },
  ];

  useEffect(() => {
    loadStyles();
  }, []);

  useEffect(() => {
    if (selectedStyle) {
      loadImages(selectedStyle.id);
    } else {
      setImages([]);
    }
  }, [selectedStyle]);

  async function loadStyles() {
    try {
      const response = await fetch('/api/styles');
      if (!response.ok) {
        throw new Error('Failed to load styles');
      }
      const data = await response.json();
      setStyles(data.styles || []);
    } catch (err) {
      console.error('Failed to load styles:', err);
      toast.error('Failed to load styles');
    }
  }

  async function loadImages(styleId: string) {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/styles/${styleId}/training-images-with-captions`);
      if (!response.ok) {
        throw new Error('Failed to load training images');
      }

      const data = await response.json();
      
      // Load captions for all images
      const imagesWithCaptions = await Promise.all(
        data.images.map(async (img: InputImage) => {
          let caption = '';
          if (img.hasCaption) {
            try {
              const captionResponse = await fetch(`/api/styles/${styleId}/caption/read/${img.captionFile}`);
              const captionData = await captionResponse.json();
              caption = captionData.caption || '';
            } catch (err) {
              console.error(`Failed to load caption for ${img.filename}:`, err);
            }
          }
          
          return {
            ...img,
            caption,
            isEditing: false,
            isSaving: false,
            isSelected: false,
            isGenerating: false
          };
        })
      );

      setImages(imagesWithCaptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  }


  function updateCaption(index: number, newCaption: string) {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, caption: newCaption } : img
    ));
  }

  function toggleEdit(index: number) {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isEditing: !img.isEditing } : img
    ));
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
  }

  async function generateCaption(index: number) {
    if (!selectedStyle) return;
    const image = images[index];
    
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isGenerating: true } : img
    ));

    try {
      const response = await fetch(`/api/styles/${selectedStyle.id}/caption/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{ filename: image.filename, path: image.path }],
          systemPrompt: systemCaption,
          userPrompt: userCaption,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Caption generation API error:', errorData);
        const errorMsg = errorData.error || 'Failed to generate caption';
        const details = errorData.details ? `\n\nDetails:\n${JSON.stringify(errorData.details, null, 2)}` : '';
        throw new Error(errorMsg + details);
      }

      const data = await response.json();
      
      if (!data.success || !data.results || data.results.length === 0) {
        throw new Error('Invalid response from caption generation');
      }

      const result = data.results[0];
      
      if (!result.success) {
        console.error('❌ Caption generation failed for', image.filename);
        console.error('   Error:', result.error);
        throw new Error(result.error || 'Failed to generate caption');
      }

      console.log('✅ Caption generated for', image.filename);
      console.log('   Caption preview:', result.caption.substring(0, 100) + '...');

      // Update caption and auto-save
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, caption: result.caption, isGenerating: false } : img
      ));

      // Auto-save the generated caption
      await saveCaption(index, result.caption);
      
    } catch (err) {
      console.error('❌ Failed to generate caption for', image.filename, ':', err);
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, isGenerating: false } : img
      ));
    }
  }

  async function generateSelectedCaptions() {
    const selectedImages = images.filter(img => img.isSelected);
    
    if (selectedImages.length === 0) {
      console.warn('⚠️ No images selected for caption generation');
      return;
    }

    // Removed confirmation dialog - will show toast on completion

    await generateMultipleCaptions(selectedImages.map(img => images.indexOf(img)));
  }

  async function generateAllCaptions() {
    // Removed confirmation dialog - will show toast on completion
    toast.info(`Generating prompts for ${images.length} images...`);

    await generateMultipleCaptions(images.map((_, index) => index));
  }

  async function generateMissingCaptions() {
    const missingIndices = images
      .map((img, index) => ({ img, index }))
      .filter(({ img }) => !img.hasCaption)
      .map(({ index }) => index);

    if (missingIndices.length === 0) {
      console.log('✅ All images already have prompts');
      return;
    }

    // Removed confirmation dialog - will show toast on completion
    toast.info(`Generating prompts for ${missingIndices.length} images...`);

    await generateMultipleCaptions(missingIndices);
  }

  function abortGeneration() {
    if (abortController) {
      console.log('🛑 Aborting caption generation...');
      abortController.abort();
      setAbortController(null);
      setIsGeneratingBatch(false);
      setBatchProgress({ current: 0, total: 0 });
      setImages(prev => prev.map(img => ({ ...img, isGenerating: false })));
    }
  }

  async function generateMultipleCaptions(indices: number[]) {
    if (!selectedStyle) return;
    setIsGeneratingBatch(true);
    const controller = new AbortController();
    setAbortController(controller);
    
    const CHUNK_SIZE = 5; // Process 5 images at a time
    const PARALLEL_LIMIT = 3; // Process 3 images in parallel per chunk
    
    // Mark all selected images as generating
    setImages(prev => prev.map((img, i) => 
      indices.includes(i) ? { ...img, isGenerating: true } : img
    ));

    try {
      const totalImages = indices.length;
      let processedCount = 0;
      let successCount = 0;
      let failCount = 0;
      
      setBatchProgress({ current: 0, total: totalImages });
      console.log(`🚀 Starting batch generation: ${totalImages} images in chunks of ${CHUNK_SIZE}`);

      // Process in chunks
      for (let chunkStart = 0; chunkStart < indices.length; chunkStart += CHUNK_SIZE) {
        // Check if aborted
        if (controller.signal.aborted) {
          console.log('🛑 Generation aborted by user');
          break;
        }

        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, indices.length);
        const chunkIndices = indices.slice(chunkStart, chunkEnd);
        const chunkNum = Math.floor(chunkStart / CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(indices.length / CHUNK_SIZE);
        
        console.log(`📦 Processing chunk ${chunkNum}/${totalChunks} (${chunkIndices.length} images)...`);

        // Process chunk with parallel limit
        const chunkPromises = [];
        for (let i = 0; i < chunkIndices.length; i += PARALLEL_LIMIT) {
          const parallelBatch = chunkIndices.slice(i, Math.min(i + PARALLEL_LIMIT, chunkIndices.length));
          const imagesToGenerate = parallelBatch.map(idx => ({
            filename: images[idx].filename,
            path: images[idx].path
          }));

          const batchPromise = fetch(`/api/styles/${selectedStyle.id}/caption/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: imagesToGenerate,
              systemPrompt: systemCaption,
              userPrompt: userCaption,
              model: selectedModel
            }),
            signal: controller.signal
          })
            .then(async response => {
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate prompts');
              }
              return response.json();
            })
            .then(async data => {
              // Process results
              for (let j = 0; j < data.results.length; j++) {
                const result = data.results[j];
                const imageIndex = parallelBatch[j];
                
                if (result.success && result.caption) {
                  console.log(`  ✅ ${result.filename}`);
                  successCount++;
                  
                  // Update caption in state
                  setImages(prev => prev.map((img, idx) => 
                    idx === imageIndex ? { ...img, caption: result.caption, isGenerating: false } : img
                  ));

                  // Save to file
                  try {
                    await saveCaption(imageIndex, result.caption);
                  } catch (err) {
                    console.error(`  ⚠️ ${result.filename}: saved to state but file save failed`);
                  }
                } else {
                  console.error(`  ❌ ${result.filename}: ${result.error}`);
                  failCount++;
                  setImages(prev => prev.map((img, idx) => 
                    idx === imageIndex ? { ...img, isGenerating: false } : img
                  ));
                }
                
                processedCount++;
                setBatchProgress({ current: processedCount, total: totalImages });
              }
            });

          chunkPromises.push(batchPromise);
        }

        // Wait for all parallel batches in this chunk to complete
        await Promise.allSettled(chunkPromises);
        
        console.log(`✅ Chunk ${chunkNum}/${totalChunks} complete (Progress: ${processedCount}/${totalImages})`);
      }

      if (!controller.signal.aborted) {
        console.log(`🎉 Batch complete: ${successCount} succeeded, ${failCount} failed (${totalImages} total)`);
        if (successCount > 0) {
          toast.success(`Generated ${successCount} caption${successCount !== 1 ? 's' : ''} successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        } else if (failCount > 0) {
          toast.error(`Failed to generate ${failCount} caption${failCount !== 1 ? 's' : ''}`);
        }
      } else {
        toast.info('Caption generation aborted');
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('🛑 Generation aborted');
        toast.info('Caption generation aborted');
      } else {
        console.error('❌ Batch caption generation error:', err);
        toast.error('Failed to generate prompts');
      }
    } finally {
      setIsGeneratingBatch(false);
      setAbortController(null);
      setBatchProgress({ current: 0, total: 0 });
      setImages(prev => prev.map(img => ({ ...img, isGenerating: false })));
    }
  }

  async function saveCaption(index: number, caption?: string) {
    if (!selectedStyle) return;
    const image = images[index];
    const promptToSave = caption !== undefined ? caption : image.caption;
    
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isSaving: true } : img
    ));

    try {
      const response = await fetch(`/api/styles/${selectedStyle.id}/caption/save/${image.captionFile}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: promptToSave })
      });

      if (!response.ok) {
        throw new Error('Failed to save caption');
      }

      setImages(prev => prev.map((img, i) => 
        i === index ? { 
          ...img, 
          caption: promptToSave, 
          hasCaption: true, 
          isEditing: false, 
          isSaving: false 
        } : img
      ));
    } catch (err) {
      console.error('Failed to save caption:', err);
      throw err;
    }
  }

  const filteredImages = images.filter(img => {
    if (filter === 'with-caption') return img.hasCaption;
    if (filter === 'without-caption') return !img.hasCaption;
    return true;
  });

  if (loading) {
    return (
      <div className="caption-editor-loading">
        <div className="spinner"></div>
        <p>Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="caption-editor-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Images</h3>
        <p>{error}</p>
      </div>
    );
  }

  const selectedCount = images.filter(img => img.isSelected).length;
  const missingCount = images.filter(img => !img.hasCaption).length;
  const currentModel = visionModels.find(m => m.id === selectedModel);

  return (
    <div className="caption-editor-container">
      <div className="caption-editor-header">
        <div>
          <h2>Caption Editor</h2>
          <p className="caption-editor-subtitle">
            {selectedStyle ? (
              <>
                <strong>{selectedStyle.title}</strong> • {images.length} images • {images.filter(i => i.hasCaption).length} with captions • {missingCount} missing
                {selectedCount > 0 && ` • ${selectedCount} selected`} • Model: {currentModel?.name || 'GPT-4o'}
              </>
            ) : (
              'Select a style to view and edit training data captions'
            )}
          </p>
        </div>
        
        <div className="caption-editor-actions">
          {isGeneratingBatch ? (
            <button 
              className="caption-button abort"
              onClick={abortGeneration}
              title="Stop generation"
            >
              🛑 Abort ({batchProgress.current}/{batchProgress.total})
            </button>
          ) : (
            <>
              <button 
                className="caption-button primary"
                onClick={() => setShowStyleSelector(true)}
                title="Select a style to load training images"
              >
                🎨 Select Style
              </button>
              
              <button 
                className="caption-button gpt primary"
                onClick={generateMissingCaptions}
                disabled={missingCount === 0 || !selectedStyle}
                title="Generate captions for all images without captions"
              >
                ✨ Generate Missing ({missingCount})
              </button>
              
              <button 
                className="caption-button gpt"
                onClick={generateSelectedCaptions}
                disabled={selectedCount === 0 || !selectedStyle}
                title="Generate captions for selected images"
              >
                Generate Selected ({selectedCount})
              </button>
              
              <button 
                className="caption-button settings"
                onClick={() => setShowSettings(!showSettings)}
                title="Configure model and captions"
              >
                ⚙️ Settings
              </button>
            </>
          )}
        </div>
      </div>

      {isGeneratingBatch && batchProgress.total > 0 && (
        <div className="caption-progress-bar">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
          <div className="progress-bar-text">
            Generating prompts: {batchProgress.current} / {batchProgress.total} 
            ({Math.round((batchProgress.current / batchProgress.total) * 100)}%)
          </div>
        </div>
      )}

      {showSettings && (
        <div className="caption-settings-panel">
          <div className="settings-header">
            <h3>GPT Configuration</h3>
            <button
              className="caption-button small"
              onClick={() => {
                setSystemCaption(DEFAULT_SYSTEM_PROMPT);
                setUserCaption(DEFAULT_USER_PROMPT);
                setSelectedModel('gpt-4o');
              }}
            >
              Reset to Defaults
            </button>
          </div>
          
          <div className="settings-field">
            <label htmlFor="model-select">
              Vision Model
              <span className="field-hint">Choose the GPT model for caption generation</span>
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-select"
            >
              {visionModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description} (Cost: {model.cost})
                </option>
              ))}
            </select>
          </div>
          
          <div className="settings-field">
            <label htmlFor="system-caption">
              System Caption
              <span className="field-hint">Defines GPT's role and general instructions</span>
            </label>
            <textarea
              id="system-caption"
              value={systemCaption}
              onChange={(e) => setSystemCaption(e.target.value)}
              rows={6}
              placeholder="System caption..."
            />
          </div>
          
          <div className="settings-field">
            <label htmlFor="user-caption">
              User Caption
              <span className="field-hint">Specific instructions for each image analysis</span>
            </label>
            <textarea
              id="user-caption"
              value={userCaption}
              onChange={(e) => setUserCaption(e.target.value)}
              rows={4}
              placeholder="User caption..."
            />
          </div>
          
          <div className="settings-info">
            <p>💡 <strong>Best Practices for Flux LoRA Training Captions:</strong></p>
            <ul>
              <li><strong>DON'T describe style:</strong> Never mention "oil painting", "vibrant colors", "brush strokes" - the style is learned implicitly</li>
              <li><strong>DO describe scene content:</strong> Subject, setting, objects, lighting, weather, camera angle</li>
              <li><strong>Caption what varies:</strong> Only describe elements you want prompt control over later</li>
              <li><strong>Keep it moderate:</strong> 8-20 words describing the scene + trigger token</li>
              <li><strong>Trigger token:</strong> Use [TRIGGER] in prompts - it's automatically replaced with SBai_style_ID (e.g., SBai_style_16)</li>
              <li><strong>Vary descriptions:</strong> Different captions prevent overfitting and improve flexibility</li>
              <li>Images are automatically resized to 768px to reduce costs (~$0.01-0.02 per image)</li>
            </ul>
            <p className="settings-note">
              📖 See <code>docs/CAPTION_GUIDE.md</code> for comprehensive guidelines and examples
            </p>
          </div>
        </div>
      )}

      <div className="caption-editor-toolbar">
        <div className="caption-editor-filters">
          <button 
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({images.length})
          </button>
          <button 
            className={`filter-button ${filter === 'with-caption' ? 'active' : ''}`}
            onClick={() => setFilter('with-caption')}
          >
            With Caption ({images.filter(i => i.hasCaption).length})
          </button>
          <button 
            className={`filter-button ${filter === 'without-caption' ? 'active' : ''}`}
            onClick={() => setFilter('without-caption')}
          >
            Without Caption ({images.filter(i => !i.hasCaption).length})
          </button>
        </div>
        
        <div className="selection-actions">
          <button 
            className="caption-button small"
            onClick={selectAll}
            disabled={images.length === 0}
          >
            Select All
          </button>
          <button 
            className="caption-button small"
            onClick={deselectAll}
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="caption-editor-grid">
        {filteredImages.map((image, index) => {
          const originalIndex = images.indexOf(image);
          
          return (
            <div key={image.filename} className={`caption-item ${image.isSelected ? 'selected' : ''} ${image.isGenerating ? 'generating' : ''}`}>
              <div className="caption-item-checkbox">
                <input
                  type="checkbox"
                  checked={image.isSelected}
                  onChange={() => toggleSelection(originalIndex)}
                  disabled={image.isGenerating}
                  title="Select for batch generation"
                />
              </div>
              
              <div className="caption-item-image">
                <img src={image.path} alt={image.filename} loading="lazy" />
                {!image.hasCaption && !image.isGenerating && (
                  <div className="caption-status-badge no-caption">
                    No Caption
                  </div>
                )}
                {image.isGenerating && (
                  <div className="caption-status-badge generating">
                    <div className="spinner-small"></div>
                    Generating...
                  </div>
                )}
              </div>
              
              <div className="caption-item-content">
                <div className="caption-item-header">
                  <span className="caption-filename">{image.filename}</span>
                  <span className="caption-file-info">{image.captionFile}</span>
                </div>

                {image.isEditing ? (
                  <div className="caption-edit-area">
                    <textarea
                      value={image.caption}
                      onChange={(e) => updateCaption(originalIndex, e.target.value)}
                      placeholder="Enter caption for this image..."
                      rows={4}
                      disabled={image.isSaving || image.isGenerating}
                    />
                    <div className="caption-edit-actions">
                      <button 
                        className="caption-button save"
                        onClick={() => saveCaption(originalIndex)}
                        disabled={image.isSaving || image.isGenerating}
                      >
                        {image.isSaving ? 'Saving...' : '💾 Save'}
                      </button>
                      <button 
                        className="caption-button cancel"
                        onClick={() => toggleEdit(originalIndex)}
                        disabled={image.isSaving || image.isGenerating}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="caption-display">
                    {image.caption ? (
                      <p className="caption-text">{image.caption}</p>
                    ) : (
                      <p className="caption-placeholder">No caption yet</p>
                    )}
                    <div className="caption-button-group">
                      <button 
                        className="caption-button edit"
                        onClick={() => toggleEdit(originalIndex)}
                        disabled={image.isGenerating}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="caption-button gpt small"
                        onClick={() => generateCaption(originalIndex)}
                        disabled={image.isGenerating || isGeneratingBatch}
                        title="Generate caption with GPT"
                      >
                        {image.isGenerating ? '⏳ Generating...' : '✨ Generate'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredImages.length === 0 && (
        <div className="caption-editor-empty">
          <div className="empty-icon">📝</div>
          <h3>No Images Found</h3>
          <p>No images match the selected filter.</p>
        </div>
      )}

      <StyleSelectorModal
        styles={styles}
        selectedStyle={selectedStyle?.id || ''}
        onSelect={(styleId) => {
          const style = styles.find(s => s.id === styleId);
          setSelectedStyle(style || null);
        }}
        open={showStyleSelector}
        onOpenChange={setShowStyleSelector}
      />
    </div>
  );
}
