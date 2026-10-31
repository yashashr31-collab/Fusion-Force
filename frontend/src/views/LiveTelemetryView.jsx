import { useState } from 'react';
import {
  Activity,
  Radio,
  Send,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Eye,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import { useSecurity } from '../context/SecurityContext';
import PacketModal from '../components/PacketModal';
import { formatTimestamp } from '../utils/formatters';

export default function LiveTelemetryView() {
  const {
    telemetrySeries,
    submitCustomPacket,
    loading,
    isOnline,
    triggerSimulation
  } = useSecurity();

  const [activeChartTab, setActiveChartTab] = useState('all'); // 'all' | 'signal' | 'latency' | 'loss'
  const [filterAnomaliesOnly, setFilterAnomaliesOnly] = useState(false);
  const [inspectPacket, setInspectPacket] = useState(null);

  // Custom Packet Injection Form State
  const [customSource, setCustomSource] = useState('sensor-01');
  const [customSeq, setCustomSeq] = useState('');
  const [customSignal, setCustomSignal] = useState('-55.0');
  const [customLatency, setCustomLatency] = useState('42.0');
  const [customLoss, setCustomLoss] = useState('1.5');
  const [customTimestampType, setCustomTimestampType] = useState('now'); // 'now' | 'future' | 'past'
  const [injectionResult, setInjectionResult] = useState(null);

  // Chart dataset mapping
  const chartData = telemetrySeries.map((pt, idx) => ({
    name: pt.sequence !== undefined ? `Seq ${pt.sequence}` : `#${idx + 1}`,
    seq: pt.sequence,
    signal: pt.signal_strength !== null ? Number(pt.signal_strength) : null,
    latency: pt.latency_ms !== null ? Number(pt.latency_ms) : null,
    loss: pt.packet_loss !== null ? Number(pt.packet_loss) : null,
    alertCount: pt.alertCount || 0,
    hasAnomaly: pt.hasAnomaly,
    raw: pt
  }));

  // Presets for manual injection
  const applyPreset = (presetType) => {
    switch (presetType) {
      case 'nominal':
        setCustomSignal('-55.0');
        setCustomLatency('40.0');
        setCustomLoss('1.0');
        setCustomTimestampType('now');
        break;
      case 'jump':
        setCustomSignal('-95.0'); // Sudden drop
        setCustomLatency('45.0');
        setCustomLoss('2.0');
        setCustomTimestampType('now');
        break;
      case 'future_ts':
        setCustomSignal('-54.0');
        setCustomLatency('38.0');
        setCustomLoss('0.5');
        setCustomTimestampType('future');
        break;
      case 'past_ts':
        setCustomSignal('-54.0');
        setCustomLatency('38.0');
        setCustomLoss('0.5');
        setCustomTimestampType('past');
        break;
      case 'extreme_latency':
        setCustomSignal('-56.0');
        setCustomLatency('500.0');
        setCustomLoss('30.0');
        setCustomTimestampType('now');
        break;
      default:
        break;
    }
  };

  const handleSendCustomTelemetry = async (e) => {
    e.preventDefault();
    setInjectionResult(null);

    let ts;
    const now = new Date();
    if (customTimestampType === 'future') {
      // 120 seconds in future
      ts = new Date(now.getTime() + 120 * 1000).toISOString();
    } else if (customTimestampType === 'past') {
      // 5 minutes in past
      ts = new Date(now.getTime() - 300 * 1000).toISOString();
    } else {
      ts = now.toISOString();
    }

    const payload = {
      source: customSource || 'sensor-01',
      timestamp: ts,
      metrics: {
        signal_strength: parseFloat(customSignal) || -55.0,
        latency_ms: parseFloat(customLatency) || 40.0,
        packet_loss: parseFloat(customLoss) || 0.0
      }
    };

    if (customSeq !== '') {
      payload.sequence = parseInt(customSeq, 10);
    }

    try {
      const response = await submitCustomPacket(payload);
      setInjectionResult({
        success: true,
        data: response
      });
    } catch (err) {
      setInjectionResult({
        success: false,
        error: err.message
      });
    }
  };

  const filteredPackets = filterAnomaliesOnly
    ? chartData.filter(p => p.hasAnomaly)
    : chartData;

  return (
    <div className="view-container live-telemetry-view">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Live RF Signal Telemetry Analysis</h2>
          <p className="view-subtitle">
            Inspect real-time signal properties, frequency strength, latency, and packet sequence continuity.
          </p>
        </div>
        <div className="view-header-actions">
          <button
            className="btn btn-outline"
            onClick={() => triggerSimulation('normal')}
            disabled={loading.simulation || !isOnline}
          >
            <RefreshCw size={14} className={loading.simulation ? 'animate-spin' : ''} />
            <span>Generate Baseline Stream</span>
          </button>
        </div>
      </div>

      {/* Primary Telemetry Charts Card */}
      <div className="cyber-card full-telemetry-chart-card">
        <div className="cyber-card-header chart-tabs-header">
          <div className="chart-header-left">
            <Activity size={18} className="text-cyan" />
            <div>
              <h3 className="card-heading">Signal Stream Waveform Analyzer</h3>
              <span className="card-subheading">
                Tracking {chartData.length} consecutive telemetry frames
              </span>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="chart-view-tabs">
            <button
              className={`chart-tab-btn ${activeChartTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('all')}
            >
              Multi-Metric
            </button>
            <button
              className={`chart-tab-btn ${activeChartTab === 'signal' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('signal')}
            >
              Signal Power (dBm)
            </button>
            <button
              className={`chart-tab-btn ${activeChartTab === 'latency' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('latency')}
            >
              Latency (ms)
            </button>
            <button
              className={`chart-tab-btn ${activeChartTab === 'loss' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('loss')}
            >
              Packet Loss (%)
            </button>
          </div>
        </div>

        <div className="cyber-card-body">
          {chartData.length === 0 ? (
            <div className="empty-chart-state">
              <Radio size={40} className="text-muted" />
              <p>No telemetry frames currently in memory.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => triggerSimulation('normal')}
                disabled={!isOnline}
              >
                Inject Normal Simulation Stream
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'loss' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-card)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <ReferenceLine y={20} stroke="var(--color-rose)" strokeDasharray="4 4" label={{ value: 'Loss Alarm 20%', fill: '#f43f5e', fontSize: 10 }} />
                    <Bar dataKey="loss" name="Packet Loss (%)" fill="var(--color-rose)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sigGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-amber)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-amber)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-rose)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-rose)" stopOpacity={0.0} />
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
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--color-cyan)', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

                    {(activeChartTab === 'all' || activeChartTab === 'signal') && (
                      <Area
                        type="monotone"
                        dataKey="signal"
                        name="Signal Power (dBm)"
                        stroke="var(--color-cyan)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#sigGrad)"
                      />
                    )}

                    {(activeChartTab === 'all' || activeChartTab === 'latency') && (
                      <Area
                        type="monotone"
                        dataKey="latency"
                        name="Latency (ms)"
                        stroke="var(--color-amber)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#latGrad)"
                      />
                    )}

                    {activeChartTab === 'all' && (
                      <Area
                        type="monotone"
                        dataKey="loss"
                        name="Packet Loss (%)"
                        stroke="var(--color-rose)"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#lossGrad)"
                      />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Dual Section: Manual Telemetry Injection + Live Packet Inspector Feed */}
      <div className="telemetry-split-grid">
        {/* Manual Telemetry Injection form */}
        <div className="cyber-card manual-injection-card">
          <div className="cyber-card-header">
            <div className="chart-header-left">
              <Send size={16} className="text-cyan" />
              <div>
                <h3 className="card-heading">Adversarial Packet Injector</h3>
                <span className="card-subheading">Submit telemetry to <code className="mono">POST /telemetry</code></span>
              </div>
            </div>
            <span className="badge badge-cyan mono">LIVE API</span>
          </div>

          <div className="cyber-card-body">
            <form onSubmit={handleSendCustomTelemetry} className="injection-form">
              {/* Presets Bar */}
              <div className="preset-buttons-row">
                <span className="text-xs text-muted">Test Presets:</span>
                <button type="button" className="btn btn-outline btn-xs" onClick={() => applyPreset('nominal')}>
                  Nominal
                </button>
                <button type="button" className="btn btn-outline btn-xs text-amber" onClick={() => applyPreset('jump')}>
                  Signal Jump
                </button>
                <button type="button" className="btn btn-outline btn-xs text-rose" onClick={() => applyPreset('future_ts')}>
                  Future Clock
                </button>
                <button type="button" className="btn btn-outline btn-xs text-pink" onClick={() => applyPreset('past_ts')}>
                  Time Reversal
                </button>
                <button type="button" className="btn btn-outline btn-xs text-rose" onClick={() => applyPreset('extreme_latency')}>
                  Congestion Spike
                </button>
              </div>

              <div className="form-row-grid">
                <div className="form-field">
                  <label className="field-label">Source Node ID</label>
                  <input
                    type="text"
                    className="cyber-input mono"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="sensor-01"
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Sequence # (Optional)</label>
                  <input
                    type="number"
                    className="cyber-input mono"
                    value={customSeq}
                    onChange={(e) => setCustomSeq(e.target.value)}
                    placeholder="e.g. 42"
                  />
                </div>
              </div>

              <div className="form-row-grid tri-col">
                <div className="form-field">
                  <label className="field-label">Signal (dBm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="cyber-input mono"
                    value={customSignal}
                    onChange={(e) => setCustomSignal(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Latency (ms)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="cyber-input mono"
                    value={customLatency}
                    onChange={(e) => setCustomLatency(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Loss Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="cyber-input mono"
                    value={customLoss}
                    onChange={(e) => setCustomLoss(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Timestamp Generator</label>
                <div className="timestamp-mode-selector">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="tsMode"
                      checked={customTimestampType === 'now'}
                      onChange={() => setCustomTimestampType('now')}
                    />
                    <span>Now (UTC Sync)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="tsMode"
                      checked={customTimestampType === 'future'}
                      onChange={() => setCustomTimestampType('future')}
                    />
                    <span className="text-rose">Future Skew (+120s)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="tsMode"
                      checked={customTimestampType === 'past'}
                      onChange={() => setCustomTimestampType('past')}
                    />
                    <span className="text-amber">Time Rollback (-300s)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading.telemetrySubmit || !isOnline}
              >
                <Send size={14} className={loading.telemetrySubmit ? 'animate-spin' : ''} />
                <span>Transmit Packet to Detector Engine</span>
              </button>
            </form>

            {/* Injection Detector Output */}
            {injectionResult && (
              <div className={`injection-result-box ${injectionResult.success ? (injectionResult.data.alerts?.length > 0 ? 'box-alert' : 'box-clean') : 'box-error'}`}>
                {injectionResult.success ? (
                  <>
                    <div className="result-header">
                      <span className="mono font-semibold">
                        STATUS: {injectionResult.data.status?.toUpperCase()}
                      </span>
                      <span className={`badge ${injectionResult.data.alerts?.length > 0 ? 'badge-rose' : 'badge-emerald'}`}>
                        {injectionResult.data.alert_count} Alerts Triggered
                      </span>
                    </div>
                    {injectionResult.data.alerts?.length > 0 ? (
                      <div className="result-alerts-list">
                        {injectionResult.data.alerts.map((alt, i) => (
                          <div key={i} className="result-alert-item">
                            <AlertTriangle size={14} className="text-rose" />
                            <span><strong>{alt.type}:</strong> {alt.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="result-clean-msg">
                        <CheckCircle2 size={14} className="text-emerald" />
                        <span>Packet verified cleanly by GhostWave detector. Zero anomalies observed.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="result-err-msg">
                    <AlertTriangle size={14} className="text-rose" />
                    <span>Error: {injectionResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Packet Stream Table */}
        <div className="cyber-card live-packets-table-card">
          <div className="cyber-card-header">
            <div className="chart-header-left">
              <Radio size={16} className="text-cyan" />
              <div>
                <h3 className="card-heading">Packet Frame Ledger</h3>
                <span className="card-subheading">Consecutive observations in detector buffer</span>
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              className={`btn btn-xs ${filterAnomaliesOnly ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => setFilterAnomaliesOnly(!filterAnomaliesOnly)}
            >
              <Filter size={12} />
              <span>{filterAnomaliesOnly ? 'Anomalous Only' : 'All Frames'}</span>
            </button>
          </div>

          <div className="cyber-table-container stream-table-wrapper">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Timestamp</th>
                  <th>Signal</th>
                  <th>Latency</th>
                  <th>Loss</th>
                  <th>Integrity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted" style={{ padding: '24px' }}>
                      No frames matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredPackets.slice().reverse().map((p, idx) => (
                    <tr key={idx} className={p.hasAnomaly ? 'row-anomalous' : ''}>
                      <td className="mono font-semibold">
                        {p.seq !== undefined ? `#${p.seq}` : `#${idx + 1}`}
                      </td>
                      <td className="mono text-xs text-muted">
                        {formatTimestamp(p.raw.timestamp)}
                      </td>
                      <td className="mono">
                        <span className={p.signal < -80 ? 'text-amber font-semibold' : ''}>
                          {p.signal !== null ? `${p.signal} dBm` : 'N/A'}
                        </span>
                      </td>
                      <td className="mono">
                        <span className={p.latency > 100 ? 'text-rose font-semibold' : ''}>
                          {p.latency !== null ? `${p.latency} ms` : 'N/A'}
                        </span>
                      </td>
                      <td className="mono">
                        <span className={p.loss > 10 ? 'text-rose font-semibold' : ''}>
                          {p.loss !== null ? `${p.loss}%` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        {p.hasAnomaly ? (
                          <span className="badge badge-rose">
                            {p.alertCount} Flag{p.alertCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="badge badge-emerald">Verified</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => setInspectPacket(p.raw)}
                          title="Inspect raw packet JSON"
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Packet Inspector Modal */}
      <PacketModal
        isOpen={!!inspectPacket}
        item={inspectPacket}
        onClose={() => setInspectPacket(null)}
        title="Telemetry Frame Inspector"
      />
    </div>
  );
}
