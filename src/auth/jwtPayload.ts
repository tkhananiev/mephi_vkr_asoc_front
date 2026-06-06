
export function jwtPayloadRole(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padCount = (4 - (b64.length % 4)) % 4
    b64 += '='.repeat(padCount)
    const raw = atob(b64)
    const p = JSON.parse(raw) as { role?: unknown }
    return typeof p.role === 'string' ? p.role : null
  } catch {
    return null
  }
}
export function jwtPayloadExpiry(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padCount = (4 - (b64.length % 4)) % 4
    b64 += '='.repeat(padCount)
    const raw = atob(b64)
    const p = JSON.parse(raw) as { exp?: unknown }
    if (typeof p.exp === 'number' && Number.isFinite(p.exp)) return p.exp
    return null
  } catch {
    return null
  }
}

export function jwtPayloadProfile(token: string): { email: string; name: string; role: string | null } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padCount = (4 - (b64.length % 4)) % 4
    b64 += '='.repeat(padCount)
    const raw = atob(b64)
    const p = JSON.parse(raw) as { role?: unknown; email?: unknown; name?: unknown }
    const role = typeof p.role === 'string' ? p.role : null
    const email = typeof p.email === 'string' ? p.email : ''
    const name = typeof p.name === 'string' ? p.name : ''
    return { role, email, name }
  } catch {
    return null
  }
}
