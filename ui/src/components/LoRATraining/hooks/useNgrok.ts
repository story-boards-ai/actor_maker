import { useState } from 'react';
import { toast } from 'sonner';

export function useNgrok() {
  const [ngrokUrl, setNgrokUrl] = useState('');
  const [isNgrokRunning, setIsNgrokRunning] = useState(false);
  const [ngrokPort, setNgrokPort] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function checkNgrokStatus() {
    try {
      const response = await fetch('/api/ngrok/status');
      if (response.ok) {
        const data = await response.json();
        setIsNgrokRunning(data.running);
        setNgrokUrl(data.url || '');
        setNgrokPort(data.port);
      }
    } catch (err) {
      console.error('Failed to check ngrok status:', err);
    }
  }

  async function startNgrok() {
    try {
      setLoading(true);
      const response = await fetch('/api/ngrok/start', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start ngrok');
      
      const data = await response.json();
      setNgrokUrl(data.url);
      setNgrokPort(data.port);
      setIsNgrokRunning(true);
      toast.success(`Ngrok tunnel started on port ${data.port}!`);
    } catch (err: any) {
      toast.error(`Failed to start ngrok: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function stopNgrok() {
    try {
      setLoading(true);
      const response = await fetch('/api/ngrok/stop', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop ngrok');
      
      setNgrokUrl('');
      setNgrokPort(undefined);
      setIsNgrokRunning(false);
      toast.success('Ngrok tunnel stopped');
    } catch (err: any) {
      toast.error(`Failed to stop ngrok: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return {
    ngrokUrl,
    isNgrokRunning,
    ngrokPort,
    loading,
    checkNgrokStatus,
    startNgrok,
    stopNgrok,
  };
}
