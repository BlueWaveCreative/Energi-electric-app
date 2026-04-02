import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimer } from '@/hooks/use-timer'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useTimer', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('starts with no active timer', () => {
    const { result } = renderHook(() => useTimer())
    expect(result.current.isRunning).toBe(false)
    expect(result.current.activeProjectId).toBeNull()
  })

  it('starts a timer for a project', () => {
    const { result } = renderHook(() => useTimer())
    act(() => {
      result.current.startTimer('project-1', 'phase-1')
    })
    expect(result.current.isRunning).toBe(true)
    expect(result.current.activeProjectId).toBe('project-1')
  })

  it('stops a timer and returns elapsed time', () => {
    const { result } = renderHook(() => useTimer())

    act(() => {
      result.current.startTimer('project-1', null)
    })

    act(() => {
      const elapsed = result.current.stopTimer()
      expect(elapsed).toBeDefined()
      expect(elapsed!.projectId).toBe('project-1')
      expect(typeof elapsed!.durationMinutes).toBe('number')
    })

    expect(result.current.isRunning).toBe(false)
  })

  it('persists timer state to localStorage', () => {
    const { result } = renderHook(() => useTimer())
    act(() => {
      result.current.startTimer('project-1', 'phase-1')
    })
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })
})
