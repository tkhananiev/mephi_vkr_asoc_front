import { createContext, useContext, type ReactNode } from 'react'

const TopbarTrailingContext = createContext<ReactNode | undefined>(undefined)

export function TopbarTrailingProvider({
  trailing,
  children,
}: {
  trailing?: ReactNode
  children: ReactNode
}) {
  return <TopbarTrailingContext.Provider value={trailing}>{children}</TopbarTrailingContext.Provider>
}

export function useTopbarTrailing() {
  return useContext(TopbarTrailingContext)
}
