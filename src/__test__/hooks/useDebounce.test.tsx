import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('returns updated value after default delay (500ms)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    expect(result.current).toBe('initial')
    rerender({ value: 'updated', delay: 500 })
    expect(result.current).toBe('initial')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })

  it('returns updated value after custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )
    rerender({ value: 'updated', delay: 1000 })
        act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })

  it('cancels previous timeout when value changes rapidly', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )
    rerender({ value: 'first-update' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    rerender({ value: 'second-update' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('initial')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('second-update')
  })

  it('works with different data types', () => {
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    )
    numberRerender({ value: 42 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(numberResult.current).toBe(42)
    const initialObj = { id: 1, name: 'John' }
    const updatedObj = { id: 2, name: 'Jane' }
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: initialObj } }
    )
    objectRerender({ value: updatedObj })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(objectResult.current).toEqual(updatedObj)
    const initialArray = [1, 2, 3]
    const updatedArray = [4, 5, 6]
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: initialArray } }
    )
    arrayRerender({ value: updatedArray })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(arrayResult.current).toEqual(updatedArray)
  })

  it('handles boolean values correctly', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: false } }
    )
    rerender({ value: true })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(true)
    rerender({ value: false })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(false)
  })

  it('handles null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' as string | null | undefined } }
    )
    rerender({ value: null })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(null)
    rerender({ value: undefined })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(undefined)
  })

  it('updates delay dynamically', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    rerender({ value: 'updated', delay: 1000 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')    
    const { unmount } = renderHook(() => useDebounce('test', 500))
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'initial' } }
    )
    rerender({ value: 'updated' })
    expect(result.current).toBe('initial')
    act(() => {
      vi.runAllTimers()
    })
    expect(result.current).toBe('updated')
  })

  it('performs well with rapid successive updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    )
    for (let i = 1; i <= 20; i++) {
      rerender({ value: i })
      act(() => {
        vi.advanceTimersByTime(50) 
      })
    }
    expect(result.current).toBe(0)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(20)
  })

  it('performs well with rapid successive to 200 updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    )
    for (let i = 1; i <= 10; i++) {
      rerender({ value: i })
      act(() => {
        vi.advanceTimersByTime(50) 
      })
    }
    expect(result.current).toBe(0)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(10)
  })
})
