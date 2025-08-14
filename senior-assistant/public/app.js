const state = {
	lessons: [],
	plan: [],
	currentLesson: null,
	currentStepIndex: 0,
	voiceEnabled: false,
	preferences: null,
};

const els = {
	btnStartPlan: document.getElementById('btn-start-plan'),
	btnBrowse: document.getElementById('btn-browse'),
	toggleVoice: document.getElementById('toggle-voice'),
	lessonListSection: document.getElementById('lesson-list'),
	lessonsGrid: document.getElementById('lessons-grid'),
	playerSection: document.getElementById('player'),
	btnBack: document.getElementById('btn-back'),
	lessonTitle: document.getElementById('lesson-title'),
	safetyTip: document.getElementById('safety-tip'),
	stepText: document.getElementById('step-text'),
	practice: document.getElementById('practice'),
	practiceList: document.getElementById('practice-list'),
	btnRepeat: document.getElementById('btn-repeat'),
	btnNext: document.getElementById('btn-next'),
	btnCheat: document.getElementById('btn-cheat'),
	onboarding: document.getElementById('onboarding'),
	onboardingForm: document.getElementById('onboarding-form'),
};

async function init() {
	await loadLessons();
	loadPreferences();
	setupHandlers();
	if (!state.preferences) {
		showOnboarding();
	} else {
		renderHome();
	}
}

async function loadLessons() {
	const res = await fetch('/api/lessons');
	const data = await res.json();
	state.lessons = data.lessons || [];
}

function loadPreferences() {
	try {
		const saved = localStorage.getItem('ftc-preferences');
		if (saved) {
			state.preferences = JSON.parse(saved);
			state.voiceEnabled = !!state.preferences.voice;
			els.toggleVoice.checked = state.voiceEnabled;
		}
	} catch (e) { /* ignore */ }
}

function savePreferences() {
	localStorage.setItem('ftc-preferences', JSON.stringify(state.preferences));
}

function setupHandlers() {
	els.btnStartPlan.addEventListener('click', () => {
		if (!state.preferences) { showOnboarding(); return; }
		buildPlan();
		showPlanList();
	});
	els.btnBrowse.addEventListener('click', () => {
		showAllLessons();
	});
	els.toggleVoice.addEventListener('change', () => {
		state.voiceEnabled = els.toggleVoice.checked;
		if (state.preferences) {
			state.preferences.voice = state.voiceEnabled;
			savePreferences();
		}
	});
	els.btnBack.addEventListener('click', () => {
		stopSpeaking();
		state.currentLesson = null;
		state.currentStepIndex = 0;
		showAllLessons();
	});
	els.btnRepeat.addEventListener('click', () => {
		repeatStep();
	});
	els.btnNext.addEventListener('click', () => {
		nextStep();
	});
	els.btnCheat.addEventListener('click', () => {
		generateCheatSheet();
	});
	els.onboardingForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const form = new FormData(els.onboardingForm);
		const comfort = form.get('comfort');
		const device = form.get('device');
		const goals = form.getAll('goals');
		const voice = form.get('voice') === 'on';
		state.preferences = { comfort, device, goals, voice, createdAt: Date.now() };
		savePreferences();
		state.voiceEnabled = voice;
		els.toggleVoice.checked = state.voiceEnabled;
		els.onboarding.hidden = true;
		buildPlan();
		showPlanList();
	});
}

function showOnboarding() {
	els.onboarding.hidden = false;
}

function renderHome() {
	// Default to showing featured lessons
	showAllLessons();
}

function showAllLessons() {
	els.playerSection.hidden = true;
	els.lessonListSection.hidden = false;
	renderLessons(state.lessons);
}

function showPlanList() {
	els.playerSection.hidden = true;
	els.lessonListSection.hidden = false;
	renderLessons(state.plan);
}

function renderLessons(list) {
	els.lessonsGrid.innerHTML = '';
	list.forEach(lesson => {
		const card = document.createElement('article');
		card.className = 'card';
		card.innerHTML = `
			<h3>${lesson.title}</h3>
			<p>${lesson.summary || ''}</p>
			<p><small>Time: ${lesson.estimatedMinutes || 5} min • Level: ${lesson.level || 'Beginner'}</small></p>
			<button class="primary" aria-label="Start ${lesson.title}">Start</button>
		`;
		card.querySelector('button').addEventListener('click', () => startLesson(lesson.id));
		els.lessonsGrid.appendChild(card);
	});
}

function buildPlan() {
	const prefs = state.preferences || { comfort: 'beginner', goals: [] };
	const base = [...state.lessons];
	// Always start with Intro to AI if present
	const intro = base.find(l => l.id === 'intro-to-ai');
	let plan = [];
	if (intro) plan.push(intro);
	// Then prioritize goals
	const goalOrder = {
		'video-calls': ['video-calls'],
		'letters': ['holiday-letters'],
		'photos': ['organizing-photos'],
		'reminders': ['reminders-and-calendar'],
		'safety': ['spotting-scams'],
		'fun': ['fun-with-ai']
	};
	prefs.goals.forEach(g => {
		(goalOrder[g] || []).forEach(id => {
			const found = base.find(l => l.id === id);
			if (found && !plan.some(p => p.id === found.id)) plan.push(found);
		});
	});
	// Fill with remaining lessons
	base.forEach(l => { if (!plan.some(p => p.id === l.id)) plan.push(l); });
	// Simpler plan for beginners: cap steps shown later
	state.plan = plan;
}

function startLesson(id) {
	const lesson = state.lessons.find(l => l.id === id);
	if (!lesson) return;
	state.currentLesson = lesson;
	state.currentStepIndex = 0;
	els.lessonTitle.textContent = lesson.title;
	els.lessonListSection.hidden = true;
	els.playerSection.hidden = false;
	renderStep();
}

function renderStep() {
	const lesson = state.currentLesson;
	const step = lesson.steps[state.currentStepIndex];
	if (!step) { endOfLesson(); return; }
	// Show safety tip if step requires internet or has a safetyTip
	if (step.requiresInternet || step.safetyTip) {
		els.safetyTip.textContent = step.safetyTip || 'Friendly reminder: never share personal or financial information unless you started the conversation and you trust the website.';
		els.safetyTip.hidden = false;
	} else {
		els.safetyTip.hidden = true;
	}
	els.stepText.textContent = step.text;
	// Practice prompts
	if (step.practicePrompts && step.practicePrompts.length) {
		els.practice.hidden = false;
		els.practiceList.innerHTML = '';
		for (const prompt of step.practicePrompts) {
			const li = document.createElement('li');
			const promptSpan = document.createElement('span');
			promptSpan.textContent = prompt;
			const btn = document.createElement('button');
			btn.className = 'copy';
			btn.textContent = 'Copy';
			btn.addEventListener('click', async () => {
				try { await navigator.clipboard.writeText(prompt); btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent='Copy', 1500);} catch {}
			});
			li.appendChild(promptSpan);
			li.appendChild(btn);
			els.practiceList.appendChild(li);
		}
	} else {
		els.practice.hidden = true;
	}
	if (state.voiceEnabled) speak(step.text);
	// Buttons
	els.btnRepeat.disabled = false;
	els.btnNext.disabled = false;
}

function nextStep() {
	state.currentStepIndex += 1;
	stopSpeaking();
	renderStep();
}

function repeatStep() {
	stopSpeaking();
	renderStep();
}

function endOfLesson() {
	stopSpeaking();
	els.stepText.textContent = 'Great job! You finished this lesson.';
	els.practice.hidden = true;
	els.safetyTip.hidden = true;
	els.btnNext.disabled = true;
}

function speak(text) {
	try {
		const utter = new SpeechSynthesisUtterance(text);
		utter.rate = 0.95;
		speechSynthesis.cancel();
		speechSynthesis.speak(utter);
	} catch {}
}

function stopSpeaking() {
	try { speechSynthesis.cancel(); } catch {}
}

function generateCheatSheet() {
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF({ unit: 'pt', format: 'letter' });
	const margin = 48;
	let y = margin;
	const title = state.currentLesson ? state.currentLesson.title : 'My Tech Cheat Sheet';
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(22);
	doc.text(title, margin, y);
	y += 28;
	if (state.currentLesson && state.currentLesson.cheatSheet && state.currentLesson.cheatSheet.keyPoints) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(14);
		for (const point of state.currentLesson.cheatSheet.keyPoints) {
			const lines = doc.splitTextToSize('• ' + point, 540);
			if (y + lines.length * 18 > 720) { doc.addPage(); y = margin; }
			doc.text(lines, margin, y);
			y += lines.length * 18 + 8;
		}
	}
	if (state.currentLesson && state.currentLesson.cheatSheet && state.currentLesson.cheatSheet.tryNow) {
		if (y + 48 > 720) { doc.addPage(); y = margin; }
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(16);
		doc.text('Try this now:', margin, y);
		y += 24;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(14);
		for (const ex of state.currentLesson.cheatSheet.tryNow) {
			const lines = doc.splitTextToSize('— ' + ex, 540);
			if (y + lines.length * 18 > 720) { doc.addPage(); y = margin; }
			doc.text(lines, margin, y);
			y += lines.length * 18 + 6;
		}
	}
	doc.save(`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cheat-sheet.pdf`);
}

init();