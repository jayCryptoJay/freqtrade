import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// ── Backtest (task-based) ──────────────────────────────────────────────────────
export const startBacktest = (payload) => api.post('/backtest/start', payload).then((r) => r.data)
export const getBacktestProgress = (taskId) => api.get(`/backtest/progress/${taskId}`).then((r) => r.data)
export const getBacktestHistory = (strategyId) => api.get(`/backtest/history/${strategyId}`).then((r) => r.data)
export const getBacktestResult = (id) => api.get(`/backtest/result/${id}`).then((r) => r.data)
export const getSupportedSymbols = () => api.get('/backtest/symbols').then((r) => r.data)

// ── Strategies ────────────────────────────────────────────────────────────────
export const getTemplates = () => api.get('/strategies/templates').then((r) => r.data)
export const listStrategies = (params) => api.get('/strategies', { params }).then((r) => r.data)
export const createStrategy = (data) => api.post('/strategies', data).then((r) => r.data)
export const getStrategy = (id) => api.get(`/strategies/${id}`).then((r) => r.data)
export const updateStrategy = (id, data) => api.patch(`/strategies/${id}`, data).then((r) => r.data)
export const deleteStrategy = (id) => api.delete(`/strategies/${id}`)
export const toggleFavorite = (id) => api.post(`/strategies/${id}/favorite`).then((r) => r.data)

// ── Version history ───────────────────────────────────────────────────────────
export const listVersions = (strategyId) =>
  api.get(`/strategies/${strategyId}/versions`).then((r) => r.data)
export const restoreVersion = (strategyId, versionId) =>
  api.post(`/strategies/${strategyId}/versions/${versionId}/restore`).then((r) => r.data)

// ── AI ────────────────────────────────────────────────────────────────────────
export const generateStrategy = (prompt) => api.post('/ai/generate', { prompt }).then((r) => r.data)
export const tweakStrategy = (code, metrics, user_prompt = '') =>
  api.post('/ai/tweak', { code, metrics, user_prompt }).then((r) => r.data)

// ── Data ──────────────────────────────────────────────────────────────────────
export const getOHLCV = (params) => api.get('/data/ohlcv', { params }).then((r) => r.data)

// ── Polling helper ────────────────────────────────────────────────────────────
/**
 * Poll /backtest/progress/{taskId} at `intervalMs` until done or error.
 * onProgress(progress: 0-1, status: string) called each tick.
 * Returns the final result or throws on error.
 */
export function pollBacktestTask(taskId, onProgress, intervalMs = 600) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const data = await getBacktestProgress(taskId)
        onProgress?.(data.progress ?? 0, data.status)
        if (data.status === 'done') {
          clearInterval(timer)
          resolve(data.result)
        } else if (data.status === 'error') {
          clearInterval(timer)
          reject(new Error(data.error || 'Backtest failed'))
        }
      } catch (err) {
        clearInterval(timer)
        reject(err)
      }
    }, intervalMs)
  })
}
