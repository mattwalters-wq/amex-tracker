'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { BUCKETS, CATEGORIES } from '../../lib/constants'
import {
  getCurrentCycle, filterByCycle, filterByWeek,
  sumBucket, sumCard, sumLiving, calcCarryForward,
  fmtAUD, genId, sanitizeDate,
} from '../../lib/utils'
import { format, parseISO } from 'date-fns'

const STORAGE_KEY = 'amex_chat_history_v2'

// Tool definitions sent to Claude
const TOOLS = [
  {
    name: 'add_transaction',
    description: 'Add a new transaction. Use when the user mentions a purchase they made.',
    input_schema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Merchant name or description' },
        amount: { type: 'number', description: 'Dollar amount (positive)' },
        bucket: { type: 'string', enum: ['daily', 'splurge', 'wine', 'bill', 'savings'], description: 'Budget bucket' },
        category: { type: 'string', description: 'Category id e.g. groceries, fuel, eating_out, coffee' },
        card: { type: 'string', enum: ['amex', 'debit'], description: 'Which card was used' },
        who: { type: 'string', enum: ['matt', 'liz'], description: 'Who made the purchase' },
        date: { type: 'string', description: 'Date as YYYY-MM-DD, or omit for today' },
      },
      required: ['note', 'amount', 'bucket', 'card'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Delete a transaction by ID. Use when the user asks to remove, delete, or undo a transaction.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction ID' },
        reason: { type: 'string', description: 'Brief reason e.g. duplicate, wrong entry' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_transaction',
    description: 'Update fields on an existing transaction. Use when user wants to correct bucket, amount, card, category, or note.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction ID' },
        note: { type: 'string', description: 'Updated merchant name' },
        amount: { type: 'number', description: 'Updated amount' },
        bucket: { type: 'string', enum: ['daily', 'splurge', 'wine', 'bill', 'savings'] },
        category: { type: 'string', description: 'Updated category id' },
        card: { type: 'string', enum: ['amex', 'debit'] },
        who: { type: 'string', enum: ['matt', 'liz'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_duplicate_transactions',
    description: 'Delete all transactions currently flagged as duplicates in one go.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'Must be true to proceed' },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'update_settings',
    description: 'Update budget settings like weekly caps.',
    input_schema: {
      type: 'object',
      properties: {
        daily_weekly: { type: 'number', description: 'New daily weekly cap in dollars' },
        splurge_weekly: { type: 'number', description: 'New splurge weekly cap in dollars' },
        bills_monthly: { type: 'number', description: 'New bills monthly cap in dollars' },
      },
    },
  },
]

function buildContext(transactions, settings) {
  const cycleStartDay = settings.cycle_start_day || 22
  const payDay = settings.pay_day || 4
  const cycle = getCurrentCycle(cycleStartDay)
  const cycleTx = filterByCycle(transactions, cycleStartDay)
  const weekTx = filterByWeek(transactions, payDay)
  const dailyCap = settings.daily_weekly || 605
  const splurgeCap = settings.splurge_weekly || 250
  const billsCap = settings.bills_monthly || 1500
  const wineCap = settings.wine_monthly || 250
  const dailyCarry = calcCarryForward(transactions, 'daily', dailyCap, payDay)
  const splurgeCarry = calcCarryForward(transactions, 'splurge', splurgeCap, payDay)
  const cycleLiving = sumLiving(cycleTx)
  const cycleLivingBudget = (dailyCap + splurgeCap) * 4.4
  const totalPoints = transactions
    .filter(t => t.card === 'amex')
    .reduce((s, t) => s + Math.floor(Number(t.amount) * 1.25), 0)
  const dupes = transactions.filter(t => t.isDuplicate)

  // --- ALL-TIME merchant totals (for pattern questions like "how much at Coles ever") ---
  const allMerchantTotals = {}
  transactions.forEach(tx => {
    const key = (tx.note || 'Unknown').trim()
    allMerchantTotals[key] = (allMerchantTotals[key] || 0) + Number(tx.amount)
  })
  const topAllMerchants = Object.entries(allMerchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([n, v]) => n + ': ' + fmtAUD(v))

  // --- ALL-TIME category totals ---
  const allCategoryTotals = {}
  transactions.forEach(tx => {
    allCategoryTotals[tx.category] = (allCategoryTotals[tx.category] || 0) + Number(tx.amount)
  })
  const topCategories = Object.entries(allCategoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k, v]) => k + ': ' + fmtAUD(v))

  // --- Month-by-month totals (all time) ---
  const monthTotals = {}
  transactions.forEach(tx => {
    const d = typeof tx.created_at === 'string' ? parseISO(tx.created_at) : new Date(tx.created_at)
    const key = format(d, 'MMM yyyy')
    if (!monthTotals[key]) monthTotals[key] = { daily: 0, splurge: 0, bill: 0, savings: 0, total: 0 }
    monthTotals[key][tx.bucket] = (monthTotals[key][tx.bucket] || 0) + Number(tx.amount)
    monthTotals[key].total += Number(tx.amount)
  })
  const monthSummary = Object.entries(monthTotals)
    .sort((a, b) => new Date('01 ' + a[0]) - new Date('01 ' + b[0]))
    .map(([m, v]) => m + ': total ' + fmtAUD(v.total) + ' (daily ' + fmtAUD(v.daily) + ', splurge ' + fmtAUD(v.splurge) + ', bills ' + fmtAUD(v.bill) + ', savings ' + fmtAUD(v.savings) + ')')

  // --- Per-person totals all time ---
  const mattTotal = transactions.filter(t => t.who === 'matt').reduce((s, t) => s + Number(t.amount), 0)
  const lizTotal = transactions.filter(t => t.who === 'liz').reduce((s, t) => s + Number(t.amount), 0)

  // --- This cycle top merchants ---
  const cycleMerchantTotals = {}
  cycleTx.forEach(tx => {
    const key = (tx.note || 'Unknown').trim()
    cycleMerchantTotals[key] = (cycleMerchantTotals[key] || 0) + Number(tx.amount)
  })
  const topCycleMerchants = Object.entries(cycleMerchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([n, v]) => n + ': ' + fmtAUD(v))

  // --- Recent transactions with IDs (for tool use) ---
  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 40)
    .map(tx => {
      const d = typeof tx.created_at === 'string' ? parseISO(tx.created_at) : new Date(tx.created_at)
      return '[' + tx.id + '] ' + format(d, 'd MMM yyyy') + ' - ' + (tx.note || tx.category) + ' ' + fmtAUD(tx.amount) + ' (' + tx.bucket + ', ' + tx.card + ', ' + tx.who + ')' + (tx.isDuplicate ? ' [DUPLICATE]' : '')
    })

  return `You are an agentic financial assistant for Matt and Liz Walters. You can read their data AND make changes using tools. Be direct, casual, and specific. No fluff. No em dashes.

TODAY: ${format(new Date(), 'd MMMM yyyy')}
CURRENT CYCLE: ${cycle.label} (${cycle.daysLeft} days left)

BUDGETS:
- Daily: ${fmtAUD(dailyCap)}/wk (this week cap: ${fmtAUD(dailyCarry.adjustedBudget)}${dailyCarry.carryNote ? ', ' + dailyCarry.carryNote : ''})
- Splurge: ${fmtAUD(splurgeCap)}/wk (this week cap: ${fmtAUD(splurgeCarry.adjustedBudget)}${splurgeCarry.carryNote ? ', ' + splurgeCarry.carryNote : ''})
- Bills: ${fmtAUD(billsCap)}/month (includes fuel) | Wine: ${fmtAUD(wineCap)}/month | Savings: no cap

THIS CYCLE: living ${fmtAUD(cycleLiving)} of ${fmtAUD(cycleLivingBudget)} | daily ${fmtAUD(sumBucket(cycleTx, 'daily'))} | splurge ${fmtAUD(sumBucket(cycleTx, 'splurge'))} | wine ${fmtAUD(sumBucket(cycleTx, 'wine'))} | bills ${fmtAUD(sumBucket(cycleTx, 'bill'))} | savings ${fmtAUD(sumBucket(cycleTx, 'savings'))}
THIS WEEK: daily ${fmtAUD(sumBucket(weekTx, 'daily'))} | splurge ${fmtAUD(sumBucket(weekTx, 'splurge'))}
AMEX/DEBIT SPLIT (this cycle): ${fmtAUD(sumCard(cycleTx, 'amex'))} / ${fmtAUD(sumCard(cycleTx, 'debit'))}
QF POINTS (all time): ~${totalPoints.toLocaleString()} | Japan (2 pax business): ~280,000 needed | to go: ~${Math.max(0, 280000 - totalPoints).toLocaleString()}

${dupes.length > 0 ? 'DUPLICATES: ' + dupes.length + ' transactions flagged as duplicates' : 'No duplicates detected'}

THIS CYCLE TOP MERCHANTS:
${topCycleMerchants.join('\n')}

ALL-TIME TOP MERCHANTS (use for pattern questions like "how much at Coles", "biggest splurge spots"):
${topAllMerchants.join('\n')}

ALL-TIME TOP CATEGORIES:
${topCategories.join('\n')}

SPENDING BY MONTH (all time - use for trend questions):
${monthSummary.join('\n')}

ALL-TIME BY PERSON: Matt ${fmtAUD(mattTotal)} | Liz ${fmtAUD(lizTotal)}
TOTAL TRANSACTIONS: ${transactions.length} | Date range: ${monthSummary.length > 0 ? monthSummary[0].split(':')[0] + ' to ' + monthSummary[monthSummary.length - 1].split(':')[0] : 'unknown'}

RECENT TRANSACTIONS WITH IDs (for tool use - delete/update by ID):
${recent.join('\n')}

INCOME: Matt ~$2,824/fn (UNIFIED), Liz ~$1,600/fn (architecture). Fixed (not on cards): mortgage $3,412/mo, car $558/mo, Centrelink $157/mo.

TOOL USE GUIDANCE:
- Use add_transaction when user describes a purchase
- Use delete_transaction for duplicates or wrong entries - use the ID from the list above
- Use update_transaction to fix bucket/category/amount/card errors
- Use delete_duplicate_transactions only when user explicitly asks to clear all dupes
- For ambiguous requests, ask one clarifying question before acting
- After completing an action, confirm what you did in plain language

STATEMENT RECONCILIATION (when a PDF or image is attached):
- Read every transaction on the statement carefully
- Cross-reference each one against the RECENT TRANSACTIONS list above
- Identify: (1) transactions on statement but missing from the tracker, (2) possible duplicates, (3) transactions in the wrong bucket
- For missing transactions, use add_transaction to add them - make a sensible bucket/category judgement based on merchant name
- Skip: direct debit payments, credits, refunds, interest charges - these are not purchases
- After reconciling, give a clear summary: how many added, how many already existed, any you flagged for review
- Large one-off purchases (IKEA, furniture, medical, car) should go to savings bucket unless clearly a bill`
}

// Render a tool call as a visible action card
function ToolCallCard({ call, result }) {
  const { name, input } = call
  const succeeded = result?.success !== false

  const label = {
    add_transaction: 'Added transaction',
    delete_transaction: 'Deleted transaction',
    update_transaction: 'Updated transaction',
    delete_duplicate_transactions: 'Cleared duplicates',
    update_settings: 'Updated settings',
  }[name] || name

  const detail = {
    add_transaction: input.note + ' ' + fmtAUD(input.amount) + ' (' + (input.bucket||'') + ', ' + (input.card||'') + ')',
    delete_transaction: 'ID: ' + input.id + (input.reason ? ' - ' + input.reason : ''),
    update_transaction: 'ID: ' + input.id,
    delete_duplicate_transactions: 'All flagged duplicates removed',
    update_settings: Object.entries(input).map(([k,v]) => k.replace(/_/g,' ') + ': ' + fmtAUD(v)).join(', '),
  }[name] || ''

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs border mb-1 ${
      succeeded
        ? 'bg-sage-light border-sage/20 text-sage'
        : 'bg-terra-light border-terra/20 text-terra'
    }`}>
      <span className="mt-0.5 flex-shrink-0">{succeeded ? '✓' : '!'}</span>
      <div>
        <div className="font-medium">{label}</div>
        {detail && <div className="opacity-70 mt-0.5">{detail}</div>}
        {result?.error && <div className="text-terra mt-0.5">{result.error}</div>}
      </div>
    </div>
  )
}

const SUGGESTED = [
  'Add $45 at Coles on Amex, daily',
  'Delete all duplicates',
  'Are we on track this month?',
  'Move the last splurge to daily bucket',
  'How much have we spent at Coles?',
  'Where can we cut $200/month?',
]

export default function ChatPage({ transactions, settings, onAdd, onDelete, onUpdate, onUpdateSettings }) {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState(null) // { name, base64, mediaType }
  const bottomRef = useRef()
  const fileRef = useRef()

  const context = useMemo(() => buildContext(transactions, settings), [transactions, settings])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Execute a single tool call, return { success, error, summary }
  const executeTool = async (name, input) => {
    try {
      if (name === 'add_transaction') {
        const tx = {
          note: input.note || '',
          amount: Number(input.amount),
          bucket: input.bucket || 'daily',
          category: input.category || 'other_' + (input.bucket || 'daily'),
          card: input.card || 'amex',
          who: input.who || 'matt',
          created_at: sanitizeDate(input.date || null),
        }
        const result = await onAdd(tx)
        if (result?.error) throw new Error(result.error.message || 'Add failed')
        return { success: true, id: result?.id }
      }

      if (name === 'delete_transaction') {
        const result = await onDelete(input.id)
        if (result?.error) throw new Error(result.error.message || 'Delete failed')
        return { success: true }
      }

      if (name === 'update_transaction') {
        const { id, ...updates } = input
        const result = await onUpdate(id, updates)
        if (result?.error) throw new Error(result.error.message || 'Update failed')
        return { success: true }
      }

      if (name === 'delete_duplicate_transactions') {
        if (!input.confirm) return { success: false, error: 'Confirm must be true' }
        const dupes = transactions.filter(t => t.isDuplicate)
        for (const tx of dupes) {
          await onDelete(tx.id)
        }
        return { success: true, count: dupes.length }
      }

      if (name === 'update_settings') {
        const result = await onUpdateSettings(input)
        if (result?.error) throw new Error(result.error.message || 'Settings update failed')
        return { success: true }
      }

      return { success: false, error: 'Unknown tool: ' + name }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result.split(',')[1])
      reader.onerror = () => rej(new Error('Read failed'))
      reader.readAsDataURL(file)
    })
    setAttachment({ name: file.name, base64, mediaType: file.type || 'application/pdf' })
    e.target.value = ''
  }

  const send = async (text) => {
    const msg = (text || input).trim()
    if ((!msg && !attachment) || loading) return
    setInput('')
    const currentAttachment = attachment
    setAttachment(null)

    const apiKey = localStorage.getItem('anthropic_api_key')
    if (!apiKey) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg || 'Reconcile this statement', attachmentName: currentAttachment?.name },
        { role: 'assistant', content: 'No Anthropic API key set. Add it in Settings first.' }
      ])
      return
    }

    const userMsg = { role: 'user', content: msg || 'Reconcile this statement against my transactions', attachmentName: currentAttachment?.name }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    // Build API messages - convert display messages to API format
    // For the latest message, include attachment if present
    const apiMessages = newMessages.map((m, idx) => {
      if (m.role === 'tool_result') return null
      // For the last user message, attach the document if present
      if (idx === newMessages.length - 1 && m.role === 'user' && currentAttachment) {
        const isPdf = currentAttachment.mediaType === 'application/pdf'
        const contentBlocks = []
        if (isPdf) {
          contentBlocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: currentAttachment.base64 },
          })
        } else {
          contentBlocks.push({
            type: 'image',
            source: { type: 'base64', media_type: currentAttachment.mediaType, data: currentAttachment.base64 },
          })
        }
        contentBlocks.push({ type: 'text', text: m.content })
        return { role: 'user', content: contentBlocks }
      }
      return { role: m.role, content: m.content }
    }).filter(Boolean)

    try {
      // Agentic loop - keep going until stop_reason is 'end_turn'
      let loopMessages = [...apiMessages]
      let iterations = 0
      const MAX_ITERATIONS = 5

      while (iterations < MAX_ITERATIONS) {
        iterations++

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
            max_tokens: 1024,
            system: context,
            tools: TOOLS,
            messages: loopMessages,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error?.message || 'API error ' + res.status)
        }

        const data = await res.json()
        const { content, stop_reason } = data

        // Collect text and tool_use blocks
        const textBlocks = content.filter(b => b.type === 'text')
        const toolBlocks = content.filter(b => b.type === 'tool_use')

        // If there's text, show it
        const textContent = textBlocks.map(b => b.text).join('\n').trim()

        if (stop_reason === 'end_turn' || toolBlocks.length === 0) {
          // Done - show final text reply
          if (textContent) {
            setMessages(prev => [...prev, { role: 'assistant', content: textContent, toolCalls: [] }])
          }
          break
        }

        // There are tool calls - execute them all
        const toolResults = []
        const executedCalls = []

        for (const block of toolBlocks) {
          const result = await executeTool(block.name, block.input)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
          executedCalls.push({ name: block.name, input: block.input, result })
        }

        // Show the action cards + any accompanying text as one message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: textContent,
          toolCalls: executedCalls,
        }])

        // Add assistant turn + tool results to loop
        loopMessages = [
          ...loopMessages,
          { role: 'assistant', content },
          { role: 'user', content: toolResults },
        ]
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + err.message }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <div className="flex flex-col pb-16" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Assistant</h1>
          <p className="text-xs text-stone-400 mt-0.5">{transactions.length} transactions loaded</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-xs text-stone-400 hover:text-terra px-3 py-1.5 border border-stone-200 rounded-lg">
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-none">
        {messages.length === 0 && (
          <div className="pt-2">
            <div className="bg-surface border border-black/[0.07] rounded-2xl p-4 mb-4">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Ask questions or tell me what to do. I can add transactions, fix mistakes, delete duplicates, and update budgets. Attach a PDF statement to reconcile the month.
              </p>
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Try saying</div>
            <div className="space-y-2">
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => send(q)} className="w-full text-left bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm text-stone-700 hover:bg-sage-light hover:border-sage/30 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-1 self-start">
                🤖
              </div>
            )}
            <div className={`max-w-[88%] ${msg.role === 'user' ? 'w-auto' : 'flex-1'}`}>
              {/* Tool action cards */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.toolCalls.map((call, j) => (
                    <ToolCallCard key={j} call={call} result={call.result} />
                  ))}
                </div>
              )}
              {/* Text bubble */}
              {(msg.content || msg.attachmentName) && (
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sage text-white rounded-tr-sm'
                    : 'bg-surface border border-black/[0.07] text-stone-800 rounded-tl-sm'
                }`}>
                  {msg.attachmentName && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-white/80 text-xs">
                      <span>📄</span><span>{msg.attachmentName}</span>
                    </div>
                  )}
                  {msg.content && msg.content.split('\n').map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-1">🤖</div>
            <div className="bg-surface border border-black/[0.07] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-20 pt-2 border-t border-black/[0.06] bg-cream">
        {/* Attachment preview */}
        {attachment && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-sage-light border border-sage/20 rounded-xl">
            <span className="text-sm">📄</span>
            <span className="text-xs font-medium text-sage flex-1 truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-sage/60 hover:text-terra text-sm leading-none">✕</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          {/* Paperclip */}
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border border-black/[0.07] bg-surface hover:bg-sage-light transition-all text-stone-400 hover:text-sage"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <textarea
            rows={1}
            className="flex-1 bg-surface border border-black/[0.07] rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-sage max-h-32 leading-relaxed"
            placeholder={attachment ? 'Add a message or just hit send...' : 'Ask or tell me what to do...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => send()}
            disabled={(!input.trim() && !attachment) || loading}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
              (input.trim() || attachment) && !loading ? 'bg-sage text-white hover:bg-sage-dark' : 'bg-stone-200 text-stone-400'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
