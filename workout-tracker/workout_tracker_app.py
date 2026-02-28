"""Simple standalone workout tracking app with mobile-friendly web UI."""

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from datetime import date
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, urlparse

DEFAULT_DB = Path("workout_tracker.db")


@dataclass(frozen=True)
class WorkoutSuggestion:
    name: str
    duration_minutes: int
    focus: str
    notes: str


SUGGESTION_LIBRARY: tuple[WorkoutSuggestion, ...] = (
    WorkoutSuggestion("Morning Walk", 20, "cardio", "Easy pace to start the day."),
    WorkoutSuggestion("Chair Squats", 15, "strength", "Great low-impact leg workout."),
    WorkoutSuggestion("Yoga Flow", 25, "flexibility", "Mobility and breathing-focused flow."),
    WorkoutSuggestion("Resistance Band Upper Body", 20, "strength", "Rows, presses, and curls."),
    WorkoutSuggestion("Light Dance Session", 30, "cardio", "Put on music and keep moving."),
    WorkoutSuggestion("Core + Stretch", 20, "full-body", "Planks, bird-dogs, and stretching."),
)


class WorkoutTrackerApp:
    def __init__(self, db_path: Path = DEFAULT_DB) -> None:
        self.db_path = db_path

    def connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def initialize(self) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS schedule (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    day TEXT NOT NULL,
                    workout_name TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    notes TEXT DEFAULT ''
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS workout_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    performed_on TEXT NOT NULL,
                    workout_name TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    intensity TEXT DEFAULT '',
                    notes TEXT DEFAULT ''
                )
                """
            )

    def add_schedule(self, day: str, workout_name: str, duration_minutes: int, notes: str = "") -> int:
        with self.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO schedule(day, workout_name, duration_minutes, notes)
                VALUES (?, ?, ?, ?)
                """,
                (day, workout_name, duration_minutes, notes),
            )
            return int(cursor.lastrowid)

    def update_schedule(
        self,
        schedule_id: int,
        day: str | None,
        workout_name: str | None,
        duration_minutes: int | None,
        notes: str | None,
    ) -> int:
        updates: list[str] = []
        values: list[str | int] = []
        if day is not None:
            updates.append("day = ?")
            values.append(day)
        if workout_name is not None:
            updates.append("workout_name = ?")
            values.append(workout_name)
        if duration_minutes is not None:
            updates.append("duration_minutes = ?")
            values.append(duration_minutes)
        if notes is not None:
            updates.append("notes = ?")
            values.append(notes)
        if not updates:
            return 0
        values.append(schedule_id)
        with self.connect() as conn:
            cursor = conn.execute(
                f"UPDATE schedule SET {', '.join(updates)} WHERE id = ?",  # nosec B608 - columns are static
                values,
            )
            return cursor.rowcount

    def delete_schedule(self, schedule_id: int) -> int:
        with self.connect() as conn:
            cursor = conn.execute("DELETE FROM schedule WHERE id = ?", (schedule_id,))
            return cursor.rowcount

    def list_schedule(self) -> list[sqlite3.Row]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT id, day, workout_name, duration_minutes, notes FROM schedule ORDER BY id"
            ).fetchall()
        return list(rows)

    def add_workout_log(
        self,
        workout_name: str,
        duration_minutes: int,
        performed_on: str | None = None,
        intensity: str = "",
        notes: str = "",
    ) -> int:
        performed_on = performed_on or date.today().isoformat()
        with self.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO workout_log(performed_on, workout_name, duration_minutes, intensity, notes)
                VALUES (?, ?, ?, ?, ?)
                """,
                (performed_on, workout_name, duration_minutes, intensity, notes),
            )
            return int(cursor.lastrowid)

    def list_workout_logs(self) -> list[sqlite3.Row]:
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, performed_on, workout_name, duration_minutes, intensity, notes
                FROM workout_log
                ORDER BY performed_on DESC, id DESC
                """
            ).fetchall()
        return list(rows)

    def get_suggestions(self, focus: str, time_limit: int) -> list[WorkoutSuggestion]:
        focus_lower = focus.strip().lower()
        return [
            item
            for item in SUGGESTION_LIBRARY
            if item.duration_minutes <= time_limit
            and (focus_lower in {"any", "all"} or item.focus == focus_lower or item.focus == "full-body")
        ]


def format_table(rows: Iterable[sqlite3.Row], headers: list[str]) -> str:
    row_list = [headers, *[[str(row[header]) for header in headers] for row in rows]]
    widths = [max(len(row[idx]) for row in row_list) for idx in range(len(headers))]
    formatted_rows = []
    for idx, row in enumerate(row_list):
        formatted_rows.append(" | ".join(col.ljust(widths[i]) for i, col in enumerate(row)))
        if idx == 0:
            formatted_rows.append("-+-".join("-" * width for width in widths))
    return "\n".join(formatted_rows)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Workout tracking app")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to the sqlite database")

    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init", help="Initialize workout database")

    schedule_add = sub.add_parser("schedule-add", help="Add a planned workout")
    schedule_add.add_argument("--day", required=True)
    schedule_add.add_argument("--name", required=True)
    schedule_add.add_argument("--duration", type=int, required=True)
    schedule_add.add_argument("--notes", default="")

    schedule_list = sub.add_parser("schedule-list", help="List planned workouts")
    schedule_list.add_argument("--day", default="", help="Optional day filter")

    schedule_update = sub.add_parser("schedule-update", help="Update a schedule entry")
    schedule_update.add_argument("--id", type=int, required=True)
    schedule_update.add_argument("--day")
    schedule_update.add_argument("--name")
    schedule_update.add_argument("--duration", type=int)
    schedule_update.add_argument("--notes")

    schedule_delete = sub.add_parser("schedule-delete", help="Delete a schedule entry")
    schedule_delete.add_argument("--id", type=int, required=True)

    log_add = sub.add_parser("log-add", help="Log a completed workout")
    log_add.add_argument("--name", required=True)
    log_add.add_argument("--duration", type=int, required=True)
    log_add.add_argument("--date", default=None)
    log_add.add_argument("--intensity", default="")
    log_add.add_argument("--notes", default="")

    sub.add_parser("log-list", help="List completed workouts")

    suggest = sub.add_parser("suggest", help="Get workout suggestions")
    suggest.add_argument("--focus", default="any")
    suggest.add_argument("--time", type=int, default=30)

    serve = sub.add_parser("serve", help="Run mobile-friendly web UI")
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--port", type=int, default=8080)

    return parser


def render_home(app: WorkoutTrackerApp, message: str = "") -> str:
    schedule_rows = app.list_schedule()
    log_rows = app.list_workout_logs()[:10]
    suggestions = app.get_suggestions("any", 30)

    schedule_html = "".join(
        f"<li><b>{escape(row['day'])}</b>: {escape(row['workout_name'])} ({row['duration_minutes']} min)</li>"
        for row in schedule_rows
    ) or "<li>No schedule yet.</li>"

    logs_html = "".join(
        f"<li>{escape(row['performed_on'])}: {escape(row['workout_name'])} ({row['duration_minutes']} min)</li>"
        for row in log_rows
    ) or "<li>No workout logs yet.</li>"

    suggestions_html = "".join(
        f"<li>{escape(item.name)} ({item.duration_minutes} min, {escape(item.focus)})</li>"
        for item in suggestions
    )

    message_html = f"<p style='color:green;'>{escape(message)}</p>" if message else ""
    return f"""
<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1' />
<title>Workout Tracker</title>
<style>
body {{ font-family: Arial, sans-serif; margin: 1rem; max-width: 700px; }}
form {{ border: 1px solid #ccc; border-radius: 10px; padding: 0.8rem; margin-bottom: 1rem; }}
label {{ display:block; margin-top: 0.4rem; }} input {{ width: 100%; padding: 0.45rem; box-sizing: border-box; }}
button {{ margin-top: 0.6rem; width: 100%; padding: 0.6rem; }}
</style></head><body>
<h1>Workout Tracker</h1>{message_html}
<form method='post' action='/schedule-add'>
<h2>Add Schedule</h2>
<label>Day <input name='day' required /></label>
<label>Workout <input name='name' required /></label>
<label>Duration (minutes) <input type='number' name='duration' min='1' required /></label>
<label>Notes <input name='notes' /></label>
<button type='submit'>Add to Schedule</button></form>
<form method='post' action='/log-add'>
<h2>Log Workout</h2>
<label>Workout <input name='name' required /></label>
<label>Duration (minutes) <input type='number' name='duration' min='1' required /></label>
<label>Date (YYYY-MM-DD) <input name='date' placeholder='{date.today().isoformat()}' /></label>
<label>Intensity <input name='intensity' /></label>
<label>Notes <input name='notes' /></label>
<button type='submit'>Save Workout</button></form>
<h2>Schedule</h2><ul>{schedule_html}</ul>
<h2>Recent Workout Logs</h2><ul>{logs_html}</ul>
<h2>Quick Suggestions</h2><ul>{suggestions_html}</ul>
</body></html>
"""


def run_web_ui(app: WorkoutTrackerApp, host: str, port: int) -> int:
    class WorkoutHandler(BaseHTTPRequestHandler):
        def _send_html(self, html: str, status: int = 200) -> None:
            payload = html.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def _redirect(self, location: str) -> None:
            self.send_response(303)
            self.send_header("Location", location)
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path != "/":
                self._send_html("<h1>Not found</h1>", 404)
                return
            message = parse_qs(parsed.query).get("message", [""])[0]
            self._send_html(render_home(app, message))

        def do_POST(self) -> None:  # noqa: N802
            length = int(self.headers.get("Content-Length", "0"))
            data = parse_qs(self.rfile.read(length).decode("utf-8"))
            if self.path == "/schedule-add":
                app.add_schedule(
                    data.get("day", [""])[0],
                    data.get("name", [""])[0],
                    int(data.get("duration", ["0"])[0]),
                    data.get("notes", [""])[0],
                )
                self._redirect("/?message=Schedule+entry+added")
                return
            if self.path == "/log-add":
                app.add_workout_log(
                    data.get("name", [""])[0],
                    int(data.get("duration", ["0"])[0]),
                    data.get("date", [""])[0] or None,
                    data.get("intensity", [""])[0],
                    data.get("notes", [""])[0],
                )
                self._redirect("/?message=Workout+logged")
                return
            self._send_html("<h1>Not found</h1>", 404)

    server = ThreadingHTTPServer((host, port), WorkoutHandler)
    print(f"Workout Tracker running at http://{host}:{port}")
    server.serve_forever()
    return 0


def main() -> int:
    args = build_parser().parse_args()
    app = WorkoutTrackerApp(db_path=args.db)
    app.initialize()

    if args.command == "init":
        print(f"Initialized workout database at {args.db}")
        return 0
    if args.command == "schedule-add":
        print(f"Added schedule entry #{app.add_schedule(args.day, args.name, args.duration, args.notes)}")
        return 0
    if args.command == "schedule-list":
        rows = app.list_schedule()
        if args.day:
            rows = [r for r in rows if r["day"].lower() == args.day.lower()]
        print(format_table(rows, ["id", "day", "workout_name", "duration_minutes", "notes"]) if rows else "No schedule entries found.")
        return 0
    if args.command == "schedule-update":
        print(f"Updated {app.update_schedule(args.id, args.day, args.name, args.duration, args.notes)} schedule entries.")
        return 0
    if args.command == "schedule-delete":
        print(f"Deleted {app.delete_schedule(args.id)} schedule entries.")
        return 0
    if args.command == "log-add":
        print(f"Added workout log #{app.add_workout_log(args.name, args.duration, args.date, args.intensity, args.notes)}")
        return 0
    if args.command == "log-list":
        rows = app.list_workout_logs()
        print(format_table(rows, ["id", "performed_on", "workout_name", "duration_minutes", "intensity", "notes"]) if rows else "No workout logs found.")
        return 0
    if args.command == "suggest":
        suggestions = app.get_suggestions(args.focus, args.time)
        for idx, suggestion in enumerate(suggestions, 1):
            print(f"{idx}. {suggestion.name} ({suggestion.duration_minutes} min, {suggestion.focus}) - {suggestion.notes}")
        return 0
    if args.command == "serve":
        return run_web_ui(app, args.host, args.port)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
