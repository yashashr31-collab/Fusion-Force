"""
GhostWave defensive telemetry detector.
Works with the existing FastAPI contract: GhostWaveDetector().analyze(packet) -> list[dict].
Synthetic/demo detection only; alerts indicate suspicious evidence, not proof of an attack.
"""
from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
import hashlib
import json
import math
from typing import Any


class GhostWaveDetector:
    def __init__(
        self,
        signal_jump_db: float = 18.0,
        max_latency_ms: float = 5000.0,
        max_packet_loss_pct: float = 100.0,
        history_size: int = 100,
    ):
        self.signal_jump_db = signal_jump_db
        self.max_latency_ms = max_latency_ms
        self.max_packet_loss_pct = max_packet_loss_pct
        self.history_size = history_size
        self._last_sequence: dict[str, int] = {}
        self._last_timestamp: dict[str, datetime] = {}
        self._last_signal: dict[str, float] = {}
        self._payload_history: dict[str, deque[str]] = defaultdict(
            lambda: deque(maxlen=self.history_size)
        )
        self._window_history: dict[str, deque[str]] = defaultdict(
            lambda: deque(maxlen=self.history_size)
        )

    @staticmethod
    def _alert(kind: str, severity: str, message: str, evidence: dict[str, Any],
               confidence: float) -> dict[str, Any]:
        return {
            "type": kind,
            "severity": severity,
            "message": message,
            "confidence": round(max(0.0, min(1.0, confidence)), 2),
            "evidence": evidence,
        }

    @staticmethod
    def _parse_timestamp(value: Any) -> datetime | None:
        if not isinstance(value, str) or not value.strip():
            return None
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except (ValueError, TypeError, OverflowError):
            return None

    @staticmethod
    def _payload_fingerprint(metrics: Any) -> str:
        try:
            raw = json.dumps(metrics, sort_keys=True, separators=(",", ":"), allow_nan=False)
        except (TypeError, ValueError):
            raw = repr(metrics)
        return hashlib.sha256(raw.encode("utf-8", errors="replace")).hexdigest()

    def analyze(self, packet: dict[str, Any]) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        if not isinstance(packet, dict):
            return [self._alert(
                "invalid_payload", "high", "Telemetry record must be a JSON object.",
                {"received_type": type(packet).__name__}, 0.99
            )]

        source = str(packet.get("source") or "unknown")
        evidence_base = {"source": source}
        if not packet:
            return [self._alert("invalid_payload", "high", "Telemetry record is empty.",
                                evidence_base, 0.99)]

        # Validate the basic packet shape.
        timestamp_raw = packet.get("timestamp")
        timestamp = self._parse_timestamp(timestamp_raw)
        if timestamp_raw is None or timestamp_raw == "":
            alerts.append(self._alert(
                "inconsistent_timestamp", "medium", "Timestamp is missing.",
                {**evidence_base, "timestamp": timestamp_raw}, 0.85
            ))
        elif timestamp is None:
            alerts.append(self._alert(
                "inconsistent_timestamp", "high", "Timestamp is not a valid ISO-8601 value.",
                {**evidence_base, "timestamp": str(timestamp_raw)}, 0.98
            ))

        sequence = packet.get("sequence")
        sequence_int: int | None = None
        if sequence is None:
            alerts.append(self._alert(
                "missing_sequence", "medium", "Sequence number is missing.",
                evidence_base, 0.85
            ))
        else:
            try:
                # Reject bool despite bool being a subclass of int.
                if isinstance(sequence, bool):
                    raise ValueError
                sequence_int = int(sequence)
                if str(sequence_int) != str(sequence).strip() and not isinstance(sequence, int):
                    raise ValueError
                if sequence_int < 0:
                    raise ValueError
            except (ValueError, TypeError, OverflowError):
                sequence_int = None
                alerts.append(self._alert(
                    "invalid_sequence", "high", "Sequence number must be a non-negative integer.",
                    {**evidence_base, "sequence": sequence}, 0.98
                ))

        metrics = packet.get("metrics")
        if not isinstance(metrics, dict):
            alerts.append(self._alert(
                "invalid_metric", "high", "Metrics must be provided as a JSON object.",
                {**evidence_base, "metrics_type": type(metrics).__name__}, 0.98
            ))
            metrics = {}

        numeric_metrics: dict[str, float] = {}
        for key in ("signal_strength", "latency_ms", "packet_loss"):
            if key not in metrics:
                continue
            value = metrics[key]
            try:
                if isinstance(value, bool):
                    raise ValueError
                number = float(value)
                if not math.isfinite(number):
                    raise ValueError
                numeric_metrics[key] = number
            except (ValueError, TypeError, OverflowError):
                alerts.append(self._alert(
                    "invalid_metric", "high", f"Metric '{key}' must be a finite number.",
                    {**evidence_base, "metric": key, "value": repr(value)}, 0.98
                ))

        if "signal_strength" in numeric_metrics and not -200 <= numeric_metrics["signal_strength"] <= 50:
            alerts.append(self._alert(
                "invalid_metric", "high", "Signal strength is outside the accepted range (-200 to 50 dBm).",
                {**evidence_base, "metric": "signal_strength", "value": numeric_metrics["signal_strength"]}, 0.95
            ))
        if "latency_ms" in numeric_metrics and not 0 <= numeric_metrics["latency_ms"] <= self.max_latency_ms:
            alerts.append(self._alert(
                "invalid_metric", "high", "Latency is outside the accepted range.",
                {**evidence_base, "metric": "latency_ms", "value": numeric_metrics["latency_ms"]}, 0.95
            ))
        if "packet_loss" in numeric_metrics and not 0 <= numeric_metrics["packet_loss"] <= self.max_packet_loss_pct:
            alerts.append(self._alert(
                "invalid_metric", "high", "Packet loss must be between 0 and 100 percent.",
                {**evidence_base, "metric": "packet_loss", "value": numeric_metrics["packet_loss"]}, 0.98
            ))

        # Sequence and timestamp checks are source-specific.
        previous_sequence = self._last_sequence.get(source)
        if sequence_int is not None and previous_sequence is not None:
            if sequence_int == previous_sequence:
                alerts.append(self._alert(
                    "duplicate_sequence", "high", "Sequence number was repeated.",
                    {**evidence_base, "previous_sequence": previous_sequence, "sequence": sequence_int}, 0.96
                ))
            elif sequence_int < previous_sequence:
                alerts.append(self._alert(
                    "sequence_regression", "high", "Sequence number moved backwards; replay or reordering is possible.",
                    {**evidence_base, "previous_sequence": previous_sequence, "sequence": sequence_int}, 0.91
                ))
            elif sequence_int > previous_sequence + 1:
                alerts.append(self._alert(
                    "missing_sequence", "medium", "One or more sequence numbers were skipped.",
                    {**evidence_base, "previous_sequence": previous_sequence, "sequence": sequence_int,
                     "missing_count": sequence_int - previous_sequence - 1}, 0.84
                ))

        previous_timestamp = self._last_timestamp.get(source)
        if timestamp is not None and previous_timestamp is not None:
            if timestamp == previous_timestamp:
                alerts.append(self._alert(
                    "inconsistent_timestamp", "high", "Timestamp was duplicated for consecutive observations.",
                    {**evidence_base, "timestamp": timestamp.isoformat()}, 0.95
                ))
            elif timestamp < previous_timestamp:
                alerts.append(self._alert(
                    "inconsistent_timestamp", "high", "Timestamp moved backwards; replay or clock error is possible.",
                    {**evidence_base, "previous_timestamp": previous_timestamp.isoformat(),
                     "timestamp": timestamp.isoformat()}, 0.94
                ))

        # Sudden changes are evidence of an anomaly, not proof of malicious activity.
        signal = numeric_metrics.get("signal_strength")
        previous_signal = self._last_signal.get(source)
        if signal is not None and previous_signal is not None:
            delta = abs(signal - previous_signal)
            if delta >= self.signal_jump_db:
                alerts.append(self._alert(
                    "signal_jump", "medium",
                    "Signal strength changed abruptly; check for a legitimate link change or possible manipulation.",
                    {**evidence_base, "previous_signal_strength": previous_signal,
                     "signal_strength": signal, "absolute_change_db": round(delta, 2)}, 0.72
                ))

        # Repeated metrics can indicate replay; repeated values alone are only medium severity.
        if isinstance(metrics, dict) and metrics:
            fingerprint = self._payload_fingerprint(metrics)
            history = self._payload_history[source]
            if fingerprint in history:
                alerts.append(self._alert(
                    "repeated_payload", "medium",
                    "Identical metric values were observed before; investigate possible replay or a stable sensor reading.",
                    {**evidence_base, "metrics": metrics, "repeat_window": len(history)}, 0.68
                ))
            history.append(fingerprint)

            # Repeated short windows can catch a replay pattern even if individual records differ.
            window_key = self._payload_fingerprint({
                "metrics": metrics,
                "sequence": sequence_int,
            })
            window_history = self._window_history[source]
            if window_key in window_history and not any(a["type"] == "repeated_payload" for a in alerts):
                alerts.append(self._alert(
                    "duplicate_window", "medium", "A previously observed telemetry window pattern reappeared.",
                    {**evidence_base, "sequence": sequence_int}, 0.70
                ))
            window_history.append(window_key)

        # Update state only when the incoming value parsed successfully.
        if sequence_int is not None:
            self._last_sequence[source] = sequence_int
        if timestamp is not None:
            self._last_timestamp[source] = timestamp
        if signal is not None and -200 <= signal <= 50:
            self._last_signal[source] = signal

        return alerts
