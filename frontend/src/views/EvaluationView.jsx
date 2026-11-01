import {
  BarChart3,
  Sparkles,
  Info,
  RefreshCw,
  Check,
  X,
  Target,
  ShieldCheck,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useSecurity } from '../context/SecurityContext';
import { SCENARIO_METADATA } from '../services/api';
import { getAlertMeta } from '../utils/formatters';

export default function EvaluationView() {
  const { evaluation, refreshEvaluation, loading, isOnline } = useSecurity();

  const scenariosData = evaluation?.scenarios || {};
  const scenarioKeys = Object.keys(scenariosData);

  // Summary Metrics across all scenarios
  let totalPackets = 0;
  let totalAlerts = 0;
  let totalMatched = 0;
  let totalExpected = 0;

  scenarioKeys.forEach(k => {
    const sc = scenariosData[k];
    totalPackets += sc.packets_processed || 0;
    totalAlerts += sc.alerts_count || 0;
    const exp = sc.expected_indicators || [];
    const mat = sc.expected_indicator_observed || [];
    totalExpected += exp.length;
    totalMatched += mat.length;
  });

  const overallAccuracy = totalExpected > 0 ? Math.round((totalMatched / totalExpected) * 100) : 100;

  // Chart data
  const chartData = scenarioKeys.map((scKey) => {
    const sc = scenariosData[scKey];
    const meta = SCENARIO_METADATA[scKey] || {};
    return {
      name: meta.label || scKey,
      packets: sc.packets_processed || 0,
      alerts: sc.alerts_count || 0,
      observedTypes: sc.alert_types?.length || 0
    };
  });

  return (
    <div className="view-container evaluation-view animate-fade-in">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="view-pretitle-row">
            <span className="soc-live-status-pill">
              <span className="pulse-dot" style={{ backgroundColor: 'var(--color-purple)' }} />
              <span className="soc-status-text">SYNTHETIC BENCHMARK HARNESS</span>
            </span>
          </div>
          <h2 className="view-title">Adversarial Detection Engine Evaluation</h2>
          <p className="view-subtitle">
            Benchmark performance results returned directly from backend <code className="mono">GET /evaluate</code>.
          </p>
        </div>
        <div className="view-header-actions">
          <button
            className="btn btn-cyber"
            onClick={refreshEvaluation}
            disabled={loading.evaluation || !isOnline}
          >
            <RefreshCw size={14} className={loading.evaluation ? 'animate-spin' : ''} />
            <span>Re-evaluate Scenarios</span>
          </button>
        </div>
      </div>

      {/* Backend Mandatory Synthetic Disclaimer Banner */}
      <div className="cyber-card eval-disclaimer-banner">
        <div className="disclaimer-icon">
          <Info size={22} className="text-amber" />
        </div>
        <div className="disclaimer-content">
          <div className="disclaimer-title">SYNTHETIC BENCHMARK DEMONSTRATION NOTICE</div>
          <div className="disclaimer-text">
            {evaluation?.note || (
              'Synthetic demonstration only. These results are not a validated measure of real-world detection accuracy.'
            )}
          </div>
        </div>
      </div>

      {/* High-level Benchmark Metric Cards */}
      <div className="alerts-stats-row" style={{ marginBottom: 24 }}>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-cyan)' }}>
          <span className="stat-label">Total Test Packets</span>
          <span className="stat-val mono text-cyan">{totalPackets}</span>
          <span className="stat-sub">Across 5 Synthetic Suites</span>
        </div>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-teal)' }}>
          <span className="stat-label">Expected Indicators Matched</span>
          <span className="stat-val mono text-teal">{totalMatched} / {totalExpected}</span>
          <span className="stat-sub">{overallAccuracy}% Signature Recall Rate</span>
        </div>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-rose)' }}>
          <span className="stat-label">Total Alerts Flagged</span>
          <span className="stat-val mono text-rose">{totalAlerts}</span>
          <span className="stat-sub">Adversarial Detections</span>
        </div>
        <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-purple)' }}>
          <span className="stat-label">Test Scenarios</span>
          <span className="stat-val mono text-purple">{scenarioKeys.length}</span>
          <span className="stat-sub">Standardized Attack Vectors</span>
        </div>
      </div>

      {/* Comparative Evaluation Bar Chart */}
      {chartData.length > 0 && (
        <div className="cyber-card eval-chart-card">
          <div className="cyber-card-header">
            <div className="chart-header-left">
              <BarChart3 size={16} className="text-cyan" />
              <div>
                <h3 className="card-heading">Scenario Anomaly Distribution Benchmark</h3>
                <span className="card-subheading">
                  Packets Processed vs Alerts Flagged across all 5 test scenarios
                </span>
              </div>
            </div>
            <span className="badge badge-purple mono">GET /evaluate</span>
          </div>

          <div className="cyber-card-body">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-card-hover)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="packets" name="Packets Processed" fill="var(--color-blue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="alerts" name="Alerts Flagged" fill="var(--color-rose)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Individual Scenario Benchmark Breakdown Cards */}
      <div className="scenario-eval-cards-grid">
        {scenarioKeys.length === 0 ? (
          <div className="empty-eval-box cyber-card">
            <Sparkles size={36} className="text-muted" />
            <p className="font-semibold text-primary">No evaluation report loaded yet.</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={refreshEvaluation}
              disabled={!isOnline}
            >
              Run Evaluation Benchmark
            </button>
          </div>
        ) : (
          scenarioKeys.map((scKey) => {
            const sc = scenariosData[scKey];
            const meta = SCENARIO_METADATA[scKey] || {
              label: scKey,
              title: scKey,
              color: '#38bdf8',
              risk: 'Normal'
            };

            const expected = sc.expected_indicators || [];
            const observed = sc.alert_types || [];
            const matched = sc.expected_indicator_observed || [];

            const isClean = scKey === 'normal';

            return (
              <div
                key={scKey}
                className="cyber-card scenario-eval-card"
                style={{ '--eval-accent': meta.color }}
              >
                <div className="cyber-card-header eval-card-header">
                  <div className="eval-card-header-left">
                    <span className="pulse-dot" style={{ backgroundColor: meta.color }} />
                    <div>
                      <h4 className="eval-card-title">{meta.title || meta.label}</h4>
                      <span className="mono text-xs text-muted">Scenario Key: {scKey}</span>
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${meta.color}20`,
                      color: meta.color,
                      borderColor: `${meta.color}50`
                    }}
                  >
                    {isClean ? 'BASELINE' : `${meta.risk} RISK`}
                  </span>
                </div>

                <div className="cyber-card-body eval-card-body">
                  {/* Summary Metric Counters */}
                  <div className="eval-metrics-row">
                    <div className="eval-metric-item">
                      <span className="eval-metric-lbl">Packets Processed</span>
                      <span className="eval-metric-val mono">{sc.packets_processed}</span>
                    </div>
                    <div className="eval-metric-item">
                      <span className="eval-metric-lbl">Total Alerts</span>
                      <span className={`eval-metric-val mono ${sc.alerts_count > 0 ? 'text-rose' : 'text-teal'}`}>
                        {sc.alerts_count}
                      </span>
                    </div>
                    <div className="eval-metric-item">
                      <span className="eval-metric-lbl">Indicators Matched</span>
                      <span className="eval-metric-val mono text-cyan">
                        {expected.length > 0 ? `${matched.length}/${expected.length}` : 'N/A (Baseline)'}
                      </span>
                    </div>
                  </div>

                  {/* Indicator Breakdown Lists */}
                  <div className="indicators-section">
                    <div className="indicators-group">
                      <span className="indicators-lbl text-muted">
                        Expected Threat Indicators:
                      </span>
                      <div className="indicator-tags-wrap">
                        {expected.length === 0 ? (
                          <span className="indicator-tag-empty mono">None (Nominal)</span>
                        ) : (
                          expected.map((ind) => {
                            const isObserved = matched.includes(ind);
                            return (
                              <span
                                key={ind}
                                className={`indicator-tag mono ${isObserved ? 'tag-matched' : 'tag-missing'}`}
                              >
                                {isObserved ? <Check size={11} className="text-teal" /> : <X size={11} className="text-rose" />}
                                <span>{ind}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="indicators-group">
                      <span className="indicators-lbl text-muted">
                        Observed Alert Types:
                      </span>
                      <div className="indicator-tags-wrap">
                        {observed.length === 0 ? (
                          <span className="indicator-tag-empty mono">Zero alerts triggered</span>
                        ) : (
                          observed.map((obs) => {
                            const alertMeta = getAlertMeta(obs);
                            return (
                              <span
                                key={obs}
                                className="indicator-tag tag-observed mono"
                                style={{ borderColor: alertMeta.color }}
                              >
                                <span className="tag-color-bullet" style={{ backgroundColor: alertMeta.color }} />
                                <span>{obs}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="eval-card-footer">
                  <span className="text-xs text-muted">
                    {isClean
                      ? 'Zero false positives observed in baseline'
                      : `Observed ${matched.length} expected indicator type(s)`}
                  </span>
                  <span className="badge badge-outline mono text-xs">
                    {sc.alerts_count > 0 ? 'DETECTED' : 'PASS'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
