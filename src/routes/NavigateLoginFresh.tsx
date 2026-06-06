import { Navigate } from 'react-router-dom'
import { markLoginFormWipe } from '../auth/loginFormWipe'
export function NavigateLoginFresh({ state }: { state?: Record<string, unknown> | null }) {
  markLoginFormWipe()

  let from: string | undefined
  if (state && typeof state === 'object' && typeof state.from === 'string' && state.from.length > 0) {
    from = state.from
  }

  const nextState: { freshLogin: true; from?: string } = { freshLogin: true }
  if (from !== undefined) nextState.from = from

  return <Navigate to={{ pathname: '/', search: '?auth=login' }} replace state={nextState} />
}
