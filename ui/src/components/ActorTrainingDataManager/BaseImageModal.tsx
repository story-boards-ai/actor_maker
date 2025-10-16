import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Actor } from '../../types';

interface BaseImageModalProps {
  actor: Actor;
  baseImage: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBaseImageRegenerated?: () => void;
}

export function BaseImageModal({ actor, baseImage, open, onOpenChange, onBaseImageRegenerated }: BaseImageModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateNewBaseImage = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Build complete description from actor data including outfit
      let description = actor.description || 
        `${actor.ethnicity} ${actor.age} year old ${actor.sex}`;
      
      // Append outfit information if available
      if (actor.outfit) {
        description = `${description}, wearing ${actor.outfit}`;
      }

      console.log('[BASE-IMAGE-MODAL] Generating new base image for:', actor.name);
      console.log('[BASE-IMAGE-MODAL] Full description:', description);

      const response = await fetch('/api/generate-base-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: actor.name,
          description: description,
          width: 1024,
          height: 1536,
          steps: 25,
          seed: -1
        })
      });

      const result = await response.json();

      if (result.status === 'COMPLETED') {
        console.log('[BASE-IMAGE-MODAL] ✅ Base image generated successfully');
        console.log('[BASE-IMAGE-MODAL] Saved to:', result.localPath);
        
        // Notify parent to reload
        if (onBaseImageRegenerated) {
          onBaseImageRegenerated();
        }
        
        // Close modal after short delay to show success
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (err) {
      console.error('[BASE-IMAGE-MODAL] Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate base image');
    } finally {
      setIsGenerating(false);
    }
  };

  // If no base image, show create interface
  if (!baseImage) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ background: 'rgba(0,0,0,0.8)', position: 'fixed', inset: 0, zIndex: 1000 }} />
          <Dialog.Content style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', maxWidth: '600px', width: '90vw', zIndex: 1001 }}>
            <div style={{ padding: '48px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎨</div>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 600, color: '#1e293b' }}>Create Base Image</h2>
              <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '16px', lineHeight: 1.6 }}>
                Generate a professional full-body portrait for <strong>{actor.name}</strong>
                <br />
                {actor.age}y {actor.sex} {actor.ethnicity}
                {actor.description && (
                  <>
                    <br />
                    <br />
                    <span style={{ fontSize: '14px', fontStyle: 'italic' }}>{actor.description}</span>
                  </>
                )}
                {actor.outfit && (
                  <>
                    <br />
                    <br />
                    <strong style={{ fontSize: '14px' }}>Outfit:</strong>{' '}
                    <span style={{ fontSize: '14px', fontStyle: 'italic' }}>{actor.outfit}</span>
                  </>
                )}
              </p>
              
              <button
                onClick={handleGenerateNewBaseImage}
                disabled={isGenerating}
                style={{
                  padding: '16px 32px',
                  background: isGenerating ? 'rgba(59, 130, 246, 0.95)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.2s ease',
                  marginBottom: '16px'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '24px' }}>✨</span>
                    <span>Generate Base Image</span>
                  </>
                )}
              </button>

              {error && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px', 
                  background: '#fee2e2', 
                  border: '1px solid #ef4444', 
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '14px'
                }}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              <p style={{ margin: '24px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                This will create a 1024x1536 full-body portrait with professional studio lighting
              </p>
            </div>
            
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            
            <Dialog.Close asChild>
              <button style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // If base image exists, show normal view/regenerate interface
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ background: 'rgba(0,0,0,0.8)', position: 'fixed', inset: 0, zIndex: 1000 }} />
        <Dialog.Content style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', zIndex: 1001 }}>
          <div 
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowGenerateButton(true)}
            onMouseLeave={() => setShowGenerateButton(false)}
          >
            <img src={baseImage} alt={`${actor.name} base`} style={{ width: '100%', height: 'auto', display: 'block' }} />
            
            {/* Generate New Base Image Button */}
            {(showGenerateButton || isGenerating) && (
              <button
                onClick={handleGenerateNewBaseImage}
                disabled={isGenerating}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  padding: '16px 32px',
                  background: isGenerating ? 'rgba(59, 130, 246, 0.95)' : 'rgba(37, 99, 235, 0.95)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease',
                  opacity: isGenerating ? 1 : 0.95,
                  pointerEvents: isGenerating ? 'none' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.background = 'rgba(29, 78, 216, 0.95)';
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.95)';
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '20px' }}>🎨</span>
                    <span>Generate New Base Image</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div style={{ padding: '24px' }}>
            <Dialog.Title style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{actor.name}</Dialog.Title>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>Age:</strong> {actor.age} • <strong>Sex:</strong> {actor.sex} • <strong>Ethnicity:</strong> {actor.ethnicity}
            </p>
            {actor.description && <p style={{ margin: '8px 0', color: '#475569' }}><strong>Description:</strong> {actor.description}</p>}
            {actor.outfit && <p style={{ margin: '8px 0', color: '#475569' }}><strong>Outfit:</strong> {actor.outfit}</p>}
            {error && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: '#fee2e2', 
                border: '1px solid #ef4444', 
                borderRadius: '6px',
                color: '#991b1b'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
          
          {/* CSS Animation for spinner */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <Dialog.Close asChild>
            <button style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
