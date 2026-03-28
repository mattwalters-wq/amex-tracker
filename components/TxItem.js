'use client'

import { useState } from 'react'
import { BUCKETS, getCategoryIcon, getCategoryLabel } from '../lib/constants'
import { fmtAUD, fmtDate } from '../lib/utils'

export default function TxItem({ tx, onDelete, onEdit, showDate = false }) {
  const [confirming, setConfirming] = useState(false)
  const bucket = BUCKETS[tx.bucket] || BUCKETS.daily

  const handleDelete = (e) => {
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 2500)
      return
    }
    onDelete(tx.id)
  }

  return (
    <div
      className="flex items-center gap-3 bg-surface border border-black/[0.06] rounded-xl px-3 py-2.5 mb-1.5 active:bg-cream-dark transition-colors cursor-pointer"
      onClick={() => onEdit && onEdit(tx)}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: bucket.light }}
      >
        {getCategoryIcon(tx.category)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{tx.note || getCategoryLabel(tx.category)}</span>
          {tx.isDuplicate && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              dup
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: bucket.light, color: bucket.color }}
          >
            {bucket.label}
          </span>
          <span className="text-[11px] text-stone-400">
            {tx.card === 'amex' ? 'Amex' : 'Debit'} &middot; {tx.who === 'liz' ? 'Liz' : 'Matt'}
          </span>
          {showDate && (
            <span className="text-[11px] text-stone-400">&middot; {fmtDate(tx.created_at)}</span>
          )}
        </div>
      </div>

      {/* Amount + delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <div className={`text-sm font-medium ${tx.card === 'debit' ? 'text-olive' : 'text-stone-800'}`}>
            {fmtAUD(tx.amount)}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs ${
            confirming
              ? 'bg-terra text-white'
              : 'text-stone-300 hover:text-terra hover:bg-terra-light'
          }`}
        >
          {confirming ? '?' : '✕'}
        </button>
      </div>
    </div>
  )
}
