'use client'

import { useState, useEffect } from 'react'

const SESSION_KEY = 'amex_unlocked'

export function usePinLock(correctPin = '2026') {
  const [unlocked, setUnlocked] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Check if unlocked this session
    const sessionUnlocked = sessionStorage.getItem(SESSION_KEY)
    if (sessionUnlocked === 'true') {
      setUnlocked(true)
    }
    setChecked(true)
  }, [])

  const unlock = (pin) => {
    if (pin === correctPin) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setUnlocked(true)
      return true
    }
    return false
  }

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUnlocked(false)
  }

  return { unlocked, checked, unlock, lock }
}
