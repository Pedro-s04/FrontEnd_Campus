import { useState, useCallback } from 'react'

export function useAsync() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const run = useCallback(async (promise) => {
    setLoading(true)
    setError(null)
    try {
      const result = await promise
      return result
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error inesperado'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, run }
}

export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn(...args)
      setData(res.data?.data ?? res.data)
      return res.data?.data ?? res.data
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al cargar datos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, deps)

  return { data, loading, error, fetch, setData }
}
