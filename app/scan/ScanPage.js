'use client'

import { useState, useRef } from 'react'
import { BUCKETS, CATEGORIES, SKIP_MERCHANTS } from '../../lib/constants'
import { sanitizeDate, detectDuplicates, fmtAUD } from '../../lib/utils'

const BUCKET_ORDER = ['daily', 'splurge', 'bill', 'savings']

function cycleBucket(current) {
  const idx = BUCKET_ORDER.indexOf(current)
  return BUCKET_ORDER[(idx + 1) % BUCKET_ORDER.length]
}

export default function ScanPage({ transactions, onImport }) {
  const [card, setCard] = useState(null)
  const [stage, setStage] = useState('pick-card') // pick-card | uploading | reviewing | done
  const [scanned, setScanned] = useState([])
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setStage('uploading')
    setError(null)

    const apiKey = localStorage.getItem('anthropic_api_key')
    if (!apiKey) {
      setError('No Anthropic API key set. Add it in Settings.')
      setStage('pick-card')
      return
    }

    try {
      // Convert file to base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = () => rej(new Error('File read failed'))
        reader.readAsDataURL(file)
      })

      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'

      const systemPrompt = `You are a transaction extractor. Extract all real purchase transactions from this bank statement or screenshot.

RULES:
- Include ALL purchases and pending transactions (pending = real purchases, include them)
- Skip: salary deposits, Centrelink, transfers between accounts, loan repayments, direct debits from mortgage/car finance, refunds of credits
- For each transaction return ONLY a JSON array, no other text, no markdown
- Each object: { "note": "merchant name", "amount": number (positive), "date": "YYYY-MM-DD or null if pending", "bucket": one of daily/splurge/bill/savings, "category": category id }

Bucket guide:
- daily: groceries (Coles/Woolworths/Aldi), fuel (Ampol/BP), pharmacy, kids, pets, transport, hardware (Bunnings), garden
- splurge: restaurants, cafes, coffee, takeaway, Uber Eats/DoorDash, wine/bottle shop, bars
- bill: Starlink, electricity, gas, water, phone, insurance, subscriptions (Netflix/Spotify), pilates, piano, activities
- savings: large one-off purchases, clothing, gifts, tech

Category ids: groceries, fuel, health, kids, pets, transport, shopping, garden, other_daily, eating_out, coffee, wine, kb, market, other_splurge, internet, gas, electricity, phone, water, insurance, subscriptions, activities, other_bill, home, clothing, gifts, travel, tech, other_savings

Card being processed: ${card}
Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY a valid JSON array. No explanation. No markdown.`

      const msgContent = isImage
        ? [
            { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
            { type: 'text', text: 'Extract all purchase transactions from this statement screenshot.' },
          ]
        : isPdf
        ? [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: 'Extract all purchase transactions from this bank statement.' },
          ]
        : null

      if (!msgContent) {
        setError('Please upload an image or PDF file.')
        setStage('pick-card')
        return
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: msgContent }],
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || 'API error ' + res.status)
      }

      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      const clean = text.replace(/```json\n?|```/g, '').trim()

      let parsed
      try {
        parsed = JSON.parse(clean)
      } catch {
        throw new Error('Could not parse AI response. Try a clearer screenshot.')
      }

      if (!Array.isArray(parsed)) throw new Error('Unexpected response format')

      // Sanitize dates, filter skipped merchants
      const sanitized = parsed
        .filter(tx => {
          const note = (tx.note || '').toLowerCase()
          return !SKIP_MERCHANTS.some(s => note.includes(s))
        })
        .map((tx, i) => ({
          id: 'scan_' + i,
          note: tx.note || '',
          amount: Math.abs(Number(tx.amount) || 0),
          bucket: BUCKET_ORDER.includes(tx.bucket) ? tx.bucket : 'daily',
          category: tx.category || 'other_daily',
          card,
          who: 'matt',
          created_at: sanitizeDate(tx.date),
          isDuplicate: false,
        }))
        .filter(tx => tx.amount > 0)

      // Check for dupes against existing transactions
      const combined = detectDuplicates([...sanitized, ...transactions])
      const withDupFlag = sanitized.map(tx => {
        const match = combined.find(c => c.id === tx.id)
        return { ...tx, isDuplicate: match?.isDuplicate || false }
      })

      setScanned(withDupFlag)
      // Pre-deselect duplicates
      setSelected(withDupFlag.map(tx => !tx.isDuplicate))
      setStage('reviewing')
    } catch (err) {
      setError(err.message)
      setStage('pick-card')
    }
  }

  const toggleSelect = (i) => {
    setSelected(s => s.map((v, idx) => idx === i ? !v : v))
  }

  const changeBucket = (i) => {
    setScanned(s => s.map((tx, idx) =>
      idx === i ? { ...tx, bucket: cycleBucket(tx.bucket) } : tx
    ))
  }

  const handleImport = async () => {
    const toImport = scanned.filter((_, i) => selected[i])
    if (!toImport.length) return
    setImporting(true)
    await onImport(toImport)
    setImporting(false)
    setStage('done')
  }

  const reset = () => {
    setStage('pick-card')
    setCard(null)
    setScanned([])
    setSelected([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Done
  if (stage === 'done') {
    return (
      <div className="pb-24 px-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-serif text-2xl mb-2">Imported!</h2>
        <p className="text-stone-400 text-sm mb-6 text-center">Transactions added to your tracker</p>
        <button onClick={reset} className="bg-sage text-white px-8 py-3 rounded-xl font-medium">
          Scan another
        </button>
      </div>
    )
  }

  // Reviewing
  if (stage === 'reviewing') {
    const selectedCount = selected.filter(Boolean).length
    const dupCount = scanned.filter(tx => tx.isDuplicate).length

    return (
      <div className="pb-28 px-4">
        <div className="pt-6 pb-4">
          <h1 className="font-serif text-3xl">Review scan</h1>
          <p className="text-sm text-stone-400 mt-1">
            {scanned.length} found &middot; {selectedCount} selected
            {dupCount > 0 && <span className="text-amber-600"> &middot; {dupCount} possible dup{dupCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>

        <div className="space-y-2 mb-4">
          {scanned.map((tx, i) => {
            const b = BUCKETS[tx.bucket]
            return (
              <div
                key={tx.id}
                className={`bg-surface border rounded-xl p-3 transition-all ${
                  tx.isDuplicate ? 'border-amber-200 bg-amber-50/50' : 'border-black/[0.07]'
                } ${!selected[i] ? 'opacity-50' : ''}`}
              >
                {tx.isDuplicate && (
                  <div className="text-[10px] text-amber-700 font-medium mb-1.5 flex items-center gap-1">
                    <span>Possible duplicate</span>
                    <span className="text-amber-400">&middot;</span>
                    <span>same merchant, amount and date already exists</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(i)}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                      selected[i] ? 'bg-sage border-sage text-white' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {selected[i] && (
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.note}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        onClick={() => changeBucket(i)}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-all"
                        style={{ background: b?.light, color: b?.color }}
                        title="Tap to change bucket"
                      >
                        {b?.label} &darr;
                      </button>
                      <span className="text-[11px] text-stone-400">{new Date(tx.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="text-sm font-medium flex-shrink-0">{fmtAUD(tx.amount)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="fixed bottom-20 left-0 right-0 max-w-app mx-auto px-4 pb-2">
          <div className="flex gap-3 bg-cream pt-2">
            <button onClick={reset} className="px-4 py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className={`flex-1 py-3 rounded-xl text-white text-sm font-medium transition-all ${
                selectedCount === 0 || importing ? 'bg-stone-300' : 'bg-sage hover:bg-sage-dark'
              }`}
            >
              {importing ? 'Importing...' : 'Import ' + selectedCount + ' transaction' + (selectedCount !== 1 ? 's' : '')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Uploading
  if (stage === 'uploading') {
    return (
      <div className="pb-24 px-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-4xl mb-4 animate-pulse">🔍</div>
        <p className="font-serif text-xl mb-2">Reading with Claude...</p>
        <p className="text-stone-400 text-sm">Extracting {card === 'amex' ? 'Amex' : 'CommBank'} transactions</p>
      </div>
    )
  }

  // Pick card
  return (
    <div className="pb-24 px-4">
      <div className="pt-6 pb-4">
        <h1 className="font-serif text-3xl">Scan statement</h1>
        <p className="text-sm text-stone-400 mt-1">Upload a screenshot or PDF from your banking app</p>
      </div>

      {error && (
        <div className="bg-terra-light border border-terra/20 rounded-xl px-4 py-3 mb-4 text-sm text-terra">
          {error}
        </div>
      )}

      {/* Card select */}
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">Which card?</div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCard('amex')}
            className={`py-5 rounded-2xl border-2 font-medium transition-all ${
              card === 'amex' ? 'border-sage bg-sage-light text-sage' : 'border-black/[0.07] bg-surface text-stone-600'
            }`}
          >
            <div className="text-2xl mb-1">💳</div>
            <div className="text-sm">Amex</div>
            <div className="text-[10px] text-stone-400">...51005</div>
          </button>
          <button
            onClick={() => setCard('debit')}
            className={`py-5 rounded-2xl border-2 font-medium transition-all ${
              card === 'debit' ? 'border-olive bg-olive-light text-olive' : 'border-black/[0.07] bg-surface text-stone-600'
            }`}
          >
            <div className="text-2xl mb-1">🏦</div>
            <div className="text-sm">Debit</div>
            <div className="text-[10px] text-stone-400">CommBank</div>
          </button>
        </div>
      </div>

      {/* Upload area */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
      />
      <button
        onClick={() => card && fileRef.current?.click()}
        disabled={!card}
        className={`w-full border-2 border-dashed rounded-2xl py-12 flex flex-col items-center gap-3 transition-all ${
          card
            ? 'border-sage/40 hover:border-sage hover:bg-sage-light/30 cursor-pointer'
            : 'border-stone-200 opacity-50 cursor-not-allowed'
        }`}
      >
        <div className="text-4xl">📄</div>
        <div className="text-sm font-medium text-stone-600">Tap to upload</div>
        <div className="text-xs text-stone-400 text-center px-8">
          Screenshot from Amex or CommBank app, or bank statement PDF
        </div>
      </button>

      {!card && (
        <p className="text-center text-xs text-stone-400 mt-3">Select a card first</p>
      )}

      <div className="mt-6 bg-ochre-light border border-ochre/20 rounded-xl px-4 py-3">
        <div className="text-xs font-medium text-ochre mb-1">What gets skipped automatically</div>
        <div className="text-xs text-stone-500">
          Salary, Centrelink, transfers, loan repayments, mortgage direct debits. Pending transactions are included.
        </div>
      </div>
    </div>
  )
}
