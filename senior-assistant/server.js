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
const userLessonsPath = path.join(dataDir, 'user_lessons.json');

app.use(express.json({ limit: '1mb' }));

// In-memory lessons if user provided dataset exists
let memoryLessons = null;

function normalizeUserLessons(rawLessons) {
	if (!Array.isArray(rawLessons)) return { lessons: [] };
	const normalized = rawLessons.map((item) => {
		const id = item.lessonNumber ? `lesson-${item.lessonNumber}` : (item.title ? item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `lesson-${Math.random().toString(36).slice(2)}`);
		const steps = Array.isArray(item.steps) ? item.steps.map((text, idx, all) => {
			const step = { id: `s${idx + 1}`, text: String(text || '').trim() };
			// Add practice prompt to the last step if present
			if (item.practicePrompt && idx === all.length - 1) {
				step.practicePrompts = [String(item.practicePrompt).trim()];
			}
			// Show safety tip once at the first relevant step
			if (item.safetyTip && idx === 0) {
				step.safetyTip = String(item.safetyTip).trim();
			}
			return step;
		}) : [];
		const estimatedMinutes = Math.max(5, steps.length * 2);
		return {
			id,
			title: item.title || 'Lesson',
			summary: item.goal || '',
			category: 'Custom',
			level: 'Beginner',
			estimatedMinutes,
			steps,
			cheatSheet: {
				keyPoints: Array.isArray(item.steps) ? item.steps.map(s => String(s)) : [],
				tryNow: item.practicePrompt ? [String(item.practicePrompt)] : []
			}
		};
	});
	return { lessons: normalized };
}

function loadUserLessonsIntoMemory() {
	try {
		if (fs.existsSync(userLessonsPath)) {
			const raw = fs.readFileSync(userLessonsPath, 'utf-8');
			const json = JSON.parse(raw);
			memoryLessons = normalizeUserLessons(json);
			return;
		}
	} catch (err) {
		console.error('Failed to load user lessons:', err);
	}
	memoryLessons = null;
}

loadUserLessonsIntoMemory();

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

app.get('/api/source', (_req, res) => {
	res.json({ source: memoryLessons ? 'user_lessons' : 'lessons_file' });
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
	if (memoryLessons) {
		return res.json(memoryLessons);
	}
	const data = readLessons();
	res.json(data);
});

// Get one lesson
app.get('/api/lessons/:id', (req, res) => {
	if (memoryLessons) {
		const lesson = memoryLessons.lessons.find(l => l.id === req.params.id);
		if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
		return res.json(lesson);
	}
	const data = readLessons();
	const lesson = data.lessons.find(l => l.id === req.params.id);
	if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
	res.json(lesson);
});

// Create lesson
app.post('/api/lessons', requireAdminCode, (req, res) => {
	if (memoryLessons) {
		return res.status(403).json({ error: 'Read-only: using user-provided lessons in memory' });
	}
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
	if (memoryLessons) {
		return res.status(403).json({ error: 'Read-only: using user-provided lessons in memory' });
	}
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
	if (memoryLessons) {
		return res.status(403).json({ error: 'Read-only: using user-provided lessons in memory' });
	}
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