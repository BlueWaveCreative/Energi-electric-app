import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOnline, onConnectivityChange } from '@/lib/connectivity'

describe('Connectivity', () => {
  describe('isOnline', () => {
    it('returns true when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      expect(isOnline()).toBe(true)
    })

    it('returns false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
      expect(isOnline()).toBe(false)
    })
  })

  describe('onConnectivityChange', () => {
    let addSpy: ReturnType<typeof vi.spyOn>
    let removeSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      addSpy = vi.spyOn(window, 'addEventListener')
      removeSpy = vi.spyOn(window, 'removeEventListener')
    })

    afterEach(() => {
      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('registers online and offline event listeners', () => {
      const callback = vi.fn()
      const cleanup = onConnectivityChange(callback)

      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function))

      cleanup()
      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('calls callback with true on online event', () => {
      const callback = vi.fn()
      const cleanup = onConnectivityChange(callback)

      window.dispatchEvent(new Event('online'))
      expect(callback).toHaveBeenCalledWith(true)

      cleanup()
    })

    it('calls callback with false on offline event', () => {
      const callback = vi.fn()
      const cleanup = onConnectivityChange(callback)

      window.dispatchEvent(new Event('offline'))
      expect(callback).toHaveBeenCalledWith(false)

      cleanup()
    })
  })
})
