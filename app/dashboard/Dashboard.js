'use client'

import { useState, useMemo } from 'react'
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

export default function Dashboard({ transactions, settings, onDelete, onUpdate }) {
  const router = useRouter()
  const [editTx, setEditTx] = useState(null)
  const [drillBucket, setDrillBucket] = useState(null)

  const cycle = useMemo(() => getCurrentCycle(settings.cycle_start_day || 22), [settings])
  const week = useMemo(() => getCurrentWeek(settings.pay_day || 4), [settings])

  const cycleTx = useMemo(() => filterByCycle(transactions, settings.cycle_start_day || 22), [transactions, settings])
  const weekTx = useMemo(() => filterByWeek(transactions, settings.pay_day || 4), [transactions, settings])

  // Budget figures
  const dailyCap = settings.daily_weekly || 605
  const splurgeCap = settings.splurge_weekly || 250
  const billsCap = settings.bills_monthly || 1166

  const dailyCarry = useMemo(() => calcCarryForward(transactions, 'daily', dailyCap, settings.pay_day || 4), [transactions, dailyCap, settings])
  const splurgeCarry = useMemo(() => calcCarryForward(transactions, 'splurge', splurgeCap, settings.pay_day || 4), [transactions, splurgeCap, settings])

  // Cycle totals
  const cycleLiving = sumLiving(cycleTx)
  const cycleLivingBudget = (dailyCap * 4.4 + splurgeCap * 4.4)
  const cycleBills = sumBucket(cycleTx, 'bill')
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
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Monthly living</span>
          <span className="text-xs text-stone-400">Daily + Splurge</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`font-serif text-3xl ${livingOver ? 'text-terra' : 'text-stone-800'}`}>{fmtAUD(cycleLiving)}</span>
          <span className="text-stone-400 text-sm">/ {fmtAUD(cycleLivingBudget)}</span>
        </div>
        <ProgressBar value={cycleLiving} max={cycleLivingBudget} color="#7A9E8E" showPaceMarker paceValue={livingPace} />
        {livingOver ? (
          <div className="mt-2 text-xs text-terra font-medium">
            Over by {fmtAUD(overspend)} &middot; {fmtAUD(recoveryPerDay)}/day to recover
          </div>
        ) : (
          <div className="mt-2 text-xs text-stone-400">
            {fmtAUD(cycleLivingBudget - cycleLiving)} remaining &middot; pace {fmtAUD(livingPace)}
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
          <div className="text-[10px] text-stone-400 mt-1.5">
            {dailyCarry.carryNote || ('cap ' + fmtAUD(dailyCarry.adjustedBudget))}
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
          <div className="text-[10px] text-stone-400 mt-1.5">
            {splurgeCarry.carryNote || ('cap ' + fmtAUD(splurgeCarry.adjustedBudget))}
          </div>
        </div>
      </div>

      {/* Bills + Savings */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('bill')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Bills this cycle</div>
          <div className="font-serif text-2xl mb-1 text-stone-800">{fmtAUD(cycleBills)}</div>
          <ProgressBar value={cycleBills} max={billsCap} color="#C49A4A" />
          <div className="text-[10px] text-stone-400 mt-1.5">of {fmtAUD(billsCap)}</div>
        </div>
        <div
          className="bg-surface border border-black/[0.07] rounded-2xl p-3.5 cursor-pointer active:bg-cream-dark"
          onClick={() => setDrillBucket('savings')}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-0.5">Savings</div>
          <div className="font-serif text-2xl mb-1 text-olive">{fmtAUD(cycleSavings)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5">outside budget caps</div>
        </div>
      </div>

      {/* Amex card */}
      <div className="bg-surface border border-black/[0.07] rounded-2xl p-4 mb-3">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Amex this cycle</div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-[10px] text-stone-400 mb-0.5">Amex</div>
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
    </div>
  )
}
