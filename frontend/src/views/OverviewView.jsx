import { useState } from 'react';
import {
  Activity,
  ShieldAlert,
  Radio,
  ArrowRight,
  Clock,
  CheckCircle2,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { useSecurity } from '../context/SecurityContext';
import MetricCards from '../components/MetricCards';
import SimulationControls from '../components/SimulationControls';
import PacketModal from '../components/PacketModal';
import { getAlertMeta, getSeverityStyle, timeAgo } from '../utils/formatters';

export default function OverviewView({ onNavigate }) {
  const {
    incidents,
    telemetrySeries
  } = useSecurity();

  const [selectedIncident, setSelectedIncident] = useState(null);

  // Latest 5 incidents
  const recentIncidents = incidents.slice(0, 5);

  // Chart data formatting: take last 20 points
  const chartData = telemetrySeries.slice(-20).map((pt, idx) => ({
    name: pt.sequence !== undefined ? `Seq #${pt.sequence}` : `#${idx + 1}`,
    seq: pt.sequence,
    signal: pt.signal_strength !== null ? Number(pt.signal_strength) : null,
    latency: pt.latency_ms !== null ? Number(pt.latency_ms) : null,
    loss: pt.packet_loss !== null ? Number(pt.packet_loss) : null,
    hasAnomaly: pt.hasAnomaly
  }));

  return (
    <div className="view-container overview-view">
      {/* Page Title & Status Banner */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Adversarial Telemetry Verification SOC</h2>
          <p className="view-subtitle">
            Continuous real-time verification and anomaly detection for mission-critical RF signal streams.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('telemetry')}>
            <Activity size={15} />
            <span>Open Telemetry Stream</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards onCardClick={onNavigate} />

      {/* Attack Simulation Controls */}
      <SimulationControls />

      {/* Grid: Live Telemetry Preview + Recent Incidents */}
      <div className="overview-dual-grid">
        {/* Left: Telemetry Time-Series Preview */}
        <div className="cyber-card overview-chart-card">
          <div className="cyber-card-header">
            <div className="chart-header-left">
              <Radio size={16} className="text-cyan" />
              <div>
                <h3 className="card-heading">Live Telemetry Correlation</h3>
                <span className="card-subheading">RF Signal Power (dBm) &amp; Latency (ms)</span>
              </div>
            </div>
            <div className="chart-legend-pills">
              <span className="legend-pill" style={{ color: 'var(--color-cyan)' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--color-cyan)' }} />
                Signal (dBm)
              </span>
              <span className="legend-pill" style={{ color: 'var(--color-amber)' }}>
                <span className="legend-dot" style={{ backgroundColor: 'var(--color-amber)' }} />
                Latency (ms)
              </span>
            </div>
          </div>

          <div className="cyber-card-body chart-body-wrapper">
            {chartData.length === 0 ? (
              <div className="empty-chart-state">
                <Activity size={32} className="text-muted" />
                <p>No telemetry frames loaded yet.</p>
                <span className="text-xs text-muted">Run a simulation scenario above to stream synthetic frames.</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-amber)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-amber)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-card)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-card)',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--color-cyan)', fontWeight: 600 }}
                    />
                    <ReferenceLine y={-80} stroke="var(--color-rose)" strokeDasharray="4 4" label={{ value: 'Jamming Threshold', fill: '#f43f5e', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="signal"
                      name="Signal (dBm)"
                      stroke="var(--color-cyan)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#signalGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      name="Latency (ms)"
                      stroke="var(--color-amber)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#latencyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card-footer-action">
            <span className="text-muted text-xs">
              Showing last {chartData.length} monitored packets · <strong>Node: sensor-01</strong>
            </span>
            <button className="btn btn-outline btn-xs" onClick={() => onNavigate('telemetry')}>
              <span>View Full Charts</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Right: Recent Security Alerts / Incidents Snapshot */}
        <div className="cyber-card overview-incidents-card">
          <div className="cyber-card-header">
            <div className="chart-header-left">
              <ShieldAlert size={16} className="text-rose" />
              <div>
                <h3 className="card-heading">Recent Security Alerts</h3>
                <span className="card-subheading">Latest anomalies logged in detector DB</span>
              </div>
            </div>
            <button className="btn btn-outline btn-xs" onClick={() => onNavigate('alerts')}>
              View All ({incidents.length})
            </button>
          </div>

          <div className="cyber-card-body incidents-snapshot-list">
            {recentIncidents.length === 0 ? (
              <div className="empty-incidents-box">
                <CheckCircle2 size={32} className="text-emerald" />
                <p className="empty-title">All Telemetry Clear</p>
                <p className="empty-desc">
                  No security incidents recorded. Run a simulation scenario like <em>Network Fault</em>, <em>Replay</em>, or <em>Manipulation</em> to observe real-time detection.
                </p>
              </div>
            ) : (
              recentIncidents.map((inc) => {
                const meta = getAlertMeta(inc.alert_type);
                const sev = getSeverityStyle(inc.severity);

                return (
                  <div
                    key={inc.id}
                    className="incident-snapshot-item"
                    onClick={() => setSelectedIncident(inc)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="incident-item-left">
                      <span className="pulse-dot" style={{ backgroundColor: sev.dot }} />
                      <div className="incident-item-content">
                        <div className="incident-item-header">
                          <span className="incident-item-title" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="incident-time-ago mono">{timeAgo(inc.created_at)}</span>
                        </div>
                        <div className="incident-item-msg text-muted">
                          {inc.message}
                        </div>
                      </div>
                    </div>
                    <div className="incident-item-right">
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
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {recentIncidents.length > 0 && (
            <div className="card-footer-action">
              <span className="text-muted text-xs">
                Total recorded in DB: <strong>{incidents.length} incidents</strong>
              </span>
              <button className="btn btn-outline btn-xs" onClick={() => onNavigate('timeline')}>
                <span>View Timeline</span>
                <Clock size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Architecture & Verification Engine Specs */}
      <div className="cyber-card specs-card">
        <div className="cyber-card-header">
          <div className="chart-header-left">
            <Layers size={16} className="text-blue" />
            <div>
              <h3 className="card-heading">GhostWave Verification Architecture</h3>
              <span className="card-subheading">Multi-layer adversarial defense pipeline</span>
            </div>
          </div>
          <span className="badge badge-emerald">ACTIVE DEFENSE</span>
        </div>
        <div className="cyber-card-body specs-grid">
          <div className="spec-col">
            <h4 className="spec-col-title text-cyan">1. Chronological &amp; Order</h4>
            <p className="spec-col-desc">
              Timestamp drift detection (&gt;60s future skews), monotonic sequence continuity checks, and out-of-order packet arrival isolation.
            </p>
          </div>
          <div className="spec-col">
            <h4 className="spec-col-title text-purple">2. Payload Replay Defense</h4>
            <p className="spec-col-desc">
              Canonical SHA-256 metric payload fingerprinting. Prevents identical telemetry values replayed with spoofed sequence numbers.
            </p>
          </div>
          <div className="spec-col">
            <h4 className="spec-col-title text-amber">3. RF Anomaly Detection</h4>
            <p className="spec-col-desc">
              Adaptive historical delta thresholding. Detects sudden signal strength jumps (|Δ| &gt; 20 dBm) and physical parameter spoofing.
            </p>
          </div>
          <div className="spec-col">
            <h4 className="spec-col-title text-rose">4. Immutable Audit Ledger</h4>
            <p className="spec-col-desc">
              Zero-omission SQLite security logging. Every alert automatically generates an audit trial entry with telemetry snapshot.
            </p>
          </div>
        </div>
      </div>

      {/* Packet Inspection Modal */}
      <PacketModal
        isOpen={!!selectedIncident}
        item={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Packet Inspector"
      />
    </div>
  );
}
