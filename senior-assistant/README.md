# Friendly Tech Coach

Warm, easy, step-by-step lessons that teach seniors how to use AI and basic technology. Includes a simple lesson editor, text-to-speech, safety reminders, and printable large-print PDFs.

## Quick Start

- Requirements: Node.js 18+
- Install and run:

```bash
cd /workspace/senior-assistant
npm install
npm run start
```

Open http://localhost:3000

## Admin (Lesson Editor)

- Visit `/admin.html`
- Enter the admin code in the top box
- Default admin code is `letmein` (change by setting environment variable `ADMIN_CODE` before starting the server)
- Create new lessons or edit existing ones. Click Save Changes.

## Personalization

On first visit, users answer a few simple questions. Lessons are then ordered to match their goals and comfort level.

## Accessibility

- Large, legible font
- High contrast colors
- Clear buttons: Next, Repeat, Back
- Optional Read Aloud using the browser's speech

## Cheat Sheets (PDF)

Every lesson can be saved as a large-print PDF with key points and try-now examples.

## Project Structure

- `server.js` Express server and API
- `data/lessons.json` Simple content store for lessons
- `public/` Static web app (no build step)
  - `index.html`, `style.css`, `app.js`
  - `admin.html` simple lesson editor

## Environment

- `PORT` set the server port (default 3000)
- `ADMIN_CODE` set the admin editor code (default `letmein`)

## Backups

The server saves lessons in `data/lessons.json`. Back up this file regularly.