# GhostWave (Fusion-Force) — Adversarially Robust Signal Telemetry Verification

[![BYTEFORGE 2026](https://img.shields.io/badge/BYTEFORGE-2026-00E5FF?style=for-the-badge&logo=shield)](https://fusion-force.web.app/)
[![Live Deployment](https://img.shields.io/badge/Live_Site-fusion--force.web.app-00D6A0?style=for-the-badge&logo=firebase)](https://fusion-force.web.app/)
[![Backend API](https://img.shields.io/badge/Backend_API-Render_FastAPI-FFB020?style=for-the-badge&logo=fastapi)](https://fusion-force.onrender.com/health)
[![Python Version](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![React Version](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Vite Version](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)

> **Enterprise-grade Security Operations Center (SOC) dashboard and real-time verification engine designed to detect, classify, and mitigate adversarial manipulations in mission-critical wireless RF telemetry streams.**

---

## 🌐 Live Deployments

| Component | URL | Platform | Status |
| :--- | :--- | :--- | :--- |
| **SOC Dashboard (Frontend)** | [https://fusion-force.web.app/](https://fusion-force.web.app/) | Firebase Hosting (`safesyn-b1b29`) | ![Online](https://img.shields.io/badge/Online-00D6A0?style=flat-square) |
| **FastAPI Verification Engine** | [https://fusion-force.onrender.com](https://fusion-force.onrender.com) | Render Web Service (FastAPI + Uvicorn) | ![Online](https://img.shields.io/badge/Online-00D6A0?style=flat-square) |
| **API Health Probe** | [https://fusion-force.onrender.com/health](https://fusion-force.onrender.com/health) | REST API Endpoint | `{"status": "online"}` |

---

## 📑 Table of Contents

- [Problem Statement & Overview](#-problem-statement--overview)
- [Multi-Layer Verification Architecture](#-multi-layer-verification-architecture)
- [Threat & Attack Scenario Matrix](#-threat--attack-scenario-matrix)
- [SOC Dashboard Modules](#-soc-dashboard-modules)
- [Batch CSV Telemetry Ingestion (Up to 5 MB)](#-batch-csv-telemetry-ingestion-up-to-5-mb)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Project Structure](#-project-structure)
- [Local Development & Setup Guide](#-local-development--setup-guide)
- [Deployment Guide](#-deployment-guide)
- [Synthetic Demonstration Notice](#-synthetic-demonstration-notice)

---

## 🎯 Problem Statement & Overview

Modern mission-critical systems — including unmanned aerial vehicles (UAVs), satellite downlinks, tactical military communications, and critical telemetry sensors — rely heavily on continuous wireless RF signal streams. 

However, wireless telemetry channels are inherently vulnerable to physical and cyber-physical adversarial threats:
1. **Signal Spoofing & Injection:** Malicious actors inject falsified sensor readings with anomalous carrier boosts or spoofed physical parameters.
2. **Replay Attacks:** Adversaries capture legitimate telemetry frames and retransmit identical metric signatures at a later time with forged sequence numbers.
3. **Temporal Desynchronization & Clock Drift:** Attackers manipulate timestamps forward (future skews) or backward (time rollback) to bypass time-based validations.
4. **Denial-of-Service & Jamming:** Intentional RF path degradation, severe buffer congestion, and packet dropping.

**GhostWave** provides an adversarially robust defense pipeline that continuously verifies the integrity, monotonicity, chronological progression, and physical power dynamics of incoming RF telemetry packets in real time.

---

## 🛡️ Multi-Layer Verification Architecture

GhostWave operates a four-stage sequential defense pipeline where every incoming packet must clear all integrity stages:

```
 Incoming RF Telemetry Stream (JSON or CSV batch up to 5 MB)
                          │
                          ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 1: Chronological & Monotonic Verification            │
 │  • Future timestamp skew detection (> 60s ahead)           │
 │  • Backward time rollback isolation                         │
 │  • Sequence monotonicity (detects gaps: expected N, got M) │
 │  • Duplicate sequence number detection                      │
 └────────────────────────┬────────────────────────────────────┘
                          │ Passed / Flagged
                          ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 2: Cryptographic Payload Fingerprinting              │
 │  • Canonical JSON serialization of metrics                  │
 │  • Dynamic SHA-256 payload history cache                    │
 │  • Repeated payload detection (identical metrics replayed) │
 └────────────────────────┬────────────────────────────────────┘
                          │ Passed / Flagged
                          ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 3: RF Physical Layer Anomaly Detection               │
 │  • Adaptive delta thresholding (|Δ| > 20 dBm or > 75% shift)│
 │  • Jamming detection: Signal power dropped below -80 dBm    │
 │  • Extreme latency spikes (> 100ms) & packet loss (> 10%)   │
 └────────────────────────┬────────────────────────────────────┘
                          │ Passed / Flagged
                          ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 4: Immutable Audit Ledger & Incident Database        │
 │  • SQLite persistence with microsecond UTC timestamps       │
 │  • Automated threat classification (HIGH / MEDIUM severity) │
 │  • Zero-omission cryptographic ledger audit entries         │
 └─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Threat & Attack Scenario Matrix

GhostWave features a built-in adversarial attack simulation engine accessible via `GET /simulate/{scenario}` and executable from the dashboard:

| Scenario Key | Attack Designation | Primary Threat Signature | Risk Level | Anomaly Detection Trigger |
| :--- | :--- | :--- | :--- | :--- |
| `normal` | **Nominal Baseline** | Clean RF transmission | `Low` | Zero alerts triggered. Verified clean baseline. |
| `network_fault` | **RF Path Degradation** | High latency & packet drop | `Medium` | `signal_jump`, `missing_telemetry` |
| `replay` | **Payload Replay Attack** | Re-broadcast identical metric payload | `High` | `repeated_payload`, `duplicate_sequence` |
| `manipulation` | **Adversarial Spoofing** | Artificial signal boost & 95% drop | `Critical` | `signal_jump`, `invalid_metric` |
| `missing_data` | **Sequence Drop Attack** | Periodic frames dropped (seq gap) | `Medium` | `missing_sequence`, `missing_telemetry` |

---

## 🖥️ SOC Dashboard Modules

The frontend is an enterprise-grade Cyber Defence SOC inspired by CrowdStrike Falcon, Darktrace Cyber AI, and Palo Alto Cortex XSIAM:

### 1. Top Navigation Bar
- **Brand Identity:** Dual-tone shield identity with `BYTEFORGE 2026` badge.
- **Dynamic Engine Status Pill:** Displays `BACKEND ONLINE` (pulsing neon teal) when connected to the live FastAPI backend, or `IN-BROWSER ENGINE` (pulsing electric cyan) when operating in client-side standalone mode.
- **Active Attack Indicator:** Displays a real-time warning whenever an adversarial simulation scenario is active.
- **Operational Controls:** 8-second auto-polling pause/resume toggle, manual refresh with spin animation, and external API settings modal.

### 2. Sidebar Navigation & Active Sensor Node Panel
- **Navigation:** 6 dedicated views (`Overview`, `Live Telemetry`, `Security Alerts`, `Incident Timeline`, `Audit Logs`, `Evaluation`) with cyan indicators and animated `LIVE` and `BENCH` badges.
- **Active Sensor Node:** Real-time information panel for `sensor-01` (`RF-BAND-7 [UHF]`, `Adversarial Monitored`) with an animated 3-bar RF carrier wave indicator.

### 3. Overview Dashboard & Balanced 5-Metric Row
A balanced 5-column responsive metric grid:
- **Total Incidents:** Real-time count of detected threats with high/medium breakdown.
- **Signal Integrity Index:** Proportion of clean packets monitored in the active window.
- **RF Signal Strength:** Carrier power measurement with nominal range verification.
- **Transmission Latency:** Packet propagation latency against the `< 60ms` threshold.
- **Packet Loss Rate:** Stability indicator tracking wireless link drop rates.
- **Dual Correlation Grid:** Recharts AreaChart correlating Signal Power (dBm) and Latency (ms) alongside the recent security incidents feed.

### 4. Live Telemetry Analysis & Adversarial Packet Injector
- Multi-metric view tabs: `Multi-Metric`, `Signal Power (dBm)`, `Latency (ms)`, `Packet Loss (%)`.
- Interactive custom packet injection tool (`POST /telemetry`) with presets for Nominal, Signal Jump, Future Clock, Time Rollback, and Congestion Spikes.
- Continuous packet frame ledger with filterable flags.

### 5. Security Alerts & Incident Monitoring
- Searchable, filterable security incident database.
- Severity classification pills: Critical (`#FF4560`), High, Medium (`#FFB020`), and Informational.
- Telemetry payload inspector modal with raw JSON formatting and copy-to-clipboard functionality.

### 6. Incident Timeline & Audit Logs
- **Chronological Timeline:** Vertical security event progression with glowing severity nodes and telemetry metric snapshots.
- **Cryptographic Audit Ledger:** Immutable ledger table with microsecond UTC timestamps, action classifications, and JSON export.

### 7. Evaluation & Synthetic Benchmark
- Comparative benchmark visualization (`GET /evaluate`) testing detector recall across all 5 standardized attack scenarios.
- Expected threat indicator tags vs. observed alert classifications.

---

## 📂 Batch CSV Telemetry Ingestion (Up to 5 MB)

GhostWave supports batch RF telemetry ingestion and scanning via `POST /analyze-csv` (or the client-side dropzone).

### Specifications:
- **Maximum File Size:** 5 MB (`5,242,880 bytes`).
- **Maximum Record Count:** Up to 10,000 frames per batch.
- **Format:** Standard UTF-8 / UTF-8-BOM comma-separated values (`.csv`).

### Required CSV Header Schema:
```csv
timestamp,sequence,source,signal_strength,latency_ms,packet_loss
```

### Sample CSV Data (`sample_telemetry.csv`):
```csv
timestamp,sequence,source,signal_strength,latency_ms,packet_loss
2026-10-31T10:00:00Z,1,normal_demo,-62,35,0
2026-10-31T10:00:01Z,2,normal_demo,-63,38,0
2026-10-31T10:00:02Z,3,normal_demo,-61,36,0
2026-10-31T10:00:03Z,4,normal_demo,-64,40,0
2026-10-31T10:01:00Z,10,replay_demo,-70,42,0
2026-10-31T10:01:01Z,11,replay_demo,-69,41,0
2026-10-31T10:01:02Z,11,replay_demo,-69,41,0
2026-10-31T10:01:01Z,11,replay_demo,-69,41,0
2026-10-31T10:02:00Z,1,network_fault_demo,-65,4500,35
2026-10-31T10:02:01Z,2,network_fault_demo,-66,4900,48
2026-10-31T10:03:00Z,1,signal_demo,-60,40,0
2026-10-31T10:03:01Z,2,signal_demo,-25,42,0
2026-10-31T10:03:02Z,3,signal_demo,75,45,0
2026-10-31T10:04:00Z,1,missing_demo,-72,55,1
2026-10-31T10:04:01Z,4,missing_demo,-73,58,2
```

> 💡 **Tip:** This sample file is available in the repository as [`sample_telemetry.csv`](./sample_telemetry.csv) and can also be downloaded directly from the **Upload CSV** modal in the dashboard.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health probe and status | None |
| `POST` | `/telemetry` | Ingest and verify a real-time telemetry frame | JSON Telemetry Packet |
| `POST` | `/analyze-csv` | Batch ingest and analyze telemetry CSV file (up to 5 MB) | `multipart/form-data` with `file` |
| `GET` | `/simulate/{scenario}` | Inject synthetic attack scenario (`normal`, `network_fault`, etc.) | Path parameter: `scenario` |
| `GET` | `/incidents` | Retrieve security incidents recorded in detector database | None |
| `GET` | `/audit` | Retrieve cryptographic audit ledger entries | None |
| `GET` | `/evaluate` | Run synthetic benchmark evaluation across all suites | None |

### Example Telemetry Packet Payload (`POST /telemetry`):
```json
{
  "source": "sensor-01",
  "sequence": 42,
  "timestamp": "2026-11-01T11:00:00Z",
  "metrics": {
    "signal_strength": -47.4,
    "latency_ms": 46.5,
    "packet_loss": 0.7
  }
}
```

---

## 🏗️ Project Structure

```
Fusion-Force-main/
├── README.md                      # Complete project documentation
├── main.py                        # Root entrypoint for Render / cloud deployments
├── requirements.txt               # Root Python dependencies for Render build
├── Procfile                       # Process file for cloud container runners
├── render.yaml                    # Render Infrastructure as Code (Blueprint)
├── sample_telemetry.csv           # Benchmark RF telemetry dataset (15 test records)
├── ghostwave_normal_telemetry.csv # Baseline nominal RF telemetry benchmark
├── ghostwave_suspicious_telemetry.csv # Adversarial telemetry benchmark (replay & jumps)
├── ghostwave_missing_invalid_data.csv # Faulty & corrupted telemetry benchmark
├── firebase.json                  # Firebase Hosting configuration (site: fusion-force)
├── .firebaserc                    # Firebase project mapping (safesyn-b1b29)
│
├── backend/                       # Python FastAPI Backend
│   ├── main.py                    # FastAPI application, CORS, and REST endpoints
│   ├── detector.py                # GhostWaveDetector multi-layer anomaly algorithms
│   ├── simulator.py               # Synthetic adversarial scenario generator
│   ├── database.py                # SQLite database persistence (incidents & audit)
│   └── requirements.txt           # Backend dependencies (fastapi, uvicorn, numpy, multipart)
│
└── frontend/                      # React 19 + Vite SOC Dashboard
    ├── index.html                 # Entry HTML with custom typography
    ├── vite.config.js             # Vite 8 bundler configuration
    ├── .env                       # Environment variables (VITE_API_BASE_URL)
    ├── package.json               # NPM packages & build scripts
    │
    └── src/
        ├── main.jsx               # Application entry point
        ├── App.jsx                # Main dashboard shell & view routing
        ├── index.css              # Design tokens, color system, and animations
        ├── App.css                # Enterprise SOC component styles & responsive layouts
        │
        ├── context/
        │   └── SecurityContext.jsx# Global security state, data streams, and auto-polling
        │
        ├── services/
        │   ├── api.js             # API service layer with auto-fallback to mock engine
        │   └── mockEngine.js      # Complete in-browser standalone verification engine
        │
        ├── components/
        │   ├── Header.jsx         # Top navigation bar with live status pill
        │   ├── Sidebar.jsx        # Vertical sidebar & Active Sensor Node panel
        │   ├── MetricCards.jsx    # Balanced 5-card metric row
        │   ├── SimulationControls.jsx # Adversarial attack simulation panel
        │   ├── CsvUploadModal.jsx # Batch CSV drag-and-drop ingestion (up to 5 MB)
        │   ├── PacketModal.jsx    # Raw telemetry payload inspector
        │   └── ApiSettingsModal.jsx # Backend API configuration modal
        │
        ├── views/
        │   ├── OverviewView.jsx   # SOC executive dashboard
        │   ├── LiveTelemetryView.jsx # Live RF waveform charts & packet stream
        │   ├── SecurityAlertsView.jsx # Flagged security alerts & incident filters
        │   ├── IncidentTimelineView.jsx # Chronological security event timeline
        │   ├── AuditLogsView.jsx  # Immutable cryptographic ledger
        │   └── EvaluationView.jsx # Synthetic benchmark evaluation reports
        │
        └── utils/
            └── formatters.js      # Timestamp and severity formatting helpers
```

---

## ☁️ Render Cloud Deployment Guide (FastAPI Backend)

When hosting the Python backend on **Render.com**:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Environment** | `Python` | Standard Python runtime |
| **Region** | Any (e.g. Frankfurt / Oregon) | Choose closest to users |
| **Branch** | `main` | Automatic deployments enabled |
| **Root Directory** | *(leave empty / blank)* | Defaults to repository root |
| **Build Command** | `pip install -r requirements.txt` | Installs FastAPI, Uvicorn, NumPy, Python-Multipart |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` | Starts production ASGI server binding to Render `$PORT` |

> [!TIP]
> If you choose to set Render's **Root Directory** to `backend`, the same Start Command (`uvicorn main:app --host 0.0.0.0 --port $PORT`) and Build Command (`pip install -r requirements.txt`) will work identically.

---

## 🚀 Local Development & Setup Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **Python:** v3.11.0 or higher
- **npm** or **pnpm**

---

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server on port 8000
uvicorn main:app --reload --port 8000
```

Verify backend health at: `http://localhost:8000/health` (returns `{"status":"online"}`).

---

### 2. Frontend Setup (React + Vite)

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# (Optional) Verify backend URL in frontend/.env
# VITE_API_BASE_URL=http://localhost:8000

# Start Vite local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🚢 Deployment Guide

### Deploying the Backend to Render
1. Connect your GitHub repository to [Render](https://render.com/).
2. Create a new **Web Service**.
3. Set the following settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set CORS origins in `backend/main.py` to allow your frontend domain (`https://fusion-force.web.app`).

### Deploying the Frontend to Firebase Hosting
1. Build the production bundle:
   ```bash
   node ./frontend/node_modules/vite/bin/vite.js build frontend
   ```
2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting --project safesyn-b1b29
   ```

---

## ⚠️ Synthetic Demonstration Notice

> **Notice:** GhostWave is designed as an adversarial signal verification and telemetry defense demonstration for **BYTEFORGE 2026**. Simulated attack scenarios and synthetic CSV evaluations illustrate threat detection capabilities and do not represent validated field performance under arbitrary electronic warfare conditions.

---

## 👥 Authors & Acknowledgments

- **Project:** GhostWave / Fusion-Force
- **Event:** BYTEFORGE 2026
- **Architecture:** Adversarially Robust Signal Telemetry Verification
- **License:** MIT License
