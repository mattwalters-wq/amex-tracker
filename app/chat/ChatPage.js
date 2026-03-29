'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { BUCKETS } from '../../lib/constants'
import {
  getCurrentCycle, filterByCycle, filterByWeek,
  sumBucket, sumCard, sumLiving, calcCarryForward,
  fmtAUD, fmtDate,
} from '../../lib/utils'
import { format, parseISO } from 'date-fns'

const STORAGE_KEY = 'amex_chat_history'

const SUGGESTED_QUESTIONS = [
  'Are we on track this month?',
  'How much have we spent at Coles?',
  'Where can we cut $200/month?',
  'When will we have enough points for Japan?',
  'What are our biggest splurge categories?',
  'How does this week compare to last week?',
]

function buildFinancialContext(transactions, settings) {
  const cycleStartDay = settings.cycle_start_day || 22
  const payDay = settings.pay_day || 4
  const cycle = getCurrentCycle(cycleStartDay)
  const cycleTx = filterByCycle(transactions, cycleStartDay)
  const weekTx = filterByWeek(transactions, payDay)

  const dailyCap = settings.daily_weekly || 605
  const splurgeCap = settings.splurge_weekly || 250
  const billsCap = settings.bills_monthly || 1166
  const dailyCarry = calcCarryForward(transactions, 'daily', dailyCap, payDay)
  const splurgeCarry = calcCarryForward(transactions, 'splurge', splurgeCap, payDay)

  const cycleLiving = sumLiving(cycleTx)
  const cycleLivingBudget = (dailyCap + splurgeCap) * 4.4
  const cycleAmex = sumCard(cycleTx, 'amex')
  const cycleDebit = sumCard(cycleTx, 'debit')

  // Top merchants this cycle
  const merchantTotals = {}
  cycleTx.forEach(tx => {
    const key = tx.note || 'Unknown'
    merchantTotals[key] = (merchantTotals[key] || 0) + Number(tx.amount)
  })
  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => name + ': ' + fmtAUD(total))

  // Category breakdown
  const categoryTotals = {}
  cycleTx.forEach(tx => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount)
  })

  // All-time totals for merchant lookups
  const allMerchantTotals = {}
  transactions.forEach(tx => {
    const key = (tx.note || '').toLowerCase()
    allMerchantTotals[key] = (allMerchantTotals[key] || 0) + Number(tx.amount)
  })

  // Points estimate
  const totalPoints = transactions
    .filter(t => t.card === 'amex')
    .reduce((sum, t) => sum + Math.floor(Number(t.amount) * 1.25), 0)

  // Recent transactions list (last 20)
  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20)
    .map(tx => {
      const d = typeof tx.created_at === 'string' ? parseISO(tx.created_at) : new Date(tx.created_at)
      return format(d, 'd MMM') + ' - ' + (tx.note || tx.category) + ' ' + fmtAUD(tx.amount) + ' (' + tx.bucket + ', ' + tx.card + ', ' + tx.who + ')'
    })

  return `You are a financial assistant for Matt and Liz Walters. You have full access to their household spending data. Be direct, casual, and specific. No fluff.

TODAY: ${format(new Date(), 'd MMMM yyyy')}
CURRENT CYCLE: ${cycle.label} (${cycle.daysLeft} days left, ${cycle.daysElapsed} days in)

BUDGET SETTINGS:
- Daily cap: ${fmtAUD(dailyCap)}/week (adjusted this week: ${fmtAUD(dailyCarry.adjustedBudget)}${dailyCarry.carryNote ? ', ' + dailyCarry.carryNote : ''})
- Splurge cap: ${fmtAUD(splurgeCap)}/week (adjusted this week: ${fmtAUD(splurgeCarry.adjustedBudget)}${splurgeCarry.carryNote ? ', ' + splurgeCarry.carryNote : ''})
- Bills cap: ${fmtAUD(billsCap)}/month
- Savings: no cap (tracked only)
- Total monthly living budget: ~${fmtAUD(cycleLivingBudget)}

THIS CYCLE SPENDING:
- Living (Daily + Splurge): ${fmtAUD(cycleLiving)} of ${fmtAUD(cycleLivingBudget)} (${Math.round((cycleLiving / cycleLivingBudget) * 100)}%)
- Daily: ${fmtAUD(sumBucket(cycleTx, 'daily'))}
- Splurge: ${fmtAUD(sumBucket(cycleTx, 'splurge'))}
- Bills: ${fmtAUD(sumBucket(cycleTx, 'bill'))} of ${fmtAUD(billsCap)}
- Savings: ${fmtAUD(sumBucket(cycleTx, 'savings'))}
- Amex: ${fmtAUD(cycleAmex)} | Debit: ${fmtAUD(cycleDebit)}
- ${cycleLiving > cycleLivingBudget ? 'OVER BUDGET by ' + fmtAUD(cycleLiving - cycleLivingBudget) : 'Under budget by ' + fmtAUD(cycleLivingBudget - cycleLiving)}

THIS WEEK:
- Daily: ${fmtAUD(sumBucket(weekTx, 'daily'))} of ${fmtAUD(dailyCarry.adjustedBudget)} cap
- Splurge: ${fmtAUD(sumBucket(weekTx, 'splurge'))} of ${fmtAUD(splurgeCarry.adjustedBudget)} cap

AMEX CARD:
- Card ending 51005, credit limit $20,000
- Estimated QF points earned (all time): ~${totalPoints.toLocaleString()}
- Japan business return (2 pax): ~280,000 points needed
- Points to go: ~${Math.max(0, 280000 - totalPoints).toLocaleString()}
- Statement closes ~22nd, direct debit ~14 days after
- Earn rate: 1.25 pts/$1 (everyday), 2.25 pts/$1 (Qantas), 0.5 pts/$1 (govt)

TOP MERCHANTS THIS CYCLE:
${topMerchants.join('\n')}

RECENT TRANSACTIONS (last 20):
${recent.join('\n')}

TOTAL TRANSACTIONS IN DATABASE: ${transactions.length}

HOUSEHOLD INCOME (for context):
- Matt salary: ~$2,824 fortnightly (UNIFIED Music Group)
- Liz salary: ~$1,600 fortnightly (architecture)
- Combined net: ~$8,849/month
- Fixed commitments NOT on cards: mortgage $3,412/mo, car finance $558/mo, Centrelink repayment $157/mo`
}

export default function ChatPage({ transactions, settings }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const inputRef = useRef()

  const context = useMemo(() => buildFinancialContext(transactions, settings), [transactions, settings])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const apiKey = localStorage.getItem('anthropic_api_key')
    if (!apiKey) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: 'No Anthropic API key set. Add it in Settings first.' }
      ])
      return
    }

    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
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
          max_tokens: 1000,
          system: context,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || 'API error ' + res.status)
      }

      const data = await res.json()
      const reply = data.content?.find(b => b.type === 'text')?.text || 'No response'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
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
    <div className="flex flex-col h-screen max-h-screen pb-16">
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
          <div className="pt-4">
            <div className="bg-surface border border-black/[0.07] rounded-2xl p-4 mb-4">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Ask me anything about your spending. I have full context of all your transactions, budgets, and Amex details.
              </p>
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">Try asking</div>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm text-stone-700 hover:bg-sage-light hover:border-sage/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-1">
                💳
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sage text-white rounded-tr-sm'
                  : 'bg-surface border border-black/[0.07] text-stone-800 rounded-tl-sm'
              }`}
            >
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-1">💳</div>
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
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-surface border border-black/[0.07] rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-sage max-h-32 leading-relaxed"
            placeholder="Ask about your spending..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
              input.trim() && !loading ? 'bg-sage text-white hover:bg-sage-dark' : 'bg-stone-200 text-stone-400'
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
