import * as Dialog from '@radix-ui/react-dialog';
import type { Actor } from '../../types';

interface BaseImageModalProps {
  actor: Actor;
  baseImage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BaseImageModal({ actor, baseImage, open, onOpenChange }: BaseImageModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ background: 'rgba(0,0,0,0.8)', position: 'fixed', inset: 0, zIndex: 1000 }} />
        <Dialog.Content style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', zIndex: 1001 }}>
          <img src={baseImage} alt={`${actor.name} base`} style={{ width: '100%', height: 'auto', display: 'block' }} />
          <div style={{ padding: '24px' }}>
            <Dialog.Title style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{actor.name}</Dialog.Title>
            <p style={{ margin: '8px 0', color: '#475569' }}>
              <strong>Age:</strong> {actor.age} • <strong>Sex:</strong> {actor.sex} • <strong>Ethnicity:</strong> {actor.ethnicity}
            </p>
            {actor.description && <p style={{ margin: '8px 0', color: '#475569' }}><strong>Description:</strong> {actor.description}</p>}
          </div>
          <Dialog.Close asChild>
            <button style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
