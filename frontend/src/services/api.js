/**
 * GhostWave API Service Layer
 * Interfaces strictly with existing FastAPI backend endpoints:
 * - GET /health
 * - GET /incidents
 * - GET /audit
 * - GET /evaluate
 * - GET /simulate/{scenario}
 * - POST /telemetry
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const VALID_SCENARIOS = [
  'normal',
  'network_fault',
  'replay',
  'manipulation',
  'missing_data'
];

export const SCENARIO_METADATA = {
  normal: {
    title: 'Normal Baseline Telemetry',
    label: 'Normal',
    description: 'Clean RF link signals within nominal operational thresholds. No adversarial injections.',
    color: '#10b981', // green
    risk: 'Low',
    icon: 'Radio'
  },
  network_fault: {
    title: 'RF Path Degradation / Fault',
    label: 'Network Fault',
    description: 'Sudden RF attenuation (-95 dBm), severe latency spike (450ms), and 35% packet loss.',
    color: '#f59e0b', // amber
    risk: 'Medium',
    icon: 'WifiOff'
  },
  replay: {
    title: 'Payload Replay Attack',
    label: 'Replay Attack',
    description: 'Cryptographic replay of identical metric fingerprints intercepted from earlier transmission cycles.',
    color: '#a855f7', // purple
    risk: 'High',
    icon: 'Copy'
  },
  manipulation: {
    title: 'Adversarial Telemetry Spoofing',
    label: 'Manipulation',
    description: 'Adversary injects artificial signal boost (-45 dBm), artificially low latency (5ms), and 95% packet loss.',
    color: '#ef4444', // red
    risk: 'Critical',
    icon: 'Flame'
  },
  missing_data: {
    title: 'Sequence Discontinuity / Drop Attack',
    label: 'Missing Data',
    description: 'Periodic packet drop attack (every 5th frame dropped) triggering sequence gaps.',
    color: '#06b6d4', // cyan
    risk: 'Medium',
    icon: 'AlertTriangle'
  }
};

/**
 * Standard request helper with timeout and friendly error propagation
 */
async function request(endpoint, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          detail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // ignore fallback
      }
      throw new Error(detail);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`, { cause: err });
    }
    throw err;
  }
}

/**
 * Health check: GET /health
 */
export async function fetchHealth() {
  return request('/health', { method: 'GET' }, 4000);
}

/**
 * Retrieve incidents log: GET /incidents
 */
export async function fetchIncidents() {
  return request('/incidents', { method: 'GET' });
}

/**
 * Retrieve audit log: GET /audit
 */
export async function fetchAuditLogs() {
  return request('/audit', { method: 'GET' });
}

/**
 * Retrieve synthetic evaluation results: GET /evaluate
 */
export async function fetchEvaluation() {
  return request('/evaluate', { method: 'GET' });
}

/**
 * Run simulation scenario: GET /simulate/{scenario}
 */
export async function runSimulation(scenario) {
  if (!VALID_SCENARIOS.includes(scenario)) {
    throw new Error(`Invalid scenario: "${scenario}". Must be one of: ${VALID_SCENARIOS.join(', ')}`);
  }
  return request(`/simulate/${encodeURIComponent(scenario)}`, { method: 'GET' });
}

/**
 * Submit live telemetry packet: POST /telemetry
 */
export async function submitTelemetry(telemetryData) {
  return request('/telemetry', {
    method: 'POST',
    body: JSON.stringify(telemetryData)
  });
}

export { API_BASE_URL };
