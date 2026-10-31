import { useState } from 'react';
import {
  Clock,
  FileJson,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import PacketModal from '../components/PacketModal';
import { getAlertMeta, getSeverityStyle, formatDateTime, timeAgo } from '../utils/formatters';

export default function IncidentTimelineView() {
  const { incidents, refreshIncidents, loading, isOnline } = useSecurity();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timelineLimit, setTimelineLimit] = useState(25);

  const displayedIncidents = incidents.slice(0, timelineLimit);

  return (
    <div className="view-container incident-timeline-view">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Incident Chronology &amp; Timeline</h2>
          <p className="view-subtitle">
            Temporal security event reconstruction showing telemetry anomaly arrival progression.
          </p>
        </div>
        <div className="view-header-actions">
          <div className="limit-buttons-group">
            <span className="text-xs text-muted">Show:</span>
            <button
              className={`btn btn-xs ${timelineLimit === 10 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTimelineLimit(10)}
            >
              10
            </button>
            <button
              className={`btn btn-xs ${timelineLimit === 25 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTimelineLimit(25)}
            >
              25
            </button>
            <button
              className={`btn btn-xs ${timelineLimit === 100 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTimelineLimit(100)}
            >
              All
            </button>
          </div>
          <button
            className="btn btn-cyber"
            onClick={refreshIncidents}
            disabled={loading.incidents || !isOnline}
          >
            <RefreshCw size={14} className={loading.incidents ? 'animate-spin' : ''} />
            <span>Sync Incidents</span>
          </button>
        </div>
      </div>

      {/* Main Timeline Card */}
      <div className="cyber-card timeline-card">
        <div className="cyber-card-header">
          <div className="chart-header-left">
            <Clock size={16} className="text-cyan" />
            <div>
              <h3 className="card-heading">Temporal Incident Progression</h3>
              <span className="card-subheading">
                Chronologically ordered security alarms (Latest to Oldest)
              </span>
            </div>
          </div>
          <span className="badge badge-cyan mono">
            {displayedIncidents.length} Events Visualized
          </span>
        </div>

        <div className="cyber-card-body timeline-body">
          {displayedIncidents.length === 0 ? (
            <div className="empty-timeline-state">
              <CheckCircle2 size={40} className="text-emerald" />
              <p className="font-semibold text-lg text-primary">No Incidents Logged</p>
              <p className="text-sm text-muted">
                The incident timeline is clean. Trigger an adversarial simulation to generate an event trace.
              </p>
            </div>
          ) : (
            <div className="vertical-timeline">
              {displayedIncidents.map((inc, index) => {
                const meta = getAlertMeta(inc.alert_type);
                const sev = getSeverityStyle(inc.severity);
                const metrics = inc.packet?.metrics || {};

                return (
                  <div key={inc.id || index} className="timeline-node">
                    {/* Node marker with glowing dot */}
                    <div className="timeline-marker-column">
                      <div
                        className="timeline-marker-dot"
                        style={{
                          backgroundColor: sev.dot,
                          boxShadow: `0 0 10px ${sev.dot}`
                        }}
                      />
                      {index < displayedIncidents.length - 1 && (
                        <div className="timeline-connector-line" />
                      )}
                    </div>

                    {/* Timeline Event Card */}
                    <div className="timeline-event-card cyber-card">
                      <div className="timeline-event-header">
                        <div className="event-title-group">
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
                          <span className="event-type-title" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="badge badge-cyan mono text-xs">
                            #{inc.id}
                          </span>
                        </div>

                        <div className="event-time-group mono">
                          <Clock size={12} className="text-muted" />
                          <span className="text-cyan text-xs font-semibold">{timeAgo(inc.created_at)}</span>
                          <span className="text-muted text-xs">({formatDateTime(inc.created_at)})</span>
                        </div>
                      </div>

                      <div className="timeline-event-msg">
                        {inc.message}
                      </div>

                      {/* Packet Snapshot Bar */}
                      <div className="timeline-metrics-pill-bar">
                        <div className="metric-pill">
                          <span className="pill-key">Source:</span>
                          <span className="pill-val mono text-highlight">{inc.source || 'sensor-01'}</span>
                        </div>
                        {inc.packet?.sequence !== undefined && (
                          <div className="metric-pill">
                            <span className="pill-key">Seq:</span>
                            <span className="pill-val mono">#{inc.packet.sequence}</span>
                          </div>
                        )}
                        {metrics.signal_strength !== undefined && (
                          <div className="metric-pill">
                            <span className="pill-key">Signal:</span>
                            <span className="pill-val mono">{metrics.signal_strength} dBm</span>
                          </div>
                        )}
                        {metrics.latency_ms !== undefined && (
                          <div className="metric-pill">
                            <span className="pill-key">Latency:</span>
                            <span className="pill-val mono">{metrics.latency_ms} ms</span>
                          </div>
                        )}
                        {metrics.packet_loss !== undefined && (
                          <div className="metric-pill">
                            <span className="pill-key">Loss:</span>
                            <span className="pill-val mono">{metrics.packet_loss}%</span>
                          </div>
                        )}

                        <button
                          className="btn btn-outline btn-xs inspect-event-btn"
                          onClick={() => setSelectedIncident(inc)}
                        >
                          <FileJson size={12} />
                          <span>Inspect Packet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Packet Inspection Modal */}
      <PacketModal
        isOpen={!!selectedIncident}
        item={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Timeline Telemetry"
      />
    </div>
  );
}
