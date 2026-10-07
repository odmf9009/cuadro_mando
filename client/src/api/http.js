// Wrapper minimo sobre fetch: siempre manda la cookie de sesion, siempre
// negocia JSON, y normaliza los errores para que los componentes solo
// tengan que hacer un try/catch.

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  let url = path
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    if (qs) url += `?${qs}`
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null

  if (!res.ok) {
    throw new ApiError(data?.error || `Error ${res.status}`, res.status)
  }
  return data
}

// Subida de archivos (FormData): no se puede pasar por request() porque ahi
// siempre serializa a JSON. El navegador pone el Content-Type correcto
// (multipart/form-data; boundary=...) solo si uno NO lo fija a mano.
async function postFormData(path, formData) {
  const res = await fetch(path, { method: 'POST', credentials: 'include', body: formData })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) throw new ApiError(data?.error || `Error ${res.status}`, res.status)
  return data
}

export const http = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  postFormData,
}

export { ApiError }
