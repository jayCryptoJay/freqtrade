# Workout Tracker App (Standalone Repository)

This folder is a standalone repository for the workout app.

## Features
- Weekly schedule CRUD.
- Workout logging with duration/intensity/notes.
- Suggestions by focus and available time.
- Mobile-friendly web UI for iPhone.

## Super beginner guide: use this on iPhone from your computer

Follow these exact steps in order.

### 1) Check Python is installed on your computer
Open Terminal (Mac/Linux) or PowerShell (Windows) and run:

```bash
python --version
```

If that fails, install Python 3.10+ first from python.org, then retry.

### 2) Open a terminal in the `workout-tracker` folder
You must be inside this folder before running commands.

```bash
cd /path/to/freqtrade/workout-tracker
```

### 3) Start the workout web app
Run:

```bash
python workout_tracker_app.py serve --host 0.0.0.0 --port 8080
```

Keep this terminal window open. If you close it, the app stops.

### 4) Find your computer's local IP address
You need this so your iPhone can reach your computer.

- **Windows (PowerShell):**
  ```powershell
  ipconfig
  ```
  Look for `IPv4 Address` (example: `192.168.1.25`).

- **Mac/Linux (Terminal):**
  ```bash
  ifconfig
  ```
  Look for an address like `192.168.x.x` or `10.x.x.x`.

### 5) Connect iPhone to the same Wi-Fi
Your iPhone and computer must be on the same home Wi-Fi network.

### 6) Open the app on iPhone
On iPhone, open Safari and enter:

```text
http://YOUR_COMPUTER_IP:8080
```

Example:

```text
http://192.168.1.25:8080
```

### 7) Use the app
- **Add Schedule**: plan workouts for days of the week.
- **Log Workout**: record what was completed and how long.
- View schedule, recent logs, and suggestions on the same page.

### 8) If it does not open on iPhone
Try these fixes:
- Confirm the terminal still shows the server running.
- Re-check both devices are on the same Wi-Fi.
- Make sure the IP address is correct.
- Allow Python through your computer firewall if prompted.
- Try another port:
  ```bash
  python workout_tracker_app.py serve --host 0.0.0.0 --port 8090
  ```
  then open `http://YOUR_COMPUTER_IP:8090`.

### 9) Stop the app
On the computer terminal, press `Ctrl + C`.

## Quick local commands
```bash
python workout_tracker_app.py --help
python workout_tracker_app.py init
python workout_tracker_app.py schedule-add --day Monday --name "Morning Walk" --duration 20
python workout_tracker_app.py log-add --name "Morning Walk" --duration 20 --intensity easy
```

## Create separate git repository
```bash
cd workout-tracker
git init
git add .
git commit -m "Initial standalone workout tracker app"
```
