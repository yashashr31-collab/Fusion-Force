from collections import defaultdict, deque
from datetime import datetime, timezone
import hashlib
import json
import math


class GhostWaveDetector:
    def __init__(self):
        self.last_timestamp = {}
        self.last_sequence = {}
        self.history = defaultdict(lambda: deque(maxlen=20))

        # Keep sequence numbers and payload fingerprints separate.
        self.sequences = defaultdict(set)
        self.fingerprints = defaultdict(set)

    def analyze(self, data):
        alerts = []

        if not isinstance(data, dict):
            return [{
                "type": "invalid_payload",
                "severity": "high",
                "message": "Telemetry must be a JSON object."
            }]

        source = str(data.get("source", "unknown"))
        timestamp = data.get("timestamp")
        sequence = data.get("sequence")
        metrics = data.get("metrics", {})

        if not isinstance(metrics, dict) or not metrics:
            return [{
                "type": "invalid_payload",
                "severity": "high",
                "message": "Telemetry metrics are missing or invalid."
            }]

        # Validate timestamp.
        try:
            if isinstance(timestamp, (int, float)) and not isinstance(timestamp, bool):
                ts = float(timestamp)
            elif isinstance(timestamp, str):
                ts = datetime.fromisoformat(
                    timestamp.replace("Z", "+00:00")
                ).timestamp()
            else:
                raise ValueError("Invalid timestamp")

            if not math.isfinite(ts):
                raise ValueError("Non-finite timestamp")

        except (ValueError, TypeError, OverflowError, OSError):
            return [{
                "type": "invalid_timestamp",
                "severity": "high",
                "message": "Timestamp is missing or invalid."
            }]

        now = datetime.now(timezone.utc).timestamp()

        if ts > now + 60:
            alerts.append({
                "type": "future_timestamp",
                "severity": "high",
                "message": "Telemetry timestamp is more than 60 seconds in the future."
            })

        # Check timestamp order and gaps.
        previous_ts = self.last_timestamp.get(source)

        if previous_ts is not None:
            if ts < previous_ts:
                alerts.append({
                    "type": "out_of_order",
                    "severity": "medium",
                    "message": "Timestamp moved backwards."
                })
            elif ts - previous_ts > 10:
                alerts.append({
                    "type": "missing_telemetry",
                    "severity": "medium",
                    "message": "A telemetry gap greater than 10 seconds was detected."
                })

        is_newer_timestamp = previous_ts is None or ts > previous_ts

        if is_newer_timestamp:
            self.last_timestamp[source] = ts

        # Validate metric values.
        for key, value in metrics.items():
            if (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
            ):
                alerts.append({
                    "type": "invalid_metric",
                    "severity": "high",
                    "message": f"Metric '{key}' must be a finite number."
                })

        # Do not perform numeric comparisons on invalid metrics.
        valid_metrics = {
            key: value
            for key, value in metrics.items()
            if (
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and math.isfinite(value)
            )
        }

        # Detect missing sequence numbers and repeated sequence numbers.
        if sequence is not None:
            try:
                sequence_number = int(sequence)

                if isinstance(sequence, bool) or str(sequence_number) != str(sequence):
                    raise ValueError("Invalid sequence")

                if sequence_number < 0:
                    raise ValueError("Negative sequence")

                if sequence_number in self.sequences[source]:
                    alerts.append({
                        "type": "duplicate_sequence",
                        "severity": "high",
                        "message": "A previously observed sequence number was received again."
                    })
                else:
                    previous_sequence = self.last_sequence.get(source)

                    if (
                        previous_sequence is not None
                        and sequence_number > previous_sequence + 1
                    ):
                        alerts.append({
                            "type": "missing_sequence",
                            "severity": "medium",
                            "message": (
                                f"Sequence gap detected: expected "
                                f"{previous_sequence + 1}, received {sequence_number}."
                            )
                        })

                    self.sequences[source].add(sequence_number)

                    if (
                        previous_sequence is None
                        or sequence_number > previous_sequence
                    ):
                        self.last_sequence[source] = sequence_number

            except (ValueError, TypeError, OverflowError):
                alerts.append({
                    "type": "invalid_sequence",
                    "severity": "medium",
                    "message": "Sequence number must be a non-negative integer."
                })

        # Detect repeated metric payloads independently of sequence numbers.
        try:
            canonical = json.dumps(
                valid_metrics,
                sort_keys=True,
                separators=(",", ":"),
                allow_nan=False
            )
            fingerprint = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

            if fingerprint in self.fingerprints[source]:
                alerts.append({
                    "type": "repeated_payload",
                    "severity": "medium",
                    "message": "Identical metric values were observed before; investigate possible replay."
                })
            else:
                self.fingerprints[source].add(fingerprint)

        except (TypeError, ValueError):
            alerts.append({
                "type": "invalid_payload",
                "severity": "high",
                "message": "Telemetry metrics could not be serialized."
            })

        # Compare valid numeric metrics with the last accepted observation.
        previous = self.history[source][-1] if self.history[source] else {}

        for key, value in valid_metrics.items():
            if key in previous:
                old_value = previous[key]

                if abs(value - old_value) > max(20, abs(old_value) * 0.75):
                    alerts.append({
                        "type": "signal_jump",
                        "severity": "medium",
                        "message": (
                            f"Metric '{key}' changed sharply "
                            f"from {old_value} to {value}."
                        )
                    })

        # Store history only for newer timestamps.
        if is_newer_timestamp:
            self.history[source].append(valid_metrics.copy())

        return alerts