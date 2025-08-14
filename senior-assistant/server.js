import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'letmein';
const dataDir = path.join(__dirname, 'data');
const lessonsPath = path.join(dataDir, 'lessons.json');

app.use(express.json({ limit: '1mb' }));

// Simple auth middleware for admin routes
function requireAdminCode(req, res, next) {
	const headerCode = req.header('x-admin-code');
	if (!headerCode || headerCode !== ADMIN_CODE) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	next();
}

// Health check
app.get('/api/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// Read lessons from file
function readLessons() {
	try {
		const raw = fs.readFileSync(lessonsPath, 'utf-8');
		return JSON.parse(raw);
	} catch (err) {
		return { lessons: [] };
	}
}

// Write lessons to file (atomic-ish)
function writeLessons(data) {
	fs.mkdirSync(dataDir, { recursive: true });
	const tempPath = lessonsPath + '.tmp';
	fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
	fs.renameSync(tempPath, lessonsPath);
}

// List all lessons
app.get('/api/lessons', (_req, res) => {
	const data = readLessons();
	res.json(data);
});

// Get one lesson
app.get('/api/lessons/:id', (req, res) => {
	const data = readLessons();
	const lesson = data.lessons.find(l => l.id === req.params.id);
	if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
	res.json(lesson);
});

// Create lesson
app.post('/api/lessons', requireAdminCode, (req, res) => {
	const data = readLessons();
	const newLesson = req.body;
	if (!newLesson || !newLesson.id || !newLesson.title) {
		return res.status(400).json({ error: 'Missing required fields: id, title' });
	}
	if (data.lessons.some(l => l.id === newLesson.id)) {
		return res.status(409).json({ error: 'Lesson id already exists' });
	}
	data.lessons.push(newLesson);
	writeLessons(data);
	res.status(201).json(newLesson);
});

// Update lesson
app.put('/api/lessons/:id', requireAdminCode, (req, res) => {
	const data = readLessons();
	const idx = data.lessons.findIndex(l => l.id === req.params.id);
	if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });
	const updated = { ...data.lessons[idx], ...req.body, id: req.params.id };
	data.lessons[idx] = updated;
	writeLessons(data);
	res.json(updated);
});

// Delete lesson
app.delete('/api/lessons/:id', requireAdminCode, (req, res) => {
	const data = readLessons();
	const idx = data.lessons.findIndex(l => l.id === req.params.id);
	if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });
	const removed = data.lessons.splice(idx, 1)[0];
	writeLessons(data);
	res.json(removed);
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for any non-API route
app.get(/^\/(?!api).*/, (_req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});