'use client'

import { useState } from 'react'
import { BUCKETS, CATEGORIES } from '../../lib/constants'

export default function AddPage({ onAdd }) {
  const [bucket, setBucket] = useState('daily')
  const [card, setCard] = useState('amex')
  const [who, setWho] = useState('matt')
  const [category, setCategory] = useState('groceries')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const cats = CATEGORIES[bucket] || []
  const bucketObj = BUCKETS[bucket]

  const handleBucket = (b) => {
    setBucket(b)
    setCategory(CATEGORIES[b]?.[0]?.id || '')
  }

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return
    setSaving(true)
    await onAdd({
      bucket,
      card,
      who,
      category,
      amount: Number(amount),
      note,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
    setSuccess(true)
    setAmount('')
    setNote('')
    setTimeout(() => setSuccess(false), 1500)
  }

  return (
    <div className="pb-24 px-4">
      <div className="pt-6 pb-4">
        <h1 className="font-serif text-3xl">Add transaction</h1>
      </div>

      {/* Amount - big prominent input */}
      <div className="bg-surface border border-black/[0.07] rounded-2xl p-5 mb-4 text-center">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Amount</div>
        <div className="flex items-center justify-center gap-2">
          <span className="font-serif text-4xl text-stone-400">$</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            className="font-serif text-4xl bg-transparent outline-none text-center w-40 placeholder-stone-200"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Bucket */}
      <div className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">Bucket</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.values(BUCKETS).map(b => (
            <button
              key={b.id}
              onClick={() => handleBucket(b.id)}
              className="py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={bucket === b.id
                ? { background: b.color, color: 'white', borderColor: b.color }
                : { background: b.light, color: b.color, borderColor: 'transparent' }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">Category</div>
        <div className="grid grid-cols-3 gap-2">
          {cats.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-1 ${
                category === c.id
                  ? 'border-sage bg-sage-light text-sage'
                  : 'border-black/[0.07] bg-surface text-stone-600'
              }`}
            >
              <span className="text-base">{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card + Who */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">Card</div>
          <div className="flex gap-2">
            {['amex', 'debit'].map(c => (
              <button
                key={c}
                onClick={() => setCard(c)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  card === c ? 'bg-sage text-white border-sage' : 'bg-surface text-stone-600 border-black/[0.07]'
                }`}
              >
                {c === 'amex' ? 'Amex' : 'Debit'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">Who</div>
          <div className="flex gap-2">
            {['matt', 'liz'].map(w => (
              <button
                key={w}
                onClick={() => setWho(w)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize border transition-all ${
                  who === w ? 'bg-sage text-white border-sage' : 'bg-surface text-stone-600 border-black/[0.07]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">Note (optional)</div>
        <input
          className="w-full border border-black/[0.07] rounded-xl px-4 py-3 text-sm bg-surface focus:outline-none focus:border-sage"
          placeholder="Merchant name or description..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || !amount}
        className={`w-full py-4 rounded-2xl text-white font-medium text-base transition-all ${
          success
            ? 'bg-olive'
            : saving || !amount
            ? 'bg-stone-300'
            : 'bg-sage hover:bg-sage-dark active:scale-95'
        }`}
      >
        {success ? 'Added!' : saving ? 'Saving...' : 'Add transaction'}
      </button>
    </div>
  )
}
