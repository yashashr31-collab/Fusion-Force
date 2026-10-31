import { useState } from 'react';
import {
  Play,
  Flame,
  WifiOff,
  Copy,
  AlertTriangle,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertOctagon,
  Info
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { VALID_SCENARIOS, SCENARIO_METADATA } from '../services/api';

export default function SimulationControls() {
  const { triggerSimulation, loading, activeScenario, simulationResult, isOnline } = useSecurity();
  const [selectedScenario, setSelectedScenario] = useState('network_fault');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const isSimulating = loading.simulation;

  const handleRunSimulation = async (scenarioKey) => {
    const target = scenarioKey || selectedScenario;
    setSelectedScenario(target);
    setFeedbackMsg(null);
    try {
      const res = await triggerSimulation(target);
      setFeedbackMsg({
        type: 'success',
        text: `Scenario "${target}" completed: ${res.packets_processed} packets processed, ${res.alerts_detected} anomalies detected.`
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: `Simulation failed: ${err.message}`
      });
    }
  };

  const getScenarioIcon = (iconName) => {
    switch (iconName) {
      case 'Flame': return <Flame size={16} />;
      case 'WifiOff': return <WifiOff size={16} />;
      case 'Copy': return <Copy size={16} />;
      case 'AlertTriangle': return <AlertTriangle size={16} />;
      default: return <Radio size={16} />;
    }
  };

  return (
    <div className="simulation-controls-container cyber-card">
      <div className="cyber-card-header simulation-header">
        <div className="simulation-title-group">
          <div className="sim-icon-shield">
            <Sparkles size={16} className="text-cyan" />
          </div>
          <div>
            <h3 className="sim-title">Adversarial Attack Simulation Engine</h3>
            <p className="sim-subtitle">
              Inject synthetic telemetry scenarios via <code className="mono">GET /simulate/&#123;scenario&#125;</code>
            </p>
          </div>
        </div>

        {/* Clear label for synthetic demonstration data */}
        <div className="synthetic-badge-pill" title="Backend requirement: clearly labeled synthetic demonstration data">
          <Info size={12} />
          <span>SYNTHETIC DEMONSTRATION DATA</span>
        </div>
      </div>

      <div className="cyber-card-body simulation-body">
        {/* Scenario Selector Grid */}
        <div className="scenario-cards-grid">
          {VALID_SCENARIOS.map((scKey) => {
            const meta = SCENARIO_METADATA[scKey];
            const isSelected = selectedScenario === scKey;
            const isActiveRunning = activeScenario === scKey && isSimulating;

            return (
              <div
                key={scKey}
                className={`scenario-choice-card ${isSelected ? 'selected' : ''} ${activeScenario === scKey ? 'active-target' : ''}`}
                onClick={() => setSelectedScenario(scKey)}
                role="button"
                tabIndex={0}
                style={{ '--scenario-accent': meta.color }}
              >
                <div className="scenario-card-top">
                  <div className="scenario-icon-tag" style={{ color: meta.color }}>
                    {getScenarioIcon(meta.icon)}
                    <span className="scenario-name-badge">{meta.label}</span>
                  </div>
                  <span
                    className="scenario-risk-pill"
                    style={{
                      color: meta.color,
                      borderColor: `${meta.color}44`,
                      background: `${meta.color}15`
                    }}
                  >
                    {meta.risk} Risk
                  </span>
                </div>

                <div className="scenario-desc-text">
                  {meta.description}
                </div>

                <div className="scenario-card-action">
                  <button
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'} scenario-btn`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunSimulation(scKey);
                    }}
                    disabled={isSimulating || !isOnline}
                  >
                    <Play size={12} className={isActiveRunning ? 'animate-spin' : ''} />
                    <span>{isActiveRunning ? 'Injecting...' : `Simulate ${meta.label}`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result Feedback Banner */}
        {feedbackMsg && (
          <div className={`sim-feedback-banner ${feedbackMsg.type === 'error' ? 'sim-feedback-error' : 'sim-feedback-success'}`}>
            {feedbackMsg.type === 'error' ? <AlertOctagon size={16} /> : <CheckCircle2 size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Last Simulation Stats Bar */}
        {simulationResult && (
          <div className="sim-stats-bar">
            <div className="sim-stat-item">
              <span className="sim-stat-label">Last Scenario Executed</span>
              <span className="sim-stat-val mono text-cyan">{simulationResult.scenario?.toUpperCase()}</span>
            </div>
            <div className="sim-stat-divider" />
            <div className="sim-stat-item">
              <span className="sim-stat-label">Packets Processed</span>
              <span className="sim-stat-val mono">{simulationResult.packets_processed} frames</span>
            </div>
            <div className="sim-stat-divider" />
            <div className="sim-stat-item">
              <span className="sim-stat-label">Anomalies Detected</span>
              <span className={`sim-stat-val mono ${simulationResult.alerts_detected > 0 ? 'text-rose' : 'text-emerald'}`}>
                {simulationResult.alerts_detected} alerts
              </span>
            </div>
            <div className="sim-stat-divider" />
            <div className="sim-stat-item">
              <span className="sim-stat-label">Detection Status</span>
              <span className="sim-stat-val">
                {simulationResult.alerts_detected > 0 ? (
                  <span className="badge badge-rose">Flagged &amp; Logged</span>
                ) : (
                  <span className="badge badge-emerald">Nominal Baseline</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
