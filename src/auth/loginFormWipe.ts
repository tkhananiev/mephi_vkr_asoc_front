
export const ASOC_LOGIN_FORM_WIPE_KEY = 'asoc_login_form_wipe_v1'

export function markLoginFormWipe() {
  try {
    sessionStorage.setItem(ASOC_LOGIN_FORM_WIPE_KEY, String(Date.now()))
  } catch {
  }
}

export function consumeLoginFormWipe(): boolean {
  try {
    if (sessionStorage.getItem(ASOC_LOGIN_FORM_WIPE_KEY) === null) return false
    sessionStorage.removeItem(ASOC_LOGIN_FORM_WIPE_KEY)
    return true
  } catch {
    return false
  }
}
