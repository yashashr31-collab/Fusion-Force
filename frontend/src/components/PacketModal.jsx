import { useState } from 'react';
import { X, Copy, Check, FileJson } from 'lucide-react';
import { getAlertMeta, getSeverityStyle, formatDateTime } from '../utils/formatters';

export default function PacketModal({ item, isOpen, onClose, title = 'Telemetry Packet Inspector' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const rawJson = JSON.stringify(item.packet || item, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const alertMeta = item.alert_type ? getAlertMeta(item.alert_type) : null;
  const severityStyle = item.severity ? getSeverityStyle(item.severity) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container cyber-card" onClick={(e) => e.stopPropagation()}>
        <div className="cyber-card-header modal-header">
          <div className="modal-header-left">
            <FileJson size={18} className="text-cyan" />
            <h3 className="modal-title">{title}</h3>
            {item.id && <span className="badge badge-cyan mono">ID #{item.id}</span>}
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cyber-card-body modal-body">
          {/* If this is an incident, show summary banner */}
          {item.alert_type && (
            <div className="modal-incident-banner" style={{ borderColor: alertMeta?.color || 'var(--border-subtle)' }}>
              <div className="incident-banner-header">
                <span className="badge" style={{ backgroundColor: severityStyle?.bg, color: severityStyle?.text, borderColor: severityStyle?.border }}>
                  {item.severity?.toUpperCase()} SEVERITY
                </span>
                <span className="mono incident-time">{formatDateTime(item.created_at)}</span>
              </div>
              <div className="incident-type-label" style={{ color: alertMeta?.color }}>
                {alertMeta?.label}
              </div>
              <div className="incident-msg-text">
                {item.message || 'No incident message provided.'}
              </div>
            </div>
          )}

          {/* Metrics Quick Overview */}
          {item.packet?.metrics && (
            <div className="modal-metrics-quickbar">
              <div className="quickbar-metric">
                <span className="quickbar-lbl">Signal Strength</span>
                <span className="quickbar-val mono">{item.packet.metrics.signal_strength ?? 'N/A'} dBm</span>
              </div>
              <div className="quickbar-metric">
                <span className="quickbar-lbl">Latency</span>
                <span className="quickbar-val mono">{item.packet.metrics.latency_ms ?? 'N/A'} ms</span>
              </div>
              <div className="quickbar-metric">
                <span className="quickbar-lbl">Packet Loss</span>
                <span className="quickbar-val mono">{item.packet.metrics.packet_loss ?? 'N/A'}%</span>
              </div>
              <div className="quickbar-metric">
                <span className="quickbar-lbl">Sequence #</span>
                <span className="quickbar-val mono">{item.packet.sequence ?? 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Raw JSON Code block with Copy button */}
          <div className="json-viewer-box">
            <div className="json-viewer-header">
              <span className="mono text-muted text-xs">RAW TELEMETRY PAYLOAD (JSON)</span>
              <button className="btn btn-outline btn-xs" onClick={handleCopy}>
                {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="json-pre mono">{rawJson}</pre>
          </div>
        </div>

        <div className="modal-footer">
          <span className="text-muted text-xs">
            Source: <strong className="text-cyan mono">{item.source || item.packet?.source || 'sensor-01'}</strong>
          </span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
