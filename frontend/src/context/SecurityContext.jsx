/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchHealth,
  fetchIncidents,
  fetchAuditLogs,
  fetchEvaluation,
  runSimulation,
  submitTelemetry,
  uploadCsvTelemetry,
  getApiBaseUrl,
  setApiBaseUrl,
  getEngineMode
} from '../services/api';

const SecurityContext = createContext(null);

export function SecurityProvider({ children }) {
  // Backend & Engine State
  const [isOnline, setIsOnline] = useState(true);
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const [engineMode, setEngineMode] = useState('standalone'); // 'live' | 'standalone'
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [backendError, setBackendError] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());

  // Security Data
  const [incidents, setIncidents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [activeScenario, setActiveScenario] = useState('normal');

  // Telemetry Time Series (for live charts)
  const [telemetrySeries, setTelemetrySeries] = useState([]);
  const [latestPacket, setLatestPacket] = useState(null);
  const [latestAlerts, setLatestAlerts] = useState([]);

  // Loading States
  const [loading, setLoading] = useState({
    health: false,
    incidents: false,
    audit: false,
    evaluation: false,
    simulation: false,
    telemetrySubmit: false,
    csvUpload: false
  });

  // Polling Settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState(8);
  const autoRefreshTimerRef = useRef(null);
  const hasInitializedBaselineRef = useRef(false);

  /**
   * Check Backend Health: GET /health
   */
  const checkHealth = useCallback(async () => {
    setLoading(prev => ({ ...prev, health: true }));
    try {
      const res = await fetchHealth();
      if (res && res.status === 'online') {
        setIsOnline(true);
        setBackendStatus('online');
        setBackendError(null);
        const mode = res.mode || getEngineMode();
        setEngineMode(mode);
        setIsLiveBackend(mode === 'live');
      } else {
        setIsOnline(true);
        setIsLiveBackend(false);
        setEngineMode('standalone');
        setBackendStatus('online');
      }
    } catch (err) {
      setIsOnline(true);
      setIsLiveBackend(false);
      setEngineMode('standalone');
      setBackendStatus('online');
      setBackendError(err.message || null);
    } finally {
      setLastCheckTime(new Date());
      setLoading(prev => ({ ...prev, health: false }));
    }
  }, []);

  /**
   * Update Custom API Base URL
   */
  const updateApiBaseUrl = useCallback(async (newUrl) => {
    setApiBaseUrl(newUrl);
    setApiUrl(getApiBaseUrl());
    await checkHealth();
    await Promise.allSettled([
      refreshIncidents(),
      refreshAuditLogs(),
      refreshEvaluation()
    ]);
  }, [checkHealth]);

  /**
   * Fetch Incidents: GET /incidents
   */
  const refreshIncidents = useCallback(async () => {
    setLoading(prev => ({ ...prev, incidents: true }));
    try {
      const data = await fetchIncidents();
      if (Array.isArray(data)) {
        setIncidents(data);
      }
    } catch (err) {
      console.warn('Failed to load incidents:', err.message);
    } finally {
      setLoading(prev => ({ ...prev, incidents: false }));
    }
  }, []);

  /**
   * Fetch Audit Logs: GET /audit
   */
  const refreshAuditLogs = useCallback(async () => {
    setLoading(prev => ({ ...prev, audit: true }));
    try {
      const data = await fetchAuditLogs();
      if (Array.isArray(data)) {
        setAuditLogs(data);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err.message);
    } finally {
      setLoading(prev => ({ ...prev, audit: false }));
    }
  }, []);

  /**
   * Fetch Evaluation Results: GET /evaluate
   */
  const refreshEvaluation = useCallback(async () => {
    setLoading(prev => ({ ...prev, evaluation: true }));
    try {
      const data = await fetchEvaluation();
      setEvaluation(data);
    } catch (err) {
      console.warn('Failed to load evaluation:', err.message);
    } finally {
      setLoading(prev => ({ ...prev, evaluation: false }));
    }
  }, []);

  /**
   * Refresh all backend core data
   */
  const refreshAll = useCallback(async () => {
    await checkHealth();
    await Promise.allSettled([
      refreshIncidents(),
      refreshAuditLogs()
    ]);
  }, [checkHealth, refreshIncidents, refreshAuditLogs]);

  /**
   * Trigger Attack / Telemetry Simulation: GET /simulate/{scenario}
   */
  const triggerSimulation = useCallback(async (scenario) => {
    setLoading(prev => ({ ...prev, simulation: true }));
    setActiveScenario(scenario);
    try {
      const result = await runSimulation(scenario);
      setSimulationResult(result);

      // Extract telemetry series from simulation results for charts
      if (result && Array.isArray(result.results)) {
        const series = result.results.map((r, idx) => {
          const pkt = r.packet || {};
          const metrics = pkt.metrics || {};
          const alertCount = r.alert_count || (r.alerts ? r.alerts.length : 0);
          return {
            index: idx + 1,
            sequence: pkt.sequence !== undefined ? pkt.sequence : idx + 1,
            timestamp: pkt.timestamp,
            signal_strength: metrics.signal_strength !== undefined ? metrics.signal_strength : null,
            latency_ms: metrics.latency_ms !== undefined ? metrics.latency_ms : null,
            packet_loss: metrics.packet_loss !== undefined ? metrics.packet_loss : null,
            alerts: r.alerts || [],
            alertCount: alertCount,
            hasAnomaly: alertCount > 0,
            source: pkt.source || 'sensor-01'
          };
        });

        setTelemetrySeries(series);
        if (series.length > 0) {
          const lastItem = series[series.length - 1];
          setLatestPacket(lastItem);
          setLatestAlerts(lastItem.alerts || []);
        }
      }

      // Re-fetch incidents and audit logs to capture newly recorded events
      await Promise.allSettled([
        refreshIncidents(),
        refreshAuditLogs()
      ]);

      return result;
    } catch (err) {
      console.error('Simulation error:', err);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, simulation: false }));
    }
  }, [refreshIncidents, refreshAuditLogs]);

  /**
   * Submit single telemetry packet: POST /telemetry
   */
  const submitCustomPacket = useCallback(async (packet) => {
    setLoading(prev => ({ ...prev, telemetrySubmit: true }));
    try {
      const response = await submitTelemetry(packet);
      
      const newPoint = {
        index: (telemetrySeries.length > 0 ? telemetrySeries[telemetrySeries.length - 1].index : 0) + 1,
        sequence: packet.sequence,
        timestamp: packet.timestamp || new Date().toISOString(),
        signal_strength: packet.metrics?.signal_strength ?? null,
        latency_ms: packet.metrics?.latency_ms ?? null,
        packet_loss: packet.metrics?.packet_loss ?? null,
        alerts: response.alerts || [],
        alertCount: response.alert_count || (response.alerts ? response.alerts.length : 0),
        hasAnomaly: (response.alerts && response.alerts.length > 0),
        source: packet.source || 'custom-sensor'
      };

      setTelemetrySeries(prev => [...prev.slice(-29), newPoint]);
      setLatestPacket(newPoint);
      setLatestAlerts(response.alerts || []);

      if (response.alerts && response.alerts.length > 0) {
        refreshIncidents();
        refreshAuditLogs();
      }

      return response;
    } catch (err) {
      console.error('Custom telemetry submission error:', err);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, telemetrySubmit: false }));
    }
  }, [telemetrySeries, refreshIncidents, refreshAuditLogs]);

  /**
   * Batch Upload & Analyze CSV File (up to 5 MB): POST /analyze-csv
   */
  const uploadCsvFile = useCallback(async (file) => {
    setLoading(prev => ({ ...prev, csvUpload: true }));
    try {
      const response = await uploadCsvTelemetry(file);

      // If results returned, update telemetrySeries preview for live visual feedback
      if (response && Array.isArray(response.results) && response.results.length > 0) {
        const previewRows = response.results.slice(-30).map((r, idx) => {
          const pkt = r.packet || {};
          const metrics = pkt.metrics || {};
          return {
            index: idx + 1,
            sequence: r.sequence !== undefined ? r.sequence : (pkt.sequence !== undefined ? pkt.sequence : idx + 1),
            timestamp: pkt.timestamp || new Date().toISOString(),
            signal_strength: metrics.signal_strength !== undefined ? metrics.signal_strength : null,
            latency_ms: metrics.latency_ms !== undefined ? metrics.latency_ms : null,
            packet_loss: metrics.packet_loss !== undefined ? metrics.packet_loss : null,
            alerts: r.alerts || [],
            alertCount: r.alert_count || (r.alerts ? r.alerts.length : 0),
            hasAnomaly: (r.alert_count > 0 || (r.alerts && r.alerts.length > 0)),
            source: r.source || pkt.source || 'CSV Upload'
          };
        });

        if (previewRows.length > 0) {
          setTelemetrySeries(previewRows);
          const lastItem = previewRows[previewRows.length - 1];
          setLatestPacket(lastItem);
          setLatestAlerts(lastItem.alerts || []);
        }
      }

      // Refresh incidents and audit logs
      await Promise.allSettled([
        refreshIncidents(),
        refreshAuditLogs()
      ]);

      return response;
    } catch (err) {
      console.error('CSV upload analysis error:', err);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, csvUpload: false }));
    }
  }, [refreshIncidents, refreshAuditLogs]);

  // Initial load: check health, seed baseline, populate data
  useEffect(() => {
    let isMounted = true;
    (async () => {
      await checkHealth();
      if (isMounted) {
        await Promise.allSettled([
          refreshIncidents(),
          refreshAuditLogs(),
          refreshEvaluation()
        ]);
        if (!hasInitializedBaselineRef.current) {
          hasInitializedBaselineRef.current = true;
          triggerSimulation('normal').catch(() => {});
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [checkHealth, refreshIncidents, refreshAuditLogs, refreshEvaluation, triggerSimulation]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || pollIntervalSeconds <= 0) {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
      return;
    }

    autoRefreshTimerRef.current = setInterval(() => {
      refreshAll();
    }, pollIntervalSeconds * 1000);

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, pollIntervalSeconds, refreshAll]);

  const value = {
    // Connection & Engine
    isOnline,
    isLiveBackend,
    engineMode,
    backendStatus,
    backendError,
    lastCheckTime,
    apiBaseUrl: apiUrl,
    updateApiBaseUrl,
    checkHealth,

    // Data
    incidents,
    auditLogs,
    evaluation,
    simulationResult,
    activeScenario,
    telemetrySeries,
    latestPacket,
    latestAlerts,

    // Controls & Actions
    loading,
    refreshAll,
    refreshIncidents,
    refreshAuditLogs,
    refreshEvaluation,
    triggerSimulation,
    submitCustomPacket,
    uploadCsvFile,

    // Polling settings
    autoRefresh,
    setAutoRefresh,
    pollIntervalSeconds,
    setPollIntervalSeconds
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
