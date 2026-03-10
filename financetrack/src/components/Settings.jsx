import { useState, useEffect } from 'react'
import { Card, Btn, SectionTitle } from './ui.jsx'
import { storage } from '../utils/storage.js'
import { validateToken } from '../utils/github.js'

export function SettingsModal({ onClose, onSave }) {
  const [ghToken, setGhToken]   = useState('')
  const [ghOwner, setGhOwner]   = useState('')
  const [ghRepo,  setGhRepo]    = useState('')
  const [aiKey,   setAiKey]     = useState('')
  const [testing, setTesting]   = useState(false)
  const [ghUser,  setGhUser]    = useState(null)
  const [msg,     setMsg]       = useState(null)

  useEffect(() => {
    ;(async () => {
      setGhToken(await storage.getSetting('gh_token', ''))
      setGhOwner(await storage.getSetting('gh_owner', ''))
      setGhRepo (await storage.getSetting('gh_repo',  'financetrack-data'))
      setAiKey  (await storage.getSetting('ai_key',   ''))
    })()
  }, [])

  const testGitHub = async () => {
    setTesting(true); setMsg(null)
    try {
      const user = await validateToken(ghToken)
      setGhUser(user)
      setMsg({ type: 'ok', text: `✓ Conectado como @${user.login}` })
    } catch (e) {
      setMsg({ type: 'err', text: `✗ Erro: ${e.message}` })
    }
    setTesting(false)
  }

  const save = async () => {
    await storage.setSetting('gh_token', ghToken)
    await storage.setSetting('gh_owner', ghOwner || ghUser?.login || '')
    await storage.setSetting('gh_repo',  ghRepo)
    await storage.setSetting('ai_key',   aiKey)
    onSave?.({ ghToken, ghOwner: ghOwner || ghUser?.login, ghRepo, aiKey })
    onClose()
  }

  const inputStyle = {
    background: '#0d1520', border: '1px solid #2d4060', color: '#f1f5f9',
    padding: '9px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'monospace',
    width: '100%', outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000099', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <Card style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>⚙️ Configurações</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Claude API Key */}
        <div style={{ marginBottom: 22 }}>
          <SectionTitle>🤖 Chave API Claude (Anthropic)</SectionTitle>
          <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)}
            placeholder="sk-ant-..." style={inputStyle} />
          <p style={{ color: '#475569', fontSize: 11, marginTop: 6, fontFamily: 'monospace' }}>
            Necessária para análise IA. Obtenha em <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>console.anthropic.com</a>
          </p>
        </div>

        {/* GitHub */}
        <div style={{ marginBottom: 12 }}>
          <SectionTitle>🐙 GitHub — Armazenamento de Arquivos</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', display: 'block', marginBottom: 5 }}>Personal Access Token (PAT)</label>
              <input type="password" value={ghToken} onChange={e => setGhToken(e.target.value)}
                placeholder="ghp_..." style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', display: 'block', marginBottom: 5 }}>Usuário GitHub</label>
                <input value={ghOwner} onChange={e => setGhOwner(e.target.value)}
                  placeholder={ghUser?.login || 'seu-usuario'} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', display: 'block', marginBottom: 5 }}>Repositório</label>
                <input value={ghRepo} onChange={e => setGhRepo(e.target.value)}
                  placeholder="financetrack-data" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Btn variant="secondary" small onClick={testGitHub} disabled={!ghToken || testing}>
                {testing ? '⏳ Testando...' : '🔗 Testar conexão'}
              </Btn>
              {msg && (
                <span style={{ fontSize: 12, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
                  {msg.text}
                </span>
              )}
            </div>
          </div>

          <div style={{ background: '#0d1520', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
            <p style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', margin: '0 0 6px' }}>📂 Estrutura no repositório:</p>
            <pre style={{ color: '#475569', fontSize: 10, margin: 0, lineHeight: 1.8 }}>{`seu-repo/
├── data/
│   ├── contracheques/
│   │   └── 2026-02/
│   │       ├── CCheque_mensal.pdf
│   │       └── CCheque_vr.pdf
│   ├── sicredi/
│   │   └── 2026-02/extrato.pdf
│   ├── xp_cartao/
│   │   └── 2026-02/fatura.pdf
│   └── parsed/
│       └── 2026-02/
│           ├── transactions.json
│           └── analysis.json`}</pre>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="success" onClick={save}>💾 Salvar configurações</Btn>
        </div>
      </Card>
    </div>
  )
}
