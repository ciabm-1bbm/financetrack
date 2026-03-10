// ─── GitHub API ──────────────────────────────────────────────────────────────
// Saves PDFs and JSON data to the GitHub repo in organized subfolders

const GH_API = 'https://api.github.com'

function b64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  bytes.forEach(b => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function strToB64(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

export async function githubRequest(token, method, path, body = null) {
  const res = await fetch(`${GH_API}${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub ${res.status}: ${err.message || res.statusText}`)
  }
  return res.json()
}

// Get current file SHA (needed for updates)
async function getFileSHA(token, owner, repo, path) {
  try {
    const data = await githubRequest(token, 'GET', `/repos/${owner}/${repo}/contents/${path}`)
    return data.sha
  } catch {
    return null
  }
}

// Upload/overwrite a file in the repo
export async function uploadToGitHub({ token, owner, repo, path, content, isBuffer = false, message }) {
  const sha = await getFileSHA(token, owner, repo, path)
  const body = {
    message: message || `FinanceTrack: update ${path}`,
    content: isBuffer ? b64(content) : strToB64(content),
  }
  if (sha) body.sha = sha
  return githubRequest(token, 'PUT', `/repos/${owner}/${repo}/contents/${path}`, body)
}

// Download a file from the repo
export async function downloadFromGitHub({ token, owner, repo, path }) {
  const data = await githubRequest(token, 'GET', `/repos/${owner}/${repo}/contents/${path}`)
  // data.content is base64 encoded
  const binaryStr = atob(data.content.replace(/\n/g, ''))
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  return { buffer: bytes.buffer, sha: data.sha, name: data.name }
}

// List files in a folder
export async function listGitHubFolder({ token, owner, repo, path }) {
  try {
    const data = await githubRequest(token, 'GET', `/repos/${owner}/${repo}/contents/${path}`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

// Validate token and get user info
export async function validateToken(token) {
  const user = await githubRequest(token, 'GET', '/user')
  return user
}

// Save PDF to GitHub in the right subfolder
export async function savePDFToGitHub({ token, owner, repo, folder, filename, month, buffer }) {
  const mm = month ? month.replace('/', '-') : 'sem-mes'
  // e.g. data/contracheques/2026-02/CCheque_2026-02.pdf
  const path = `data/${folder}/${mm}/${filename}`
  return uploadToGitHub({ token, owner, repo, path, content: buffer, isBuffer: true, message: `Adicionar ${filename} (${month})` })
}

// Save parsed JSON data to GitHub
export async function saveJSONToGitHub({ token, owner, repo, month, type, data }) {
  const mm = month.replace('/', '-')
  const path = `data/parsed/${mm}/${type}.json`
  return uploadToGitHub({ token, owner, repo, path, content: JSON.stringify(data, null, 2), message: `FinanceTrack: dados ${type} ${month}` })
}
