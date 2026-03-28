'use client'

import { useState } from 'react'

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const press = (digit) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === 4) {
      setTimeout(() => {
        const success = onUnlock(next)
        if (!success) {
          setShaking(true)
          setTimeout(() => setShaking(false), 400)
          setError('Incorrect PIN')
          setPin('')
        }
      }, 150)
    }
  }

  const del = () => {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-cream flex flex-col items-center justify-center z-50 select-none">
      <div className="text-5xl mb-6">💳</div>
      <h1 className="font-serif text-3xl mb-8 text-center">Amex Tracker</h1>

      {/* Dots */}
      <div className={`flex gap-4 mb-3 ${shaking ? 'animate-bounce' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? 'bg-sage border-sage'
                : 'bg-transparent border-sage/40'
            }`}
          />
        ))}
      </div>

      <div className="min-h-[20px] mb-8">
        {error && <p className="text-terra text-sm text-center">{error}</p>}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button
            key={d}
            onClick={() => press(d)}
            className="w-16 h-16 rounded-full border border-sage/30 bg-surface font-serif text-2xl flex items-center justify-center hover:bg-sage-light active:bg-sage active:text-white transition-all"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          className="w-16 h-16 rounded-full border border-sage/30 bg-surface font-serif text-2xl flex items-center justify-center hover:bg-sage-light active:bg-sage active:text-white transition-all"
        >
          0
        </button>
        <button
          onClick={del}
          className="w-16 h-16 rounded-full border border-sage/20 bg-transparent text-xl flex items-center justify-center hover:bg-cream-dark text-stone-500 transition-all"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
