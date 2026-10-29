const TOKEN_KEY = 'abo.session'

export class ApiError extends Error {
  code: string
  hint?: string
  status: number

  constructor(message: string, status: number, code = 'error', hint?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.hint = hint
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable - session stays in memory only */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

const API_BASE = import.meta.env.VITE_API_URL ?? ""
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    throw new ApiError(
      'We could not reach the Operator service.',
      0,
      'network_error',
      'Check that the backend is running and try again.',
    )
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const detail = (payload as { detail?: unknown })?.detail
    if (response.status === 401) {
      clearToken()
    }
    if (typeof detail === 'string') {
      throw new ApiError(detail, response.status, 'error')
    }
    if (detail && typeof detail === 'object') {
      const d = detail as { message?: string; code?: string; hint?: string }
      throw new ApiError(
        d.message ?? 'The request could not be completed.',
        response.status,
        d.code ?? 'error',
        d.hint,
      )
    }
    throw new ApiError(
      'The Operator could not complete this request.',
      response.status,
      'request_failed',
      'Retry the action. If it keeps failing, contact workspace support.',
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
