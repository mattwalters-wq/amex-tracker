'use client'

import { useState, useMemo } from 'react'
import { BUCKETS } from '../../lib/constants'
import { filterByCycle, groupByDate, fmtAUD, fmtDate } from '../../lib/utils'
import TxItem from '../../components/TxItem'
import EditTxDrawer from '../../components/EditTxDrawer'

export default function TransactionsPage({ transactions, settings, onDelete, onUpdate }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editTx, setEditTx] = useState(null)

  const cycleTx = useMemo(
    () => filterByCycle(transactions, settings.cycle_start_day || 22),
    [transactions, settings]
  )

  const filtered = useMemo(() => {
    let list = filter === 'cycle' ? cycleTx : transactions
    if (filter === 'dupes') list = transactions.filter(t => t.isDuplicate)
    if (filter === 'amex') list = list.filter(t => t.card === 'amex')
    if (filter === 'debit') list = list.filter(t => t.card === 'debit')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => (t.note || '').toLowerCase().includes(q))
    }
    return list
  }, [filter, transactions, cycleTx, search])

  const dupeCount = useMemo(() => transactions.filter(t => t.isDuplicate).length, [transactions])
  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  return (
    <div className="pb-24 px-4">
      <div className="pt-6 pb-3">
        <h1 className="font-serif text-3xl">Transactions</h1>
        <p className="text-xs text-stone-400 mt-0.5">{filtered.length} shown</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          className="w-full bg-surface border border-black/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-sage"
          placeholder="Search merchant..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'cycle', label: 'This cycle' },
          { id: 'all', label: 'All time' },
          { id: 'amex', label: 'Amex' },
          { id: 'debit', label: 'Debit' },
          { id: 'dupes', label: `Dupes${dupeCount ? ' ' + dupeCount : ''}` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
              filter === f.id
                ? f.id === 'dupes' ? 'bg-amber-500 text-white border-amber-500' : 'bg-sage text-white border-sage'
                : f.id === 'dupes' && dupeCount ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-surface border-black/[0.07] text-stone-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">{fmtDate(date + 'T00:00:00')}</span>
            <span className="text-[10px] text-stone-400">{fmtAUD(txs.reduce((s, t) => s + Number(t.amount), 0))}</span>
          </div>
          {txs.map(tx => (
            <TxItem key={tx.id} tx={tx} onDelete={onDelete} onEdit={setEditTx} />
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-center text-stone-400 text-sm py-16">No transactions found</p>
      )}

      <EditTxDrawer tx={editTx} onSave={onUpdate} onDelete={onDelete} onClose={() => setEditTx(null)} />
    </div>
  )
}
