// Budget buckets
export const BUCKETS = {
  daily: {
    id: 'daily',
    label: 'Daily',
    color: '#7A9E8E',
    light: '#E8F0EC',
    weeklyBudget: 605,
    monthlyBudget: 2680,
    description: 'Groceries, health, kids, pets, transport',
  },
  splurge: {
    id: 'splurge',
    label: 'Splurge',
    color: '#C4705A',
    light: '#F5E8E4',
    weeklyBudget: 250,
    monthlyBudget: 1100,
    description: 'Eating out, coffee, treats',
  },
  wine: {
    id: 'wine',
    label: 'Wine',
    color: '#8E5A7A',
    light: '#F2E8EF',
    weeklyBudget: null,
    monthlyBudget: 250,
    description: 'Wine, bottle shop, cellar',
  },
  bill: {
    id: 'bill',
    label: 'Bills',
    color: '#C49A4A',
    light: '#FAF0DC',
    weeklyBudget: null,
    monthlyBudget: 1500,
    description: 'Bills, subscriptions, fuel',
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

// Buckets that count toward controllable weekly living spend
export const LIVING_BUCKETS = ['daily', 'splurge']
// Buckets excluded from the "over budget" recovery calculation
export const EXCLUDED_FROM_RECOVERY = ['savings']

// Categories per bucket
export const CATEGORIES = {
  daily: [
    { id: 'groceries', label: 'Groceries', icon: '🛒' },
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
    { id: 'kb', label: 'K&B', icon: '🧁' },
    { id: 'market', label: 'Market', icon: '🥦' },
    { id: 'other_splurge', label: 'Other', icon: '•' },
  ],
  wine: [
    { id: 'wine_shop', label: 'Bottle shop', icon: '🍷' },
    { id: 'wine_delivery', label: 'Delivery', icon: '📦' },
    { id: 'wine_cellar', label: 'Cellar', icon: '🍾' },
    { id: 'other_wine', label: 'Other', icon: '•' },
  ],
  bill: [
    { id: 'fuel', label: 'Fuel', icon: '⛽' },
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

// Legacy category fallbacks (for transactions logged before the wine/fuel restructure)
const LEGACY_CATEGORIES = {
  wine: { label: 'Wine & drinks', icon: '🍷' },
  fuel: { label: 'Fuel', icon: '⛽' },
}

// Get category icon by id (across all buckets)
export function getCategoryIcon(categoryId) {
  for (const bucket of Object.values(CATEGORIES)) {
    const found = bucket.find(c => c.id === categoryId)
    if (found) return found.icon
  }
  if (LEGACY_CATEGORIES[categoryId]) return LEGACY_CATEGORIES[categoryId].icon
  return '•'
}

export function getCategoryLabel(categoryId) {
  for (const bucket of Object.values(CATEGORIES)) {
    const found = bucket.find(c => c.id === categoryId)
    if (found) return found.label
  }
  if (LEGACY_CATEGORIES[categoryId]) return LEGACY_CATEGORIES[categoryId].label
  return categoryId || 'Other'
}

// Default settings
export const DEFAULT_SETTINGS = {
  id: 'main',
  pin: '2026',
  daily_weekly: 605,
  splurge_weekly: 250,
  wine_monthly: 250,
  bills_monthly: 1500,
  pay_day: 4, // Thursday
  cycle_start_day: 22,
  amex_cycle_target: 4000, // safe-to-spend ceiling per cycle (see SAFE_AMEX)
  amex_actual_balance: null, // last reconciled Amex balance (from the Amex app)
  amex_balance_updated_at: null, // ISO timestamp of that reconciliation
  amex_cycle_start_balance: null, // balance owed when the current cycle began
  amex_payments_cycle: 0, // total payments made to the card this cycle
  amex_cycle_key: null, // yyyy-MM-dd cycle start the snapshot/payments belong to
  cba_set_aside: 4600, // amount set aside in CBA to pay the Amex bill in full
  // Pay + commitments for forward-looking coverage. Each pay lands fortnightly;
  // the mortgage leaves CBA weekly; bills and savings are swept per pay.
  matt_pay: 2824.61, // Matt's fortnightly pay
  matt_pay_anchor: '2026-06-11', // a known Matt pay date (Thursday); repeats fortnightly
  liz_pay: 1600, // Liz's fortnightly pay
  liz_pay_anchor: '2026-06-18', // a known Liz pay date (Thursday); repeats fortnightly
  mortgage_weekly: 895, // weekly mortgage paid from CBA (not on the card)
  mortgage_weekday: 4, // JS weekday the mortgage leaves CBA (0=Sun..6=Sat); Thursday=4
  bills_per_pay: 100, // swept from CBA into the Bills account per pay
  other_per_pay: 100, // other auto-debits out of CBA per pay (CommSec, subscriptions, etc)
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

// Household income (fortnightly) - used to derive the safe Amex ceiling
export const INCOME = {
  mattFortnightly: 2824,
  lizFortnightly: 1600,
}

// Safe-to-spend on Amex per cycle, derived from income:
//   monthly income  ≈ (matt + liz) * 26 / 12        ≈ $9,585
//   minus fixed commitments not on the card          - $4,127
//   = cash available each cycle                       ≈ $5,458
//   minus a savings/buffer set-aside (~$1,300) and a little debit spend
//   = recommended Amex ceiling                        ≈ $4,000
// This is what you can charge and still pay off in full with savings left over.
export const SAFE_AMEX = {
  recommendedPerCycle: 4000,
  // derivation figures for display
  monthlyIncome: Math.round((INCOME.mattFortnightly + INCOME.lizFortnightly) * 26 / 12),
  fixedCommitments: 3412 + 558 + 157,
}

// AI scan - merchants to skip
export const SKIP_MERCHANTS = [
  'transfer', 'salary', 'wage', 'centrelink', 'bpay', 'direct debit',
  'loan', 'mortgage', 'repayment', 'direct credit', 'refund',
  'payment received', 'opening balance', 'closing balance',
]
