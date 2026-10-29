import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../lib/api'

interface State<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  refreshing: boolean
}

/**
 * Small data-fetching hook: fetches on mount, exposes a manual `reload`,
 * and never leaves the UI without a defined state.
 */
export function useApi<T>(path: string | null, options?: { poll?: number }) {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: Boolean(path),
    refreshing: false,
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(
    async (silent = false) => {
      if (!path) {
        setState({ data: null, error: null, loading: false, refreshing: false })
        return
      }
      setState((prev) => ({
        ...prev,
        loading: silent ? prev.loading : prev.data === null,
        refreshing: silent ? true : prev.refreshing,
        error: silent ? prev.error : null,
      }))
      try {
        const data = await api.get<T>(path)
        if (!mounted.current) return
        setState({ data, error: null, loading: false, refreshing: false })
      } catch (err) {
        if (!mounted.current) return
        if ((err as Error).name === 'AbortError') return
        setState({
          data: null,
          error: err instanceof ApiError ? err : new ApiError('Unexpected error', 0),
          loading: false,
          refreshing: false,
        })
      }
    },
    [path],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!options?.poll || !path) return
    const timer = window.setInterval(() => {
      void load(true)
    }, options.poll)
    return () => window.clearInterval(timer)
  }, [options?.poll, path, load])

  return {
    ...state,
    reload: load,
    setData: (updater: (prev: T | null) => T | null) =>
      setState((prev) => ({ ...prev, data: updater(prev.data) })),
  }
}
