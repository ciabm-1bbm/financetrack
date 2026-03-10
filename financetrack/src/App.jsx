import { useState, useEffect, useCallback } from 'react'
import { FOLDERS, getCat, fmt } from './constants.js'
import { storage } from './utils/storage.js'
import { extractPDFText, detectDocumentType, parseContracheque, parseXPCartao, parseSicredi } from './utils/parsers.js'
import { callClaude, parseJSON, SYS_ANALYSIS } from './utils/claude.js'
import { savePDFToGitHub, saveJSONToGitHub } from './utils/github.js'
import { Notification, Btn, Spinner } from './components/ui.jsx'
import { SettingsModal } from './components/Settings.jsx'
import { TransactionsScreen } from './components/TransactionsScreen.jsx'
import { AnalysisScreen } from './components/AnalysisScreen.jsx'

// ─── Lazy imports for FilesScreen (avoids circular dep issue) ────────────────
import { FilesScreen } from './components/FilesScreen.jsx'

const SCREENS = ['files', 'transactions', 'analysis']

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [screen,       setScreen]       = useState('files')
  const [files,        setFiles]        = useState([])
  const [transactions, setTransactions] = useState({})  // { month: [tx] }
  const [analyses,     setAnalyses]     = useState({})  // { month: analysis }
  const [activeFolder, setActiveFolder] = useState('xp_cartao')
  const [activeMonth,  setActiveMonth]  = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [analysingMonth, setAnalysingMonth] = useState(null)
  const [syncingId,    setSyncingId]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [notification, setNotification] = useState(null)
  const [ghConfig,     setGhConfig]     = useState(null)
  const [aiKey,        setAiKey]        = useState('')

  // ── Notification helper ────────────────────────────────────────────────────
  const notify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // ── Load from IndexedDB on mount ───────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const allFiles = await storage.getAllFiles()
        setFiles(allFiles.map(f => ({ ...f, buffer: undefined })))  // Don't keep buffers in state

        const allTx = await storage.getAllTx()
        const txMap = {}
        allTx.forEach(r => { txMap[r.id] = r.txList })
        setTransactions(txMap)

        const allAn = await storage.getAllAnalyses()
        const anMap = {}
        allAn.forEach(a => { anMap[a.id] = a })
        setAnalyses(anMap)

        // Load settings
        const token = await storage.getSetting('gh_token', '')
        const owner = await storage.getSetting('gh_owner', '')
        const repo  = await storage.getSetting('gh_repo', 'financetrack-data')
        const key   = await storage.getSetting('ai_key', '')
        if (token && owner) setGhConfig({ token, owner, repo })
        if (key) setAiKey(key)

        // Set active month to most recent
        const months = [...new Set(allFiles.filter(f=>f.month).map(f=>f.month))]
        if (months.length > 0) {
          const sorted = months.sort((a, b) => {
            const [ma, ya] = a.split('/'); const [mb, yb] = b.split('/')
            return (yb * 100 + Number(mb)) - (ya * 100 + Number(ma))
          })
          setActiveMonth(sorted[0])
        }
      } catch (e) {
        console.error('Load error:', e)
      }
      setLoading(false)
    })()
  }, [])

  // ── Save files list ────────────────────────────────────────────────────────
  const persistFiles = async (newFiles) => {
    setFiles(newFiles)
    // Don't persist buffers in state array — they're in IndexedDB
  }

  // ── Save transactions ──────────────────────────────────────────────────────
  const persistTx = async (month, txList) => {
    setTransactions(prev => ({ ...prev, [month]: txList }))
    await storage.saveTx(month, txList)
  }

  // ── Derived months ─────────────────────────────────────────────────────────
  const months = [...new Set(files.filter(f => f.month).map(f => f.month))].sort((a, b) => {
    const [ma, ya] = a.split('/'); const [mb, yb] = b.split('/')
    return (yb * 100 + Number(mb)) - (ya * 100 + Number(ma))
  })

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = async (rawFiles, folder) => {
    const pdfs = Array.from(rawFiles).filter(f => f.type === 'application/pdf')
    if (!pdfs.length) { notify('Apenas PDFs são aceitos.', 'error'); return }

    for (const file of pdfs) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      notify(`📥 Carregando ${file.name}...`)

      try {
        const buffer = await file.arrayBuffer()
        const text   = await extractPDFText(buffer.slice(0))
        const docType = detectDocumentType(text, file.name)

        // Detect month
        let month = null
        const mMatch = text.match(/Mês\/Ano:\s*(\d{2}\/\d{4})/) ||
                       text.match(/(\d{2})\/(\d{4})/)
        if (mMatch) {
          month = mMatch[1] || `${mMatch[1]}/${mMatch[2]}`
        }
        if (!month) {
          const now = new Date()
          month = `${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`
        }

        // Detect sub-type label
        const docLabel = {
          contracheque_mensal: 'Mensal',
          contracheque_vr:     'Vale Refeição',
          contracheque_ferias: 'Férias',
          sicredi:             'Extrato Sicredi',
          xp_cartao:           'Fatura XP',
          unknown:             'Desconhecido',
        }[docType] || docType

        const meta = {
          id, name: file.name, folder, month,
          size: file.size, docType: docLabel,
          parsedAt: null, txCount: 0,
          githubSynced: false,
          rawText: text.slice(0, 16000),
        }

        await storage.saveFile(meta, buffer)
        const newFiles = [...files.filter(f => f.id !== id), meta]
        await persistFiles(newFiles)

        // Auto-sync PDF to GitHub
        if (ghConfig?.token) {
          setSyncingId(id)
          try {
            await savePDFToGitHub({
              token: ghConfig.token, owner: ghConfig.owner, repo: ghConfig.repo,
              folder: folder, filename: file.name, month, buffer,
            })
            const updMeta = { ...meta, githubSynced: true }
            await storage.updateFileMeta(id, { githubSynced: true })
            setFiles(prev => prev.map(f => f.id === id ? updMeta : f))
            notify(`✓ ${file.name} salvo localmente e no GitHub!`)
          } catch (e) {
            notify(`⚠️ Salvo localmente. GitHub falhou: ${e.message}`, 'error')
          }
          setSyncingId(null)
        } else {
          notify(`✓ ${file.name} adicionado. Clique em ⚡ Processar para extrair dados.`)
        }

        // Update active month
        if (!activeMonth) setActiveMonth(month)

      } catch (e) {
        notify(`Erro ao carregar ${file.name}: ${e.message}`, 'error')
      }
    }
  }

  // ── Process (parse) a file ─────────────────────────────────────────────────
  const handleProcess = async (file) => {
    setProcessingId(file.id)
    try {
      const stored = await storage.getFile(file.id)
      const text = stored?.rawText || file.rawText || ''
      if (!text) throw new Error('Texto do PDF não encontrado. Faça o upload novamente.')

      const docType = detectDocumentType(text, file.name)
      let parsed

      if (docType.startsWith('contracheque')) {
        parsed = parseContracheque(text)
      } else if (docType === 'xp_cartao') {
        parsed = parseXPCartao(text)
      } else if (docType === 'sicredi') {
        parsed = parseSicredi(text)
      } else {
        // Unknown — try contracheque parser as fallback (most of your uploads)
        parsed = parseContracheque(text)
      }

      // For Sicredi: can cover multiple months in one extrato
      // Split transactions by their actual month tag
      if (docType === 'sicredi' && parsed.meses && parsed.meses.length > 1) {
        for (const m of parsed.meses) {
          const monthTx = parsed.transacoes
            .filter(t => !t.mesReferencia || t.mesReferencia === m)
            .map(t => ({ ...t, id: t.id || crypto.randomUUID(), fileId: file.id, fileName: file.name }))

          const existing = transactions[m] || []
          const merged = [...existing.filter(t => t.fileId !== file.id), ...monthTx]
          await persistTx(m, merged)

          if (ghConfig?.token) {
            try { await saveJSONToGitHub({ token: ghConfig.token, owner: ghConfig.owner, repo: ghConfig.repo, month: m, type: 'transactions', data: merged }) } catch { /* silent */ }
          }
        }
        const lastMonth = parsed.meses[parsed.meses.length - 1]
        const updMeta = { ...file, parsedAt: new Date().toLocaleString('pt-BR'), txCount: parsed.transacoes.length, month: lastMonth }
        await storage.updateFileMeta(file.id, { parsedAt: updMeta.parsedAt, txCount: updMeta.txCount, month: lastMonth })
        setFiles(prev => prev.map(f => f.id === file.id ? updMeta : f))
        setActiveMonth(lastMonth)
        notify(`✓ ${parsed.transacoes.length} transações extraídas — ${parsed.meses.join(' e ')}`)
        setProcessingId(null)
        return
      }

      const month = parsed.mes_referencia || file.month
      const newTx = (parsed.transacoes || []).map(t => ({
        ...t,
        id: t.id || crypto.randomUUID(),
        fileId: file.id,
        fileName: file.name,
      }))

      // Merge: remove old tx from this file, add new ones
      const existing = transactions[month] || []
      const merged   = [...existing.filter(t => t.fileId !== file.id), ...newTx]
      await persistTx(month, merged)

      // Update file meta
      const updMeta = {
        ...file,
        parsedAt: new Date().toLocaleString('pt-BR'),
        txCount: newTx.length,
        month,
      }
      await storage.updateFileMeta(file.id, { parsedAt: updMeta.parsedAt, txCount: newTx.length, month })
      setFiles(prev => prev.map(f => f.id === file.id ? updMeta : f))

      // Sync parsed JSON to GitHub
      if (ghConfig?.token && month) {
        try {
          await saveJSONToGitHub({
            token: ghConfig.token, owner: ghConfig.owner, repo: ghConfig.repo,
            month, type: 'transactions', data: merged,
          })
        } catch { /* silent */ }
      }

      setActiveMonth(month)
      notify(`✓ ${newTx.length} registros extraídos de "${file.name}"`)
    } catch (e) {
      notify(`Erro ao processar: ${e.message}`, 'error')
    }
    setProcessingId(null)
  }

  // ── Delete file ────────────────────────────────────────────────────────────
  const handleDelete = async (fileId) => {
    if (!confirm('Remover este arquivo e suas transações?')) return
    const f = files.find(x => x.id === fileId)
    await storage.deleteFile(fileId)
    const newFiles = files.filter(x => x.id !== fileId)
    setFiles(newFiles)
    if (f?.month) {
      const updTx = (transactions[f.month] || []).filter(t => t.fileId !== fileId)
      await persistTx(f.month, updTx)
    }
    notify('Arquivo removido.')
  }

  // ── Update transaction category ────────────────────────────────────────────
  const handleCatChange = async (txId, newCat) => {
    if (!activeMonth) return
    const updated = (transactions[activeMonth] || []).map(t =>
      t.id === txId ? { ...t, categoria: newCat } : t
    )
    await persistTx(activeMonth, updated)
  }

  // ── Run AI analysis ────────────────────────────────────────────────────────
  const handleAnalyse = async (month) => {
    const key = aiKey || await storage.getSetting('ai_key', '')
    if (!key) {
      notify('Configure sua chave API Claude em ⚙️ Configurações.', 'error')
      setShowSettings(true)
      return
    }

    const txList = transactions[month] || []
    if (!txList.length) { notify('Nenhuma transação para analisar.', 'error'); return }

    setAnalysingMonth(month)
    try {
      const gastos  = txList.filter(t => getCat(t.categoria).grupo === 'gasto')
      const receita = txList.filter(t => getCat(t.categoria).grupo === 'receita')
      const descont = txList.filter(t => getCat(t.categoria).grupo === 'desconto')

      const totalGasto   = gastos.reduce((s,t) => s + (t.valor||0), 0)
      const totalReceita = receita.reduce((s,t) => s + (t.valor||0), 0)
      const totalDesc    = descont.reduce((s,t) => s + (t.valor||0), 0)

      const porCat = {}
      txList.forEach(t => { porCat[t.categoria] = (porCat[t.categoria]||0) + (t.valor||0) })

      const prompt = `
Mês: ${month}
Receita bruta: ${fmt(totalReceita)}
Descontos legais: ${fmt(totalDesc)}
Líquido estimado: ${fmt(totalReceita - totalDesc)}
Total gasto (cartão + pix): ${fmt(totalGasto)}
Saldo final: ${fmt(totalReceita - totalDesc - totalGasto)}

Por categoria:
${Object.entries(porCat).map(([k,v]) => `  ${k}: ${fmt(v)}`).join('\n')}

Top 20 transações de maior valor:
${JSON.stringify(
  txList
    .filter(t => getCat(t.categoria).grupo === 'gasto')
    .sort((a,b) => b.valor - a.valor)
    .slice(0,20)
    .map(t => ({ data: t.data, desc: t.descricao, valor: t.valor, cat: t.categoria })),
  null, 2
)}

Histórico de meses anteriores disponíveis: ${months.filter(m => m !== month).join(', ') || 'nenhum ainda'}
`.trim()

      const raw = await callClaude(key, SYS_ANALYSIS, prompt, 5000)
      const result = parseJSON(raw)
      if (!result) throw new Error('IA retornou formato inesperado.')

      const analysis = {
        ...result,
        id: month,
        totalGasto,
        totalReceita,
        totalDesc,
      }

      await storage.saveAnalysis(month, analysis)
      setAnalyses(prev => ({ ...prev, [month]: analysis }))

      // Sync to GitHub
      if (ghConfig?.token) {
        try {
          await saveJSONToGitHub({
            token: ghConfig.token, owner: ghConfig.owner, repo: ghConfig.repo,
            month, type: 'analysis', data: analysis,
          })
        } catch { /* silent */ }
      }

      setScreen('analysis')
      notify('✓ Análise concluída!')
    } catch (e) {
      notify(`Erro na análise: ${e.message}`, 'error')
    }
    setAnalysingMonth(null)
  }

  // ── Settings save ──────────────────────────────────────────────────────────
  const handleSettingsSave = ({ ghToken, ghOwner, ghRepo, aiKey: key }) => {
    if (ghToken && ghOwner) setGhConfig({ token: ghToken, owner: ghOwner, repo: ghRepo })
    if (key) setAiKey(key)
    notify('✓ Configurações salvas!')
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0a0f18', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #1e2d3d', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: '#475569', fontFamily: 'monospace', fontSize: 12 }}>Carregando FinanceTrack...</p>
      </div>
    </div>
  )

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0a0f18', minHeight: '100vh', color: '#e2e8f0' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        * { box-sizing: border-box; }
      `}</style>

      <Notification msg={notification?.msg} type={notification?.type} />

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}

      {/* ── Nav ── */}
      <nav style={{ background: '#0d1520', borderBottom: '1px solid #1e2d3d', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Logo */}
        <div style={{ marginRight: 20, padding: '14px 0', flexShrink: 0 }}>
          <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>💰 FinanceTrack</span>
          <span style={{ color: '#1e3a5f', fontSize: 10, marginLeft: 6, fontFamily: 'monospace' }}>Gustavo</span>
        </div>

        {/* Tabs */}
        {[
          { id: 'files',        label: '📁 Arquivos' },
          { id: 'transactions', label: '📋 Transações' },
          { id: 'analysis',     label: '🧠 Análise' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setScreen(tab.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: screen === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: screen === tab.id ? '#60a5fa' : '#64748b',
              padding: '17px 14px 15px', cursor: 'pointer', fontSize: 12,
              fontFamily: 'monospace', transition: 'all .2s',
            }}>
            {tab.label}
          </button>
        ))}

        {/* Right: month selector + analyse button + settings */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {months.length > 0 && (
            <select value={activeMonth || ''} onChange={e => setActiveMonth(e.target.value)}
              style={{ background: '#141b26', border: '1px solid #1e2d3d', color: '#94a3b8', padding: '6px 10px', borderRadius: 7, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}>
              <option value="">Selecionar mês</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {m} · {(transactions[m]||[]).length} tx{analyses[m] ? ' ✓' : ''}
                </option>
              ))}
            </select>
          )}

          {activeMonth && (
            <Btn variant="success" small
              onClick={() => handleAnalyse(activeMonth)}
              disabled={!!analysingMonth}
              style={{ fontSize: 12 }}>
              {analysingMonth === activeMonth
                ? <><Spinner size={10} /> Analisando...</>
                : '✨ Analisar com IA'}
            </Btn>
          )}

          {/* GitHub status */}
          <div title={ghConfig ? `GitHub: ${ghConfig.owner}/${ghConfig.repo}` : 'GitHub não configurado'}
            style={{ fontSize: 16, cursor: 'pointer', opacity: ghConfig ? 1 : 0.3 }}
            onClick={() => setShowSettings(true)}>
            🐙
          </div>

          <button onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: '1px solid #1e2d3d', color: '#64748b', padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
            ⚙️
          </button>
        </div>
      </nav>

      {/* ── Screens ── */}
      <div style={{ animation: 'fadeUp .25s ease' }} key={screen}>
        {screen === 'files' && (
          <FilesScreen
            files={files}
            activeFolder={activeFolder}
            setActiveFolder={setActiveFolder}
            onUpload={handleUpload}
            onProcess={handleProcess}
            onDelete={handleDelete}
            onViewTx={() => setScreen('transactions')}
            processingId={processingId}
            months={months}
            transactions={transactions}
            analyses={analyses}
            onSelectMonth={setActiveMonth}
            githubEnabled={!!ghConfig}
            syncingId={syncingId}
          />
        )}

        {screen === 'transactions' && (
          <TransactionsScreen
            month={activeMonth}
            txList={transactions[activeMonth] || []}
            onCatChange={handleCatChange}
            onAnalyse={() => handleAnalyse(activeMonth)}
            isAnalysing={analysingMonth === activeMonth}
            hasAnalysis={!!analyses[activeMonth]}
            onViewAnalysis={() => setScreen('analysis')}
          />
        )}

        {screen === 'analysis' && (
          <AnalysisScreen
            analysis={analyses[activeMonth] || null}
            txList={transactions[activeMonth] || []}
            month={activeMonth}
            allMonths={months}
            allAnalyses={analyses}
            allTx={transactions}
          />
        )}
      </div>
    </div>
  )
}
