from pathlib import Path

from workout_tracker_app import WorkoutTrackerApp, build_parser, render_home


def test_schedule_and_logs(tmp_path: Path) -> None:
    app = WorkoutTrackerApp(db_path=tmp_path / "workout.db")
    app.initialize()
    sid = app.add_schedule("Monday", "Walk", 20, "easy")
    assert sid > 0
    assert len(app.list_schedule()) == 1
    app.add_workout_log("Walk", 20, "2026-01-11", "easy", "good")
    assert len(app.list_workout_logs()) == 1


def test_render_and_parser(tmp_path: Path) -> None:
    app = WorkoutTrackerApp(db_path=tmp_path / "workout.db")
    app.initialize()
    html = render_home(app, "Saved")
    assert "Workout Tracker" in html
    parser = build_parser()
    args = parser.parse_args(["serve", "--host", "0.0.0.0", "--port", "8080"])
    assert args.command == "serve"
