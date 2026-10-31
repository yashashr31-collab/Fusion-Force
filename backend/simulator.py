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
    """
    Generate deterministic synthetic telemetry packets for GhostWave demos.

    Scenario names and the return format are kept compatible with main.py:
    each packet contains source, timestamp, sequence, and metrics.

    Extra `scenario` and `label` fields are ground-truth simulation metadata;
    they are not proof that a real-world packet is malicious.
    """
    if scenario not in VALID_SCENARIOS:
        choices = ", ".join(sorted(VALID_SCENARIOS))
        raise ValueError(f"Unknown scenario. Choose one of: {choices}.")

    if not isinstance(count, int) or isinstance(count, bool) or count < 1:
        raise ValueError("count must be a positive integer.")

    rng = random.Random(42)
    start_time = datetime.now(timezone.utc).replace(microsecond=0)
    packets = []

    signal = -55.0
    latency = 40.0
    packet_loss = 1.0

    # Generate a plausible baseline with small changes, avoiding a static
    # repeated payload in the normal scenario.
    for i in range(count):
        signal = max(-85.0, min(-35.0, signal + rng.uniform(-2.0, 2.0)))
        latency = max(8.0, min(120.0, latency + rng.uniform(-5.0, 5.0)))
        packet_loss = max(
            0.0, min(8.0, packet_loss + rng.uniform(-0.7, 0.7))
        )

        packets.append({
            "source": "sensor-01",
            "timestamp": (start_time + timedelta(seconds=i)).isoformat(),
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

    if scenario == "normal":
        # Baseline packets retain modest realistic variation.
        return packets

    if scenario == "network_fault":
        # Model a link-quality deterioration. These are network symptoms,
        # not necessarily an adversarial attack.
        for i in range(midpoint, count):
            packet = packets[i]
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

    if scenario == "replay":
        # Reuse an earlier telemetry payload while the packet timestamp and
        # sequence continue forward. This models payload replay that can be
        # detected by payload fingerprints; it does not forge sequence IDs.
        replay_start = max(1, count // 2)
        for i in range(replay_start, count):
            source_index = i - replay_start
            packets[i]["metrics"] = deepcopy(packets[source_index]["metrics"])
            packets[i]["label"] = "replay"
        return packets

    if scenario == "manipulation":
        # Introduce abrupt and suspicious telemetry values. Values remain
        # mostly within broad physical ranges, with packet loss pushed high.
        for i in range(midpoint, count):
            packet = packets[i]
            packet["label"] = "manipulation"
            packet["metrics"]["signal_strength"] = round(
                -42.0 + rng.uniform(-1.0, 1.0), 2
            )
            packet["metrics"]["latency_ms"] = round(
                rng.uniform(8.0, 18.0), 2
            )
            packet["metrics"]["packet_loss"] = round(
                rng.uniform(72.0, 96.0), 2
            )
        return packets

    if scenario == "missing_data":
        # Simulate missing transmissions by dropping every fifth packet.
        # Sequence values are deliberately not renumbered, so gaps remain
        # visible to sequence-continuity checks.
        kept_packets = []
        for i, packet in enumerate(packets, start=1):
            if i % 5 == 0:
                continue
            packet["label"] = "missing_data"
            kept_packets.append(packet)
        return kept_packets

    # Defensive fallback; all supported scenarios return above.
    return packets
