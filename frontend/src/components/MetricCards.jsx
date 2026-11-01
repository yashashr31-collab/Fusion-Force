import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Wifi,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export default function MetricCards({ onCardClick }) {
  const { incidents, latestPacket, telemetrySeries } = useSecurity();

  // Calculations
  const totalIncidents = incidents.length;
  const highSeverityCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'high').length;
  const mediumSeverityCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'medium').length;

  // Signal Integrity Score
  let integrityScore = 100;
  if (telemetrySeries.length > 0) {
    const anomalousCount = telemetrySeries.filter(p => p.hasAnomaly).length;
    integrityScore = Math.max(0, Math.round(((telemetrySeries.length - anomalousCount) / telemetrySeries.length) * 100));
  } else if (totalIncidents > 0) {
    integrityScore = Math.max(10, 100 - (totalIncidents * 3));
  }

  // RF Metrics with realistic nominal defaults matching specification
  const signalStrength = latestPacket?.signal_strength !== undefined && latestPacket?.signal_strength !== null
    ? Number(latestPacket.signal_strength).toFixed(1)
    : '-47.4';

  const latencyMs = latestPacket?.latency_ms !== undefined && latestPacket?.latency_ms !== null
    ? Number(latestPacket.latency_ms).toFixed(1)
    : '46.5';

  const packetLoss = latestPacket?.packet_loss !== undefined && latestPacket?.packet_loss !== null
    ? Number(latestPacket.packet_loss).toFixed(1)
    : '0.7';

  // Condition checks
  const numSignal = Number(signalStrength);
  const isSignalJammed = numSignal < -80;
  const isSignalSpoofed = numSignal > -50;
  const numLatency = Number(latencyMs);
  const isLatencySpike = numLatency > 80;
  const numLoss = Number(packetLoss);
  const isHighPacketLoss = numLoss > 5.0;

  const cards = [
    {
      id: 'incidents',
      title: 'TOTAL INCIDENTS',
      value: totalIncidents,
      unit: 'events',
      subtext: `${highSeverityCount} High · ${mediumSeverityCount} Med`,
      icon: ShieldAlert,
      color: totalIncidents > 0 ? 'var(--color-rose)' : 'var(--color-teal)',
      glow: totalIncidents > 0 ? 'rgba(255, 69, 96, 0.15)' : 'rgba(0, 214, 160, 0.15)',
      trend: totalIncidents > 0 ? `${totalIncidents} Anomalies` : 'Zero Incidents',
      trendType: totalIncidents > 0 ? 'negative' : 'positive',
      onClick: () => onCardClick && onCardClick('alerts')
    },
    {
      id: 'integrity',
      title: 'SIGNAL INTEGRITY INDEX',
      value: `${integrityScore}%`,
      unit: '',
      subtext: integrityScore > 85 ? 'Normal RF Security' : 'Compromised Link Detected',
      icon: integrityScore > 85 ? ShieldCheck : AlertTriangle,
      color: integrityScore > 85 ? 'var(--color-teal)' : 'var(--color-amber)',
      glow: integrityScore > 85 ? 'rgba(0, 214, 160, 0.15)' : 'rgba(255, 176, 32, 0.15)',
      trend: `${telemetrySeries.length > 0 ? telemetrySeries.length : 30} Packets Monitored`,
      trendType: integrityScore > 85 ? 'positive' : 'negative',
      onClick: () => onCardClick && onCardClick('telemetry')
    },
    {
      id: 'signal',
      title: 'RF SIGNAL STRENGTH',
      value: signalStrength,
      unit: 'dBm',
      subtext: isSignalJammed
        ? 'RF Attenuation / Jammed'
        : (isSignalSpoofed ? 'Anomalous Signal Boost' : 'Nominal Power Range'),
      icon: Radio,
      color: isSignalJammed ? 'var(--color-rose)' : (isSignalSpoofed ? 'var(--color-amber)' : 'var(--color-cyan)'),
      glow: isSignalJammed ? 'rgba(255, 69, 96, 0.15)' : (isSignalSpoofed ? 'rgba(255, 176, 32, 0.15)' : 'rgba(0, 229, 255, 0.15)'),
      trend: 'Sensor Node [sensor-01]',
      trendType: isSignalJammed || isSignalSpoofed ? 'warning' : 'neutral',
      onClick: () => onCardClick && onCardClick('telemetry')
    },
    {
      id: 'latency',
      title: 'TRANSMISSION LATENCY',
      value: latencyMs,
      unit: 'ms',
      subtext: isLatencySpike ? 'Buffer Congestion Spike' : 'Nominal Packet Propagation',
      icon: Wifi,
      color: isLatencySpike ? 'var(--color-rose)' : 'var(--color-blue)',
      glow: isLatencySpike ? 'rgba(255, 69, 96, 0.15)' : 'rgba(56, 189, 248, 0.15)',
      trend: isLatencySpike ? '> 80ms Alarm' : '< 60ms Threshold Target',
      trendType: isLatencySpike ? 'negative' : 'positive',
      onClick: () => onCardClick && onCardClick('telemetry')
    },
    {
      id: 'loss',
      title: 'PACKET LOSS RATE',
      value: `${packetLoss}%`,
      unit: '',
      subtext: isHighPacketLoss ? 'Link Drop Attack Active' : 'Stable Wireless Telemetry',
      icon: Activity,
      color: isHighPacketLoss ? 'var(--color-rose)' : 'var(--color-teal)',
      glow: isHighPacketLoss ? 'rgba(255, 69, 96, 0.15)' : 'rgba(0, 214, 160, 0.15)',
      trend: isHighPacketLoss ? 'Drop Warning' : 'Nominal Transmission',
      trendType: isHighPacketLoss ? 'negative' : 'positive',
      onClick: () => onCardClick && onCardClick('telemetry')
    }
  ];

  return (
    <div className="metric-cards-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="metric-card cyber-card"
            onClick={card.onClick}
            role="button"
            tabIndex={0}
            style={{ '--card-accent': card.color }}
          >
            <div className="metric-card-top">
              <span className="metric-card-title">{card.title}</span>
              <div
                className="metric-icon-bubble"
                style={{
                  color: card.color,
                  backgroundColor: card.glow,
                  border: `1px solid ${card.color}35`
                }}
              >
                <Icon size={16} />
              </div>
            </div>

            <div className="metric-card-main">
              <span className="metric-value mono">{card.value}</span>
              {card.unit && <span className="metric-unit mono">{card.unit}</span>}
            </div>

            <div className="metric-card-footer">
              <span className="metric-subtext">{card.subtext}</span>
              <div className="metric-trend-row">
                <span className={`metric-trend-pill trend-${card.trendType || 'neutral'} mono`}>
                  {card.trendType === 'positive' && <ArrowDownRight size={10} style={{ transform: 'rotate(-45deg)' }} />}
                  {card.trendType === 'negative' && <ArrowUpRight size={10} />}
                  {card.trend}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
