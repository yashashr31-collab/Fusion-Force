import random
from datetime import datetime, timezone, timedelta


VALID_SCENARIOS = {
    "normal",
    "network_fault",
    "replay",
    "manipulation",
    "missing_data"
}


def generate_scenario(scenario="normal", count=30):
    """Generate synthetic telemetry for GhostWave demonstrations."""

    if scenario not in VALID_SCENARIOS:
        raise ValueError(
            "Unknown scenario. Choose normal, network_fault, "
            "replay, manipulation, or missing_data."
        )

    if not isinstance(count, int) or isinstance(count, bool) or count < 1:
        raise ValueError("count must be a positive integer.")

    rng = random.Random(42)
    packets = []
    start_time = datetime.now(timezone.utc)

    signal = -55.0
    latency = 40.0
    packet_loss = 1.0

    for i in range(count):
        timestamp = start_time + timedelta(seconds=i)

        signal += rng.uniform(-2, 2)
        latency = max(5, latency + rng.uniform(-5, 5))
        packet_loss = max(
            0,
            min(10, packet_loss + rng.uniform(-1, 1))
        )

        packets.append({
            "source": "sensor-01",
            "timestamp": timestamp.isoformat(),
            "sequence": i + 1,
            "metrics": {
                "signal_strength": round(signal, 2),
                "latency_ms": round(latency, 2),
                "packet_loss": round(packet_loss, 2)
            }
        })

    midpoint = count // 2

    if scenario == "network_fault":
        for packet in packets[midpoint:]:
            packet["metrics"]["signal_strength"] = -95.0
            packet["metrics"]["latency_ms"] = 450.0
            packet["metrics"]["packet_loss"] = 35.0

    elif scenario == "replay":
        half = count // 2

        if half >= 1:
            for i in range(half, count):
                packets[i]["metrics"] = packets[i - half]["metrics"].copy()

    elif scenario == "manipulation":
        for packet in packets[midpoint:]:
            packet["metrics"]["signal_strength"] = -45.0
            packet["metrics"]["latency_ms"] = 5.0
            packet["metrics"]["packet_loss"] = 95.0

    elif scenario == "missing_data":
        # Drop every fifth packet. Sequence numbers are not renumbered.
        packets = [
            packet
            for i, packet in enumerate(packets, start=1)
            if i % 5 != 0
        ]

    return packets