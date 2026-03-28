// Budget buckets
export const BUCKETS = {
  daily: {
    id: 'daily',
    label: 'Daily',
    color: '#7A9E8E',
    light: '#E8F0EC',
    weeklyBudget: 605,
    monthlyBudget: 2680,
    description: 'Groceries, fuel, health, kids, pets, transport',
  },
  splurge: {
    id: 'splurge',
    label: 'Splurge',
    color: '#C4705A',
    light: '#F5E8E4',
    weeklyBudget: 250,
    monthlyBudget: 1100,
    description: 'Eating out, coffee, wine, treats',
  },
  bill: {
    id: 'bill',
    label: 'Bills',
    color: '#C49A4A',
    light: '#FAF0DC',
    weeklyBudget: null,
    monthlyBudget: 1166,
    description: 'Recurring bills and subscriptions',
  },
  savings: {
    id: 'savings',
    label: 'Savings',
    color: '#5E6B4A',
    light: '#EDF0E8',
    weeklyBudget: null,
    monthlyBudget: null,
    description: 'One-off purchases from savings (no cap)',
  },
}

// Categories per bucket
export const CATEGORIES = {
  daily: [
    { id: 'groceries', label: 'Groceries', icon: '🛒' },
    { id: 'fuel', label: 'Fuel', icon: '⛽' },
    { id: 'health', label: 'Health', icon: '💊' },
    { id: 'kids', label: 'Kids', icon: '🧒' },
    { id: 'pets', label: 'Pets', icon: '🐾' },
    { id: 'transport', label: 'Transport', icon: '🚆' },
    { id: 'shopping', label: 'Shopping', icon: '🛍' },
    { id: 'garden', label: 'Garden', icon: '🌿' },
    { id: 'other_daily', label: 'Other', icon: '•' },
  ],
  splurge: [
    { id: 'eating_out', label: 'Eating out', icon: '🍽' },
    { id: 'coffee', label: 'Coffee', icon: '☕' },
    { id: 'wine', label: 'Wine & drinks', icon: '🍷' },
    { id: 'kb', label: 'K&B', icon: '🧁' },
    { id: 'market', label: 'Market', icon: '🥦' },
    { id: 'other_splurge', label: 'Other', icon: '•' },
  ],
  bill: [
    { id: 'internet', label: 'Internet', icon: '📡' },
    { id: 'gas', label: 'Gas', icon: '🔥' },
    { id: 'electricity', label: 'Electricity', icon: '⚡' },
    { id: 'phone', label: 'Phone', icon: '📱' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'insurance', label: 'Insurance', icon: '🛡' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '🔄' },
    { id: 'activities', label: 'Activities', icon: '🏃' },
    { id: 'other_bill', label: 'Other', icon: '•' },
  ],
  savings: [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'clothing', label: 'Clothing', icon: '👗' },
    { id: 'gifts', label: 'Gifts', icon: '🎁' },
    { id: 'travel', label: 'Travel', icon: '✈' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'other_savings', label: 'Other', icon: '•' },
  ],
}

// Get category icon by id (across all buckets)
export function getCategoryIcon(categoryId) {
  for (const bucket of Object.values(CATEGORIES)) {
    const found = bucket.find(c => c.id === categoryId)
    if (found) return found.icon
  }
  return '•'
}

export function getCategoryLabel(categoryId) {
  for (const bucket of Object.values(CATEGORIES)) {
    const found = bucket.find(c => c.id === categoryId)
    if (found) return found.label
  }
  return categoryId || 'Other'
}

// Default settings
export const DEFAULT_SETTINGS = {
  id: 'main',
  pin: '2026',
  daily_weekly: 605,
  splurge_weekly: 250,
  bills_monthly: 1166,
  pay_day: 4, // Thursday
  cycle_start_day: 22,
}

// Amex card details
export const AMEX = {
  cardEnding: '51005',
  limit: 20000,
  signupBonusTarget: 5000,
  signupBonusPoints: 70000,
  earnRateDefault: 1.25,
  earnRateQantas: 2.25,
  earnRateGovt: 0.5,
}

// Fixed commitments (not tracked, just for reference)
export const FIXED_COMMITMENTS = {
  mortgage: 3412,
  carFinance: 558,
  centrelink: 157,
}

// AI scan - merchants to skip
export const SKIP_MERCHANTS = [
  'transfer', 'salary', 'wage', 'centrelink', 'bpay', 'direct debit',
  'loan', 'mortgage', 'repayment', 'direct credit', 'refund',
  'payment received', 'opening balance', 'closing balance',
]
