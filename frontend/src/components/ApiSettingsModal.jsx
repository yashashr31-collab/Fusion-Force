import { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Radio, ExternalLink } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export default function ApiSettingsModal({ isOpen, onClose }) {
  const { 
    isLiveBackend, 
    engineMode, 
    apiBaseUrl, 
    updateApiBaseUrl, 
    loading 
  } = useSecurity();

  const [inputUrl, setInputUrl] = useState(apiBaseUrl);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setTestStatus('testing');
    setErrorMessage('');

    const targetUrl = (inputUrl || '').trim().replace(/\/+$/, '');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${targetUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'online') {
          setTestStatus('success');
          await updateApiBaseUrl(targetUrl);
          setTimeout(() => {
            onClose();
          }, 800);
          return;
        }
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      setTestStatus('failed');
      setErrorMessage(
        err.name === 'AbortError' 
          ? 'Connection timed out (4s). Ensure the server is online and reachable over HTTPS.'
          : (err.message || 'Failed to reach /health endpoint.')
      );
    }
  };

  const handleUseStandalone = async () => {
    await updateApiBaseUrl('');
    setInputUrl('http://127.0.0.1:8000');
    setTestStatus(null);
    onClose();
  };

  return (
    <div className="packet-modal-backdrop" onClick={onClose}>
      <div 
        className="packet-modal-container" 
        style={{ maxWidth: 540 }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="packet-modal-header">
          <div className="packet-modal-title">
            <Server size={18} className="text-cyan" />
            <span>Backend Engine & API Configuration</span>
          </div>
          <button className="packet-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="packet-modal-body" style={{ gap: 16 }}>
          {/* Active Mode Card */}
          <div 
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: isLiveBackend ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 240, 255, 0.08)',
              border: `1px solid ${isLiveBackend ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 240, 255, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isLiveBackend ? 'var(--color-emerald)' : 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Radio size={14} className="animate-pulse" />
                <span>{isLiveBackend ? 'Live FastAPI Backend Connected' : 'Standalone Interactive Demo Engine Active'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {isLiveBackend 
                  ? `Directly proxying telemetry to ${apiBaseUrl}` 
                  : 'Full telemetry simulation & RF anomaly detection running in-browser'}
              </div>
            </div>
            <span 
              className="badge" 
              style={{ 
                background: isLiveBackend ? 'var(--color-emerald)' : 'var(--color-cyan)', 
                color: '#000', 
                fontWeight: 700,
                fontSize: 10
              }}
            >
              {engineMode.toUpperCase()}
            </span>
          </div>

          <form onSubmit={handleTestAndSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                FastAPI Backend URL
              </label>
              <input
                type="text"
                className="input-field mono"
                style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setTestStatus(null);
                }}
                placeholder="https://your-api.onrender.com or http://127.0.0.1:8000"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                ℹ️ Note: Browsers block unencrypted HTTP requests (like <code>http://127.0.0.1:8000</code>) when visiting HTTPS sites (Firebase). For local testing, use an HTTPS tunnel (e.g. <code>ngrok http 8000</code>) or deploy the FastAPI server to a public host.
              </div>
            </div>

            {testStatus === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-emerald)', fontSize: 12 }}>
                <CheckCircle2 size={16} />
                <span>Successfully connected to FastAPI /health!</span>
              </div>
            )}

            {testStatus === 'failed' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--color-rose)', fontSize: 12 }}>
                <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                onClick={handleUseStandalone}
              >
                Use Standalone Demo Engine
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                disabled={testStatus === 'testing' || loading.health}
              >
                <RefreshCw size={13} className={testStatus === 'testing' ? 'animate-spin' : ''} />
                <span>Test & Save URL</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

