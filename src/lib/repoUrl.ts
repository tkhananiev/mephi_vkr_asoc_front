export function isValidRepoUrl(u: string): boolean {
  if (/^git@[^:]+:.+/i.test(u)) return true
  try {
    new URL(u)
    return true
  } catch {
    return false
  }
}
