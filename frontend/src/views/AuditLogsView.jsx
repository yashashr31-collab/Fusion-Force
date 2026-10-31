import { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  Lock,
  Check
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import PacketModal from '../components/PacketModal';
import { formatDateTime, timeAgo, getSeverityStyle } from '../utils/formatters';

export default function AuditLogsView() {
  const { auditLogs, refreshAuditLogs, loading, isOnline } = useSecurity();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Search filter
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return auditLogs;
    const q = searchQuery.toLowerCase();
    return auditLogs.filter(log => {
      const matchId = String(log.id).includes(q);
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details).toLowerCase() : String(log.details || '').toLowerCase();
      const matchDetails = detailsStr.includes(q);
      return matchId || matchAction || matchDetails;
    });
  }, [auditLogs, searchQuery]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ghostwave-audit-ledger-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="view-container audit-logs-view">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Cryptographic Audit Ledger</h2>
          <p className="view-subtitle">
            Immutable SQLite audit trail tracking automated security classifications and detector triggers.
          </p>
        </div>
        <div className="view-header-actions">
          <button
            className="btn btn-outline"
            onClick={handleExportJSON}
            disabled={auditLogs.length === 0}
            title="Download audit logs as JSON file"
          >
            {downloadSuccess ? <Check size={14} className="text-emerald" /> : <Download size={14} />}
            <span>{downloadSuccess ? 'Ledger Exported' : 'Export Ledger (JSON)'}</span>
          </button>
          <button
            className="btn btn-cyber"
            onClick={refreshAuditLogs}
            disabled={loading.audit || !isOnline}
          >
            <RefreshCw size={14} className={loading.audit ? 'animate-spin' : ''} />
            <span>Sync Audit Log</span>
          </button>
        </div>
      </div>

      {/* Ledger Security Integrity Banner */}
      <div className="cyber-card audit-banner-card">
        <div className="audit-banner-content">
          <div className="audit-banner-icon">
            <Lock size={20} className="text-cyan" />
          </div>
          <div>
            <div className="font-semibold text-primary">Tamper-Evident Audit Trail Active</div>
            <div className="text-xs text-muted">
              All incident creations and alerts are sequentially committed to the database ledger with nanosecond UTC timestamps.
            </div>
          </div>
        </div>
        <div className="audit-banner-stats">
          <span className="mono text-cyan font-bold">{auditLogs.length}</span>
          <span className="text-xs text-muted">Committed Entries</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card filter-toolbar-card">
        <div className="filter-toolbar-inner">
          <div className="search-box-wrapper">
            <Search size={16} className="search-icon text-muted" />
            <input
              type="text"
              className="cyber-input search-input"
              placeholder="Search audit ledger by action, alert type, source node or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card audit-table-card">
        <div className="cyber-card-header">
          <div className="chart-header-left">
            <Database size={16} className="text-cyan" />
            <span className="card-heading">
              Audit Entries ({filteredLogs.length} records)
            </span>
          </div>
        </div>

        <div className="cyber-table-container">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Action</th>
                <th>Timestamp (UTC)</th>
                <th>Source Node</th>
                <th>Alert Classification</th>
                <th>Severity</th>
                <th>Raw Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: '40px 20px' }}>
                    <div className="empty-alerts-state">
                      <CheckCircle2 size={36} className="text-emerald" />
                      <p className="font-semibold text-primary">Audit Log Clean</p>
                      <span className="text-xs text-muted">
                        No audit records in the database. Trigger an attack simulation to populate audit entries.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const details = typeof log.details === 'object' && log.details !== null ? log.details : {};
                  const severity = details.severity || 'unknown';
                  const sevStyle = getSeverityStyle(severity);

                  return (
                    <tr key={log.id} className="audit-table-row">
                      <td className="mono text-xs text-cyan font-bold">
                        #{log.id}
                      </td>
                      <td>
                        <span className="badge badge-cyan mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="mono text-xs text-muted whitespace-nowrap">
                        <div>{formatDateTime(log.created_at)}</div>
                        <div className="text-2xs text-cyan">{timeAgo(log.created_at)}</div>
                      </td>
                      <td className="mono text-xs font-semibold text-highlight">
                        {details.source || 'sensor-01'}
                      </td>
                      <td className="mono text-xs text-primary">
                        {details.alert_type ? (
                          <span className="badge badge-outline text-amber">
                            {details.alert_type}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: sevStyle.bg,
                            color: sevStyle.text,
                            borderColor: sevStyle.border
                          }}
                        >
                          {severity.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye size={12} />
                          <span>View JSON</span>
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

      {/* Audit Log Modal */}
      <PacketModal
        isOpen={!!selectedLog}
        item={selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Ledger Record Inspector"
      />
    </div>
  );
}
