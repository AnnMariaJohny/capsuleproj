const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const SESSION_KEY = 'reloop-session'

async function request(path, options) {
  const headers = new Headers(options?.headers || {})
  const token = getSessionToken()
  if (token && path !== '/auth/login' && path !== '/auth/register') {
    headers.set('Authorization', `Bearer ${token}`)
  }
  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach the Reloop API at ${API_URL}. Start the server and check the API URL.`)
    }
    throw error
  }
  if (!response.ok) {
    const details = await response.json().catch(() => ({}))
    const error = new Error(details.message || 'The service could not complete your request.')
    error.status = response.status
    throw error
  }
  return response.json()
}

export function getRequests() {
  return request('/requests')
}

export function createPickup(payload) {
  return request('/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function classifyItemPhoto(payload) {
  return request('/classifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function getWorkspaceData() {
  return request('/workspace')
}

export function saveWorkspaceData(kind, data) {
  return request(`/workspace/${kind}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
}

export function savePickupProof(record) {
  return request('/workspace/proofs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record }),
  })
}

function getSessionToken() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null')?.token || ''
  } catch {
    return ''
  }
}

export function readSession() {
  try {
    const session = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null')
    return session?.token && session?.user ? session : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY)
}

export function registerAccount(payload) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function loginAccount(payload) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function getCurrentUser() {
  return request('/auth/me')
}
