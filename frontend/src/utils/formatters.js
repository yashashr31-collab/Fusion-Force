/**
 * Utility formatters and helpers for GhostWave cybersecurity telemetry
 */

export function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return String(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return String(ts);
  }
}

export function formatDateTime(ts) {
  if (!ts) return 'N/A';
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return String(ts);
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  } catch {
    return String(ts);
  }
}

export function timeAgo(ts) {
  if (!ts) return 'Never';
  try {
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return String(ts);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  } catch {
    return String(ts);
  }
}

export const ALERT_METADATA = {
  signal_jump: {
    label: 'Signal Jump Anomaly',
    category: 'Integrity',
    description: 'Sudden high-delta variance in RF signal strength exceeding tolerance threshold.',
    color: '#f59e0b',
    badge: 'var(--color-amber)'
  },
  repeated_payload: {
    label: 'Duplicate Fingerprint Replay',
    category: 'Cryptographic Replay',
    description: 'Identical SHA-256 canonical metric payload fingerprint repeated across sequence numbers.',
    color: '#a855f7',
    badge: 'var(--color-purple)'
  },
  missing_sequence: {
    label: 'Sequence Discontinuity Gap',
    category: 'Sequence Integrity',
    description: 'Detected a gap in the consecutive telemetry packet numbering sequence.',
    color: '#06b6d4',
    badge: 'var(--color-cyan)'
  },
  duplicate_sequence: {
    label: 'Sequence Counter Collision',
    category: 'Replay / Injection',
    description: 'A previously registered sequence number was transmitted a second time.',
    color: '#ef4444',
    badge: 'var(--color-rose)'
  },
  missing_telemetry: {
    label: 'Telemetry Heartbeat Blackout',
    category: 'Availability',
    description: 'Sensor packet arrival gap exceeded the 10-second heartbeat window.',
    color: '#eab308',
    badge: 'var(--color-yellow)'
  },
  out_of_order: {
    label: 'Temporal Reversal (Out-of-Order)',
    category: 'Chronological',
    description: 'Packet timestamp moved backwards relative to previously accepted state.',
    color: '#ec4899',
    badge: 'var(--color-pink)'
  },
  future_timestamp: {
    label: 'Clock Skew / Future Timestamp',
    category: 'Chronological',
    description: 'Telemetry timestamp exceeds local system clock by more than 60 seconds.',
    color: '#ef4444',
    badge: 'var(--color-rose)'
  },
  invalid_metric: {
    label: 'Malformed Metric Value',
    category: 'Payload Validation',
    description: 'Metric value is NaN, infinite, or not a valid floating point representation.',
    color: '#ef4444',
    badge: 'var(--color-rose)'
  },
  invalid_payload: {
    label: 'Payload Schema Violation',
    category: 'Protocol',
    description: 'Submitted telemetry fails fundamental JSON object dictionary structure.',
    color: '#ef4444',
    badge: 'var(--color-rose)'
  },
  invalid_timestamp: {
    label: 'Timestamp Parsing Error',
    category: 'Protocol',
    description: 'Timestamp is missing, non-finite, or cannot be parsed from ISO string / epoch.',
    color: '#ef4444',
    badge: 'var(--color-rose)'
  },
  invalid_sequence: {
    label: 'Invalid Sequence Type',
    category: 'Protocol',
    description: 'Sequence must be a non-negative integer identifier.',
    color: '#f59e0b',
    badge: 'var(--color-amber)'
  }
};

export function getAlertMeta(alertType) {
  return (
    ALERT_METADATA[alertType] || {
      label: alertType ? alertType.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN ALERT',
      category: 'General Anomaly',
      description: 'Telemetry observation flagged by the GhostWave detection engine.',
      color: '#94a3b8',
      badge: 'var(--color-slate)'
    }
  );
}

export function getSeverityStyle(severity) {
  const sev = (severity || '').toLowerCase();
  switch (sev) {
    case 'high':
    case 'critical':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
        text: '#f87171',
        dot: '#ef4444',
        label: 'HIGH SEVERITY'
      };
    case 'medium':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        text: '#fbbf24',
        dot: '#f59e0b',
        label: 'MEDIUM SEVERITY'
      };
    case 'low':
      return {
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.4)',
        text: '#38bdf8',
        dot: '#0ea5e9',
        label: 'LOW SEVERITY'
      };
    default:
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.4)',
        text: '#34d399',
        dot: '#10b981',
        label: 'NORMAL'
      };
  }
}
