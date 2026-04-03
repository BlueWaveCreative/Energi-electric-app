'use client'

import { useState, useEffect, useCallback } from 'react'

const TIMER_KEY = 'blue-shores-timer'

interface TimerState {
  projectId: string
  phaseId: string | null
  startTime: string // ISO string
}

interface ElapsedResult {
  projectId: string
  phaseId: string | null
  startTime: string
  endTime: string
  durationMinutes: number
}

export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null)
  const [elapsed, setElapsed] = useState(0) // seconds

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_KEY)
    if (saved) {
      try {
        setTimerState(JSON.parse(saved))
      } catch {
        localStorage.removeItem(TIMER_KEY)
      }
    }
  }, [])

  // Update elapsed time every second
  useEffect(() => {
    if (!timerState) {
      setElapsed(0)
      return
    }

    function tick() {
      const start = new Date(timerState!.startTime).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timerState])

  const startTimer = useCallback((projectId: string, phaseId: string | null) => {
    const state: TimerState = {
      projectId,
      phaseId,
      startTime: new Date().toISOString(),
    }
    setTimerState(state)
    localStorage.setItem(TIMER_KEY, JSON.stringify(state))
  }, [])

  const stopTimer = useCallback((): ElapsedResult | null => {
    if (!timerState) return null

    const endTime = new Date().toISOString()
    const start = new Date(timerState.startTime).getTime()
    const end = new Date(endTime).getTime()
    const durationMinutes = Math.round((end - start) / 60000)

    const result: ElapsedResult = {
      projectId: timerState.projectId,
      phaseId: timerState.phaseId,
      startTime: timerState.startTime,
      endTime,
      durationMinutes,
    }

    // Don't clear state here — caller must call clearTimer() after successful save
    return result
  }, [timerState])

  const clearTimer = useCallback(() => {
    setTimerState(null)
    localStorage.removeItem(TIMER_KEY)
  }, [])

  return {
    isRunning: !!timerState,
    activeProjectId: timerState?.projectId ?? null,
    activePhaseId: timerState?.phaseId ?? null,
    elapsed,
    startTimer,
    stopTimer,
    clearTimer,
  }
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
