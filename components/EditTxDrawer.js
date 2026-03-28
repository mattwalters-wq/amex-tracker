'use client'

import { useState, useEffect } from 'react'
import { BUCKETS, CATEGORIES } from '../lib/constants'
import { fmtDate } from '../lib/utils'

export default function EditTxDrawer({ tx, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (tx) setForm({ ...tx })
  }, [tx])

  if (!tx || !form) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl p-5 pb-8 z-10 max-w-app w-full mx-auto">
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-5" />
        <h3 className="font-serif text-xl mb-4">Edit transaction</h3>

        {/* Note */}
        <label className="block text-xs text-stone-500 mb-1 font-medium uppercase tracking-wide">Merchant / note</label>
        <input
          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-cream mb-4 focus:outline-none focus:border-sage"
          value={form.note || ''}
          onChange={e => set('note', e.target.value)}
        />

        {/* Amount */}
        <label className="block text-xs text-stone-500 mb-1 font-medium uppercase tracking-wide">Amount</label>
        <input
          type="number"
          step="0.01"
          className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-cream mb-4 focus:outline-none focus:border-sage"
          value={form.amount || ''}
          onChange={e => set('amount', e.target.value)}
        />

        {/* Bucket */}
        <label className="block text-xs text-stone-500 mb-1 font-medium uppercase tracking-wide">Bucket</label>
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(BUCKETS).map(b => (
            <button
              key={b.id}
              onClick={() => set('bucket', b.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={form.bucket === b.id
                ? { background: b.color, color: 'white', borderColor: b.color }
                : { background: b.light, color: b.color, borderColor: 'transparent' }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Category */}
        <label className="block text-xs text-stone-500 mb-1 font-medium uppercase tracking-wide">Category</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {(CATEGORIES[form.bucket] || []).map(c => (
            <button
              key={c.id}
              onClick={() => set('category', c.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                form.category === c.id
                  ? 'bg-sage text-white border-sage'
                  : 'bg-cream text-stone-600 border-black/10'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Card + Who */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1 font-medium uppercase tracking-wide">Card</label>
            <div className="flex gap-2">
              {['amex', 'debit'].map(c => (
                <button key={c} onClick={() => set('card', c)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${form.card === c ? 'bg-sage text-white border-sage' : 'bg-cream text-stone-600 border-black/10'}`}>
                  {c === 'amex' ? 'Amex' : 'Debit'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1 font-medium uppercase tracking-wide">Who</label>
            <div className="flex gap-2">
              {['matt', 'liz'].map(w => (
                <button key={w} onClick={() => set('who', w)}
                  className={`flex-1 py-2 rounded-lg text-sm border capitalize transition-all ${form.who === w ? 'bg-sage text-white border-sage' : 'bg-cream text-stone-600 border-black/10'}`}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { onDelete(tx.id); onClose() }}
            className="px-4 py-3 rounded-xl border border-terra/30 text-terra text-sm font-medium hover:bg-terra-light transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => { onSave(tx.id, form); onClose() }}
            className="flex-1 py-3 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
