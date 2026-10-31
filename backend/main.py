from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from detector import GhostWaveDetector
from simulator import generate_scenario, VALID_SCENARIOS
from database import (
    init_db,
    save_incident,
    get_incidents,
    get_audit_logs
)


app = FastAPI(
    title="GhostWave API",
    description="Telemetry anomaly and integrity monitoring demo",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

detector = GhostWaveDetector()


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def home():
    return {
        "message": "GhostWave API is running",
        "status": "online"
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
        "status": "alert" if alerts else "normal"
    }


@app.get("/simulate/{scenario}")
def simulate(scenario: str):
    if scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Unknown scenario",
                "allowed_scenarios": sorted(VALID_SCENARIOS)
            }
        )

    packets = generate_scenario(scenario)
    results = []

    # Use a fresh detector for each simulation so previous simulations
    # do not influence the current scenario.
    simulation_detector = GhostWaveDetector()

    for packet in packets:
        alerts = simulation_detector.analyze(packet)

        for alert in alerts:
            save_incident(packet, alert)

        results.append({
            "packet": packet,
            "alerts": alerts,
            "alert_count": len(alerts)
        })

    return {
        "scenario": scenario,
        "packets_processed": len(packets),
        "alerts_detected": sum(
            result["alert_count"] for result in results
        ),
        "results": results
    }


@app.get("/incidents")
def incidents():
    return get_incidents()


@app.get("/audit")
def audit():
    return get_audit_logs()


@app.get("/evaluate")
def evaluate():
    """Run a basic synthetic scenario check; not a real-world accuracy test."""

    suspicious_types = {
        "network_fault": {
            "signal_jump",
            "missing_telemetry",
            "invalid_metric",
            "repeated_payload"
        },
        "replay": {
            "repeated_payload",
            "duplicate_sequence"
        },
        "manipulation": {
            "signal_jump",
            "invalid_metric",
            "repeated_payload"
        },
        "missing_data": {
            "missing_sequence",
            "missing_telemetry"
        }
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
                detected_types.add(alert["type"])

        expected = suspicious_types.get(scenario, set())

        evaluation[scenario] = {
            "packets_processed": len(packets),
            "alerts_count": total_alerts,
            "alert_types": sorted(detected_types),
            "expected_indicators": sorted(expected),
            "expected_indicator_observed": sorted(
                detected_types.intersection(expected)
            )
        }

    return {
        "note": (
            "Synthetic demonstration only. These results are not "
            "a validated measure of real-world detection accuracy."
        ),
        "scenarios": evaluation
    }