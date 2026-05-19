import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchIntegrationsCatalog } from '../api/client'
import {
  INTEGRATIONS_CATALOG,
  listRunnableIntegrationScans,
  type IntegrationCatalogEntry,
} from '../lib/integrationsRegistry'

export type IntegrationsCatalogContextValue = {
  entries: IntegrationCatalogEntry[]
  runnableScans: IntegrationCatalogEntry[]
  reload: () => Promise<void>
  loading: boolean
}

const IntegrationsCatalogContext = createContext<IntegrationsCatalogContextValue | null>(null)

export function IntegrationsCatalogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<IntegrationCatalogEntry[]>(() => [...INTEGRATIONS_CATALOG])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchIntegrationsCatalog()
      if (rows?.length) setEntries(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const runnableScans = useMemo(() => listRunnableIntegrationScans(entries), [entries])

  const value = useMemo(
    () => ({ entries, runnableScans, reload, loading }),
    [entries, runnableScans, reload, loading],
  )

  return (
    <IntegrationsCatalogContext.Provider value={value}>{children}</IntegrationsCatalogContext.Provider>
  )
}

export function useIntegrationsCatalog(): IntegrationsCatalogContextValue {
  const v = useContext(IntegrationsCatalogContext)
  if (!v) {
    throw new Error('useIntegrationsCatalog: wrap /app subtree with IntegrationsCatalogProvider')
  }
  return v
}
