'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BUCKETS } from '../../lib/constants'
import {
  getCurrentCycle, filterByCycle, filterByDateRange,
  sumBucket, sumCard, getLastNWeeks, fmtAUD, groupByDate,
} from '../../lib/utils'
import { format, parseISO } from 'date-fns'

const TABS = ['Weekly', 'Monthly', 'Buckets', 'People']

export default function ReportsPage({ transactions, settings }) {
  const [tab, setTab] = useState('Weekly')

  const cycleStartDay = settings.cycle_start_day || 22
  const payDay = settings.pay_day || 4
  const cycle = useMemo(() => getCurrentCycle(cycleStartDay), [cycleStartDay])
  const cycleTx = useMemo(() => filterByCycle(transactions, cycleStartDay), [transactions, cycleStartDay])

  // Last 8 weeks data
  const weeklyData = useMemo(() => {
    const weeks = getLastNWeeks(8, payDay)
    return weeks.map(w => {
      const wTx = filterByDateRange(transactions, w.start, w.end)
      return {
        label: w.label,
        Daily: Math.round(sumBucket(wTx, 'daily')),
        Splurge: Math.round(sumBucket(wTx, 'splurge')),
        Bills: Math.round(sumBucket(wTx, 'bill')),
      }
    })
  }, [transactions, payDay])

  // Monthly bucket breakdown
  const bucketData = useMemo(() => {
    return Object.values(BUCKETS).map(b => ({
      name: b.label,
      Spent: Math.round(sumBucket(cycleTx, b.id)),
      Budget: b.monthlyBudget || 0,
      color: b.color,
    }))
  }, [cycleTx])

  // Card split
  const amexTotal = Math.round(sumCard(cycleTx, 'amex'))
  const debitTotal = Math.round(sumCard(cycleTx, 'debit'))
  const cardData = [
    { name: 'Amex', value: amexTotal, color: '#7A9E8E' },
    { name: 'Debit', value: debitTotal, color: '#5E6B4A' },
  ]

  // People split
  const mattTotal = Math.round(cycleTx.filter(t => t.who === 'matt').reduce((s, t) => s + Number(t.amount), 0))
  const lizTotal = Math.round(cycleTx.filter(t => t.who === 'liz').reduce((s, t) => s + Number(t.amount), 0))
  const peopleData = [
    { name: 'Matt', value: mattTotal, color: '#7A9E8E' },
    { name: 'Liz', value: lizTotal, color: '#C4705A' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-black/10 rounded-xl p-3 text-xs shadow-sm">
        <div className="font-medium mb-1">{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {fmtAUD(p.value)}</div>
        ))}
      </div>
    )
  }

  return (
    <div className="pb-24 px-4">
      <div className="pt-6 pb-4">
        <h1 className="font-serif text-3xl">Reports</h1>
        <p className="text-xs text-stone-400 mt-0.5">{cycle.label}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
              tab === t ? 'bg-sage text-white border-sage' : 'bg-surface border-black/[0.07] text-stone-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Weekly */}
      {tab === 'Weekly' && (
        <div className="space-y-4">
          <div className="bg-surface border border-black/[0.07] rounded-2xl p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Spend last 8 weeks</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Daily" fill="#7A9E8E" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="Splurge" fill="#C4705A" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-sage inline-block" /> Daily
              </span>
              <span className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-terra inline-block" /> Splurge
              </span>
            </div>
          </div>

          {/* Weekly averages */}
          <div className="bg-surface border border-black/[0.07] rounded-2xl p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">8-week average</h3>
            {['Daily', 'Splurge', 'Bills'].map(b => {
              const avg = Math.round(weeklyData.reduce((s, w) => s + (w[b] || 0), 0) / weeklyData.length)
              const cap = b === 'Daily' ? settings.daily_weekly : b === 'Splurge' ? settings.splurge_weekly : null
              return (
                <div key={b} className="flex justify-between items-center py-2 border-b border-black/[0.05] last:border-0">
                  <span className="text-sm text-stone-600">{b}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{fmtAUD(avg)}/wk</span>
                    {cap && <span className="text-xs text-stone-400 ml-2">cap {fmtAUD(cap)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly */}
      {tab === 'Monthly' && (
        <div className="space-y-4">
          <div className="bg-surface border border-black/[0.07] rounded-2xl p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">This cycle by bucket</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bucketData} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Spent" radius={[0, 3, 3, 0]}>
                  {bucketData.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Card split */}
          <div className="bg-surface border border-black/[0.07] rounded-2xl p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Amex vs debit this cycle</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={cardData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2}>
                    {cardData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {cardData.map(c => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
                    <div>
                      <div className="text-xs text-stone-500">{c.name}</div>
                      <div className="text-sm font-medium">{fmtAUD(c.value)}</div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-stone-400 pt-1">Direct debit: {fmtAUD(amexTotal)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buckets detail */}
      {tab === 'Buckets' && (
        <div className="space-y-3">
          {Object.values(BUCKETS).map(b => {
            const spent = sumBucket(cycleTx, b.id)
            const budget = b.monthlyBudget
            const pct = budget ? Math.min(100, (spent / budget) * 100) : null
            const over = budget && spent > budget

            return (
              <div key={b.id} className="bg-surface border border-black/[0.07] rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm" style={{ color: b.color }}>{b.label}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{b.description}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-medium ${over ? 'text-terra' : 'text-stone-800'}`}>{fmtAUD(spent)}</div>
                    {budget && <div className="text-xs text-stone-400">/ {fmtAUD(budget)}</div>}
                  </div>
                </div>
                {pct !== null && (
                  <div className="h-2 bg-black/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: pct + '%', background: over ? '#C4705A' : b.color }}
                    />
                  </div>
                )}
                {!budget && <div className="text-xs text-stone-400">No budget cap</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* People */}
      {tab === 'People' && (
        <div className="space-y-4">
          <div className="bg-surface border border-black/[0.07] rounded-2xl p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Spend by person this cycle</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={peopleData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2}>
                    {peopleData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4">
                {peopleData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: p.color }} />
                    <div>
                      <div className="text-xs text-stone-500">{p.name}</div>
                      <div className="text-sm font-medium">{fmtAUD(p.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per person bucket breakdown */}
          {['matt', 'liz'].map(person => {
            const personTx = cycleTx.filter(t => t.who === person)
            return (
              <div key={person} className="bg-surface border border-black/[0.07] rounded-2xl p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3 capitalize">{person}'s buckets</h3>
                {Object.values(BUCKETS).map(b => {
                  const s = Math.round(sumBucket(personTx, b.id))
                  if (!s) return null
                  return (
                    <div key={b.id} className="flex justify-between py-1.5 border-b border-black/[0.04] last:border-0">
                      <span className="text-sm text-stone-600">{b.label}</span>
                      <span className="text-sm font-medium">{fmtAUD(s)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
