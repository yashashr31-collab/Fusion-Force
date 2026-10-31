import random
from datetime import datetime, timezone, timedelta
from copy import deepcopy


VALID_SCENARIOS = {
    "normal",
    "network_fault",
    "replay",
    "manipulation",
    "missing_data",
}


def generate_scenario(scenario="normal", count=30):
    """Generate synthetic telemetry for GhostWave demonstrations."""

    if scenario not in VALID_SCENARIOS:
        choices = ", ".join(sorted(VALID_SCENARIOS))
        raise ValueError(
            f"Unknown scenario. Choose one of: {choices}."
        )

    if not isinstance(count, int) or isinstance(count, bool) or count < 1:
        raise ValueError("count must be a positive integer.")

    rng = random.Random(42)
    start_time = datetime.now(timezone.utc).replace(microsecond=0)

    packets = []

    signal = -55.0
    latency = 40.0
    packet_loss = 1.0

    # Generate realistic baseline telemetry with small variations.
    for i in range(count):
        signal = max(
            -85.0,
            min(-35.0, signal + rng.uniform(-2.0, 2.0))
        )

        latency = max(
            8.0,
            min(120.0, latency + rng.uniform(-5.0, 5.0))
        )

        packet_loss = max(
            0.0,
            min(8.0, packet_loss + rng.uniform(-0.7, 0.7))
        )

        packets.append({
            "source": "sensor-01",
            "timestamp": (
                start_time + timedelta(seconds=i)
            ).isoformat(),
            "sequence": i + 1,
            "metrics": {
                "signal_strength": round(signal, 2),
                "latency_ms": round(latency, 2),
                "packet_loss": round(packet_loss, 2),
            },
            "scenario": scenario,
            "label": "normal",
        })

    midpoint = max(1, count // 2)

    # --------------------------------------------------
    # 1. NORMAL TRAFFIC
    # --------------------------------------------------
    if scenario == "normal":
        return packets

    # --------------------------------------------------
    # 2. NETWORK FAULT
    # --------------------------------------------------
    if scenario == "network_fault":
        for packet in packets[midpoint:]:
            packet["label"] = "network_fault"

            packet["metrics"]["signal_strength"] = round(
                -88.0 + rng.uniform(-3.0, 3.0), 2
            )

            packet["metrics"]["latency_ms"] = round(
                rng.uniform(280.0, 650.0), 2
            )

            packet["metrics"]["packet_loss"] = round(
                rng.uniform(18.0, 42.0), 2
            )

        return packets

    # --------------------------------------------------
    # 3. REPLAY ATTACK
    # --------------------------------------------------
    if scenario == "replay":
        replay_start = max(1, count // 2)

        for i in range(replay_start, count):
            source_index = i - replay_start

            # Repeat earlier metric payloads.
            packets[i]["metrics"] = deepcopy(
                packets[source_index]["metrics"]
            )

            packets[i]["label"] = "replay"

        return packets

    # --------------------------------------------------
    # 4. DATA MANIPULATION
    # --------------------------------------------------
    if scenario == "manipulation":

        # Test A: abrupt signal-strength change.
        packets[midpoint]["metrics"]["signal_strength"] = -25.0

        packets[midpoint]["label"] = (
            "manipulation_signal_jump"
        )

        # Test B: deliberately invalid packet-loss value.
        invalid_index = min(midpoint + 1, count - 1)

        packets[invalid_index]["metrics"]["signal_strength"] = -25.0

        packets[invalid_index]["metrics"]["packet_loss"] = 120.0

        packets[invalid_index]["label"] = (
            "manipulation_invalid_metric"
        )

        # Continue with changed but otherwise valid telemetry.
        for i in range(midpoint + 2, count):
            packets[i]["metrics"]["signal_strength"] = round(
                -25.0 + rng.uniform(-1.0, 1.0), 2
            )

            packets[i]["metrics"]["latency_ms"] = round(
                rng.uniform(8.0, 18.0), 2
            )

            packets[i]["metrics"]["packet_loss"] = round(
                rng.uniform(1.0, 8.0), 2
            )

            packets[i]["label"] = "manipulation"

        return packets

    # --------------------------------------------------
    # 5. MISSING DATA
    # --------------------------------------------------
    if scenario == "missing_data":

        # Drop every fifth packet without renumbering later packets.
        # This creates sequence gaps for the detector to identify.
        kept_packets = []

        for i, packet in enumerate(packets, start=1):
            if i % 5 == 0:
                continue

            packet["label"] = "missing_data"
            kept_packets.append(packet)

        return kept_packets

    return packets