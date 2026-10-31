import { 
  Shield, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Pause, 
  Play,
  Server
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export default function Header({ onNavigate }) {
  const { 
    isOnline, 
    apiBaseUrl, 
    refreshAll, 
    loading, 
    autoRefresh, 
    setAutoRefresh,
    incidents,
    activeScenario
  } = useSecurity();

  const isRefreshing = loading.health || loading.incidents || loading.audit;
  const highSeverityCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'high').length;

  return (
    <header className="ghostwave-header">
      {/* Brand & Identity */}
      <div className="header-left">
        <div className="brand-logo-container" onClick={() => onNavigate('overview')} role="button" tabIndex={0}>
          <div className="brand-icon-shield">
            <Shield className="shield-icon" size={24} />
            <Activity className="activity-icon" size={14} />
          </div>
          <div className="brand-titles">
            <div className="brand-name-row">
              <span className="brand-title">GhostWave</span>
              <span className="hackathon-tag">BYTEFORGE 2026</span>
            </div>
            <div className="brand-subtitle">Adversarially Robust Signal Telemetry Verification</div>
          </div>
        </div>
      </div>

      {/* Center status badges */}
      <div className="header-center">
        <div className={`status-pill ${isOnline ? 'status-online' : 'status-offline'}`} title={`Backend Base URL: ${apiBaseUrl}`}>
          <span className="status-dot-wrapper">
            <span 
              className="pulse-dot" 
              style={{ background: isOnline ? 'var(--color-emerald)' : 'var(--color-rose)' }} 
            />
          </span>
          <div className="status-text-group">
            <span className="status-main">
              {isOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
            </span>
            <span className="status-sub">
              {isOnline ? (
                <>
                  <Server size={10} style={{ display: 'inline', marginRight: 3 }} />
                  {apiBaseUrl.replace('http://', '')}
                </>
              ) : (
                'Unable to reach /health'
              )}
            </span>
          </div>
        </div>

        {activeScenario && activeScenario !== 'normal' && (
          <div className="scenario-active-pill" title="Active attack scenario is active in detector memory">
            <span className="scenario-flame">⚠️</span>
            <span className="scenario-label">SIMULATION:</span>
            <span className="scenario-val">{activeScenario.toUpperCase().replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="header-right">
        {/* High severity threat alert counter */}
        {highSeverityCount > 0 && (
          <button 
            className="threat-pill-btn"
            onClick={() => onNavigate('alerts')}
            title="Click to view high-severity alerts"
          >
            <AlertTriangle size={14} className="threat-icon" />
            <span className="threat-count">{highSeverityCount}</span>
            <span className="threat-text">Critical Alerts</span>
          </button>
        )}

        {/* Auto Refresh Toggle */}
        <button
          className={`btn btn-outline btn-sm auto-poll-btn ${autoRefresh ? 'active' : ''}`}
          onClick={() => setAutoRefresh(!autoRefresh)}
          title={autoRefresh ? 'Auto-refresh every 8s (Click to pause)' : 'Auto-refresh paused (Click to resume)'}
        >
          {autoRefresh ? (
            <>
              <Pause size={12} />
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
          title="Manually query /health, /incidents, /audit"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="refresh-text">Refresh</span>
        </button>
      </div>
    </header>
  );
}
