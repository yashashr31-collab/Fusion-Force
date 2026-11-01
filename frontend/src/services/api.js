/**
 * GhostWave API Service Layer
 * Interfaces with existing FastAPI backend endpoints when available:
 * - GET /health
 * - GET /incidents
 * - GET /audit
 * - GET /evaluate
 * - GET /simulate/{scenario}
 * - POST /telemetry
 *
 * Automatically falls back to the in-browser standalone engine when
 * running on Firebase Hosting without a deployed backend server.
 */

import {
  VALID_SCENARIOS,
  mockFetchHealth,
  mockFetchIncidents,
  mockFetchAuditLogs,
  mockSimulate,
  mockSubmitTelemetry,
  mockFetchEvaluation,
  mockAnalyzeCsv
} from './mockEngine';

export { VALID_SCENARIOS };

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

// Configurable API Base URL
export function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('ghostwave_api_base_url');
    if (savedUrl && savedUrl !== 'http://127.0.0.1:8000' && savedUrl !== 'http://localhost:8000') {
      return savedUrl.replace(/\/+$/, '');
    }
  }
  return envUrl || 'http://127.0.0.1:8000';
}

export function setApiBaseUrl(url) {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('ghostwave_api_base_url');
    } else {
      localStorage.setItem('ghostwave_api_base_url', url.replace(/\/+$/, ''));
    }
  }
}

// Current mode tracker: 'live' | 'standalone'
let activeMode = 'standalone';

export function getEngineMode() {
  return activeMode;
}

export function setEngineMode(mode) {
  activeMode = mode;
}

/**
 * Standard request helper with timeout and friendly error propagation
 */
async function request(endpoint, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
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
 * Tries live backend; falls back to in-browser standalone engine if unreachable.
 */
export async function fetchHealth() {
  try {
    const res = await request('/health', { method: 'GET' }, 8000);
    if (res && res.status === 'online') {
      activeMode = 'live';
      return { status: 'online', mode: 'live' };
    }
    throw new Error('Unexpected response from health check');
  } catch {
    // Graceful fallback to standalone engine
    activeMode = 'standalone';
    return mockFetchHealth();
  }
}

/**
 * Retrieve incidents log: GET /incidents
 */
export async function fetchIncidents() {
  if (activeMode === 'live') {
    try {
      return await request('/incidents', { method: 'GET' });
    } catch (err) {
      console.warn('Backend /incidents unreachable, using local engine:', err.message);
      activeMode = 'standalone';
    }
  }
  return mockFetchIncidents();
}

/**
 * Retrieve audit log: GET /audit
 */
export async function fetchAuditLogs() {
  if (activeMode === 'live') {
    try {
      return await request('/audit', { method: 'GET' });
    } catch (err) {
      console.warn('Backend /audit unreachable, using local engine:', err.message);
      activeMode = 'standalone';
    }
  }
  return mockFetchAuditLogs();
}

/**
 * Retrieve synthetic evaluation results: GET /evaluate
 */
export async function fetchEvaluation() {
  if (activeMode === 'live') {
    try {
      return await request('/evaluate', { method: 'GET' });
    } catch (err) {
      console.warn('Backend /evaluate unreachable, using local engine:', err.message);
      activeMode = 'standalone';
    }
  }
  return mockFetchEvaluation();
}

/**
 * Run simulation scenario: GET /simulate/{scenario}
 */
export async function runSimulation(scenario) {
  if (!VALID_SCENARIOS.includes(scenario)) {
    throw new Error(`Invalid scenario: "${scenario}". Must be one of: ${VALID_SCENARIOS.join(', ')}`);
  }

  if (activeMode === 'live') {
    try {
      return await request(`/simulate/${encodeURIComponent(scenario)}`, { method: 'GET' });
    } catch (err) {
      console.warn(`Backend /simulate/${scenario} unreachable, using local engine:`, err.message);
      activeMode = 'standalone';
    }
  }
  return mockSimulate(scenario);
}

/**
 * Submit live telemetry packet: POST /telemetry
 */
export async function submitTelemetry(telemetryData) {
  if (activeMode === 'live') {
    try {
      return await request('/telemetry', {
        method: 'POST',
        body: JSON.stringify(telemetryData)
      });
    } catch (err) {
      console.warn('Backend /telemetry unreachable, using local engine:', err.message);
      activeMode = 'standalone';
    }
  }
  return mockSubmitTelemetry(telemetryData);
}

/**
 * Upload and analyze CSV file: POST /analyze-csv (up to 5 MB)
 */
export async function uploadCsvTelemetry(file) {
  if (!file) {
    throw new Error('Please select a CSV file to upload.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('CSV file exceeds maximum allowed size of 5 MB.');
  }

  if (!file.name || !file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please upload a file with .csv extension.');
  }

  if (activeMode === 'live') {
    try {
      const baseUrl = getApiBaseUrl();
      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for up to 5MB

      const response = await fetch(`${baseUrl}/analyze-csv`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let detail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.detail) {
            detail = typeof errJson.detail === 'string' ? errJson.detail : (errJson.detail.message || JSON.stringify(errJson.detail));
          }
        } catch {
          // ignore
        }
        throw new Error(detail);
      }

      return await response.json();
    } catch (err) {
      console.warn('Backend /analyze-csv unreachable or error, falling back to local engine:', err.message);
      // If network error, fall back to mock
      if (err.name === 'TypeError' || err.name === 'AbortError' || err.message.includes('fetch')) {
        activeMode = 'standalone';
      } else {
        throw err;
      }
    }
  }

  return await mockAnalyzeCsv(file);
}

export const API_BASE_URL = getApiBaseUrl();
