import json
import sqlite3
from pathlib import Path
from datetime import datetime, timezone


DB_PATH = Path(__file__).resolve().with_name("ghostwave.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT,
                source TEXT,
                alert_type TEXT,
                severity TEXT,
                message TEXT,
                packet_json TEXT
            )
        """)

        # Add any missing columns if the database already existed.
        existing = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(incidents)").fetchall()
        }

        required_columns = {
            "created_at": "TEXT",
            "source": "TEXT",
            "alert_type": "TEXT",
            "severity": "TEXT",
            "message": "TEXT",
            "packet_json": "TEXT"
        }

        for column, data_type in required_columns.items():
            if column not in existing:
                conn.execute(
                    f"ALTER TABLE incidents ADD COLUMN {column} {data_type}"
                )

        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT
            )
        """)


def save_incident(packet, alert):
    """Save one detector alert and its corresponding telemetry packet."""

    created_at = datetime.now(timezone.utc).isoformat()
    source = str(packet.get("source", "unknown"))
    alert_type = str(alert.get("type", "unknown"))
    severity = str(alert.get("severity", "unknown"))
    message = str(alert.get("message", ""))

    packet_json = json.dumps(packet, default=str, allow_nan=False)

    with get_connection() as conn:
        conn.execute("""
            INSERT INTO incidents (
                created_at, source, alert_type,
                severity, message, packet_json
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            created_at,
            source,
            alert_type,
            severity,
            message,
            packet_json
        ))

        conn.execute("""
            INSERT INTO audit_log (created_at, action, details)
            VALUES (?, ?, ?)
        """, (
            created_at,
            "incident_created",
            json.dumps({
                "source": source,
                "alert_type": alert_type,
                "severity": severity
            })
        ))


def get_incidents(limit=200):
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT id, created_at, source, alert_type,
                   severity, message, packet_json
            FROM incidents
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        results = []

        for row in rows:
            item = dict(row)

            try:
                item["packet"] = json.loads(item.pop("packet_json") or "{}")
            except (json.JSONDecodeError, TypeError):
                item["packet"] = {}

            results.append(item)

        return results


def get_audit_logs(limit=200):
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT id, created_at, action, details
            FROM audit_log
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        results = []

        for row in rows:
            item = dict(row)

            try:
                item["details"] = json.loads(item["details"] or "{}")
            except (json.JSONDecodeError, TypeError):
                pass

            results.append(item)

        return results