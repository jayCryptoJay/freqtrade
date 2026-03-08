import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 min for backtests
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// Backtest
export const runBacktest = (payload) => api.post('/backtest/run', payload).then((r) => r.data)
export const getBacktestHistory = (strategyId) => api.get(`/backtest/history/${strategyId}`).then((r) => r.data)
export const getBacktestResult = (id) => api.get(`/backtest/result/${id}`).then((r) => r.data)

// Strategies
export const getTemplates = () => api.get('/strategies/templates').then((r) => r.data)
export const listStrategies = (params) => api.get('/strategies', { params }).then((r) => r.data)
export const createStrategy = (data) => api.post('/strategies', data).then((r) => r.data)
export const getStrategy = (id) => api.get(`/strategies/${id}`).then((r) => r.data)
export const updateStrategy = (id, data) => api.patch(`/strategies/${id}`, data).then((r) => r.data)
export const deleteStrategy = (id) => api.delete(`/strategies/${id}`)
export const toggleFavorite = (id) => api.post(`/strategies/${id}/favorite`).then((r) => r.data)

// AI
export const generateStrategy = (prompt) => api.post('/ai/generate', { prompt }).then((r) => r.data)
export const tweakStrategy = (code, metrics, user_prompt = '') =>
  api.post('/ai/tweak', { code, metrics, user_prompt }).then((r) => r.data)

// Data
export const getOHLCV = (params) => api.get('/data/ohlcv', { params }).then((r) => r.data)
