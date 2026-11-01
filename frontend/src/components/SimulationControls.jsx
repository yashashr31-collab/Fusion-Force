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
  Info,
  Layers,
  ArrowRight
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
        text: `Scenario "${target}" executed successfully: ${res.packets_processed} frames processed, ${res.alerts_detected} anomalies detected and logged.`
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: `Simulation execution failed: ${err.message}`
      });
    }
  };

  const getScenarioIcon = (iconName) => {
    switch (iconName) {
      case 'Flame': return <Flame size={15} />;
      case 'WifiOff': return <WifiOff size={15} />;
      case 'Copy': return <Copy size={15} />;
      case 'AlertTriangle': return <AlertTriangle size={15} />;
      default: return <Radio size={15} />;
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

        {/* Mandatory Visible Synthetic Data Notice */}
        <div className="synthetic-badge-pill" title="Adversarial evaluation requirement: clearly distinguish synthetic demonstration data">
          <Info size={13} />
          <span>SYNTHETIC DEMONSTRATION DATA</span>
        </div>
      </div>

      <div className="cyber-card-body simulation-body">
        {/* Scenario Selection Grid */}
        <div className="scenario-cards-grid">
          {VALID_SCENARIOS.map((scKey) => {
            const meta = SCENARIO_METADATA[scKey] || {
              label: scKey,
              risk: 'Medium',
              color: '#38bdf8',
              description: 'Synthetic scenario injection'
            };
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
                      borderColor: `${meta.color}45`,
                      backgroundColor: `${meta.color}15`
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
                    <span>{isActiveRunning ? 'Injecting Telemetry...' : `Inject ${meta.label}`}</span>
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

        {/* Simulation Results & Attack Detection Response Bar */}
        {simulationResult && (
          <div className="sim-stats-bar">
            <div className="sim-stat-item">
              <span className="sim-stat-label">Injected Scenario</span>
              <span className="sim-stat-val mono text-cyan font-bold">
                {simulationResult.scenario?.toUpperCase()}
              </span>
            </div>
            <div className="sim-stat-divider" />
            <div className="sim-stat-item">
              <span className="sim-stat-label">Frames Processed</span>
              <span className="sim-stat-val mono">
                {simulationResult.packets_processed} packets
              </span>
            </div>
            <div className="sim-stat-divider" />
            <div className="sim-stat-item">
              <span className="sim-stat-label">Detection Response</span>
              <span className={`sim-stat-val mono ${simulationResult.alerts_detected > 0 ? 'text-rose' : 'text-teal'}`}>
                {simulationResult.alerts_detected > 0 ? `${simulationResult.alerts_detected} Threats Flagged` : '0 Anomalies (Clean)'}
              </span>
            </div>
            <div className="sim-stat-divider" />
            <div className="sim-stat-item">
              <span className="sim-stat-label">Verification Verdict</span>
              <span className="sim-stat-val">
                {simulationResult.alerts_detected > 0 ? (
                  <span className="badge badge-rose">Adversarial Triggered</span>
                ) : (
                  <span className="badge badge-teal">Nominal Verification</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
