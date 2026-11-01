import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Eye,
  RefreshCw,
  CheckCircle2,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import PacketModal from '../components/PacketModal';
import { getAlertMeta, getSeverityStyle, formatDateTime, timeAgo } from '../utils/formatters';

export default function SecurityAlertsView() {
  const { incidents, refreshIncidents, loading, isOnline } = useSecurity();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'high' | 'medium'
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Extract distinct alert types present in the incidents
  const distinctTypes = useMemo(() => {
    const types = new Set();
    incidents.forEach(inc => {
      if (inc.alert_type) types.add(inc.alert_type);
    });
    return Array.from(types).sort();
  }, [incidents]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // Severity check
      if (severityFilter !== 'all' && (inc.severity || '').toLowerCase() !== severityFilter) {
        return false;
      }
      // Type check
      if (typeFilter !== 'all' && inc.alert_type !== typeFilter) {
        return false;
      }
      // Search check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = (inc.message || '').toLowerCase().includes(q);
        const matchesType = (inc.alert_type || '').toLowerCase().includes(q);
        const matchesSource = (inc.source || '').toLowerCase().includes(q);
        const matchesId = String(inc.id).includes(q);
        if (!matchesMsg && !matchesType && !matchesSource && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [incidents, severityFilter, typeFilter, searchQuery]);

  const highCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'high').length;
  const mediumCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'medium').length;

  return (
    <div className="view-container security-alerts-view animate-fade-in">
      {/* View Header */}
      <div className="view-header">
        <div>
          <div className="view-pretitle-row">
            <span className="soc-live-status-pill">
              <span className="pulse-dot" style={{ backgroundColor: 'var(--color-rose)' }} />
              <span className="soc-status-text">ANOMALY DETECTION SUBSYSTEM</span>
            </span>
          </div>
          <h2 className="view-title">Adversarial Security Alerts &amp; Incidents</h2>
          <p className="view-subtitle">
            Anomalies, timing drifts, and adversarial telemetry patterns flagged by the GhostWave detection engine.
          </p>
        </div>
        <div className="view-header-actions">
          <button
            className="btn btn-cyber"
            onClick={refreshIncidents}
            disabled={loading.incidents || !isOnline}
          >
            <RefreshCw size={14} className={loading.incidents ? 'animate-spin' : ''} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {/* Alert Stats Summary Bar */}
      <div className="alerts-stats-row">
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-cyan)' }}>
          <span className="stat-label">Total Flagged Incidents</span>
          <span className="stat-val mono text-cyan">{incidents.length}</span>
          <span className="stat-sub">Persisted in SQLite DB</span>
        </div>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-rose)' }}>
          <span className="stat-label">Critical / High Severity</span>
          <span className="stat-val mono text-rose">{highCount}</span>
          <span className="stat-sub">Protocol &amp; Timing Violations</span>
        </div>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-amber)' }}>
          <span className="stat-label">Medium Severity</span>
          <span className="stat-val mono text-amber">{mediumCount}</span>
          <span className="stat-sub">Signal Jump &amp; Drift Anomalies</span>
        </div>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-purple)' }}>
          <span className="stat-label">Distinct Anomaly Types</span>
          <span className="stat-val mono text-purple">{distinctTypes.length}</span>
          <span className="stat-sub">Classified Detector Signatures</span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="cyber-card filter-toolbar-card">
        <div className="filter-toolbar-inner">
          {/* Search Box */}
          <div className="search-box-wrapper">
            <Search size={16} className="search-icon text-muted" />
            <input
              type="text"
              className="cyber-input search-input"
              placeholder="Search by message, alert type, source or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>

          {/* Severity Filter Tabs */}
          <div className="filter-group">
            <span className="filter-group-lbl">Severity:</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${severityFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('all')}
              >
                All ({incidents.length})
              </button>
              <button
                className={`filter-pill pill-rose ${severityFilter === 'high' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('high')}
              >
                High ({highCount})
              </button>
              <button
                className={`filter-pill pill-amber ${severityFilter === 'medium' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('medium')}
              >
                Medium ({mediumCount})
              </button>
            </div>
          </div>

          {/* Type Dropdown */}
          <div className="filter-group">
            <span className="filter-group-lbl">Signature:</span>
            <select
              className="cyber-input type-select mono"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Anomaly Signatures</option>
              {distinctTypes.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table / Cards */}
      <div className="cyber-card alerts-table-card">
        <div className="cyber-card-header">
          <div className="chart-header-left">
            <ShieldAlert size={16} className="text-rose" />
            <span className="card-heading">
              Security Incidents ({filteredIncidents.length} match{filteredIncidents.length !== 1 ? 'es' : ''})
            </span>
          </div>
        </div>

        <div className="cyber-table-container">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Severity</th>
                <th>Anomaly Signature</th>
                <th>Source Sensor</th>
                <th>Incident Details / Rationale</th>
                <th>Timestamp</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '48px 20px' }}>
                    <div className="empty-alerts-state">
                      <ShieldCheck size={40} className="text-teal" />
                      <p className="font-semibold text-primary" style={{ fontSize: 16, marginTop: 8 }}>
                        Zero Security Incidents Detected
                      </p>
                      <span className="text-xs text-muted" style={{ maxWidth: 420, display: 'inline-block', marginTop: 4 }}>
                        {incidents.length === 0
                          ? 'All RF telemetry streams have satisfied chronological, monotonic, and power integrity criteria. Run an attack scenario in Overview to test.'
                          : 'No incidents match the active search and severity filters.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const meta = getAlertMeta(inc.alert_type);
                  const sev = getSeverityStyle(inc.severity);

                  return (
                    <tr key={inc.id} className="incident-table-row">
                      <td className="mono text-xs text-cyan font-bold">
                        #{inc.id}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: sev.bg,
                            color: sev.text,
                            borderColor: sev.border
                          }}
                        >
                          {inc.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="alert-type-name font-semibold" style={{ color: meta.color }}>
                          {meta.label}
                        </div>
                        <div className="mono text-2xs text-muted">
                          {inc.alert_type}
                        </div>
                      </td>
                      <td className="mono text-xs">
                        <span className="text-highlight font-semibold">{inc.source || 'sensor-01'}</span>
                      </td>
                      <td className="incident-msg-cell">
                        <span className="incident-msg-text">{inc.message}</span>
                        {inc.packet?.sequence !== undefined && (
                          <span className="badge badge-outline mono text-xs ml-2">
                            Seq #{inc.packet.sequence}
                          </span>
                        )}
                      </td>
                      <td className="mono text-xs text-muted whitespace-nowrap">
                        <div className="text-primary font-medium">{timeAgo(inc.created_at)}</div>
                        <div className="text-2xs text-muted">{formatDateTime(inc.created_at)}</div>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => setSelectedIncident(inc)}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packet Inspection Modal */}
      <PacketModal
        isOpen={!!selectedIncident}
        item={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Telemetry Payload"
      />
    </div>
  );
}
