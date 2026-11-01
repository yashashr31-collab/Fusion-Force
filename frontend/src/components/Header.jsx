import { useState } from 'react';
import { 
  Shield, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Pause, 
  Play,
  Server,
  Settings2,
  Cpu,
  UploadCloud
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import ApiSettingsModal from './ApiSettingsModal';
import CsvUploadModal from './CsvUploadModal';

export default function Header({ onNavigate }) {
  const { 
    isLiveBackend, 
    apiBaseUrl, 
    refreshAll, 
    loading, 
    autoRefresh, 
    setAutoRefresh,
    incidents,
    activeScenario
  } = useSecurity();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const isRefreshing = loading.health || loading.incidents || loading.audit;
  const highSeverityCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'high').length;

  return (
    <>
      <header className="ghostwave-header">
        {/* Brand & Identity */}
        <div className="header-left">
          <div className="brand-logo-container" onClick={() => onNavigate('overview')} role="button" tabIndex={0}>
            <div className="brand-icon-shield">
              <Shield className="shield-icon" size={20} />
              <Activity className="activity-icon" size={12} />
            </div>
            <div className="brand-titles">
              <div className="brand-name-row">
                <span className="brand-title">GHOSTWAVE</span>
                <span className="hackathon-tag">BYTEFORGE 2026</span>
              </div>
              <div className="brand-subtitle">Adversarially Robust Signal Telemetry Verification</div>
            </div>
          </div>
        </div>

        {/* Center Engine Status & Scenario Pill */}
        <div className="header-center">
          <div 
            className={`status-pill ${isLiveBackend ? 'status-online' : 'status-demo'}`}
            onClick={() => setSettingsOpen(true)}
            role="button"
            tabIndex={0}
            title={isLiveBackend ? `Connected to FastAPI Backend: ${apiBaseUrl} (Click to configure)` : 'In-Browser Standalone Engine Active (Click to connect external FastAPI)'}
          >
            <span className="status-dot-wrapper">
              <span 
                className="pulse-dot" 
                style={{ backgroundColor: isLiveBackend ? 'var(--color-teal)' : 'var(--color-cyan)' }} 
              />
            </span>
            <div className="status-text-group">
              <span className="status-main">
                {isLiveBackend ? 'BACKEND ONLINE' : 'IN-BROWSER ENGINE'}
              </span>
              <span className="status-sub">
                {isLiveBackend ? (
                  <>
                    <Server size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {apiBaseUrl.replace(/^https?:\/\//, '')}
                  </>
                ) : (
                  <>
                    <Cpu size={10} style={{ display: 'inline', marginRight: 3 }} />
                    Client-Side Detector
                  </>
                )}
              </span>
            </div>
          </div>

          {activeScenario && activeScenario !== 'normal' && (
            <div className="scenario-active-pill" title="Adversarial attack scenario is currently active in detector stream">
              <span className="scenario-flame">⚠️</span>
              <span className="scenario-label">INJECTED:</span>
              <span className="scenario-val">{activeScenario.toUpperCase().replace('_', ' ')}</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="header-right">
          {/* Critical alerts badge */}
          {highSeverityCount > 0 && (
            <button 
              className="threat-pill-btn"
              onClick={() => onNavigate('alerts')}
              title="Click to view critical alerts"
            >
              <AlertTriangle size={13} className="threat-icon" />
              <span className="threat-count">{highSeverityCount}</span>
              <span className="threat-text">Critical</span>
            </button>
          )}

          {/* CSV Telemetry Upload (up to 5 MB) */}
          <button
            className="btn btn-outline btn-sm csv-upload-header-btn"
            onClick={() => setCsvModalOpen(true)}
            title="Upload Telemetry CSV File (Up to 5 MB)"
          >
            <UploadCloud size={13} className="text-cyan" />
            <span className="btn-label-text">Upload CSV</span>
          </button>

          {/* Auto Refresh Polling Toggle */}
          <button
            className={`btn btn-outline btn-sm auto-poll-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-polling every 8s (Click to pause)' : 'Auto-polling paused (Click to resume)'}
          >
            {autoRefresh ? (
              <>
                <Pause size={12} className="text-cyan" />
                <span className="btn-label-text">Polling 8s</span>
              </>
            ) : (
              <>
                <Play size={12} />
                <span className="btn-label-text">Paused</span>
              </>
            )}
          </button>

          {/* Manual Refresh Button */}
          <button
            className="btn btn-cyber btn-sm refresh-btn"
            onClick={refreshAll}
            disabled={isRefreshing}
            title="Refresh telemetry streams and alerts"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="refresh-text">Refresh</span>
          </button>

          {/* Settings Button */}
          <button
            className="btn btn-outline btn-sm settings-toggle-btn"
            onClick={() => setSettingsOpen(true)}
            title="API Backend & Engine Settings"
            aria-label="API Settings"
          >
            <Settings2 size={15} />
          </button>
        </div>
      </header>

      <ApiSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CsvUploadModal isOpen={csvModalOpen} onClose={() => setCsvModalOpen(false)} />
    </>
  );
}
