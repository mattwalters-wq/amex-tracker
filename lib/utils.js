import { startOfDay, endOfDay, addDays, addMonths, subDays, differenceInDays, format, parseISO, isValid } from 'date-fns'

// Get current Amex statement cycle boundaries
export function getCurrentCycle(cycleStartDay = 22) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  let cycleStart = new Date(year, month, cycleStartDay)
  if (now < cycleStart) {
    // We're before the start day this month, so cycle started last month
    cycleStart = new Date(year, month - 1, cycleStartDay)
  }

  // Cycle ends the day before next cycle start
  const nextCycleStart = addMonths(cycleStart, 1)
  const cycleEnd = subDays(nextCycleStart, 1)

  const totalDays = differenceInDays(cycleEnd, cycleStart) + 1
  const daysElapsed = differenceInDays(now, cycleStart) + 1
  const daysLeft = Math.max(0, differenceInDays(cycleEnd, now))
  const progressPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100))

  return {
    start: cycleStart,
    end: cycleEnd,
    totalDays,
    daysElapsed,
    daysLeft,
    progressPct,
    label: format(cycleStart, 'd MMM') + ' - ' + format(cycleEnd, 'd MMM yyyy'),
    endLabel: format(cycleEnd, 'd MMM'),
    key: format(cycleStart, 'yyyy-MM-dd'),
  }
}

// Get current week boundaries (Thursday to Wednesday based on payDay=4)
export function getCurrentWeek(payDay = 4) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 4=Thu
  
  let daysFromPayDay = (dayOfWeek - payDay + 7) % 7
  const weekStart = subDays(now, daysFromPayDay)
  const weekEnd = addDays(weekStart, 6)

  return {
    start: startOfDay(weekStart),
    end: endOfDay(weekEnd),
    label: format(weekStart, 'd MMM') + ' - ' + format(weekEnd, 'd MMM'),
  }
}

// Get previous week
export function getPreviousWeek(payDay = 4) {
  const current = getCurrentWeek(payDay)
  const prevStart = subDays(current.start, 7)
  const prevEnd = subDays(current.start, 1)
  return {
    start: startOfDay(prevStart),
    end: endOfDay(prevEnd),
  }
}

// Filter transactions to a date range
export function filterByDateRange(transactions, start, end) {
  return transactions.filter(tx => {
    const d = typeof tx.created_at === 'string' ? parseISO(tx.created_at) : new Date(tx.created_at)
    return d >= start && d <= end
  })
}

// Filter transactions to current cycle
export function filterByCycle(transactions, cycleStartDay = 22) {
  const cycle = getCurrentCycle(cycleStartDay)
  return filterByDateRange(transactions, cycle.start, cycle.end)
}

// Filter transactions to current week
export function filterByWeek(transactions, payDay = 4) {
  const week = getCurrentWeek(payDay)
  return filterByDateRange(transactions, week.start, week.end)
}

// Sum transactions for a bucket
export function sumBucket(transactions, bucketId) {
  return transactions
    .filter(tx => tx.bucket === bucketId)
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
}

// Sum transactions for a card
export function sumCard(transactions, card) {
  return transactions
    .filter(tx => tx.card === card)
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
}

// Total spend (excludes savings by convention - but we include it for total tracking)
export function sumTotal(transactions) {
  return transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
}

// Living spend = daily + splurge only (what counts against weekly caps)
export function sumLiving(transactions) {
  return transactions
    .filter(tx => tx.bucket === 'daily' || tx.bucket === 'splurge')
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
}

// Calculate carry-forward: if overspent last week, subtract from this week's cap
export function calcCarryForward(transactions, bucketId, weeklyBudget, payDay = 4) {
  const prevWeek = getPreviousWeek(payDay)
  const prevTx = filterByDateRange(transactions, prevWeek.start, prevWeek.end)
  const prevSpend = sumBucket(prevTx, bucketId)
  const overspend = Math.max(0, prevSpend - weeklyBudget)
  const adjustedBudget = Math.max(0, weeklyBudget - overspend)
  return {
    overspend,
    adjustedBudget,
    carryNote: overspend > 0 ? '-' + fmtAUD(overspend) + ' from last wk' : null,
  }
}

// Estimate Qantas points from transactions
export function calcPoints(transactions) {
  let points = 0
  transactions
    .filter(tx => tx.card === 'amex')
    .forEach(tx => {
      const amt = Number(tx.amount)
      // Simplified: 1.25 pts per dollar for most, 0.5 for govt
      const rate = tx.category === 'transport' ? 0.5 : 1.25
      points += Math.floor(amt * rate)
    })
  return points
}

// Format currency AUD
export function fmtAUD(amount, showCents = true) {
  if (amount === null || amount === undefined) return '$0'
  const n = Number(amount)
  if (showCents && n % 1 !== 0) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  return '$' + Math.round(n).toLocaleString('en-AU')
}

// Format date for display
export function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
  if (!isValid(d)) return ''
  return format(d, 'EEE d MMM')
}

// Group transactions by date for list display
export function groupByDate(transactions) {
  const groups = {}
  const sorted = [...transactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  sorted.forEach(tx => {
    const d = typeof tx.created_at === 'string' ? parseISO(tx.created_at) : new Date(tx.created_at)
    const key = format(d, 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return groups
}

// Detect duplicate transactions
export function detectDuplicates(transactions) {
  const seen = new Set()
  return transactions.map(tx => {
    const d = typeof tx.created_at === 'string' ? parseISO(tx.created_at) : new Date(tx.created_at)
    const dateKey = format(d, 'yyyy-MM-dd')
    const key = (tx.note || '').toLowerCase().trim() + '_' + Number(tx.amount).toFixed(2) + '_' + dateKey
    const isDuplicate = seen.has(key)
    if (!isDuplicate) seen.add(key)
    return { ...tx, isDuplicate }
  })
}

// Sanitize AI-parsed date - reject if more than 60 days from today
export function sanitizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return new Date().toISOString()
    const diff = Math.abs(differenceInDays(d, new Date()))
    if (diff > 60) return new Date().toISOString()
    return d.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Generate a client-side ID
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Fortnightly pay dates generated from a known anchor date, that fall strictly
// after `after` and on or before `through`. Returns an array of Date objects.
export function fortnightlyOccurrences(anchorISO, after, through) {
  if (!anchorISO) return []
  let d = parseISO(anchorISO)
  if (!isValid(d)) return []
  d = startOfDay(d)
  const a = startOfDay(after)
  const t = startOfDay(through)
  // Jump close to the window in 14-day steps, then walk the boundary exactly.
  d = addDays(d, Math.floor(differenceInDays(a, d) / 14) * 14)
  while (d <= a) d = addDays(d, 14)
  const out = []
  while (d <= t) {
    out.push(d)
    d = addDays(d, 14)
  }
  return out
}

// Count occurrences of a given JS weekday (0=Sun..6=Sat) in the inclusive day
// range [from, to].
export function countWeekday(weekday, from, to) {
  let count = 0
  let d = startOfDay(from)
  const end = startOfDay(to)
  while (d <= end) {
    if (d.getDay() === weekday) count++
    d = addDays(d, 1)
  }
  return count
}

// Last N weeks for reporting
export function getLastNWeeks(n = 8, payDay = 4) {
  const weeks = []
  const current = getCurrentWeek(payDay)
  for (let i = n - 1; i >= 0; i--) {
    const start = subDays(current.start, i * 7)
    const end = addDays(start, 6)
    weeks.push({
      start: startOfDay(start),
      end: endOfDay(end),
      label: format(start, 'd MMM'),
    })
  }
  return weeks
}
