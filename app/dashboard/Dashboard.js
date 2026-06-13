'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { format, addDays, startOfDay } from 'date-fns'
import { Pencil } from 'lucide-react'
import { BUCKETS } from '../../lib/constants'
import {
  getCurrentCycle, filterByCycle,
  sumBucket, sumCard, calcPoints,
  fmtAUD, fmtDate, groupByDate,
  fortnightlyOccurrences, countWeekday,
} from '../../lib/utils'
import TxItem from '../../components/TxItem'
import EditTxDrawer from '../../components/EditTxDrawer'

// Home-screen design tokens (from the redesign handoff). Kept local so the rest
// of the app's palette is untouched.
const C = {
  screen: '#F5F0E6',
  ink: '#2B2724',
  muted: '#8A8275',
  faint: '#A39A88',
  faint2: '#9A9180',
  pencil: '#B3AA98',
  sage: '#5E7E58',
  terra: '#BE6A4C',
  gold: '#A6802F',
  wine: '#7A4A63',
  olive: '#9CA77E',
  hairline: 'rgba(43,39,36,0.12)',
  hairlineFaint: 'rgba(43,39,36,0.08)',
  dash: 'rgba(43,39,36,0.32)',
}

// Always show cents, with a leading minus outside the dollar sign.
const money = (n) => {
  const v = Number(n) || 0
  const s = Math.abs(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '-$' : '$') + s
}
const money0 = (n) => '$' + (Number(n) || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })

function ReconcileModal({ open, settings, cycle, trackedSpend, onSave, onClose }) {
  const [balance, setBalance] = useState('')
  const [startBalance, setStartBalance] = useState('')
  const [payments, setPayments] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    // Start balance + payments only carry over within the same cycle
    const sameCycle = settings.amex_cycle_key === cycle.key
    setBalance(settings.amex_actual_balance != null ? String(settings.amex_actual_balance) : '')
    setStartBalance(sameCycle && settings.amex_cycle_start_balance != null ? String(settings.amex_cycle_start_balance) : '')
    setPayments(sameCycle && Number(settings.amex_payments_cycle) ? String(settings.amex_payments_cycle) : '')
  }, [open, settings, cycle])

  if (!open) return null

  const balNum = parseFloat(balance)
  const startNum = startBalance.trim() === '' ? null : parseFloat(startBalance)
  const payNum = payments.trim() === '' ? 0 : parseFloat(payments)
  const valid = !isNaN(balNum) && balNum >= 0
    && (startNum === null || (!isNaN(startNum) && startNum >= 0))
    && !isNaN(payNum) && payNum >= 0

  const expected = startNum != null && !isNaN(payNum) ? startNum + trackedSpend - payNum : null
  const untracked = expected != null && !isNaN(balNum) ? balNum - expected : null

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    await onSave({
      amex_actual_balance: balNum,
      amex_balance_updated_at: new Date().toISOString(),
      amex_cycle_start_balance: startNum,
      amex_payments_cycle: payNum,
      amex_cycle_key: cycle.key,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-app rounded-t-3xl sm:rounded-3xl p-5 pb-8"
        style={{ background: C.screen }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl mb-1">Amex posted balance</h2>
        <p className="text-xs text-stone-400 mb-4">
          From the Amex app: the Total Balance now, what was owed when this cycle started ({fmtDate(cycle.start)} — usually last statement's closing balance), and payments made since. This sets the "posted so far" line; the gap to logged spend is pending.
        </p>
        <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1 px-1">Total balance now</div>
        <div className="flex items-center gap-2 border border-black/10 rounded-xl px-4 py-3 mb-3" style={{ background: '#FDFCFA' }}>
          <span className="font-serif text-2xl text-stone-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            className="flex-1 font-serif text-2xl bg-transparent outline-none text-stone-800"
            placeholder="0.00"
            value={balance}
            onChange={e => setBalance(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1 px-1">Owed at cycle start</div>
            <div className="flex items-center gap-1.5 border border-black/10 rounded-xl px-3 py-2.5" style={{ background: '#FDFCFA' }}>
              <span className="font-serif text-lg text-stone-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                className="w-full font-serif text-lg bg-transparent outline-none text-stone-800"
                placeholder="0.00"
                value={startBalance}
                onChange={e => setStartBalance(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1 px-1">Paid this cycle</div>
            <div className="flex items-center gap-1.5 border border-black/10 rounded-xl px-3 py-2.5" style={{ background: '#FDFCFA' }}>
              <span className="font-serif text-lg text-stone-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                className="w-full font-serif text-lg bg-transparent outline-none text-stone-800"
                placeholder="0.00"
                value={payments}
                onChange={e => setPayments(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="border border-black/10 rounded-xl px-4 py-3 mb-5 text-xs" style={{ background: '#FDFCFA' }}>
          <div className="flex justify-between text-stone-400">
            <span>Logged this cycle</span>
            <span className="font-medium text-stone-600">{fmtAUD(trackedSpend)}</span>
          </div>
          {expected != null && (
            <div className="flex justify-between text-stone-400 mt-1">
              <span>Posted so far (start + logged − paid)</span>
              <span className="font-medium text-stone-600">{fmtAUD(expected)}</span>
            </div>
          )}
          {untracked != null && (
            <div className="mt-1.5 pt-1.5 border-t border-black/[0.06] font-medium">
              {Math.abs(untracked) < 0.5
                ? <span className="text-olive">✓ Posted has caught up to logged spend</span>
                : untracked > 0
                  ? <span className="text-ochre">{fmtAUD(untracked)} posted but not logged yet</span>
                  : <span className="text-stone-500">{fmtAUD(-untracked)} logged still pending on the card</span>}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-stone-500 border border-black/10">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-white disabled:bg-stone-200 disabled:text-stone-400"
            style={!valid || saving ? undefined : { background: C.sage }}
          >
            {saving ? 'Saving...' : 'Save balance'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ transactions, settings, onDelete, onUpdate, onUpdateSettings }) {
  const [editTx, setEditTx] = useState(null)
  const [drillBucket, setDrillBucket] = useState(null)
  const [reconcileOpen, setReconcileOpen] = useState(false)

  const cycle = useMemo(() => getCurrentCycle(settings.cycle_start_day || 22), [settings])
  const cycleTx = useMemo(() => filterByCycle(transactions, settings.cycle_start_day || 22), [transactions, settings])

  // Caps
  const dailyCap = settings.daily_weekly || 605
  const splurgeCap = settings.splurge_weekly || 250

  // Cycle bucket + card totals
  const cycleDaily = sumBucket(cycleTx, 'daily')
  const cycleSplurge = sumBucket(cycleTx, 'splurge')
  const cycleBills = sumBucket(cycleTx, 'bill')
  const cycleWine = sumBucket(cycleTx, 'wine')
  const cycleSavings = sumBucket(cycleTx, 'savings')
  const cycleAmex = sumCard(cycleTx, 'amex')
  const cyclePoints = calcPoints(cycleTx)

  // Day-to-day budget for the cycle (Daily + Splurge caps scaled to cycle length)
  const weeksInCycle = cycle.totalDays / 7
  const dailyBudget = dailyCap * weeksInCycle
  const splurgeBudget = splurgeCap * weeksInCycle
  const livingBudget = dailyBudget + splurgeBudget
  const budgetRemaining = livingBudget - (cycleDaily + cycleSplurge)

  // The bill = logged spend on the Amex this cycle. This leads (it is everything
  // bought this cycle) and is the hero coverage number.
  const projectedBill = cycleAmex

  // Posted balance from the Amex app lags; the difference is pending, not error.
  const actualBalance = settings.amex_actual_balance != null ? Number(settings.amex_actual_balance) : null
  const sameCycle = settings.amex_cycle_key === cycle.key
  const startBalance = sameCycle && settings.amex_cycle_start_balance != null ? Number(settings.amex_cycle_start_balance) : null
  const cyclePayments = sameCycle ? Number(settings.amex_payments_cycle || 0) : 0
  // Charges that have posted this cycle = balance now − owed at start + payments made.
  const posted = (actualBalance != null && startBalance != null) ? actualBalance - startBalance + cyclePayments : null
  const pending = posted != null ? projectedBill - posted : null

  // Timeline: today -> cycle close -> payment due (~2 weeks of leeway after close).
  const due = useMemo(() => addDays(cycle.end, 14), [cycle])
  const daysToClose = cycle.daysLeft
  const daysToDue = daysToClose + 14
  const closePct = Math.max(0, Math.min(100, daysToDue > 0 ? (daysToClose / daysToDue) * 100 : 0))
  const annotationPct = (closePct + 100) / 2
  const weeksToPay = Math.max(1, Math.round((daysToDue - daysToClose) / 7))

  // Editable CBA set-aside (persisted real user data).
  const [setAside, setSetAside] = useState(settings.cba_set_aside ?? 4600)
  const setAsideFocused = useRef(false)
  const setAsideTimer = useRef(null)
  useEffect(() => {
    if (!setAsideFocused.current && settings.cba_set_aside != null) {
      setSetAside(Number(settings.cba_set_aside))
    }
  }, [settings.cba_set_aside])

  const handleSetAside = (raw) => {
    // Keep digits only -> non-negative integer. Avoids the controlled
    // number-input leading-zero quirk (e.g. "0" + "1889" = "01889").
    const digits = String(raw).replace(/[^0-9]/g, '')
    const n = digits === '' ? 0 : parseInt(digits, 10)
    setSetAside(n)
    clearTimeout(setAsideTimer.current)
    setAsideTimer.current = setTimeout(() => { onUpdateSettings({ cba_set_aside: n }) }, 600)
  }

  // Forward-looking coverage: pays land and the mortgage leaves CBA between now
  // and the due date, so project the CBA balance to the due date rather than
  // freezing on today. Window is from after today up to and including the due date.
  const mattPay = Number(settings.matt_pay ?? 2824.61)
  const lizPay = Number(settings.liz_pay ?? 1600)
  const mortgageWeekly = Number(settings.mortgage_weekly ?? 895)
  const mortgageWeekday = settings.mortgage_weekday != null ? Number(settings.mortgage_weekday) : 4

  const mattPays = useMemo(() => fortnightlyOccurrences(settings.matt_pay_anchor || '2026-06-11', new Date(), due), [settings.matt_pay_anchor, due])
  const lizPays = useMemo(() => fortnightlyOccurrences(settings.liz_pay_anchor || '2026-06-18', new Date(), due), [settings.liz_pay_anchor, due])
  const payCount = mattPays.length + lizPays.length
  const incomingPays = mattPays.length * mattPay + lizPays.length * lizPay
  const mortgageCount = useMemo(() => countWeekday(mortgageWeekday, addDays(startOfDay(new Date()), 1), due), [mortgageWeekday, due])
  const mortgageOut = mortgageCount * mortgageWeekly
  const projectedAvailable = setAside + incomingPays - mortgageOut
  const coverage = projectedAvailable - projectedBill
  const covered = coverage >= -0.005

  // "Left to spend" shows the binding constraint, not just the budget. Every
  // day-to-day dollar goes on the Amex and grows the bill, so the real room is
  // bounded by the projected coverage as well as the day-to-day budget remaining.
  const overSetAside = projectedAvailable < projectedBill - 0.005
  const coverageIsLimit = coverage < budgetRemaining
  const leftToSpend = Math.max(0, Math.min(budgetRemaining, coverage))
  const leftCaption = overSetAside
    ? `over your set-aside by ${money(projectedBill - projectedAvailable)}`
    : coverageIsLimit
      ? "capped by what you've set aside"
      : 'day to day, rest of cycle'
  const leftCaptionColor = overSetAside ? C.terra : C.muted

  // "Where it's going" — calm breakdown of the bill: what has been spent per
  // bucket this cycle (not remaining budget). Savings shows what's been saved.
  const spentRow = (name, color, drill, spent) => ({ name, color, drill, amount: money(spent), word: 'spent' })
  const buckets = [
    spentRow('Daily', C.sage, 'daily', cycleDaily),
    spentRow('Splurge', C.terra, 'splurge', cycleSplurge),
    spentRow('Bills', C.gold, 'bill', cycleBills),
    spentRow('Wine', C.wine, 'wine', cycleWine),
    { name: 'Savings', color: C.olive, drill: 'savings', amount: money(cycleSavings), word: 'saved' },
  ]

  const cycleLine = `${format(cycle.start, 'd MMM')} - ${format(cycle.end, 'd MMM')} · closes in ${cycle.daysLeft} ${cycle.daysLeft === 1 ? 'day' : 'days'}`
  const dueLabel = format(due, 'd MMM')

  // ---- Bucket drill-down (preserved) ----------------------------------------
  const drillTx = useMemo(() => {
    if (!drillBucket) return []
    return cycleTx.filter(t => t.bucket === drillBucket)
  }, [drillBucket, cycleTx])

  if (drillBucket) {
    const bucketLabel = BUCKETS[drillBucket]?.label || drillBucket
    const grouped = groupByDate(drillTx)
    return (
      <div className="pb-28" style={{ background: C.screen, minHeight: '100vh' }}>
        <div className="sticky top-0 z-10 px-4 pt-5 pb-3 flex items-center gap-3" style={{ background: C.screen }}>
          <button onClick={() => setDrillBucket(null)} className="p-1" style={{ color: C.sage }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="font-serif text-2xl">{bucketLabel}</h1>
        </div>
        <div className="px-4">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <div className="text-[10px] uppercase tracking-widest text-stone-400 font-medium py-2">{fmtDate(date + 'T00:00:00')}</div>
              {txs.map(tx => (
                <TxItem key={tx.id} tx={tx} onDelete={onDelete} onEdit={setEditTx} />
              ))}
            </div>
          ))}
          {drillTx.length === 0 && (
            <p className="text-center text-stone-400 text-sm py-12">No transactions yet</p>
          )}
        </div>
        <EditTxDrawer tx={editTx} onSave={onUpdate} onDelete={onDelete} onClose={() => setEditTx(null)} />
      </div>
    )
  }

  // ---- Home screen ----------------------------------------------------------
  return (
    <div style={{ background: C.screen, minHeight: '100vh', padding: '66px 26px 110px' }}>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: C.ink, lineHeight: 1.05 }}>Walters</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>{cycleLine}</div>
        </div>
        <div className="flex-shrink-0 text-right" style={{ paddingTop: 2 }}>
          <div style={{ fontSize: 15, color: C.ink, fontWeight: 600 }}>{cyclePoints.toLocaleString()}</div>
          <div style={{ fontSize: 10.5, color: C.faint, letterSpacing: '0.3px' }}>Qantas pts</div>
        </div>
      </div>

      {/* Hero one: left to spend */}
      <div style={{ marginTop: 34 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, letterSpacing: '0.2px' }}>Left to spend</div>
        <div className="font-serif" style={{ fontSize: 62, lineHeight: 1, color: C.ink, marginTop: 8 }}>{money(leftToSpend)}</div>
        <div className="flex items-baseline justify-between" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, color: leftCaptionColor }}>{leftCaption}</div>
          <div style={{ fontSize: 13, color: C.faint }}>of {money0(livingBudget)}</div>
        </div>
      </div>

      <div style={{ height: 1, background: C.hairline, margin: '26px 0' }} />

      {/* Hero two: the bill / coverage */}
      <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, letterSpacing: '0.2px' }}>The bill</div>
      <div className="flex items-baseline flex-wrap" style={{ gap: 11, marginTop: 7 }}>
        <div className="font-serif" style={{ fontSize: 46, lineHeight: 1, color: C.ink }}>{money(projectedBill)}</div>
        <div style={{ fontSize: 12.5, color: C.muted }}>projected, logged this cycle</div>
      </div>

      {/* Timeline */}
      <div style={{ margin: '22px 2px 0' }}>
        {/* leeway annotation over the sage segment */}
        <div style={{ position: 'relative', height: 19 }}>
          <div
            className="font-serif italic"
            style={{ position: 'absolute', left: annotationPct + '%', bottom: 0, transform: 'translateX(-50%)', fontSize: 15, color: C.sage, whiteSpace: 'nowrap', lineHeight: 1 }}
          >
            {weeksToPay === 1 ? '1 week to pay' : `${weeksToPay} weeks to pay`}
          </div>
        </div>
        {/* track */}
        <div style={{ position: 'relative', height: 10 }}>
          <div style={{ position: 'absolute', top: 4, left: 5, right: 5, height: 2, background: C.hairline, borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: 4, left: closePct + '%', right: 5, height: 2, background: C.sage, borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: 0, left: 5, transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: C.ink }} />
          <div style={{ position: 'absolute', top: 0, left: closePct + '%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: C.screen, border: `2px solid ${C.muted}` }} />
          <div style={{ position: 'absolute', top: 0, right: 5, transform: 'translateX(50%)', width: 10, height: 10, borderRadius: '50%', background: C.sage }} />
        </div>
        {/* labels */}
        <div style={{ position: 'relative', height: 33, marginTop: 9 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 11.5, color: C.ink, fontWeight: 600 }}>Today</div>
            <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{format(new Date(), 'd MMM')}</div>
          </div>
          <div style={{ position: 'absolute', left: closePct + '%', top: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 11.5, color: C.ink, fontWeight: 600 }}>Closes</div>
            <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{format(cycle.end, 'd MMM')}</div>
          </div>
          <div style={{ position: 'absolute', right: 0, top: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, color: C.ink, fontWeight: 600 }}>Due</div>
            <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{dueLabel}</div>
          </div>
        </div>
      </div>

      {/* Set aside / coverage */}
      <div className="flex items-end justify-between" style={{ marginTop: 22 }}>
        <div>
          <div style={{ fontSize: 12.5, color: C.muted }}>Set aside in CBA</div>
          <div className="flex items-baseline" style={{ gap: 1, marginTop: 5 }}>
            <span className="font-serif" style={{ fontSize: 31, color: C.ink }}>$</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              className="no-spinner font-serif"
              value={setAside === 0 ? '' : String(setAside)}
              onFocus={() => { setAsideFocused.current = true }}
              onBlur={() => { setAsideFocused.current = false }}
              onChange={e => handleSetAside(e.target.value)}
              style={{ fontSize: 31, color: C.ink, border: 'none', background: 'transparent', width: 104, padding: '0 2px', outline: 'none', borderBottom: `1px dashed ${C.dash}`, lineHeight: 1 }}
            />
            <Pencil style={{ width: 15, height: 15, color: C.pencil, marginLeft: 5 }} strokeWidth={1.75} />
          </div>
        </div>
        <div className="text-right" style={{ paddingBottom: 5 }}>
          <div style={{ fontSize: 12, color: C.muted }}>by {dueLabel}</div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
        {`+ ${payCount} ${payCount === 1 ? 'pay' : 'pays'} before ${dueLabel} (${money(incomingPays)}), - mortgage (${money(mortgageOut)}) = projected ${money(projectedAvailable)} by ${dueLabel}`}
      </div>
      <div style={{ marginTop: 11, fontSize: 15, fontWeight: 600, color: covered ? C.sage : C.terra }}>
        {covered
          ? `Covered, ${money(coverage)} to spare`
          : `Short ${money(-coverage)} for the bill`}
      </div>
      <button
        onClick={() => setReconcileOpen(true)}
        className="block text-left"
        style={{ marginTop: 9, fontSize: 12.5, color: C.faint }}
      >
        {posted != null
          ? `posted so far ${money(posted)}${pending >= 0.005 ? ` · ${money(pending)} pending` : ''}`
          : 'add your Amex balance to see what’s posted'}
      </button>

      <div style={{ height: 1, background: C.hairline, margin: '26px 0 6px' }} />

      {/* Where it's going */}
      <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, letterSpacing: '0.2px', marginBottom: 2 }}>Where it&apos;s going</div>
      {buckets.map((b) => (
        <button
          key={b.name}
          onClick={() => setDrillBucket(b.drill)}
          className="w-full flex items-center text-left"
          style={{ padding: '13px 0', borderBottom: `1px solid ${C.hairlineFaint}` }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, marginRight: 14, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 16, color: C.ink }}>{b.name}</div>
          <div className="flex items-baseline" style={{ gap: 6 }}>
            <span style={{ fontSize: 16, color: C.ink }}>{b.amount}</span>
            <span style={{ fontSize: 12, color: C.faint2, minWidth: 30 }}>{b.word}</span>
          </div>
        </button>
      ))}

      {/* Footer */}
      <div style={{ marginTop: 20, fontSize: 12, color: C.faint, lineHeight: 1.55 }}>
        Pace, weekly comparisons and the tracking check live in Reports.
      </div>

      <EditTxDrawer tx={editTx} onSave={onUpdate} onDelete={onDelete} onClose={() => setEditTx(null)} />

      <ReconcileModal
        open={reconcileOpen}
        settings={settings}
        cycle={cycle}
        trackedSpend={cycleAmex}
        onSave={onUpdateSettings}
        onClose={() => setReconcileOpen(false)}
      />
    </div>
  )
}
