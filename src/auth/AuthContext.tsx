import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { invalidateProductsCache } from '../lib/productsStorage'
import { TOKEN_KEY } from './token'

type AuthCtx = {
  token: string | null
  setToken: (t: string | null) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const setToken = useCallback((t: string | null) => {
    setTokenState(t)
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  }, [])

  const logout = useCallback(() => {
    invalidateProductsCache()
    setToken(null)
  }, [setToken])

  const v = useMemo(() => ({ token, setToken, logout }), [token, setToken, logout])
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

export function useAuth() {
  const x = useContext(Ctx)
  if (!x) throw new Error('useAuth outside AuthProvider')
  return x
}
