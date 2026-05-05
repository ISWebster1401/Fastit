const AUTH_BASE_URL = '/api/auth'
const AUTH_STORAGE_KEY = 'fastit-auth'

async function authRequest(path, options = {}) {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : data?.message || 'No se pudo completar la autenticación.'
    throw new Error(message)
  }

  return data
}

export function login({ email, password }) {
  return authRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(payload) {
  return authRequest('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
    return stored?.state?.user || null
  } catch {
    return null
  }
}
