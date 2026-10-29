import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api'
import type { AuthPayload, User, Workspace } from '../lib/types'

interface AuthState {
  user: User | null
  workspace: Workspace | null
  loading: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  continueWithDemo: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get<{ user: User; workspace: Workspace }>('/api/auth/me')
      .then((payload) => {
        setUser(payload.user)
        setWorkspace(payload.workspace)
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  const applySession = useCallback((payload: AuthPayload) => {
    setToken(payload.token)
    setUser(payload.user)
    setWorkspace(payload.workspace)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const payload = await api.post<AuthPayload>('/api/auth/login', { email, password, remember })
      applySession(payload)
    },
    [applySession],
  )

  const continueWithDemo = useCallback(async () => {
    const payload = await api.post<AuthPayload>('/api/auth/demo', { remember: true })
    applySession(payload)
  }, [applySession])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
    setWorkspace(null)
  }, [])

  const value = useMemo(
    () => ({ user, workspace, loading, signIn, continueWithDemo, signOut }),
    [user, workspace, loading, signIn, continueWithDemo, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
