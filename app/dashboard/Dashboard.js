'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BUCKETS, AMEX } from '../../lib/constants'
import {
  getCurrentCycle, getCurrentWeek, filterByCycle, filterByWeek,
  sumBucket, sumCard, sumLiving, calcCarryForward, calcPoints,
  fmtAUD, fmtDate, groupByDate,
} from '../../lib/utils'
import ProgressBar from '../../components/ProgressBar'
import TxItem from '../../components/TxItem'
import EditTxDrawer from '../../components/EditTxDrawer'

function ReconcileModal({ open, current, trackedSpend, onSave, onClose }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValue(current != null ? String(current) : '')
  }, [open, current])

  if (!open) return null

  const num = parseFloat(value)
  const valid = !isNaN(num) && num >= 0

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    await onSave({
      amex_actual_balance: num,
      amex_balance_updated_at: new Date().toISOString(),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-cream w-full max-w-app rounded-t-3xl sm:rounded-3xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-serif text-2xl mb-1">Reconcile Amex balance</h2>
        <p className="text-xs text-stone-400 mb-4">
          Open the Amex app and enter the current Total Balance. This is the real balance owed — it can differ from tracked spend because it carries prior cycles and subtracts payments.
        </p>
        <div className="flex items-center gap-2 bg-surface border border-black/10 rounded-xl px-4 py-3 mb-4">
          <span className="font-serif text-2xl text-stone-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            className="flex-1 font-serif text-2xl bg-transparent outline-none text-stone-800"
            placeholder="0.00"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-400 mb-5 px-1">
          <span>Tracked this cycle</span>
          <span className="font-medium text-stone-600">{fmtAUD(trackedSpend)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-stone-500 border border-black/10">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-sage text-white disabled:bg-stone-200 disabled:text-stone-400"
          >
            {saving ? 'Saving...' : 'Save balance'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ transactions, settings, onDelete, onUpdate, onUpdateSettings }) {
  const router = useRouter()
  const [editTx, setEditTx] = useState(null)
  const [drillBucket, setDrillBucket] = useState(null)
  const [reconcileOpen, setReconcileOpen] = useState(false)

  const cycle = useMemo(() => getCurrentCycle(settings.cycle_start_day || 22), [settings])
  const week = useMemo(() => getCurrentWeek(settings.pay_day || 4), [settings])

  const cycleTx = useMemo(() => filterByCycle(transactions, settings.cycle_start_day || 22), [transactions, settings])
  const weekTx = useMemo(() => filterByWeek(transactions, settings.pay_day || 4), [transactions, settings])

  // Budget figures
  const dailyCap = settings.daily_weekly || 605
  const splurgeCap = settings.splurge_weekly || 250
  const billsCap = settings.bills_monthly || 1500
  const wineCap = settings.wine_monthly || 250

  const dailyCarry = useMemo(() => calcCarryForward(transactions, 'daily', dailyCap, settings.pay_day || 4), [transactions, dailyCap, settings])
  const splurgeCarry = useMemo(() => calcCarryForward(transactions, 'splurge', splurgeCap, settings.pay_day || 4), [transactions, splurgeCap, settings])

  // Cycle totals
  const cycleLiving = sumLiving(cycleTx)
  const cycleLivingBudget = (dailyCap * 4.4 + splurgeCap * 4.4)
  const cycleBills = sumBucket(cycleTx, 'bill')
  const cycleWine = sumBucket(cycleTx, 'wine')
  const cycleSavings = sumBucket(cycleTx, 'savings')
  const cycleAmex = sumCard(cycleTx, 'amex')
  const cycleDebit = sumCard(cycleTx, 'debit')

  // Week totals
  const weekDaily = sumBucket(weekTx, 'daily')
  const weekSplurge = sumBucket(weekTx, 'splurge')

  // Points
  const cyclePoints = calcPoints(cycleTx)
  const totalPoints = calcPoints(transactions)

  // Recovery calc
  const livingOver = cycleLiving > cycleLivingBudget
  const overspend = livingOver ? cycleLiving - cycleLivingBudget : 0
  const recoveryPerDay = cycle.daysLeft > 0 ? overspend / cycle.daysLeft : 0

  // Pace marker (how much should be spent given days elapsed)
  const livingPace = (cycleLivingBudget / cycle.totalDays) * cycle.daysElapsed

  // Left-to-spend figures
  const livingLeft = cycleLivingBudget - cycleLiving
  const billsLeft = billsCap - cycleBills
  const wineLeft = wineCap - cycleWine

  // Safe-to-spend on Amex this cycle (so it can be paid off in full)
  const amexTarget = settings.amex_cycle_target || 4000
  const amexHeadroom = amexTarget - cycleAmex

  // Amex balance reconciliation
  const actualBalance = settings.amex_actual_balance != null ? Number(settings.amex_actual_balance) : null
  const balanceAsOf = settings.amex_balance_updated_at || null
  const balanceDiff = actualBalance != null ? cycleAmex - actualBalance : null

  // Drill transactions
  const drillTx = useMemo(() => {
    if (!drillBucket) return []
    if (drillBucket === 'living') return cycleTx.filter(t => t.bucket === 'daily' || t.bucket === 'splurge')
    return cycleTx.filter(t => t.bucket === drillBucket)
  }, [drillBucket, cycleTx])

  if (drillBucket) {
    const bucketLabel = drillBucket === 'living' ? 'Daily + Splurge' : BUCKETS[drillBucket]?.label || drillBucket
    const grouped = groupByDate(drillTx)
    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-cream z-10 px-4 pt-5 pb-3 flex items-center gap-3">
          <button onClick={() => setDrillBucket(null)} className="text-sage p-1">
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

  return (
    <div className="pb-24 px-4">

      {/* Header */}
      <div className="pt-6 pb-4">
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">{cycle.label}</p>
        <h1 className="font-serif text-3xl mt-0.5">Walters</h1>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>{cycle.daysElapsed}d in</span>
            <span>{cycle.daysLeft}d left</span>
          </div>
          <ProgressBar value={cycle.daysElapsed} max={cycle.totalDays} color="#7A9E8E" />
        </div>
      </div>

      {/* Monthly Living Spend */}
      <div
        className="bg-surface border border-black/[0.07] rounded-2xl p-4 mb-3 cursor-pointer active:bg-cream-dark transition-colors"
        onClick={() => setDrillBucket('living')}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Monthly living</span>
          <span className="text-xs text-stone-400">Daily + Splurge</span>
        </div>
        <div className="flex items-end justify-between mb-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">Spent</div>
            <div className={`font-serif text-3xl leading-none ${livingOver ? 'text-terra' : 'text-stone-800'}`}>{fmtAUD(cycleLiving)}</div>
            <div className="text-[11px] text-stone-400 mt-1">of {fmtAUD(cycleLivingBudget)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">{livingOver ? 'Over by' : 'Left to spend'}</div>
            <div className={`font-serif text-3xl leading-none ${livingOver ? 'text-terra' : 'text-olive'}`}>
              {fmtAUD(Math.abs(livingLeft))}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">{cycle.daysLeft}d left in cycle</div>
          </div>
        </div>
        <ProgressBar value={cycleLiving} max={cycleLivingBudget} color="#7A9E8E" showPaceMarker paceValue={livingPace} />
        {livingOver ? (
          <div className="mt-2 text-xs text-terra font-medium">
            {fmtAUD(recoveryPerDay)}/day to recover &middot; pace was {fmtAUD(livingPace)}
          </div>
        ) : (
          <div className="mt-2 text-xs text-stone-400">
            On pace you'd be at {fmtAUD(livingPace)} by now
          </div>
        )}
      </div>

      {/* Recovery card */}
      {livingOver && (
        <div className="bg-terra-light border border-terra/20 rounded-2xl p-4 mb-3">
          <div className="text-xs font-medium uppercase tracking-wider text-terra mb-1">Recovery target</div>
          <div className="flex gap-4">
            <div>
              <div className="font-serif text-2xl text-terra">{fmtAUD(recoveryPerDay)}</div>
              <div className="text-xs text-stone-500">per day</div>
            </div>
            <div>
              <div className="font-serif text-2xl text-terra">{fmtAUD(recoveryPerDay * 7)}</div>
              <div className="text-xs text-stone-500">per week</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Daily */}
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('daily')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Daily this wk</div>
          <div className={`font-serif text-2xl mb-1 ${weekDaily > dailyCarry.adjustedBudget ? 'text-terra' : 'text-stone-800'}`}>
            {fmtAUD(weekDaily)}
          </div>
          <ProgressBar value={weekDaily} max={dailyCarry.adjustedBudget} color="#7A9E8E" />
          <div className="text-[10px] mt-1.5">
            {weekDaily > dailyCarry.adjustedBudget
              ? <span className="text-terra font-medium">over by {fmtAUD(weekDaily - dailyCarry.adjustedBudget)}</span>
              : <span className="text-stone-400"><span className="text-olive font-medium">{fmtAUD(dailyCarry.adjustedBudget - weekDaily)}</span> left of {fmtAUD(dailyCarry.adjustedBudget)}</span>}
            {dailyCarry.carryNote && <span className="text-stone-300"> &middot; {dailyCarry.carryNote}</span>}
          </div>
        </div>

        {/* Splurge */}
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('splurge')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Splurge this wk</div>
          <div className={`font-serif text-2xl mb-1 ${weekSplurge > splurgeCarry.adjustedBudget ? 'text-terra' : 'text-stone-800'}`}>
            {fmtAUD(weekSplurge)}
          </div>
          <ProgressBar value={weekSplurge} max={splurgeCarry.adjustedBudget} color="#C4705A" />
          <div className="text-[10px] mt-1.5">
            {weekSplurge > splurgeCarry.adjustedBudget
              ? <span className="text-terra font-medium">over by {fmtAUD(weekSplurge - splurgeCarry.adjustedBudget)}</span>
              : <span className="text-stone-400"><span className="text-olive font-medium">{fmtAUD(splurgeCarry.adjustedBudget - weekSplurge)}</span> left of {fmtAUD(splurgeCarry.adjustedBudget)}</span>}
            {splurgeCarry.carryNote && <span className="text-stone-300"> &middot; {splurgeCarry.carryNote}</span>}
          </div>
        </div>
      </div>

      {/* Bills + Wine + Savings */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('bill')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Bills</div>
          <div className={`font-serif text-xl mb-1 ${cycleBills > billsCap ? 'text-terra' : 'text-stone-800'}`}>{fmtAUD(cycleBills)}</div>
          <ProgressBar value={cycleBills} max={billsCap} color="#C49A4A" />
          <div className="text-[10px] mt-1.5">
            {billsLeft < 0
              ? <span className="text-terra font-medium">over by {fmtAUD(-billsLeft)}</span>
              : <span className="text-stone-400"><span className="text-olive font-medium">{fmtAUD(billsLeft)}</span> left</span>}
          </div>
        </div>
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('wine')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Wine</div>
          <div className={`font-serif text-xl mb-1 ${cycleWine > wineCap ? 'text-terra' : 'text-stone-800'}`} style={{ color: cycleWine > wineCap ? undefined : '#8E5A7A' }}>{fmtAUD(cycleWine)}</div>
          <ProgressBar value={cycleWine} max={wineCap} color="#8E5A7A" />
          <div className="text-[10px] mt-1.5">
            {wineLeft < 0
              ? <span className="text-terra font-medium">over by {fmtAUD(-wineLeft)}</span>
              : <span className="text-stone-400"><span className="text-olive font-medium">{fmtAUD(wineLeft)}</span> left</span>}
          </div>
        </div>
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('savings')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Savings</div>
          <div className="font-serif text-xl mb-1 text-olive">{fmtAUD(cycleSavings)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5">no cap</div>
        </div>
      </div>

      {/* Amex card */}
      <div className="bg-surface border border-black/[0.07] rounded-2xl p-4 mb-3">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Amex this cycle</span>
          <span className="text-[10px] text-stone-400">{cycle.daysLeft}d left &middot; ends {cycle.endLabel}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-[10px] text-stone-400 mb-0.5">Spend</div>
            <div className="font-serif text-xl text-stone-800">{fmtAUD(cycleAmex)}</div>
          </div>
          <div className="w-px h-8 bg-stone-200" />
          <div>
            <div className="text-[10px] text-stone-400 mb-0.5">Debit</div>
            <div className="font-serif text-xl text-olive">{fmtAUD(cycleDebit)}</div>
          </div>
          <div className="w-px h-8 bg-stone-200" />
          <div>
            <div className="text-[10px] text-stone-400 mb-0.5">QF pts</div>
            <div className="font-serif text-xl text-ochre">{cyclePoints.toLocaleString()}</div>
          </div>
        </div>

        {/* Safe to spend this cycle (pay off in full) */}
        <div className="border-t border-black/[0.06] pt-3 mb-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-stone-400">Safe to spend &middot; cap {fmtAUD(amexTarget)}</span>
            {amexHeadroom >= 0
              ? <span className="text-[11px]"><span className="text-olive font-medium">{fmtAUD(amexHeadroom)}</span> <span className="text-stone-400">left</span></span>
              : <span className="text-[11px] text-terra font-medium">over by {fmtAUD(-amexHeadroom)}</span>}
          </div>
          <ProgressBar value={cycleAmex} max={amexTarget} color="#7A9E8E" />
          <div className="text-[10px] text-stone-300 mt-1.5">Keeps the bill payable in full each cycle &middot; edit in Settings</div>
        </div>

        {/* Actual balance reconciliation */}
        <div className="border-t border-black/[0.06] pt-3 mb-3">
          {actualBalance != null ? (
            <button onClick={() => setReconcileOpen(true)} className="w-full text-left">
              <div className="flex justify-between items-baseline">
                <div>
                  <div className="text-[10px] text-stone-400 mb-0.5">Actual card balance</div>
                  <div className="font-serif text-xl text-stone-800">{fmtAUD(actualBalance)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 mb-0.5">
                    {Math.abs(balanceDiff) < 0.5 ? 'Matches tracked' : (balanceDiff > 0 ? 'Tracked higher by' : 'Tracked lower by')}
                  </div>
                  <div className={`text-sm font-medium ${Math.abs(balanceDiff) < 0.5 ? 'text-olive' : 'text-ochre'}`}>
                    {Math.abs(balanceDiff) < 0.5 ? '✓' : fmtAUD(Math.abs(balanceDiff))}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-stone-300 mt-1.5">
                {balanceAsOf ? 'Updated ' + fmtDate(balanceAsOf) : ''} &middot; tap to update
              </div>
            </button>
          ) : (
            <button
              onClick={() => setReconcileOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-sage py-1.5 border border-sage/30 rounded-lg active:bg-cream-dark"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Enter actual Amex balance
            </button>
          )}
        </div>

        {/* Sign-up bonus progress */}
        <div>
          <div className="flex justify-between text-[10px] text-stone-400 mb-1">
            <span>Signup bonus spend</span>
            <span className="text-olive font-medium">Achieved! 74,096 pts</span>
          </div>
          <ProgressBar value={AMEX.signupBonusTarget} max={AMEX.signupBonusTarget} color="#5E6B4A" />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-serif text-xl">Recent</h2>
        <button onClick={() => router.push('/transactions')} className="text-xs text-sage font-medium">See all</button>
      </div>
      {transactions.slice(0, 8).map(tx => (
        <TxItem key={tx.id} tx={tx} onDelete={onDelete} onEdit={setEditTx} showDate />
      ))}

      <EditTxDrawer tx={editTx} onSave={onUpdate} onDelete={onDelete} onClose={() => setEditTx(null)} />

      <ReconcileModal
        open={reconcileOpen}
        current={actualBalance}
        trackedSpend={cycleAmex}
        onSave={onUpdateSettings}
        onClose={() => setReconcileOpen(false)}
      />
    </div>
  )
}
