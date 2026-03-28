'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_SETTINGS, SKIP_MERCHANTS } from '../lib/constants'
import { detectDuplicates, genId } from '../lib/utils'

export function useTracker() {
  const [transactions, setTransactions] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const pendingIds = useRef(new Set())
  const busyRef = useRef(false)

  // Fetch all data
  const fetchAll = useCallback(async (force = false) => {
    if (busyRef.current && !force) return
    busyRef.current = true

    try {
      const [txRes, settingsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('settings')
          .select('*')
          .eq('id', 'main')
          .single(),
      ])

      if (txRes.error) throw txRes.error

      // Don't overwrite locally-added transactions still pending
      setTransactions(prev => {
        const incoming = txRes.data || []
        // Keep any local-only pending items not yet in DB
        const localPending = prev.filter(t => pendingIds.current.has(t.id))
        const merged = [
          ...localPending,
          ...incoming.filter(t => !pendingIds.current.has(t.id)),
        ]
        return detectDuplicates(merged)
      })

      if (settingsRes.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsRes.data })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      busyRef.current = false
      setLoading(false)
    }
  }, [])

  // Initial load + polling
  useEffect(() => {
    fetchAll(true)
    const interval = setInterval(() => fetchAll(), 15000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchAll()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAll])

  // Add a single transaction
  const addTransaction = useCallback(async (txData) => {
    const id = genId()
    const tx = {
      id,
      amount: Number(txData.amount),
      category: txData.category || 'other_daily',
      bucket: txData.bucket || 'daily',
      note: txData.note || '',
      who: txData.who || 'matt',
      card: txData.card || 'amex',
      created_at: txData.created_at || new Date().toISOString(),
    }

    // Optimistic add
    pendingIds.current.add(id)
    setTransactions(prev => detectDuplicates([tx, ...prev]))

    try {
      const { error } = await supabase.from('transactions').insert(tx)
      if (error) throw error
    } catch (err) {
      // Rollback
      setTransactions(prev => prev.filter(t => t.id !== id))
      setError(err.message)
      return { error: err }
    } finally {
      pendingIds.current.delete(id)
    }

    return { id }
  }, [])

  // Batch add transactions (from scan)
  const addTransactions = useCallback(async (txArray) => {
    const prepared = txArray.map(tx => ({
      id: genId(),
      amount: Number(tx.amount),
      category: tx.category || 'other_daily',
      bucket: tx.bucket || 'daily',
      note: tx.note || '',
      who: tx.who || 'matt',
      card: tx.card || 'amex',
      created_at: tx.created_at || new Date().toISOString(),
    }))

    // Optimistic
    prepared.forEach(tx => pendingIds.current.add(tx.id))
    setTransactions(prev => detectDuplicates([...prepared, ...prev]))

    try {
      const { error, data } = await supabase.from('transactions').insert(prepared).select()
      if (error) {
        console.error('Batch insert error:', error)
        throw error
      }
      return { count: prepared.length }
    } catch (err) {
      prepared.forEach(tx => {
        setTransactions(prev => prev.filter(t => t.id !== tx.id))
        pendingIds.current.delete(tx.id)
      })
      setError(err.message)
      return { error: err }
    } finally {
      prepared.forEach(tx => pendingIds.current.delete(tx.id))
    }
  }, [])

  // Update a transaction
  const updateTransaction = useCallback(async (id, updates) => {
    setTransactions(prev =>
      detectDuplicates(prev.map(t => t.id === id ? { ...t, ...updates } : t))
    )
    const { error } = await supabase.from('transactions').update(updates).eq('id', id)
    if (error) {
      setError(error.message)
      fetchAll(true) // rollback by refetching
      return { error }
    }
    return {}
  }, [fetchAll])

  // Delete a transaction
  const deleteTransaction = useCallback(async (id) => {
    setTransactions(prev => detectDuplicates(prev.filter(t => t.id !== id)))
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      setError(error.message)
      fetchAll(true)
      return { error }
    }
    return {}
  }, [fetchAll])

  // Update settings
  const updateSettings = useCallback(async (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)
    const { error } = await supabase
      .from('settings')
      .upsert({ ...next, id: 'main' })
    if (error) {
      setError(error.message)
      return { error }
    }
    return {}
  }, [settings])

  return {
    transactions,
    settings,
    loading,
    error,
    clearError: () => setError(null),
    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    updateSettings,
    refresh: () => fetchAll(true),
  }
}
