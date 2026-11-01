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

        reader.fieldnames = [
            (name or "").strip().lower()
            for name in reader.fieldnames
        ]

        required_columns = {
            "timestamp",
            "sequence",
            "source",
            "signal_strength",
            "latency_ms",
            "packet_loss",
        }

        if not required_columns.issubset(set(reader.fieldnames)):
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "CSV is missing required telemetry columns.",
                    "required_columns": sorted(required_columns),
                },
            )

        if len(reader.fieldnames) != len(set(reader.fieldnames)):
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
                raise HTTPException(
                    status_code=400,
                    detail=f"Malformed CSV row at line {row_number}.",
                )

            if not any(str(value or "").strip() for value in row.values()):
                continue

            try:
                packet = {
                    "timestamp": row["timestamp"].strip(),
                    "sequence": int(row["sequence"]),
                    "source": row["source"].strip() or "CSV Upload",
                    "metrics": {
                        "signal_strength": float(row["signal_strength"]),
                        "latency_ms": float(row["latency_ms"]),
                        "packet_loss": float(row["packet_loss"]),
                    },
                }
            except (ValueError, TypeError, KeyError):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Invalid or missing numeric telemetry value "
                        f"on CSV row {row_number}."
                    ),
                )

            alerts = csv_detector.analyze(packet)

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
