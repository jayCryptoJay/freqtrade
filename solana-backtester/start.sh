#!/usr/bin/env bash
# Start both backend and frontend in parallel

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting SOL Strategy Backtester..."

# Backend
echo "📦 Installing backend dependencies..."
cd "$ROOT/backend"
pip install -r requirements.txt -q

if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  Created backend/.env - add your ANTHROPIC_API_KEY for AI features"
fi

echo "🐍 Starting FastAPI backend on :8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend
echo "📦 Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install --silent

echo "⚛  Starting React frontend on :5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Running:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for either to exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
