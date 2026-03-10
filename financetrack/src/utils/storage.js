// ─── IndexedDB wrapper ───────────────────────────────────────────────────────
// Stores: raw PDF bytes, parsed transactions, analysis results, settings

const DB_NAME = 'FinanceTrackDB'
const DB_VERSION = 1

const STORES = {
  files:        'files',        // metadata + raw arrayBuffer
  transactions: 'transactions', // parsed tx per month
  analyses:     'analyses',     // AI analysis per month
  settings:     'settings',     // github token, user prefs
}

let _db = null

async function openDB() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      Object.values(STORES).forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
      })
    }
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

async function dbGet(store, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbPut(store, obj) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(obj)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dbDelete(store, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function dbGetAll(store) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const storage = {
  // FILES
  async saveFile(meta, arrayBuffer) {
    await dbPut(STORES.files, { ...meta, buffer: arrayBuffer, savedAt: Date.now() })
  },
  async getFile(id) { return dbGet(STORES.files, id) },
  async getAllFiles() { return dbGetAll(STORES.files) },
  async deleteFile(id) { return dbDelete(STORES.files, id) },
  async updateFileMeta(id, patch) {
    const f = await dbGet(STORES.files, id)
    if (f) await dbPut(STORES.files, { ...f, ...patch })
  },

  // TRANSACTIONS
  async saveTx(month, txList) {
    await dbPut(STORES.transactions, { id: month, txList, updatedAt: Date.now() })
  },
  async getTx(month) {
    const r = await dbGet(STORES.transactions, month)
    return r?.txList || []
  },
  async getAllTx() { return dbGetAll(STORES.transactions) },

  // ANALYSIS
  async saveAnalysis(month, data) {
    await dbPut(STORES.analyses, { id: month, ...data, savedAt: Date.now() })
  },
  async getAnalysis(month) { return dbGet(STORES.analyses, month) },
  async getAllAnalyses() { return dbGetAll(STORES.analyses) },

  // SETTINGS
  async getSetting(key, fallback = null) {
    const r = await dbGet(STORES.settings, key)
    return r?.value ?? fallback
  },
  async setSetting(key, value) {
    await dbPut(STORES.settings, { id: key, value })
  },
}
