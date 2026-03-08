export const fmtPct = (v, decimals = 2) => {
  if (v === null || v === undefined || isNaN(v)) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

export const fmtNum = (v, decimals = 2) => {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return v.toFixed(decimals)
}

export const fmtUSD = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

export const fmtDate = (isoStr) => {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const fmtDuration = (hours) => {
  if (!hours || isNaN(hours)) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export const colorForValue = (v, inverse = false) => {
  if (v === null || v === undefined || isNaN(v)) return 'text-gray-400'
  const positive = inverse ? v < 0 : v > 0
  const negative = inverse ? v > 0 : v < 0
  if (positive) return 'text-accent-green'
  if (negative) return 'text-accent-red'
  return 'text-gray-400'
}

export const clampSharpe = (v) => {
  if (!v || isNaN(v)) return 0
  return Math.max(-10, Math.min(10, v))
}

export const shortenAddress = (str, chars = 6) => {
  if (!str) return ''
  if (str.length <= chars * 2) return str
  return `${str.slice(0, chars)}...${str.slice(-chars)}`
}
