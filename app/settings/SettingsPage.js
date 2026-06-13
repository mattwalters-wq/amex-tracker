'use client'

import { useState, useEffect } from 'react'
import { BUCKETS, SAFE_AMEX } from '../../lib/constants'
import { fmtAUD } from '../../lib/utils'

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-sage' : 'bg-stone-200'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

function MoneyInput({ value, onCommit }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium text-sage">$</span>
      <input
        type="number"
        className="w-20 text-right text-sm font-medium bg-transparent outline-none border-b border-sage/40 pb-0.5"
        defaultValue={value}
        onBlur={e => onCommit(e.target.value)}
      />
    </div>
  )
}

function SettingsRow({ label, sub, right }) {
  return (
    <div className="flex items-center px-4 py-3.5 border-b border-black/[0.05] last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-800">{label}</div>
        {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export default function SettingsPage({ settings, onUpdate, onLock }) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [pinSaved, setPinSaved] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(true)

  useEffect(() => {
    setApiKey(localStorage.getItem('anthropic_api_key') || '')
  }, [])

  const saveApiKey = () => {
    localStorage.setItem('anthropic_api_key', apiKey)
    setShowApiKey(false)
  }

  const savePin = async () => {
    if (!pinInput || pinInput.length < 4) return
    setSavingPin(true)
    await onUpdate({ pin: pinInput })
    setSavingPin(false)
    setPinSaved(true)
    setPinInput('')
    setTimeout(() => setPinSaved(false), 1500)
  }

  const updateSetting = async (key, value) => {
    await onUpdate({ [key]: Number(value) })
  }

  const updateText = async (key, value) => {
    await onUpdate({ [key]: value })
  }

  const dailyMonthly = Math.round((settings.daily_weekly || 605) * 4.4)
  const splurgeMonthly = Math.round((settings.splurge_weekly || 250) * 4.4)
  const totalMonthly = dailyMonthly + splurgeMonthly + (settings.wine_monthly || 250) + (settings.bills_monthly || 1500)

  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-serif text-3xl">Settings</h1>
      </div>

      {/* Budget */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">Budget caps</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <SettingsRow
            label="Daily weekly cap"
            sub={fmtAUD(dailyMonthly) + '/month estimated'}
            right={
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-sage">$</span>
                <input
                  type="number"
                  className="w-16 text-right text-sm font-medium bg-transparent outline-none border-b border-sage/40 pb-0.5"
                  defaultValue={settings.daily_weekly || 605}
                  onBlur={e => updateSetting('daily_weekly', e.target.value)}
                />
                <span className="text-xs text-stone-400">/wk</span>
              </div>
            }
          />
          <SettingsRow
            label="Splurge weekly cap"
            sub={fmtAUD(splurgeMonthly) + '/month estimated'}
            right={
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-terra">$</span>
                <input
                  type="number"
                  className="w-16 text-right text-sm font-medium bg-transparent outline-none border-b border-terra/40 pb-0.5"
                  defaultValue={settings.splurge_weekly || 250}
                  onBlur={e => updateSetting('splurge_weekly', e.target.value)}
                />
                <span className="text-xs text-stone-400">/wk</span>
              </div>
            }
          />
          <SettingsRow
            label="Wine monthly cap"
            sub="Dedicated wine envelope"
            right={
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium" style={{ color: '#8E5A7A' }}>$</span>
                <input
                  type="number"
                  className="w-20 text-right text-sm font-medium bg-transparent outline-none border-b pb-0.5"
                  style={{ borderColor: 'rgba(142,90,122,0.4)' }}
                  defaultValue={settings.wine_monthly || 250}
                  onBlur={e => updateSetting('wine_monthly', e.target.value)}
                />
                <span className="text-xs text-stone-400">/mo</span>
              </div>
            }
          />
          <SettingsRow
            label="Bills monthly cap"
            sub="Includes fuel, utilities, subscriptions"
            right={
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-ochre">$</span>
                <input
                  type="number"
                  className="w-20 text-right text-sm font-medium bg-transparent outline-none border-b border-ochre/40 pb-0.5"
                  defaultValue={settings.bills_monthly || 1500}
                  onBlur={e => updateSetting('bills_monthly', e.target.value)}
                />
                <span className="text-xs text-stone-400">/mo</span>
              </div>
            }
          />
          <SettingsRow
            label="Total monthly budget"
            sub="Daily + Splurge + Wine + Bills"
            right={<span className="text-sm font-medium text-stone-600">{fmtAUD(totalMonthly)}</span>}
          />
        </div>
      </div>

      {/* Cycle */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">Statement cycle</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <SettingsRow
            label="Cycle start day"
            sub="Day of month Amex statement closes"
            right={
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1" max="31"
                  className="w-12 text-right text-sm font-medium bg-transparent outline-none border-b border-sage/40 pb-0.5"
                  defaultValue={settings.cycle_start_day || 22}
                  onBlur={e => updateSetting('cycle_start_day', e.target.value)}
                />
                <span className="text-xs text-stone-400">th</span>
              </div>
            }
          />
          <SettingsRow
            label="Pay day"
            sub="Week starts on pay day"
            right={
              <select
                className="text-sm bg-transparent outline-none text-stone-600"
                defaultValue={settings.pay_day || 4}
                onChange={e => updateSetting('pay_day', e.target.value)}
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            }
          />
        </div>
      </div>

      {/* Pay & commitments */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">Pay & commitments</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-stone-500">Pay &middot; fortnightly</div>
          <SettingsRow
            label="Matt's pay date"
            sub="A known pay day (repeats fortnightly)"
            right={
              <input
                type="date"
                className="text-sm bg-transparent outline-none text-stone-600 border-b border-sage/40 pb-0.5"
                defaultValue={settings.matt_pay_anchor || '2026-06-11'}
                onBlur={e => updateText('matt_pay_anchor', e.target.value)}
              />
            }
          />
          <SettingsRow label="Matt's pay" right={<MoneyInput value={settings.matt_pay ?? 2824.61} onCommit={v => updateSetting('matt_pay', v)} />} />
          <SettingsRow
            label="Liz's pay date"
            sub="A known pay day (repeats fortnightly)"
            right={
              <input
                type="date"
                className="text-sm bg-transparent outline-none text-stone-600 border-b border-sage/40 pb-0.5"
                defaultValue={settings.liz_pay_anchor || '2026-06-18'}
                onBlur={e => updateText('liz_pay_anchor', e.target.value)}
              />
            }
          />
          <SettingsRow label="Liz's pay" right={<MoneyInput value={settings.liz_pay ?? 1600} onCommit={v => updateSetting('liz_pay', v)} />} />

          <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-stone-500 border-t border-black/[0.05]">Commitments out of CBA</div>
          <SettingsRow
            label="Mortgage"
            sub="Paid weekly, not on the card"
            right={
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-ochre">$</span>
                <input
                  type="number"
                  className="w-20 text-right text-sm font-medium bg-transparent outline-none border-b border-ochre/40 pb-0.5"
                  defaultValue={settings.mortgage_weekly ?? 895}
                  onBlur={e => updateSetting('mortgage_weekly', e.target.value)}
                />
                <span className="text-xs text-stone-400">/wk</span>
              </div>
            }
          />
          <SettingsRow
            label="Mortgage day"
            sub="Weekday it leaves CBA"
            right={
              <select
                className="text-sm bg-transparent outline-none text-stone-600"
                defaultValue={settings.mortgage_weekday ?? 4}
                onChange={e => updateSetting('mortgage_weekday', e.target.value)}
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            }
          />
          <SettingsRow label="Bills swept" sub="per pay, into the Bills account" right={<MoneyInput value={settings.bills_per_pay ?? 100} onCommit={v => updateSetting('bills_per_pay', v)} />} />
          <SettingsRow label="Savings swept" sub="per pay, into Savings (discretionary)" right={<MoneyInput value={settings.savings_per_pay ?? 0} onCommit={v => updateSetting('savings_per_pay', v)} />} />
          <SettingsRow
            label="Include savings sweep"
            sub="Savings is discretionary, count it against coverage"
            right={
              <Toggle
                on={settings.include_savings_sweep !== false}
                onToggle={() => updateText('include_savings_sweep', !(settings.include_savings_sweep !== false))}
              />
            }
          />
        </div>
      </div>

      {/* Amex */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">Amex</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <SettingsRow
            label="Safe to spend / cycle"
            sub="Max charge to still pay it off in full"
            right={
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-sage">$</span>
                <input
                  type="number"
                  className="w-20 text-right text-sm font-medium bg-transparent outline-none border-b border-sage/40 pb-0.5"
                  defaultValue={settings.amex_cycle_target || 4000}
                  onBlur={e => updateSetting('amex_cycle_target', e.target.value)}
                />
                <span className="text-xs text-stone-400">/cyc</span>
              </div>
            }
          />
          <div className="px-4 py-3 text-[11px] text-stone-400 leading-relaxed">
            Based on income {fmtAUD(SAFE_AMEX.monthlyIncome)}/mo less fixed commitments {fmtAUD(SAFE_AMEX.fixedCommitments)}/mo,
            leaving ~{fmtAUD(SAFE_AMEX.monthlyIncome - SAFE_AMEX.fixedCommitments)}/mo. Suggested ceiling {fmtAUD(SAFE_AMEX.recommendedPerCycle)} keeps a savings buffer. Raise it to save less.
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">Notifications</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <SettingsRow
            label="Daily SMS"
            sub="7am AEDT via Twilio"
            right={
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${smsEnabled ? 'text-olive' : 'text-stone-400'}`}>
                  {smsEnabled ? 'Live' : 'Off'}
                </span>
                <div className={`w-2 h-2 rounded-full ${smsEnabled ? 'bg-olive' : 'bg-stone-300'}`} />
                <Toggle on={smsEnabled} onToggle={() => setSmsEnabled(v => !v)} />
              </div>
            }
          />
          <SettingsRow
            label="Matt's number"
            sub="+61418991852"
            right={<span className="text-xs text-stone-400">verified</span>}
          />
          <SettingsRow
            label="Liz's number"
            sub="+61409564815"
            right={<span className="text-xs text-stone-400">verified</span>}
          />
        </div>
      </div>

      {/* AI */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">AI scan</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <div className="px-4 py-3.5">
            <div className="text-sm text-stone-800 mb-1">Anthropic API key</div>
            <div className="text-xs text-stone-400 mb-2">Stored locally in browser only, never sent to server</div>
            {showApiKey ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-xs font-mono bg-cream focus:outline-none focus:border-sage"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button onClick={saveApiKey} className="px-3 py-2 bg-sage text-white rounded-lg text-xs font-medium">
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowApiKey(true)}
                className="text-xs text-sage font-medium"
              >
                {apiKey ? 'Key set - tap to change' : 'Set API key'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="mb-5">
        <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">Security</div>
        <div className="bg-surface border-t border-b border-black/[0.07]">
          <div className="px-4 py-3.5">
            <div className="text-sm text-stone-800 mb-1">Change PIN</div>
            <div className="text-xs text-stone-400 mb-2">4-digit PIN to unlock the app</div>
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]*"
                className="w-24 border border-black/10 rounded-lg px-3 py-2 text-center text-sm font-mono bg-cream focus:outline-none focus:border-sage tracking-widest"
                placeholder="----"
                value={pinInput}
                onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <button
                onClick={savePin}
                disabled={pinInput.length < 4 || savingPin}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pinSaved ? 'bg-olive text-white' : 'bg-sage text-white disabled:bg-stone-200 disabled:text-stone-400'
                }`}
              >
                {pinSaved ? 'Saved' : savingPin ? '...' : 'Set PIN'}
              </button>
            </div>
          </div>
          <SettingsRow
            label="Lock now"
            sub="Return to PIN screen"
            right={
              <button onClick={onLock} className="text-xs font-medium text-terra px-3 py-1.5 border border-terra/30 rounded-lg hover:bg-terra-light transition-colors">
                Lock
              </button>
            }
          />
        </div>
      </div>

      {/* About */}
      <div className="px-4 py-4 text-center text-xs text-stone-300">
        Amex Tracker v2 &middot; Walters household &middot; Supabase cvuznuccqquqqramcqzn
      </div>
    </div>
  )
}
