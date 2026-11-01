/**
 * GhostWave In-Browser Standalone Anomaly Detection & Telemetry Engine
 * Replicates FastAPI backend logic (detector.py, simulator.py, database.py)
 * to provide a seamless, fully interactive experience when running as a
 * static site on Firebase Hosting or when the backend server is not connected.
 */

export const VALID_SCENARIOS = [
  'normal',
  'network_fault',
  'replay',
  'manipulation',
  'missing_data'
];

/**
 * Anomaly detector implementing identical heuristics to GhostWaveDetector (detector.py)
 */
export class GhostWaveDetector {
  constructor() {
    this.lastTimestamp = {};
    this.lastSequence = {};
    this.history = {}; // source -> list of valid metric objects (max 20)
    this.sequences = {}; // source -> Set of sequence numbers
    this.fingerprints = {}; // source -> Set of serialized metric strings
  }

  analyze(data) {
    const alerts = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [{
        type: 'invalid_payload',
        severity: 'high',
        message: 'Telemetry must be a JSON object.'
      }];
    }

    const source = String(data.source || 'unknown');
    const timestamp = data.timestamp;
    const sequence = data.sequence;
    const metrics = data.metrics || {};

    if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics) || Object.keys(metrics).length === 0) {
      return [{
        type: 'invalid_payload',
        severity: 'high',
        message: 'Telemetry metrics are missing or invalid.'
      }];
    }

    // Validate timestamp
    let ts;
    try {
      if (typeof timestamp === 'number' && !isNaN(timestamp)) {
        ts = timestamp;
      } else if (typeof timestamp === 'string') {
        const parsed = Date.parse(timestamp);
        if (isNaN(parsed)) throw new Error('Invalid timestamp');
        ts = parsed / 1000;
      } else {
        throw new Error('Invalid timestamp');
      }

      if (!isFinite(ts)) throw new Error('Non-finite timestamp');
    } catch {
      return [{
        type: 'invalid_timestamp',
        severity: 'high',
        message: 'Timestamp is missing or invalid.'
      }];
    }

    const now = Date.now() / 1000;
    if (ts > now + 60) {
      alerts.push({
        type: 'future_timestamp',
        severity: 'high',
        message: 'Telemetry timestamp is more than 60 seconds in the future.'
      });
    }

    const previousTs = this.lastTimestamp[source];
    if (previousTs !== undefined) {
      if (ts < previousTs) {
        alerts.push({
          type: 'out_of_order',
          severity: 'medium',
          message: 'Timestamp moved backwards.'
        });
      } else if (ts - previousTs > 10) {
        alerts.push({
          type: 'missing_telemetry',
          severity: 'medium',
          message: 'A telemetry gap greater than 10 seconds was detected.'
        });
      }
    }

    const isNewerTimestamp = previousTs === undefined || ts > previousTs;
    if (isNewerTimestamp) {
      this.lastTimestamp[source] = ts;
    }

    // Validate metrics
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value !== 'number' || typeof value === 'boolean' || !isFinite(value)) {
        alerts.push({
          type: 'invalid_metric',
          severity: 'high',
          message: `Metric '${key}' must be a finite number.`
        });
      }
    }

    const validMetrics = {};
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'number' && typeof value !== 'boolean' && isFinite(value)) {
        validMetrics[key] = value;
      }
    }

    // Check sequence
    if (sequence !== undefined && sequence !== null) {
      const seqNum = Number(sequence);
      if (typeof sequence === 'boolean' || !Number.isInteger(seqNum) || seqNum < 0 || String(seqNum) !== String(sequence)) {
        alerts.push({
          type: 'invalid_sequence',
          severity: 'medium',
          message: 'Sequence number must be a non-negative integer.'
        });
      } else {
        if (!this.sequences[source]) this.sequences[source] = new Set();

        if (this.sequences[source].has(seqNum)) {
          alerts.push({
            type: 'duplicate_sequence',
            severity: 'high',
            message: 'A previously observed sequence number was received again.'
          });
        } else {
          const prevSeq = this.lastSequence[source];
          if (prevSeq !== undefined && seqNum > prevSeq + 1) {
            alerts.push({
              type: 'missing_sequence',
              severity: 'medium',
              message: `Sequence gap detected: expected ${prevSeq + 1}, received ${seqNum}.`
            });
          }
          this.sequences[source].add(seqNum);
        }

        if (this.lastSequence[source] === undefined || seqNum > this.lastSequence[source]) {
          this.lastSequence[source] = seqNum;
        }
      }
    }

    // Repeated payload fingerprint
    try {
      const sortedKeys = Object.keys(validMetrics).sort();
      const canonical = JSON.stringify(sortedKeys.reduce((acc, k) => { acc[k] = validMetrics[k]; return acc; }, {}));
      if (!this.fingerprints[source]) this.fingerprints[source] = new Set();

      if (this.fingerprints[source].has(canonical)) {
        alerts.push({
          type: 'repeated_payload',
          severity: 'medium',
          message: 'Identical metric values were observed before; investigate possible replay.'
        });
      } else {
        this.fingerprints[source].add(canonical);
      }
    } catch {
      alerts.push({
        type: 'invalid_payload',
        severity: 'high',
        message: 'Telemetry metrics could not be serialized.'
      });
    }

    // Check signal jump
    if (!this.history[source]) this.history[source] = [];
    const previous = this.history[source].length > 0 ? this.history[source][this.history[source].length - 1] : {};

    for (const [key, value] of Object.entries(validMetrics)) {
      if (key in previous) {
        const oldValue = previous[key];
        if (Math.abs(value - oldValue) > Math.max(20, Math.abs(oldValue) * 0.75)) {
          alerts.push({
            type: 'signal_jump',
            severity: 'medium',
            message: `Metric '${key}' changed sharply from ${oldValue} to ${value}.`
          });
        }
      }
    }

    if (isNewerTimestamp) {
      this.history[source].push({ ...validMetrics });
      if (this.history[source].length > 20) {
        this.history[source].shift();
      }
    }

    return alerts;
  }
}

/**
 * Generate synthetic scenario telemetry packets
 */
export function generateScenario(scenario = 'normal', count = 30) {
  if (!VALID_SCENARIOS.includes(scenario)) {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  // PRNG with fixed seed
  let seed = 42;
  function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function uniform(min, max) {
    return min + random() * (max - min);
  }

  const packets = [];
  const startTime = Date.now() - (count * 1000);

  let signal = -55.0;
  let latency = 40.0;
  let packetLoss = 1.0;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime + i * 1000).toISOString();
    signal += uniform(-2, 2);
    latency = Math.max(5, latency + uniform(-5, 5));
    packetLoss = Math.max(0, Math.min(10, packetLoss + uniform(-1, 1)));

    packets.push({
      source: 'sensor-01',
      timestamp,
      sequence: i + 1,
      metrics: {
        signal_strength: Math.round(signal * 100) / 100,
        latency_ms: Math.round(latency * 100) / 100,
        packet_loss: Math.round(packetLoss * 100) / 100
      }
    });
  }

  const midpoint = Math.floor(count / 2);

  if (scenario === 'network_fault') {
    for (let i = midpoint; i < count; i++) {
      packets[i].metrics.signal_strength = -95.0;
      packets[i].metrics.latency_ms = 450.0;
      packets[i].metrics.packet_loss = 35.0;
    }
  } else if (scenario === 'replay') {
    const half = Math.floor(count / 2);
    if (half >= 1) {
      for (let i = half; i < count; i++) {
        packets[i].metrics = { ...packets[i - half].metrics };
      }
    }
  } else if (scenario === 'manipulation') {
    for (let i = midpoint; i < count; i++) {
      packets[i].metrics.signal_strength = -45.0;
      packets[i].metrics.latency_ms = 5.0;
      packets[i].metrics.packet_loss = 95.0;
    }
  } else if (scenario === 'missing_data') {
    return packets.filter((_, idx) => (idx + 1) % 5 !== 0);
  }

  return packets;
}

// In-Memory Database Storage for Standalone Engine
const globalDetector = new GhostWaveDetector();
const mockIncidents = [];
const mockAuditLogs = [];

function saveMockIncident(packet, alert) {
  const createdAt = new Date().toISOString();
  const id = mockIncidents.length + 1;
  const incident = {
    id,
    created_at: createdAt,
    source: String(packet?.source || 'unknown'),
    alert_type: String(alert?.type || 'unknown'),
    severity: String(alert?.severity || 'unknown'),
    message: String(alert?.message || ''),
    packet: packet || {}
  };
  mockIncidents.unshift(incident);
  if (mockIncidents.length > 200) mockIncidents.pop();

  const auditEntry = {
    id: mockAuditLogs.length + 1,
    created_at: createdAt,
    action: 'incident_created',
    details: {
      source: incident.source,
      alert_type: incident.alert_type,
      severity: incident.severity
    }
  };
  mockAuditLogs.unshift(auditEntry);
  if (mockAuditLogs.length > 200) mockAuditLogs.pop();
}

/**
 * Seed initial baseline incidents & audits so tables look realistic immediately
 */
function initMockData() {
  if (mockIncidents.length > 0) return;
  
  // Run a quick baseline simulation to generate seed data
  const basePackets = generateScenario('normal', 10);
  for (const pkt of basePackets) {
    globalDetector.analyze(pkt);
  }

  // Pre-seed a few historical audit logs
  mockAuditLogs.push(
    {
      id: 1,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      action: 'system_initialized',
      details: { note: 'GhostWave Engine started. RF channel UHF-Band 7 locked.', mode: 'Adversarial Monitored' }
    },
    {
      id: 2,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      action: 'baseline_calibrated',
      details: { baseline_power: '-55.0 dBm', nominal_latency: '40.0 ms', max_jitter: '12 ms' }
    }
  );
}

initMockData();

// Mock API Handlers
export function mockFetchHealth() {
  return { status: 'online', mode: 'standalone_demo' };
}

export function mockFetchIncidents() {
  return [...mockIncidents];
}

export function mockFetchAuditLogs() {
  return [...mockAuditLogs];
}

export function mockSimulate(scenario) {
  const packets = generateScenario(scenario);
  const simDetector = new GhostWaveDetector();
  const results = [];

  for (const packet of packets) {
    const alerts = simDetector.analyze(packet);
    for (const alert of alerts) {
      saveMockIncident(packet, alert);
    }
    results.push({
      packet,
      alerts,
      alert_count: alerts.length
    });
  }

  return {
    scenario,
    packets_processed: packets.length,
    alerts_detected: results.reduce((acc, r) => acc + r.alert_count, 0),
    results
  };
}

export function mockSubmitTelemetry(telemetryData) {
  const alerts = globalDetector.analyze(telemetryData);
  for (const alert of alerts) {
    saveMockIncident(telemetryData, alert);
  }

  return {
    source: telemetryData?.source || 'unknown',
    alerts,
    alert_count: alerts.length,
    status: alerts.length > 0 ? 'alert' : 'normal'
  };
}

export function mockFetchEvaluation() {
  const suspiciousTypes = {
    network_fault: ['signal_jump', 'missing_telemetry', 'invalid_metric', 'repeated_payload'],
    replay: ['repeated_payload', 'duplicate_sequence'],
    manipulation: ['signal_jump', 'invalid_metric', 'repeated_payload'],
    missing_data: ['missing_sequence', 'missing_telemetry']
  };

  const evaluation = {};
  for (const scenario of ['manipulation', 'missing_data', 'network_fault', 'normal', 'replay']) {
    const packets = generateScenario(scenario);
    const testDetector = new GhostWaveDetector();
    const detectedTypes = new Set();
    let totalAlerts = 0;

    for (const packet of packets) {
      const alerts = testDetector.analyze(packet);
      totalAlerts += alerts.length;
      for (const alert of alerts) {
        detectedTypes.add(alert.type);
      }
    }

    const expected = suspiciousTypes[scenario] || [];
    const detectedArr = Array.from(detectedTypes).sort();
    const expectedObserved = detectedArr.filter(t => expected.includes(t));

    evaluation[scenario] = {
      packets_processed: packets.length,
      alerts_count: totalAlerts,
      alert_types: detectedArr,
      expected_indicators: expected.slice().sort(),
      expected_indicator_observed: expectedObserved
    };
  }

  return {
    note: 'Synthetic demonstration only. These results are not a validated measure of real-world detection accuracy.',
    scenarios: evaluation
  };
}

/**
 * Robust CSV parser for batch telemetry verification
 */
function parseCsvText(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        row.push(currentField);
        lines.push(row);
        row = [];
        currentField = '';
      } else if (char === '\n') {
        row.push(currentField);
        lines.push(row);
        row = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || row.length > 0) {
    row.push(currentField);
    lines.push(row);
  }

  return lines;
}

/**
 * Mock implementation of POST /analyze-csv
 * Validates 5 MB file size and parses CSV telemetry
 */
export async function mockAnalyzeCsv(file) {
  if (!file) throw new Error('No file provided.');
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('CSV file must be smaller than 5 MB.');
  }
  if (!file.name || !file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please upload a .csv file.');
  }

  const text = await file.text();
  if (!text || !text.trim()) {
    throw new Error('The uploaded CSV file is empty.');
  }

  const rawRows = parseCsvText(text);
  if (rawRows.length === 0) {
    throw new Error('CSV file must contain a header row.');
  }

  const headerRow = rawRows[0].map(h => (h || '').trim().toLowerCase());
  const requiredColumns = ['timestamp', 'sequence', 'source', 'signal_strength', 'latency_ms', 'packet_loss'];
  const missingCols = requiredColumns.filter(c => !headerRow.includes(c));

  if (missingCols.length > 0) {
    throw new Error(`CSV is missing required telemetry columns: ${missingCols.join(', ')}`);
  }

  // Check duplicate headers
  if (new Set(headerRow).size !== headerRow.length) {
    throw new Error('CSV contains duplicate column names.');
  }

  const csvDetector = new GhostWaveDetector();
  const results = [];
  const alertTypes = new Set();

  for (let i = 1; i < rawRows.length; i++) {
    const rowNumber = i + 1;
    if (rowNumber > 10001) {
      throw new Error('CSV cannot contain more than 10,000 records.');
    }

    const rowValues = rawRows[i];
    // Skip empty lines
    if (rowValues.length === 0 || (rowValues.length === 1 && !rowValues[0].trim())) {
      continue;
    }

    const rowObj = {};
    for (let c = 0; c < headerRow.length; c++) {
      rowObj[headerRow[c]] = rowValues[c] !== undefined ? rowValues[c] : '';
    }

    const sig = parseFloat(rowObj.signal_strength);
    const lat = parseFloat(rowObj.latency_ms);
    const loss = parseFloat(rowObj.packet_loss);
    const seq = parseInt(rowObj.sequence, 10);

    if (isNaN(sig) || isNaN(lat) || isNaN(loss) || isNaN(seq)) {
      throw new Error(`Invalid or missing numeric telemetry value on CSV row ${rowNumber}.`);
    }

    const packet = {
      timestamp: String(rowObj.timestamp || '').trim(),
      sequence: seq,
      source: String(rowObj.source || '').trim() || 'CSV Upload',
      metrics: {
        signal_strength: sig,
        latency_ms: lat,
        packet_loss: loss
      }
    };

    const alerts = csvDetector.analyze(packet);

    for (const alert of alerts) {
      alertTypes.add(alert.type || 'unknown');
      saveMockIncident(packet, alert);
    }

    results.push({
      row: rowNumber,
      source: packet.source,
      sequence: packet.sequence,
      status: alerts.length > 0 ? 'suspicious' : 'normal',
      alerts: alerts,
      alert_count: alerts.length,
      packet: packet
    });
  }

  if (results.length === 0) {
    throw new Error('No telemetry records were found in the CSV.');
  }

  const suspiciousCount = results.filter(r => r.status === 'suspicious').length;

  return {
    filename: file.name,
    total_records: results.length,
    normal_records: results.length - suspiciousCount,
    suspicious_records: suspiciousCount,
    total_alerts: results.reduce((acc, r) => acc + r.alert_count, 0),
    alert_types: Array.from(alertTypes).sort(),
    results: results,
    note: 'Synthetic/demo analysis. An alert indicates suspicious evidence, not proof of a malicious attack.'
  };
}

