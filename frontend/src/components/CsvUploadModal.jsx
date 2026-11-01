import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Filter,
  Search,
  Sparkles,
  Info,
  Check,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import PacketModal from './PacketModal';

export default function CsvUploadModal({ isOpen, onClose }) {
  const { uploadCsvFile, loading } = useSecurity();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [filterSuspiciousOnly, setFilterSuspiciousOnly] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [inspectRowPacket, setInspectRowPacket] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSelectFile = (file) => {
    setErrorMsg(null);
    setAnalysisResult(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Please select a valid .csv file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`File size (${sizeMb} MB) exceeds the maximum allowed limit of 5 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setErrorMsg(null);

    try {
      const result = await uploadCsvFile(selectedFile);
      setAnalysisResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze CSV telemetry.');
    }
  };

  // Generate and download a valid sample CSV file
  const handleDownloadSampleCsv = () => {
    const sampleRows = [
      'timestamp,sequence,source,signal_strength,latency_ms,packet_loss',
      '2026-11-01T11:00:00Z,1,sensor-01,-47.4,46.5,0.7',
      '2026-11-01T11:00:01Z,2,sensor-01,-47.1,45.8,0.6',
      '2026-11-01T11:00:02Z,3,sensor-01,-47.8,47.2,0.8',
      '2026-11-01T11:00:03Z,4,sensor-01,-95.0,420.0,32.0', // Signal Jump + High Latency
      '2026-11-01T11:00:04Z,5,sensor-01,-94.5,415.0,30.5',
      '2026-11-01T11:00:05Z,6,sensor-01,-48.0,48.0,1.0',
      '2026-11-01T11:00:06Z,7,sensor-01,-48.2,46.0,0.8',
      '2026-11-01T11:02:30Z,8,sensor-01,-47.9,45.5,0.7'  // Gap > 10s
    ];

    const blob = new Blob([sampleRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ghostwave-telemetry-sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredResults = (analysisResult?.results || []).filter(item => {
    if (filterSuspiciousOnly && item.status !== 'suspicious') return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchSeq = String(item.sequence).includes(q);
      const matchSource = (item.source || '').toLowerCase().includes(q);
      const matchAlerts = (item.alerts || []).some(a => (a.message || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q));
      if (!matchSeq && !matchSource && !matchAlerts) return false;
    }
    return true;
  });

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div 
          className="modal-container cyber-card csv-modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 840 }}
        >
          {/* Modal Header */}
          <div className="cyber-card-header modal-header">
            <div className="modal-header-left">
              <UploadCloud size={20} className="text-cyan" />
              <div>
                <h3 className="modal-title">Batch Telemetry CSV Analysis</h3>
                <span className="card-subheading">
                  High-throughput RF packet verification &amp; anomaly scanning
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-cyan mono">
                MAX 5 MB
              </span>
              <button className="modal-close-btn" onClick={onClose} aria-label="Close Modal">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="cyber-card-body modal-body" style={{ maxHeight: '78vh' }}>
            {/* Dropzone & File Selection */}
            {!analysisResult && (
              <>
                <div
                  className={`csv-dropzone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {selectedFile ? (
                    <div className="dropzone-file-selected">
                      <FileText size={36} className="text-cyan" />
                      <div className="selected-file-info">
                        <span className="selected-file-name mono font-semibold">{selectedFile.name}</span>
                        <span className="selected-file-size text-muted mono">
                          Size: {formatFileSize(selectedFile.size)} · Limit: 5.00 MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-empty-prompt">
                      <UploadCloud size={40} className="text-cyan" style={{ opacity: 0.8 }} />
                      <div className="dropzone-main-text">
                        <strong>Click to select a CSV file</strong> or drag &amp; drop here
                      </div>
                      <div className="dropzone-sub-text text-muted">
                        Supports telemetry logs up to <strong>5 MB</strong> (up to 10,000 records)
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="sim-feedback-banner sim-feedback-error">
                    <AlertTriangle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Required Schema Specification & Sample Helper */}
                <div className="csv-spec-box cyber-card">
                  <div className="csv-spec-header">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-cyan" />
                      <span className="font-semibold text-xs text-primary">Required CSV Header Schema</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={handleDownloadSampleCsv}
                      title="Download sample telemetry CSV file formatted for GhostWave"
                    >
                      {downloadSuccess ? <Check size={12} className="text-teal" /> : <Download size={12} />}
                      <span>{downloadSuccess ? 'Sample Downloaded' : 'Download Sample CSV'}</span>
                    </button>
                  </div>
                  <div className="csv-spec-cols-row mono text-2xs">
                    <span className="spec-col-tag">timestamp</span>
                    <span className="spec-col-tag">sequence</span>
                    <span className="spec-col-tag">source</span>
                    <span className="spec-col-tag">signal_strength</span>
                    <span className="spec-col-tag">latency_ms</span>
                    <span className="spec-col-tag">packet_loss</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className="btn btn-primary btn-block"
                  style={{ padding: '12px 18px', marginTop: 8 }}
                  disabled={!selectedFile || loading.csvUpload}
                  onClick={handleAnalyze}
                >
                  <Sparkles size={16} className={loading.csvUpload ? 'animate-spin' : ''} />
                  <span>
                    {loading.csvUpload ? 'Verifying Telemetry Stream (Scanning Anomalies)...' : 'Upload & Analyze Telemetry CSV'}
                  </span>
                </button>
              </>
            )}

            {/* Analysis Results View */}
            {analysisResult && (
              <div className="csv-analysis-results animate-fade-in">
                {/* File Overview Banner */}
                <div className="csv-result-banner cyber-card">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-cyan" />
                      <div>
                        <div className="font-semibold text-primary mono text-sm">{analysisResult.filename}</div>
                        <div className="text-xs text-muted">
                          Batch processed {analysisResult.total_records} RF frames through GhostWave multi-layer detector.
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => {
                        setAnalysisResult(null);
                        setSelectedFile(null);
                      }}
                    >
                      Upload Another File
                    </button>
                  </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="alerts-stats-row" style={{ marginBottom: 16 }}>
                  <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-cyan)' }}>
                    <span className="stat-label">Total Records</span>
                    <span className="stat-val mono text-cyan">{analysisResult.total_records}</span>
                    <span className="stat-sub">Parsed Telemetry Frames</span>
                  </div>
                  <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-teal)' }}>
                    <span className="stat-label">Normal / Verified</span>
                    <span className="stat-val mono text-teal">{analysisResult.normal_records}</span>
                    <span className="stat-sub">Passed All Heuristics</span>
                  </div>
                  <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-rose)' }}>
                    <span className="stat-label">Suspicious / Flagged</span>
                    <span className="stat-val mono text-rose">{analysisResult.suspicious_records}</span>
                    <span className="stat-sub">{analysisResult.total_alerts} Total Alerts</span>
                  </div>
                  <div className="alert-stat-card cyber-card" style={{ '--card-accent': 'var(--color-purple)' }}>
                    <span className="stat-label">Alert Signatures</span>
                    <span className="stat-val mono text-purple">{analysisResult.alert_types?.length || 0}</span>
                    <span className="stat-sub">Distinct Attack Classes</span>
                  </div>
                </div>

                {/* Detected Alert Types Pills */}
                {analysisResult.alert_types && analysisResult.alert_types.length > 0 && (
                  <div className="csv-detected-types-bar">
                    <span className="text-xs text-muted font-semibold">Flagged Signatures:</span>
                    <div className="flex gap-2 flex-wrap">
                      {analysisResult.alert_types.map((type) => (
                        <span key={type} className="badge badge-rose mono text-2xs">
                          <AlertTriangle size={10} style={{ display: 'inline', marginRight: 3 }} />
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter and Search Bar for CSV Results */}
                <div className="filter-toolbar-inner" style={{ padding: '8px 0', border: 'none' }}>
                  <div className="search-box-wrapper" style={{ minWidth: 200 }}>
                    <Search size={14} className="search-icon text-muted" />
                    <input
                      type="text"
                      className="cyber-input search-input"
                      placeholder="Search rows by sequence, source, or alert..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      style={{ fontSize: 12, padding: '6px 10px 6px 28px' }}
                    />
                    {tableSearch && (
                      <button className="clear-search-btn" onClick={() => setTableSearch('')}>
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    className={`btn btn-xs ${filterSuspiciousOnly ? 'btn-danger' : 'btn-outline'}`}
                    onClick={() => setFilterSuspiciousOnly(!filterSuspiciousOnly)}
                  >
                    <Filter size={11} />
                    <span>{filterSuspiciousOnly ? 'Suspicious Rows Only' : 'All Rows'}</span>
                  </button>
                </div>

                {/* Table of Processed Rows */}
                <div className="cyber-table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Sequence</th>
                        <th>Source Node</th>
                        <th>Status</th>
                        <th>Detected Anomalies</th>
                        <th>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted" style={{ padding: 24 }}>
                            No rows match current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredResults.map((item, idx) => (
                          <tr key={idx} className={item.status === 'suspicious' ? 'row-anomalous' : ''}>
                            <td className="mono text-xs text-muted">#{item.row}</td>
                            <td className="mono font-semibold">#{item.sequence}</td>
                            <td className="mono text-xs text-highlight">{item.source || 'sensor-01'}</td>
                            <td>
                              {item.status === 'suspicious' ? (
                                <span className="badge badge-rose text-2xs">
                                  {item.alert_count} Alert{item.alert_count > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="badge badge-teal text-2xs">
                                  Normal
                                </span>
                              )}
                            </td>
                            <td style={{ maxWidth: 280 }}>
                              {item.alerts && item.alerts.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {item.alerts.map((a, i) => (
                                    <span key={i} className="text-xs text-rose" style={{ display: 'block' }}>
                                      • <strong>{a.type}:</strong> {a.message}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted">Nominal signal verification</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-outline btn-xs"
                                onClick={() => setInspectRowPacket(item.packet || {
                                  source: item.source,
                                  sequence: item.sequence,
                                  status: item.status,
                                  alerts: item.alerts
                                })}
                                title="Inspect raw packet payload"
                              >
                                <Eye size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <span className="text-muted text-xs">
              GhostWave CSV Ingestion Engine · <strong>Up to 5 MB per batch</strong>
            </span>
            <button className="btn btn-outline btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Packet Details Modal */}
      <PacketModal
        isOpen={!!inspectRowPacket}
        item={inspectRowPacket}
        onClose={() => setInspectRowPacket(null)}
        title="CSV Row Telemetry Payload"
      />
    </>
  );
}

