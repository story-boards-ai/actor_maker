import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface TrainingImage {
  index: number;
  filename: string;
  s3_url: string;
  local_exists: boolean;
  local_path: string | null;
  status: 's3_only' | 'local_only' | 'synced' | 'mismatch';
}

interface TrainingPrompt {
  id: string;
  category: string;
  label: string;
  prompt: string;
}

interface TrainingImageModalProps {
  image: TrainingImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: number;
  actorName: string;
  baseImagePath: string | null;
  onImageGenerated?: () => void;
}

export function TrainingImageModal({ image, open, onOpenChange, actorId, actorName, baseImagePath, onImageGenerated }: TrainingImageModalProps) {
  const [prompts, setPrompts] = useState<TrainingPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [promptUsage, setPromptUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open && !image) {
      // Load prompts when modal opens in generator mode
      loadPrompts();
      setShowGenerator(true);
    } else {
      setShowGenerator(false);
    }
  }, [open, image]);

  async function loadPrompts() {
    try {
      const response = await fetch(`/api/actors/${actorId}/training-prompts`);
      if (!response.ok) throw new Error('Failed to load prompts');
      const data = await response.json();
      setPrompts(data.prompts || []);
      if (data.prompts?.length > 0) {
        setSelectedPromptId(data.prompts[0].id);
      }
      
      // Load prompt usage
      const usageResponse = await fetch(`/api/actors/${actorId}/prompt-usage`);
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setPromptUsage(usageData.prompt_usage || {});
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  }

  async function generateTrainingImage() {
    if (!selectedPromptId || !baseImagePath) return;

    const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
    if (!selectedPrompt) return;

    try {
      setGenerating(true);
      setGenerationMessage('Generating training image with Replicate...');

      const response = await fetch(`/api/actors/${actorId}/training-data/generate-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actorId,
          actor_name: actorName,
          base_image_path: baseImagePath,
          prompt: selectedPrompt.prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      
      setGenerationMessage(`✅ Generated: ${result.filename}`);
      
      // Notify parent to reload
      if (onImageGenerated) {
        setTimeout(() => {
          onImageGenerated();
          onOpenChange(false);
        }, 1500);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationMessage(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  }

  if (!image && !showGenerator) return null;

  const statusColors = {
    synced: '#10b981',
    s3_only: '#3b82f6',
    local_only: '#f59e0b',
    mismatch: '#ef4444'
  };

  const statusLabels = {
    synced: 'Fully Synced',
    s3_only: 'S3 Only',
    local_only: 'Local Only',
    mismatch: 'Hash Mismatch'
  };

  // Render generator mode
  if (showGenerator && !image) {
    const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ background: 'rgba(0,0,0,0.8)', position: 'fixed', inset: 0, zIndex: 1000 }} />
          <Dialog.Content style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', maxWidth: '600px', width: '90vw', maxHeight: '90vh', overflow: 'auto', zIndex: 1001 }}>
            <div style={{ padding: '32px' }}>
              <Dialog.Title style={{ margin: 0, fontSize: '24px', color: '#1e293b', marginBottom: '24px' }}>Generate Training Image</Dialog.Title>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Select Prompt</label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '14px', cursor: 'pointer', color: '#1e293b' }}
                >
                  {prompts.map((prompt) => {
                    const usageCount = promptUsage[prompt.prompt] || 0;
                    const usageIndicator = usageCount > 0 ? ` [${usageCount}x used]` : ' [unused]';
                    return (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.label} ({prompt.category}){usageIndicator}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPrompt && (
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Preview</div>
                    {(() => {
                      const usageCount = promptUsage[selectedPrompt.prompt] || 0;
                      return usageCount > 0 ? (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', background: '#dbeafe', padding: '4px 8px', borderRadius: '4px' }}>
                          Used {usageCount}x
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', background: '#d1fae5', padding: '4px 8px', borderRadius: '4px' }}>
                          Unused
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{selectedPrompt.prompt}</div>
                </div>
              )}

              {generationMessage && (
                <div style={{ marginBottom: '24px', padding: '12px', background: generationMessage.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${generationMessage.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, fontSize: '14px', color: generationMessage.startsWith('✅') ? '#166534' : '#991b1b' }}>
                  {generationMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={generating}
                  style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={generateTrainingImage}
                  disabled={generating || !selectedPromptId || !baseImagePath}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: (generating || !selectedPromptId || !baseImagePath) ? 'not-allowed' : 'pointer', opacity: (generating || !selectedPromptId || !baseImagePath) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {generating && <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>}
                  {generating ? 'Generating...' : '✨ Generate Image'}
                </button>
              </div>
            </div>
            <Dialog.Close asChild>
              <button style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', color: '#475569', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </Dialog.Close>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Render image viewer mode
  if (!image) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ background: 'rgba(0,0,0,0.8)', position: 'fixed', inset: 0, zIndex: 1000 }} />
        <Dialog.Content style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', zIndex: 1001 }}>
          <img 
            src={image.local_exists ? image.local_path! : image.s3_url} 
            alt={image.filename}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onError={(e) => {
              if (image.local_exists && e.currentTarget.src !== image.s3_url) {
                e.currentTarget.src = image.s3_url;
              }
            }}
          />
          <div style={{ padding: '24px' }}>
            <Dialog.Title style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{image.filename}</Dialog.Title>
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px' }}>
              <div>
                <strong>Index:</strong> #{image.index}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ color: statusColors[image.status], fontWeight: 600 }}>
                  {statusLabels[image.status]}
                </span>
              </div>
              {image.local_exists && (
                <div>
                  <strong>Source:</strong> Local
                </div>
              )}
              {!image.local_exists && (
                <div>
                  <strong>Source:</strong> S3
                </div>
              )}
            </div>
          </div>
          <Dialog.Close asChild>
            <button style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
