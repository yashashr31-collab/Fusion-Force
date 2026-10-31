from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
    """
    Run deterministic synthetic checks for the configured scenarios.
    This is a smoke test, not a validated real-world accuracy benchmark.
    """

    # Expected indicators are intentionally scenario-specific. A scenario
    # does not need to trigger every possible detector rule to be useful.
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
