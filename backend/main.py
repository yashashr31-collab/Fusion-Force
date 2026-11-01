from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import csv
import io

from detector import GhostWaveDetector
from simulator import generate_scenario, VALID_SCENARIOS
from database import (
    init_db,
    save_incident,
    get_incidents,
    get_audit_logs,
)


app = FastAPI(
    title="GhostWave API",
    description="Telemetry anomaly and integrity monitoring demo",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://fusion-force.web.app",
        "https://fusion-force.firebaseapp.com",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = GhostWaveDetector()


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def home():
    return {
        "message": "GhostWave API is running",
        "status": "online",
    }


@app.get("/health")
def health():
    return {"status": "online"}


@app.post("/telemetry")
def receive_telemetry(data: dict):
    alerts = detector.analyze(data)

    for alert in alerts:
        save_incident(data, alert)

    return {
        "source": data.get("source", "unknown"),
        "alerts": alerts,
        "alert_count": len(alerts),
        "status": "alert" if alerts else "normal",
    }


# --------------------------------------------------
# CSV UPLOAD AND TELEMETRY ANALYSIS
# --------------------------------------------------

@app.post("/analyze-csv")
async def analyze_csv(file: UploadFile = File(...)):
    try:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a .csv file.",
            )

        content = await file.read()

        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="CSV file must be smaller than 5 MB.",
            )

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded CSV file is empty.",
            )

        try:
            text_content = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Could not read the file as UTF-8 CSV.",
            )

        reader = csv.DictReader(io.StringIO(text_content))

        if not reader.fieldnames:
            raise HTTPException(
                status_code=400,
                detail="CSV file must contain a header row.",
            )

        # Standardize column headers
        col_map = {name.strip().lower(): name for name in reader.fieldnames}

        # Resolve column aliases
        seq_col = next((col_map[c] for c in ("sequence", "seq", "id", "packet_id", "packet_number") if c in col_map), None)
        ts_col = next((col_map[c] for c in ("timestamp", "time", "ts", "date") if c in col_map), None)
        sig_col = next((col_map[c] for c in ("signal_strength", "signal_dbm", "signal", "rssi", "dbm") if c in col_map), None)
        lat_col = next((col_map[c] for c in ("latency_ms", "latency", "delay", "rtt") if c in col_map), None)
        loss_col = next((col_map[c] for c in ("packet_loss", "packet_loss_rate", "loss", "loss_rate") if c in col_map), None)
        src_col = next((col_map[c] for c in ("source", "source_id", "node", "node_id", "sensor", "sensor_id", "device") if c in col_map), None)

        missing = []
        if not seq_col: missing.append("sequence (or seq)")
        if not ts_col: missing.append("timestamp (or time)")
        if not sig_col and not lat_col: missing.append("signal_strength (or signal_dbm)")

        if missing:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "CSV is missing required telemetry columns.",
                    "missing_columns": missing,
                    "supported_columns": [
                        "sequence", "timestamp", "signal_strength (or signal_dbm)",
                        "latency_ms", "packet_loss", "source"
                    ]
                },
            )

        if len(reader.fieldnames) != len(set(name.strip().lower() for name in reader.fieldnames)):
            raise HTTPException(
                status_code=400,
                detail="CSV contains duplicate column names.",
            )

        csv_detector = GhostWaveDetector()
        results = []
        alert_types = set()

        for row_number, row in enumerate(reader, start=2):
            if row_number > 10001:
                raise HTTPException(
                    status_code=400,
                    detail="CSV cannot contain more than 10,000 records.",
                )

            if None in row or any(value is None for value in row.values()):
                # Allow minor trailing empty fields, but reject completely malformed rows
                if not any(str(v or "").strip() for v in row.values()):
                    continue

            if not any(str(value or "").strip() for value in row.values()):
                continue

            raw_seq = row.get(seq_col) if seq_col else None
            raw_ts = row.get(ts_col) if ts_col else None
            raw_sig = row.get(sig_col) if sig_col else None
            raw_lat = row.get(lat_col) if lat_col else None
            raw_loss = row.get(loss_col) if loss_col else None
            raw_src = (row.get(src_col) or "").strip() if src_col else "sensor-01"

            # Parse sequence
            seq_val = None
            if raw_seq is not None and str(raw_seq).strip() != "":
                try:
                    seq_val = int(raw_seq)
                except (ValueError, TypeError):
                    seq_val = raw_seq

            # Parse timestamp
            ts_val = str(raw_ts or "").strip()

            # Parse metrics
            metrics = {}
            if raw_sig is not None and str(raw_sig).strip() != "":
                try:
                    metrics["signal_strength"] = float(raw_sig)
                except (ValueError, TypeError):
                    metrics["signal_strength"] = raw_sig
            if raw_lat is not None and str(raw_lat).strip() != "":
                try:
                    metrics["latency_ms"] = float(raw_lat)
                except (ValueError, TypeError):
                    metrics["latency_ms"] = raw_lat
            if raw_loss is not None and str(raw_loss).strip() != "":
                try:
                    metrics["packet_loss"] = float(raw_loss)
                except (ValueError, TypeError):
                    metrics["packet_loss"] = raw_loss
            elif "signal_strength" in metrics:
                metrics["packet_loss"] = 0.0

            packet = {
                "timestamp": ts_val,
                "sequence": seq_val if seq_val is not None else row_number,
                "source": raw_src or "sensor-01",
                "metrics": metrics,
            }

            alerts = csv_detector.analyze(packet)

            # Check if essential metrics were missing from row
            if not metrics or ("signal_strength" not in metrics and "latency_ms" not in metrics):
                alerts.append({
                    "type": "missing_metric",
                    "severity": "high",
                    "message": f"Row {row_number} is missing essential signal/latency measurements.",
                    "confidence": 0.99,
                    "evidence": {"row": row_number, "source": packet["source"]}
                })

            for alert in alerts:
                alert_types.add(alert.get("type", "unknown"))
                save_incident(packet, alert)

            results.append({
                "row": row_number,
                "source": packet["source"],
                "sequence": packet["sequence"],
                "status": "suspicious" if alerts else "normal",
                "alerts": alerts,
                "alert_count": len(alerts),
            })

        if not results:
            raise HTTPException(
                status_code=400,
                detail="No telemetry records were found in the CSV.",
            )

        suspicious_count = sum(
            result["status"] == "suspicious"
            for result in results
        )

        return {
            "filename": file.filename,
            "total_records": len(results),
            "normal_records": len(results) - suspicious_count,
            "suspicious_records": suspicious_count,
            "total_alerts": sum(
                result["alert_count"] for result in results
            ),
            "alert_types": sorted(alert_types),
            "results": results,
            "note": (
                "Synthetic/demo analysis. An alert indicates suspicious "
                "evidence, not proof of a malicious attack."
            ),
        }

    except csv.Error:
        raise HTTPException(
            status_code=400,
            detail="The CSV file could not be parsed.",
        )

    finally:
        await file.close()


# --------------------------------------------------
# SIMULATION
# --------------------------------------------------

@app.get("/simulate/{scenario}")
def simulate(scenario: str):
    if scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Unknown scenario",
                "allowed_scenarios": sorted(VALID_SCENARIOS),
            },
        )

    packets = generate_scenario(scenario)
    results = []
    simulation_detector = GhostWaveDetector()

    for packet in packets:
        alerts = simulation_detector.analyze(packet)

        for alert in alerts:
            save_incident(packet, alert)

        results.append({
            "packet": packet,
            "alerts": alerts,
            "alert_count": len(alerts),
        })

    alert_types = sorted({
        alert.get("type", "unknown")
        for result in results
        for alert in result["alerts"]
    })

    return {
        "scenario": scenario,
        "packets_processed": len(packets),
        "alerts_detected": sum(
            result["alert_count"] for result in results
        ),
        "alert_types": alert_types,
        "results": results,
        "note": (
            "Synthetic simulation output. An anomaly is not, by itself, "
            "proof of malicious activity."
        ),
    }


@app.get("/incidents")
def incidents():
    return get_incidents()


@app.get("/audit")
def audit():
    return get_audit_logs()


@app.get("/evaluate")
def evaluate():
    """Run deterministic synthetic checks; not a real-world accuracy benchmark."""
    expected_indicators = {
        "normal": set(),
        "replay": {"repeated_payload"},
        "network_fault": {"signal_jump"},
        "manipulation": {"signal_jump", "invalid_metric"},
        "missing_data": {"missing_sequence"},
    }

    evaluation = {}

    for scenario in sorted(VALID_SCENARIOS):
        packets = generate_scenario(scenario)
        test_detector = GhostWaveDetector()
        detected_types = set()
        total_alerts = 0

        for packet in packets:
            alerts = test_detector.analyze(packet)
            total_alerts += len(alerts)

            for alert in alerts:
                detected_types.add(alert.get("type", "unknown"))

        expected = expected_indicators.get(scenario, set())
        observed = detected_types.intersection(expected)

        evaluation[scenario] = {
            "packets_processed": len(packets),
            "alerts_count": total_alerts,
            "alert_types": sorted(detected_types),
            "expected_indicators": sorted(expected),
            "expected_indicator_observed": sorted(observed),
            "expected_indicator_missing": sorted(expected - detected_types),
            "check_passed": expected.issubset(detected_types),
        }

    return {
        "note": (
            "Synthetic demonstration only. These results are not a "
            "validated measure of real-world detection accuracy."
        ),
        "overall_check_passed": all(
            item["check_passed"] for item in evaluation.values()
        ),
        "scenarios": evaluation,
    }
