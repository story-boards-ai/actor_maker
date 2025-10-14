import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import './PromptEditor.css';

interface InputImage {
  filename: string;
  path: string;
  promptFile: string;
  hasPrompt: boolean;
}

interface ImageWithPrompt extends InputImage {
  prompt: string;
  isEditing: boolean;
  isSaving: boolean;
  isSelected: boolean;
  isGenerating: boolean;
}

// Default prompts
const DEFAULT_SYSTEM_PROMPT = `You are an expert image prompt generation assistant for training movie scene generation AI models.

CRITICAL RULES:
1. ALWAYS start with "a movie scene of"
2. Use ONLY concrete, factual descriptions of what IS visible
3. NEVER use uncertain language like "appears to be", "seems to", "looks like", "might be"
4. NEVER describe feelings, moods, or emotions
5. Describe the ENTIRE scene including foreground, middle ground, and background
6. Be absolutely specific and direct

Format: "a movie scene of [complete factual description of everything visible in the frame]"`;

const DEFAULT_USER_PROMPT = `Describe this image as a movie scene. Start with "a movie scene of" and then provide a complete, factual description of:

1. Main subject(s) - what they are, what they're doing, their position
2. Foreground elements - objects, people, details closest to camera
3. Middle ground - the main setting and environment
4. Background - what's behind the main subjects, distant elements, sky/walls/environment
5. Lighting - direction, intensity, color temperature (specific, not mood)
6. Colors - actual colors present, not impressions
7. Camera framing and composition - shot type, angle

Use only concrete, observable facts. No interpretations, feelings, or uncertain language.`;

export function PromptEditor() {
  const [images, setImages] = useState<ImageWithPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'with-prompt' | 'without-prompt'>('all');
  
  // GPT settings
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [userPrompt, setUserPrompt] = useState(DEFAULT_USER_PROMPT);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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
    loadImages();
  }, []);

  async function loadImages() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/input-images');
      if (!response.ok) {
        throw new Error('Failed to load input images');
      }

      const data = await response.json();
      
      // Load prompts for all images
      const imagesWithPrompts = await Promise.all(
        data.images.map(async (img: InputImage) => {
          let prompt = '';
          if (img.hasPrompt) {
            try {
              const promptResponse = await fetch(`/api/prompt/read/${img.promptFile}`);
              const promptData = await promptResponse.json();
              prompt = promptData.prompt || '';
            } catch (err) {
              console.error(`Failed to load prompt for ${img.filename}:`, err);
            }
          }
          
          return {
            ...img,
            prompt,
            isEditing: false,
            isSaving: false,
            isSelected: false,
            isGenerating: false
          };
        })
      );

      setImages(imagesWithPrompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  }


  function updatePrompt(index: number, newPrompt: string) {
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, prompt: newPrompt } : img
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

  async function generatePrompt(index: number) {
    const image = images[index];
    
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isGenerating: true } : img
    ));

    try {
      const response = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{ filename: image.filename, path: image.path }],
          systemPrompt,
          userPrompt,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Prompt generation API error:', errorData);
        const errorMsg = errorData.error || 'Failed to generate prompt';
        const details = errorData.details ? `\n\nDetails:\n${JSON.stringify(errorData.details, null, 2)}` : '';
        throw new Error(errorMsg + details);
      }

      const data = await response.json();
      
      if (!data.success || !data.results || data.results.length === 0) {
        throw new Error('Invalid response from prompt generation');
      }

      const result = data.results[0];
      
      if (!result.success) {
        console.error('❌ Prompt generation failed for', image.filename);
        console.error('   Error:', result.error);
        throw new Error(result.error || 'Failed to generate prompt');
      }

      console.log('✅ Prompt generated for', image.filename);
      console.log('   Prompt preview:', result.prompt.substring(0, 100) + '...');

      // Update prompt and auto-save
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, prompt: result.prompt, isGenerating: false } : img
      ));

      // Auto-save the generated prompt
      await savePrompt(index, result.prompt);
      
    } catch (err) {
      console.error('❌ Failed to generate prompt for', image.filename, ':', err);
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, isGenerating: false } : img
      ));
    }
  }

  async function generateSelectedPrompts() {
    const selectedImages = images.filter(img => img.isSelected);
    
    if (selectedImages.length === 0) {
      console.warn('⚠️ No images selected for prompt generation');
      return;
    }

    // Removed confirmation dialog - will show toast on completion

    await generateMultiplePrompts(selectedImages.map(img => images.indexOf(img)));
  }

  async function generateAllPrompts() {
    // Removed confirmation dialog - will show toast on completion
    toast.info(`Generating prompts for ${images.length} images...`);

    await generateMultiplePrompts(images.map((_, index) => index));
  }

  async function generateMissingPrompts() {
    const missingIndices = images
      .map((img, index) => ({ img, index }))
      .filter(({ img }) => !img.hasPrompt)
      .map(({ index }) => index);

    if (missingIndices.length === 0) {
      console.log('✅ All images already have prompts');
      return;
    }

    // Removed confirmation dialog - will show toast on completion
    toast.info(`Generating prompts for ${missingIndices.length} images...`);

    await generateMultiplePrompts(missingIndices);
  }

  function abortGeneration() {
    if (abortController) {
      console.log('🛑 Aborting prompt generation...');
      abortController.abort();
      setAbortController(null);
      setIsGeneratingBatch(false);
      setBatchProgress({ current: 0, total: 0 });
      setImages(prev => prev.map(img => ({ ...img, isGenerating: false })));
    }
  }

  async function generateMultiplePrompts(indices: number[]) {
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

          const batchPromise = fetch('/api/prompt/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: imagesToGenerate,
              systemPrompt,
              userPrompt,
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
                
                if (result.success && result.prompt) {
                  console.log(`  ✅ ${result.filename}`);
                  successCount++;
                  
                  // Update prompt in state
                  setImages(prev => prev.map((img, idx) => 
                    idx === imageIndex ? { ...img, prompt: result.prompt, isGenerating: false } : img
                  ));

                  // Save to file
                  try {
                    await savePrompt(imageIndex, result.prompt);
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
          toast.success(`Generated ${successCount} prompt${successCount !== 1 ? 's' : ''} successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        } else if (failCount > 0) {
          toast.error(`Failed to generate ${failCount} prompt${failCount !== 1 ? 's' : ''}`);
        }
      } else {
        toast.info('Prompt generation aborted');
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('🛑 Generation aborted');
        toast.info('Prompt generation aborted');
      } else {
        console.error('❌ Batch prompt generation error:', err);
        toast.error('Failed to generate prompts');
      }
    } finally {
      setIsGeneratingBatch(false);
      setAbortController(null);
      setBatchProgress({ current: 0, total: 0 });
      setImages(prev => prev.map(img => ({ ...img, isGenerating: false })));
    }
  }

  async function savePrompt(index: number, prompt?: string) {
    const image = images[index];
    const promptToSave = prompt !== undefined ? prompt : image.prompt;
    
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isSaving: true } : img
    ));

    try {
      const response = await fetch(`/api/prompt/save/${image.promptFile}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToSave })
      });

      if (!response.ok) {
        throw new Error('Failed to save prompt');
      }

      setImages(prev => prev.map((img, i) => 
        i === index ? { 
          ...img, 
          prompt: promptToSave, 
          hasPrompt: true, 
          isEditing: false, 
          isSaving: false 
        } : img
      ));
    } catch (err) {
      console.error('Failed to save prompt:', err);
      throw err;
    }
  }

  const filteredImages = images.filter(img => {
    if (filter === 'with-prompt') return img.hasPrompt;
    if (filter === 'without-prompt') return !img.hasPrompt;
    return true;
  });

  if (loading) {
    return (
      <div className="prompt-editor-loading">
        <div className="spinner"></div>
        <p>Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prompt-editor-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Images</h3>
        <p>{error}</p>
      </div>
    );
  }

  const selectedCount = images.filter(img => img.isSelected).length;
  const missingCount = images.filter(img => !img.hasPrompt).length;
  const currentModel = visionModels.find(m => m.id === selectedModel);

  return (
    <div className="prompt-editor-container">
      <div className="prompt-editor-header">
        <div>
          <h2>Prompt Editor</h2>
          <p className="prompt-editor-subtitle">
            {images.length} images • {images.filter(i => i.hasPrompt).length} with prompts • {missingCount} missing
            {selectedCount > 0 && ` • ${selectedCount} selected`} • Model: {currentModel?.name || 'GPT-4o'}
          </p>
        </div>
        
        <div className="prompt-editor-actions">
          {isGeneratingBatch ? (
            <button 
              className="prompt-button abort"
              onClick={abortGeneration}
              title="Stop generation"
            >
              🛑 Abort ({batchProgress.current}/{batchProgress.total})
            </button>
          ) : (
            <>
              <button 
                className="prompt-button gpt primary"
                onClick={generateMissingPrompts}
                disabled={missingCount === 0}
                title="Generate prompts for all images without prompts"
              >
                ✨ Generate Missing ({missingCount})
              </button>
              
              <button 
                className="prompt-button gpt"
                onClick={generateSelectedPrompts}
                disabled={selectedCount === 0}
                title="Generate prompts for selected images"
              >
                Generate Selected ({selectedCount})
              </button>
              
              <button 
                className="prompt-button settings"
                onClick={() => setShowSettings(!showSettings)}
                title="Configure model and prompts"
              >
                ⚙️ Settings
              </button>
            </>
          )}
        </div>
      </div>

      {isGeneratingBatch && batchProgress.total > 0 && (
        <div className="prompt-progress-bar">
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
        <div className="prompt-settings-panel">
          <div className="settings-header">
            <h3>GPT Configuration</h3>
            <button
              className="prompt-button small"
              onClick={() => {
                setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
                setUserPrompt(DEFAULT_USER_PROMPT);
                setSelectedModel('gpt-4o');
              }}
            >
              Reset to Defaults
            </button>
          </div>
          
          <div className="settings-field">
            <label htmlFor="model-select">
              Vision Model
              <span className="field-hint">Choose the GPT model for prompt generation</span>
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
            <label htmlFor="system-prompt">
              System Prompt
              <span className="field-hint">Defines GPT's role and general instructions</span>
            </label>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              placeholder="System prompt..."
            />
          </div>
          
          <div className="settings-field">
            <label htmlFor="user-prompt">
              User Prompt
              <span className="field-hint">Specific instructions for each image analysis</span>
            </label>
            <textarea
              id="user-prompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={4}
              placeholder="User prompt..."
            />
          </div>
          
          <div className="settings-info">
            <p>💡 <strong>Tips for Quality Prompts:</strong></p>
            <ul>
              <li><strong>Always start with:</strong> "a movie scene of..."</li>
              <li><strong>Be concrete:</strong> Describe what IS there, not what "appears" or "seems"</li>
              <li><strong>Cover everything:</strong> Foreground, middle ground, AND background</li>
              <li><strong>No emotions:</strong> Only visual facts, no moods or feelings</li>
              <li><strong>Specific details:</strong> Actual colors, lighting directions, exact positions</li>
              <li>Images are automatically resized to 768px to reduce costs (~$0.01-0.02 per image)</li>
            </ul>
          </div>
        </div>
      )}

      <div className="prompt-editor-toolbar">
        <div className="prompt-editor-filters">
          <button 
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({images.length})
          </button>
          <button 
            className={`filter-button ${filter === 'with-prompt' ? 'active' : ''}`}
            onClick={() => setFilter('with-prompt')}
          >
            With Prompt ({images.filter(i => i.hasPrompt).length})
          </button>
          <button 
            className={`filter-button ${filter === 'without-prompt' ? 'active' : ''}`}
            onClick={() => setFilter('without-prompt')}
          >
            Without Prompt ({images.filter(i => !i.hasPrompt).length})
          </button>
        </div>
        
        <div className="selection-actions">
          <button 
            className="prompt-button small"
            onClick={selectAll}
            disabled={images.length === 0}
          >
            Select All
          </button>
          <button 
            className="prompt-button small"
            onClick={deselectAll}
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="prompt-editor-grid">
        {filteredImages.map((image, index) => {
          const originalIndex = images.indexOf(image);
          
          return (
            <div key={image.filename} className={`prompt-item ${image.isSelected ? 'selected' : ''} ${image.isGenerating ? 'generating' : ''}`}>
              <div className="prompt-item-checkbox">
                <input
                  type="checkbox"
                  checked={image.isSelected}
                  onChange={() => toggleSelection(originalIndex)}
                  disabled={image.isGenerating}
                  title="Select for batch generation"
                />
              </div>
              
              <div className="prompt-item-image">
                <img src={image.path} alt={image.filename} loading="lazy" />
                {!image.hasPrompt && !image.isGenerating && (
                  <div className="prompt-status-badge no-prompt">
                    No Prompt
                  </div>
                )}
                {image.isGenerating && (
                  <div className="prompt-status-badge generating">
                    <div className="spinner-small"></div>
                    Generating...
                  </div>
                )}
              </div>
              
              <div className="prompt-item-content">
                <div className="prompt-item-header">
                  <span className="prompt-filename">{image.filename}</span>
                  <span className="prompt-file-info">{image.promptFile}</span>
                </div>

                {image.isEditing ? (
                  <div className="prompt-edit-area">
                    <textarea
                      value={image.prompt}
                      onChange={(e) => updatePrompt(originalIndex, e.target.value)}
                      placeholder="Enter prompt for this image..."
                      rows={4}
                      disabled={image.isSaving || image.isGenerating}
                    />
                    <div className="prompt-edit-actions">
                      <button 
                        className="prompt-button save"
                        onClick={() => savePrompt(originalIndex)}
                        disabled={image.isSaving || image.isGenerating}
                      >
                        {image.isSaving ? 'Saving...' : '💾 Save'}
                      </button>
                      <button 
                        className="prompt-button cancel"
                        onClick={() => toggleEdit(originalIndex)}
                        disabled={image.isSaving || image.isGenerating}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prompt-display">
                    {image.prompt ? (
                      <p className="prompt-text">{image.prompt}</p>
                    ) : (
                      <p className="prompt-placeholder">No prompt yet</p>
                    )}
                    <div className="prompt-button-group">
                      <button 
                        className="prompt-button edit"
                        onClick={() => toggleEdit(originalIndex)}
                        disabled={image.isGenerating}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="prompt-button gpt small"
                        onClick={() => generatePrompt(originalIndex)}
                        disabled={image.isGenerating || isGeneratingBatch}
                        title="Generate prompt with GPT"
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
        <div className="prompt-editor-empty">
          <div className="empty-icon">📝</div>
          <h3>No Images Found</h3>
          <p>No images match the selected filter.</p>
        </div>
      )}
    </div>
  );
}
