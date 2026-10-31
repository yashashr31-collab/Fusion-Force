import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Wifi,
  AlertTriangle,
  Percent
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export default function MetricCards({ onCardClick }) {
  const { incidents, latestPacket, telemetrySeries } = useSecurity();

  // Calculations
  const totalIncidents = incidents.length;
  const highSeverityCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'high').length;
  const mediumSeverityCount = incidents.filter(i => (i.severity || '').toLowerCase() === 'medium').length;

  // Signal Integrity Index: proportion of clean packets in recent series (or 100% if empty)
  let integrityScore = 100;
  if (telemetrySeries.length > 0) {
    const anomalousCount = telemetrySeries.filter(p => p.hasAnomaly).length;
    integrityScore = Math.max(0, Math.round(((telemetrySeries.length - anomalousCount) / telemetrySeries.length) * 100));
  } else if (totalIncidents > 0) {
    integrityScore = Math.max(10, 100 - (totalIncidents * 3));
  }

  // Current RF telemetry metrics
  const signalStrength = latestPacket?.signal_strength !== undefined && latestPacket?.signal_strength !== null
    ? Number(latestPacket.signal_strength).toFixed(1)
    : '-55.0';

  const latencyMs = latestPacket?.latency_ms !== undefined && latestPacket?.latency_ms !== null
    ? Number(latestPacket.latency_ms).toFixed(1)
    : '40.0';

  const packetLoss = latestPacket?.packet_loss !== undefined && latestPacket?.packet_loss !== null
    ? Number(latestPacket.packet_loss).toFixed(1)
    : '1.0';

  // State classifications
  const isSignalJammed = Number(signalStrength) < -80;
  const isSignalSpoofed = Number(signalStrength) > -50;
  const isLatencySpike = Number(latencyMs) > 100;
  const isHighPacketLoss = Number(packetLoss) > 10;

  const cards = [
    {
      id: 'incidents',
      title: 'TOTAL INCIDENTS',
      value: totalIncidents,
      unit: 'events',
      subtext: `${highSeverityCount} High · ${mediumSeverityCount} Med`,
      icon: ShieldAlert,
      color: totalIncidents > 0 ? 'var(--color-rose)' : 'var(--color-emerald)',
      glow: totalIncidents > 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      trend: totalIncidents > 0 ? 'Threats Recorded' : 'Zero Incidents',
      onClick: () => onCardClick && onCardClick('alerts')
    },
    {
      id: 'integrity',
      title: 'SIGNAL INTEGRITY INDEX',
      value: `${integrityScore}%`,
      unit: '',
      subtext: integrityScore > 85 ? 'Nominal RF Security' : 'Compromised Link Detected',
      icon: integrityScore > 85 ? ShieldCheck : AlertTriangle,
      color: integrityScore > 85 ? 'var(--color-emerald)' : 'var(--color-amber)',
      glow: integrityScore > 85 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
      trend: `${telemetrySeries.length} Packets Monitored`,
      onClick: () => onCardClick && onCardClick('telemetry')
    },
    {
      id: 'signal',
      title: 'RF SIGNAL STRENGTH',
      value: signalStrength,
      unit: 'dBm',
      subtext: isSignalJammed ? 'RF Attenuation / Jammed' : (isSignalSpoofed ? 'Anomalous Signal Boost' : 'Nominal Power Range'),
      icon: Radio,
      color: (isSignalJammed || isSignalSpoofed) ? 'var(--color-amber)' : 'var(--color-cyan)',
      glow: (isSignalJammed || isSignalSpoofed) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 240, 255, 0.2)',
      trend: 'Sensor Node [sensor-01]',
      onClick: () => onCardClick && onCardClick('telemetry')
    },
    {
      id: 'latency',
      title: 'TRANSMISSION LATENCY',
      value: latencyMs,
      unit: 'ms',
      subtext: isLatencySpike ? 'Severe Buffer Congestion' : 'Nominal Packet Propagation',
      icon: Wifi,
      color: isLatencySpike ? 'var(--color-rose)' : 'var(--color-blue)',
      glow: isLatencySpike ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
      trend: isLatencySpike ? 'Critical Latency Spike' : '< 60ms Threshold Target',
      onClick: () => onCardClick && onCardClick('telemetry')
    },
    {
      id: 'loss',
      title: 'PACKET LOSS RATE',
      value: `${packetLoss}%`,
      unit: '',
      subtext: isHighPacketLoss ? 'Link Drop Attack Active' : 'Stable Wireless Telemetry',
      icon: Percent,
      color: isHighPacketLoss ? 'var(--color-rose)' : 'var(--color-emerald)',
      glow: isHighPacketLoss ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      trend: isHighPacketLoss ? 'Dropped Sequences' : 'Nominal Transmission',
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
              <div className="metric-icon-bubble" style={{ color: card.color, backgroundColor: card.glow }}>
                <Icon size={18} />
              </div>
            </div>

            <div className="metric-card-main">
              <span className="metric-value mono">{card.value}</span>
              {card.unit && <span className="metric-unit">{card.unit}</span>}
            </div>

            <div className="metric-card-footer">
              <span className="metric-subtext">{card.subtext}</span>
              <span className="metric-badge mono">{card.trend}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
