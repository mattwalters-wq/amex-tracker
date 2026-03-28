'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTracker } from '../hooks/useTracker'
import { usePinLock } from '../hooks/usePinLock'
import PinScreen from '../components/PinScreen'
import BottomNav from '../components/BottomNav'
import Dashboard from './dashboard/Dashboard'
import AddPage from './add/AddPage'
import ScanPage from './scan/ScanPage'
import ReportsPage from './reports/ReportsPage'
import TransactionsPage from './transactions/TransactionsPage'
import SettingsPage from './settings/SettingsPage'

export default function AppShell() {
  const pathname = usePathname()
  const { unlocked, checked, unlock, lock } = usePinLock(undefined) // pin comes from settings
  const {
    transactions, settings, loading, error, clearError,
    addTransaction, addTransactions,
    updateTransaction, deleteTransaction,
    updateSettings,
  } = useTracker()

  const { checked: pinChecked, unlocked: isUnlocked } = usePinLock(settings.pin || '2026')

  // Use actual PIN from settings for the lock check
  const [manualUnlocked, setManualUnlocked] = useState(false)

  const handleUnlock = (pin) => {
    if (pin === (settings.pin || '2026')) {
      setManualUnlocked(true)
      // Store session
      try { sessionStorage.setItem('amex_unlocked', 'true') } catch {}
      return true
    }
    return false
  }

  const handleLock = () => {
    setManualUnlocked(false)
    try { sessionStorage.removeItem('amex_unlocked') } catch {}
  }

  // Check session storage
  let sessionUnlocked = false
  try { sessionUnlocked = sessionStorage.getItem('amex_unlocked') === 'true' } catch {}
  const appUnlocked = manualUnlocked || sessionUnlocked

  if (!appUnlocked) {
    return <PinScreen onUnlock={handleUnlock} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-stone-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (pathname) {
      case '/add':
        return <AddPage onAdd={addTransaction} />
      case '/scan':
        return <ScanPage transactions={transactions} onImport={addTransactions} />
      case '/reports':
        return <ReportsPage transactions={transactions} settings={settings} />
      case '/transactions':
        return <TransactionsPage transactions={transactions} settings={settings} onDelete={deleteTransaction} onUpdate={updateTransaction} />
      case '/settings':
        return <SettingsPage settings={settings} onUpdate={updateSettings} onLock={handleLock} />
      default:
        return <Dashboard transactions={transactions} settings={settings} onDelete={deleteTransaction} onUpdate={updateTransaction} />
    }
  }

  return (
    <div className="max-w-app mx-auto min-h-screen bg-cream relative">
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-app mx-auto bg-terra-light border border-terra/30 rounded-xl px-4 py-3 text-sm text-terra flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="text-terra/60 hover:text-terra text-lg leading-none ml-3">x</button>
        </div>
      )}
      <main className="overflow-y-auto">
        {renderPage()}
      </main>
      <BottomNav />
    </div>
  )
}
